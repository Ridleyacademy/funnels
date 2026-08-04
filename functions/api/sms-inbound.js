// Twilio inbound SMS → ActiveCampaign, for the VSL call-nurture texts.
//
// The confirmation texts say "Reply C and I'll know you're set" and "Need to
// move it? Just reply." This is the thing that listens. Point the Messaging
// Service's inbound request URL (Twilio Console → Messaging → Services →
// Low Volume Mixed A2P Messaging Service → Integration → "Send a webhook")
// at POST https://<FUNNEL_DOMAIN>/api/sms-inbound
//
// What it does with a reply, matched to the AC contact by phone number:
//   - "C" / "confirm" / "yes"  → add tag "SMS Confirmed" (creates it if absent)
//   - every reply (incl. C)    → saved as a note on the contact, so reschedule
//                                requests and questions are visible in AC
//   - STOP/HELP are handled by Twilio's own opt-out layer before this runs;
//     if a STOP still arrives here it is noted but never tagged as confirmed.
//
// Env vars (Cloudflare dashboard, never committed):
//   AC_URL              https://creatorsecretsads.api-us1.com
//   AC_KEY              ActiveCampaign API key
//   TWILIO_AUTH_TOKEN   validates X-Twilio-Signature so only Twilio can post

const CONFIRM_TAG = 'SMS Confirmed';
const CONFIRM_RE = /^\s*(c|confirm|confirmed|yes|y)\s*[.!]?\s*$/i;

let cachedTagId = null;

async function ac(env, path, method, body) {
  const res = await fetch(env.AC_URL + path, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'Api-Token': env.AC_KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 422) throw new Error('AC ' + path + ' -> ' + res.status);
  return res.json().catch(() => ({}));
}

async function confirmTagId(env) {
  if (cachedTagId) return cachedTagId;
  const found = await ac(env, '/api/3/tags?search=' + encodeURIComponent(CONFIRM_TAG));
  const hit = (found.tags || []).find(t => t.tag === CONFIRM_TAG);
  if (hit) { cachedTagId = hit.id; return cachedTagId; }
  const made = await ac(env, '/api/3/tags', 'POST', {
    tag: { tag: CONFIRM_TAG, tagType: 'contact', description: 'Replied C to a VSL SMS reminder' },
  });
  cachedTagId = made.tag && made.tag.id;
  return cachedTagId;
}

// Twilio posts numbers as +18015551234; AC stores E.164 too (booking form
// normalizes). Search the last 10 digits to survive formatting drift.
async function findContactByPhone(env, from) {
  const digits = String(from || '').replace(/\D/g, '');
  const tail = digits.slice(-10);
  if (!tail) return null;
  const data = await ac(env, '/api/3/contacts?search=' + encodeURIComponent(tail));
  const hit = (data.contacts || []).find(c => String(c.phone || '').replace(/\D/g, '').endsWith(tail));
  return hit || null;
}

// X-Twilio-Signature = Base64(HMAC-SHA1(authToken, url + concat(sorted key+value)))
async function verifyTwilioSignature(env, url, params, header) {
  if (!header) return false;
  let data = url;
  for (const k of [...params.keys()].sort()) data += k + params.get(k);
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.TWILIO_AUTH_TOKEN),
    { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return b64 === header;
}

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const twiml = () => new Response(EMPTY_TWIML, { status: 200, headers: { 'Content-Type': 'text/xml' } });

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return new Response('ok', { status: 200 });

  const bodyText = await request.text();
  const params = new URLSearchParams(bodyText);

  const ok = await verifyTwilioSignature(
    env, request.url, params, request.headers.get('X-Twilio-Signature'));
  if (!ok) return new Response('bad signature', { status: 403 });

  const from = params.get('From');
  const msg = (params.get('Body') || '').trim();
  if (!from || !msg) return twiml();

  try {
    const contact = await findContactByPhone(env, from);
    if (!contact) return twiml(); // unknown number; nothing to attach it to

    const confirmed = CONFIRM_RE.test(msg);
    const isStop = /^\s*(stop|stopall|unsubscribe|cancel|end|quit)\s*$/i.test(msg);

    await ac(env, '/api/3/notes', 'POST', {
      note: {
        note: 'SMS reply from ' + from + ': "' + msg.slice(0, 500) + '"' +
          (confirmed ? ' [confirmed]' : '') + (isStop ? ' [opt-out]' : ''),
        relid: contact.id,
        reltype: 'Subscriber',
      },
    });

    if (confirmed && !isStop) {
      await ac(env, '/api/3/contactTags', 'POST', {
        contactTag: { contact: contact.id, tag: await confirmTagId(env) },
      });
    }
    return twiml();
  } catch (e) {
    // Always answer Twilio cleanly; the error is visible in CF logs.
    return twiml();
  }
}
