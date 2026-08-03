// Opt-in / application → ActiveCampaign bridge.
// Drop-in replacement for handoff/new/functions/api/optin.js (7/24 kit),
// backward compatible: payloads without `source` behave exactly as before.
//
// Two callers, distinguished by `source` in the posted JSON:
//   (none) / "optin"  → variant B opt-in page, or variant A's early contact
//                       capture (pushCrm). Tag: "VSL Opt-in".
//   "application"     → variant A booking form submitted (the Meta Lead
//                       moment; payload also carries q1, q2, dq). Tags:
//                       "VSL Application", plus "VSL Tripwire Routed" when
//                       dq is true. The Booking Abandon automation triggers
//                       on "VSL Application".
//
// Env vars (Cloudflare dashboard, same as calendly-webhook.js):
//   AC_URL                https://creatorsecretsads.api-us1.com
//   AC_KEY                ActiveCampaign Settings → Developer → API key
//   SMS_CONSENT_FIELD_ID  AC custom-field id for the SMS opt-in record. When the
//                         posted payload carries consent:true, this field is
//                         stamped with the consent timestamp (ISO). The Twilio
//                         scheduler in calendly-webhook.js reads it as its TCPA
//                         gate, so a booking only gets texts if consent is stored.

const TAGS = {
  optin: ['VSL Opt-in'],
  application: ['VSL Application'],
  application_dq: ['VSL Application', 'VSL Tripwire Routed'],
};

const tagIdCache = {};

async function ac(env, path, method, body) {
  const res = await fetch(env.AC_URL + path, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'Api-Token': env.AC_KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 422) throw new Error('AC ' + path + ' -> ' + res.status);
  return res.json().catch(() => ({}));
}

async function tagId(env, tagName) {
  if (tagIdCache[tagName]) return tagIdCache[tagName];
  const data = await ac(env, '/api/3/tags?search=' + encodeURIComponent(tagName));
  const hit = (data.tags || []).find(t => t.tag === tagName);
  if (!hit) throw new Error('Tag not found: ' + tagName);
  tagIdCache[tagName] = hit.id;
  return hit.id;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return new Response('ok', { status: 200 }); // health check

  let d;
  try { d = JSON.parse(await request.text()); } catch (e) { return new Response('bad json', { status: 400 }); }

  const email = String(d.email || '').trim().slice(0, 254);
  if (!/\S+@\S+\.\S+/.test(email)) return new Response('bad email', { status: 400 });
  const name = String(d.name || '').trim().slice(0, 120);
  const phone = String(d.phone || '').trim().slice(0, 40);
  const consent = d.consent === true || d.consent === 'true' || d.consent === 1 || d.consent === '1';
  const dq = d.dq === true || d.dq === 'true' || d.dq === 1 || d.dq === '1';
  const firstName = name.split(/\s+/)[0] || '';
  const lastName = name.split(/\s+/).slice(1).join(' ') || '';

  const tagNames = d.source === 'application'
    ? (dq ? TAGS.application_dq : TAGS.application)
    : TAGS.optin;

  try {
    const data = await ac(env, '/api/3/contact/sync', 'POST', {
      contact: { email, firstName, lastName, phone },
    });
    const contactId = data.contact && data.contact.id;
    if (contactId) {
      for (const t of tagNames) {
        await ac(env, '/api/3/contactTags', 'POST', {
          contactTag: { contact: contactId, tag: await tagId(env, t) },
        });
      }
      // Stamp the SMS consent record so the Twilio scheduler can gate on it.
      // Timestamp on consent, cleared otherwise. No field configured → skip.
      if (env.SMS_CONSENT_FIELD_ID) {
        await ac(env, '/api/3/fieldValues', 'POST', {
          fieldValue: {
            contact: contactId,
            field: env.SMS_CONSENT_FIELD_ID,
            value: consent ? new Date().toISOString() : '',
          },
        });
      }
    }
    return new Response('ok', { status: 200 });
  } catch (e) {
    // 200 so the beacon never retries; the error is visible in CF logs.
    return new Response('error: ' + e.message, { status: 200 });
  }
}
