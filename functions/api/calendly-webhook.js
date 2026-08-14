// Calendly → AXL: put "VSL booked call" on the contact when they book.
//
// WHY THIS EXISTS
// AXL is the system of record, and until now nothing ever told it a call was
// booked. Measured 2026-08-14: 324 contacts held "VSL Opt-in" and 3 held
// "VSL booked call", so in practice the tag was dark and there was no way to
// separate a lead from a lead who booked. Calendly's own ActiveCampaign
// integration does write a booking tag, but it writes it to AC, and AC has not
// been the system of record since the 2026-08-04 cutover.
//
// There is an older, different file in ~/riddley/qual-to-crm that also listens
// to Calendly. That one writes Call_Date and a tag into ACTIVECAMPAIGN for the
// 595 call nurture. It is not this, it does not touch AXL, and deploying it
// would not have answered the question this file answers. If both ever run,
// they are complementary rather than duplicates.
//
// TAG NAME, EXACTLY
// The tag is "VSL booked call" (lowercase b, no "a"), id K1A3xB9g6UOnSxJQ9CIbOg.
// The qual-to-crm file uses the string "VSL Booked a Call", which is a DIFFERENT
// tag in AXL. Sending that spelling here would create a second, parallel
// booked-call tag and split every segment built on it. Do not "fix" the casing.
//
// NOT LIVE UNTIL TWO THINGS EXIST, neither of which is in this repo:
//   1. CALENDLY_SIGNING_KEY set on the Pages project. Until then this endpoint
//      answers with a diagnostic instead of trusting unsigned input.
//   2. A Calendly webhook subscription pointing at
//      https://vsl-b.ridleyacademy.team/api/calendly-webhook
//      for the invitee.created event, scoped to the organization.
//      The signing key is shown once, when that subscription is created.
// Deployed ahead of both deliberately: the endpoint refuses everything until it
// is configured, so wiring it up is a settings change rather than a code change.
//
// Reschedules arrive as canceled + created, so the created half re-tags an
// already-tagged contact, which is a no-op. invitee.canceled is intentionally
// ignored: "booked a call at some point" is the signal we want for segmentation,
// and un-tagging on cancel would erase the history the nurture branches on.

const DEFAULT_PROXY_URL = 'https://accel-proxy.system-2f6.workers.dev/api/run';
// AXL scenario "Outside Registration". Same scenario the opt-in path uses, and
// the only id the proxy whitelists, so tags have to ride in on it. Running it
// for an existing contact re-evaluates its comment-substring chain and re-adds
// the source tag they already had, which is idempotent and harmless.
const DEFAULT_SCENARIO_ID = 'h7YOCA0HikKRerkqkXgoOA';
const BOOKED_TAG = 'VSL booked call';

// Same whitespace-tolerant lookup as optin.js: a dashboard-pasted variable name
// arrives as " ACCEL_PROXY_KEY" more often than anyone would like.
function envVar(env, name) {
  if (env[name]) return env[name];
  try {
    const k = Object.keys(env).find((x) => x.trim() === name);
    return k ? env[k] : undefined;
  } catch (e) {
    return undefined;
  }
}

// Calendly signs with `Calendly-Webhook-Signature: t=<unix>,v1=<hex hmac>` over
// "<t>.<raw body>". Compared in constant time, and the timestamp is bounded so a
// captured-and-replayed payload stops working.
async function signatureValid(raw, header, key) {
  if (!header) return false;
  const parts = Object.fromEntries(
    String(header)
      .split(',')
      .map((p) => p.split('=').map((s) => s.trim()))
      .filter((p) => p.length === 2)
  );
  if (!parts.t || !parts.v1) return false;
  const age = Math.abs(Date.now() / 1000 - Number(parts.t));
  if (!Number.isFinite(age) || age > 300) return false;

  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(parts.t + '.' + raw));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (expected.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

export async function onRequestPost({ request, env }) {
  const raw = await request.text();

  const signingKey = envVar(env, 'CALENDLY_SIGNING_KEY');
  if (!signingKey) {
    // Deliberately 200 with a report string, matching /api/optin: `curl -d` on
    // this route is then the live diagnosis of whether it is configured.
    return new Response('calendly:no_signing_key', { status: 200 });
  }
  if (!(await signatureValid(raw, request.headers.get('Calendly-Webhook-Signature'), signingKey))) {
    return new Response('calendly:bad_signature', { status: 401 });
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch (e) {
    return new Response('calendly:bad_json', { status: 400 });
  }

  if (body.event !== 'invitee.created') {
    return new Response('calendly:ignored ' + String(body.event || 'unknown'), { status: 200 });
  }

  const payload = body.payload || {};
  const email = String(payload.email || '').trim().toLowerCase();
  if (!email) return new Response('calendly:no_email', { status: 200 });

  const proxyKey = envVar(env, 'ACCEL_PROXY_KEY');
  if (!proxyKey) return new Response('calendly:no_proxy_key', { status: 200 });

  // Find-or-create on email, per Scenario.Run's contract. A booker who types a
  // different email into Calendly than they used at the opt-in creates a second
  // contact rather than tagging the first. That is a known and accepted gap here:
  // the phone-based reconciliation the AC bridge does needs a lookup this proxy
  // does not expose, and a booking recorded against a duplicate is still better
  // than a booking recorded nowhere.
  const contactData = {
    email,
    tags: [BOOKED_TAG],
  };
  const first = String(payload.first_name || payload.name || '').trim().split(/\s+/)[0];
  if (first) contactData.firstName = first;

  const res = await fetch(envVar(env, 'ACCEL_PROXY_URL') || DEFAULT_PROXY_URL, {
    method: 'POST',
    headers: { 'X-Proxy-Key': proxyKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenarioId: envVar(env, 'ACCEL_SCENARIO_ID') || DEFAULT_SCENARIO_ID,
      contactData,
      data: {},
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    // Answer 200 regardless. Calendly retries non-2xx, and a retry storm against
    // a misconfigured proxy would re-run the scenario for every booking.
    console.error('calendly ' + email + ' -> axl ' + res.status + ' ' + detail.slice(0, 200));
    return new Response('calendly:axl_' + res.status, { status: 200 });
  }

  console.log('calendly ' + email + ' -> axl:ok');
  return new Response('calendly:ok', { status: 200 });
}
