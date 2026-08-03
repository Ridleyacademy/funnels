// Calendly → ActiveCampaign bridge for the 595 call nurture.
// Purpose: write the booking time into the Call_Date field (id 13) so the
// 595 automation can pace emails against the actual call, and add the
// "VSL Booked a Call" tag idempotently.
//
// SMS is NOT sent from here. The three reminder texts are native
// "Twilio - Send an SMS" action nodes inside automation 595 (the Twilio
// connection id is in RIDLEY-595-SMS-NODES.md, deliberately not in this repo).
// This webhook only has to land an accurate Call_Date, which is what those
// in-595 waits anchor to.
//
// Deploy: Cloudflare Pages Function (functions/api/calendly-webhook.js on the
// funnel repo) or standalone Worker. Then create the webhook subscription in
// Calendly (Integrations → Webhooks, or via API) pointing at this URL for
// events: invitee.created, invitee.canceled.
//
// Env vars (Cloudflare dashboard, never committed):
//   CALENDLY_SIGNING_KEY  Calendly webhook signing key (shown when the
//                         webhook subscription is created)
//   AC_URL                https://creatorsecretsads.api-us1.com
//   AC_KEY                ActiveCampaign Settings → Developer → API key
//
// Behavior:
//   invitee.created  → upsert contact, Call_Date = scheduled_event.start_time,
//                      add tag "VSL Booked a Call". Reschedules arrive as a
//                      canceled+created pair, so the new created simply
//                      overwrites Call_Date with the new time.
//   invitee.canceled → if not a reschedule, blank Call_Date so the 595
//                      "Call_Date is set" guard holds the contact instead of
//                      pacing toward a call that no longer exists.

const CALL_DATE_FIELD_ID = '13';
const BOOKED_TAG = 'VSL Booked a Call';
// Call_Host (create in AC, set env CALL_HOST_FIELD_ID): first name of the
// round-robin host (Charlie/Danny) from the booking, read from the Calendly
// event_memberships. Automation 597 personalizes the instant confirmation
// text with it and falls back to team wording when it's blank.

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

async function bookedTagId(env) {
  if (cachedTagId) return cachedTagId;
  const data = await ac(env, '/api/3/tags?search=' + encodeURIComponent(BOOKED_TAG));
  const hit = (data.tags || []).find(t => t.tag === BOOKED_TAG);
  if (!hit) throw new Error('Tag not found: ' + BOOKED_TAG);
  cachedTagId = hit.id;
  return cachedTagId;
}

async function upsertContact(env, email, firstName, lastName) {
  const data = await ac(env, '/api/3/contact/sync', 'POST', {
    contact: { email, firstName: firstName || '', lastName: lastName || '' },
  });
  return data.contact && data.contact.id;
}

async function setCallDate(env, contactId, isoOrEmpty) {
  await ac(env, '/api/3/fieldValues', 'POST', {
    fieldValue: { contact: contactId, field: CALL_DATE_FIELD_ID, value: isoOrEmpty },
  });
}

async function addBookedTag(env, contactId) {
  await ac(env, '/api/3/contactTags', 'POST', {
    contactTag: { contact: contactId, tag: await bookedTagId(env) },
  });
}

// Calendly signs: "Calendly-Webhook-Signature: t=<ts>,v1=<hex hmac sha256 of `${t}.${body}`>"
async function verifySignature(env, request, rawBody) {
  const header = request.headers.get('Calendly-Webhook-Signature') || '';
  const t = (header.match(/t=([^,]+)/) || [])[1];
  const v1 = (header.match(/v1=([0-9a-f]+)/) || [])[1];
  if (!t || !v1) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.CALENDLY_SIGNING_KEY),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(t + '.' + rawBody));
  const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('');
  return hex === v1;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return new Response('ok', { status: 200 }); // Calendly setup ping safety
  const rawBody = await request.text();

  if (!(await verifySignature(env, request, rawBody))) {
    return new Response('bad signature', { status: 401 });
  }

  let evt;
  try { evt = JSON.parse(rawBody); } catch (e) { return new Response('bad json', { status: 400 }); }

  const kind = evt.event;                       // "invitee.created" | "invitee.canceled"
  const p = evt.payload || {};
  const email = p.email;
  const startTime = p.scheduled_event && p.scheduled_event.start_time; // ISO 8601 UTC
  if (!email) return new Response('no email', { status: 200 });

  try {
    const contactId = await upsertContact(env, email, p.first_name || p.name, p.last_name);
    if (!contactId) return new Response('no contact', { status: 200 });

    if (kind === 'invitee.created' && startTime) {
      await setCallDate(env, contactId, startTime);
      // Round-robin host (Charlie/Danny): first membership on the event.
      // Write BEFORE the tag so automation 597 (triggered by the tag) sees it.
      if (env.CALL_HOST_FIELD_ID) {
        const m = (p.scheduled_event.event_memberships || [])[0];
        const hostFirst = m && m.user_name ? String(m.user_name).trim().split(/\s+/)[0] : '';
        await ac(env, '/api/3/fieldValues', 'POST', {
          fieldValue: { contact: contactId, field: env.CALL_HOST_FIELD_ID, value: hostFirst },
        });
      }
      await addBookedTag(env, contactId);
    } else if (kind === 'invitee.canceled') {
      // Reschedules send canceled (rescheduled: true) then created; only a
      // true cancellation blanks the field.
      if (!p.rescheduled) await setCallDate(env, contactId, '');
    }
    return new Response('ok', { status: 200 });
  } catch (e) {
    // 200 so Calendly doesn't retry-storm; the error is visible in CF logs.
    return new Response('error: ' + e.message, { status: 200 });
  }
}
