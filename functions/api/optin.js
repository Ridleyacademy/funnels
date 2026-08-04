// Opt-in → AXL (Accel) bridge (variant B's front door).
// funnel.js posts {name, phone, email, consent} here on opt-in submit; this
// registers the lead in AXL through the accel-proxy worker, which holds the
// Accel bearer token so it never ships to the browser.
//
// AXL is the system of record. ActiveCampaign is deliberately NOT written here:
// per Chris on 2026-08-04, registration goes through AXL only. Bookings still
// reach AC via Calendly's native integration; that path is untouched by this file.
//
// Env vars (Cloudflare dashboard):
//   ACCEL_PROXY_URL     https://accel-proxy.system-2f6.workers.dev/api/run
//                       Exact path, no trailing slash. The proxy 404s anything else.
//   ACCEL_PROXY_KEY     Matches the PROXY_KEY secret on the accel-proxy worker.
//   ACCEL_SCENARIO_ID   Must appear in the worker's ALLOWED_SCENARIOS, or the
//                       worker returns 403 scenario_not_allowed.

// Registers the lead in AXL via the accel-proxy worker. Server-to-server, so the
// proxy key never reaches the browser and the worker's lack of CORS headers is
// irrelevant (a browser-side call would die on the OPTIONS preflight).
async function axl(env, lead) {
  const url = env.ACCEL_PROXY_URL;
  if (!url || !env.ACCEL_PROXY_KEY || !env.ACCEL_SCENARIO_ID) return 'axl:unconfigured';

  const contactData = { email: lead.email };
  if (lead.firstName) contactData.firstName = lead.firstName;
  if (lead.phone) contactData.phone = lead.phone;
  if (lead.ip) contactData.IP_Address = lead.ip;
  // TCPA record. AC used to hold this in SMS_CONSENT_FIELD_ID and the Twilio
  // scheduler gated on it; with AC out of the path it has to live in AXL or the
  // consent proof is simply lost. Timestamped on consent, empty otherwise.
  contactData.SMS_Consent = lead.consent ? new Date().toISOString() : '';
  // Attribution. The working AXL scenario maps `comment` to the registration's
  // utm_source, so that is where traffic source has to go — AXL has no separate
  // utm field on the whitelist. funnel-build's shared.js posts utm_source and
  // `source` (the originating page) alongside the lead; prefer an explicit
  // comment, then utm_source, then the page name.
  // funnel-build posts both: utm_source (traffic) and source (which form fired,
  // "optin" vs "application"). Keeping both is what lets a lead be traced to the
  // page that produced it, so they are joined rather than one winning.
  const attribution =
    lead.comment || [lead.utm_source, lead.source].filter(Boolean).join(' | ');
  if (attribution) contactData.comment = attribution;

  // Pass-through fields the worker whitelists; only sent when the page supplies them.
  for (const k of ['timezoneId', 'Last_Webinar_Registered', 'webinarjam_url']) {
    if (lead[k]) contactData[k] = lead[k];
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-Proxy-Key': env.ACCEL_PROXY_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenarioId: env.ACCEL_SCENARIO_ID,
      contactData,
      data: lead.product ? { product: lead.product } : {},
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    // The proxy's error codes are the whole diagnosis: not_found = wrong URL,
    // unauthorized = key mismatch, scenario_not_allowed = id not whitelisted.
    const detail = await res.text().catch(() => '');
    throw new Error('axl ' + res.status + ' ' + detail.slice(0, 200));
  }
  return 'axl:ok';
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

  const lead = {
    email,
    firstName: name.split(/\s+/)[0] || '',
    phone,
    consent,
    ip: request.headers.get('CF-Connecting-IP') || '',
    timezoneId: d.timezoneId,
    Last_Webinar_Registered: d.Last_Webinar_Registered,
    webinarjam_url: d.webinarjam_url,
    comment: d.comment,
    utm_source: d.utm_source,
    source: d.source,
    product: d.product,
  };

  let report;
  try {
    report = await axl(env, lead);
    console.log('optin ' + email + ' -> ' + report);
  } catch (e) {
    report = 'axl:FAIL ' + e.message;
    console.error('optin ' + email + ' -> ' + report);
  }

  // Always 200 so the beacon never retries, but the body states what actually
  // happened. A silent 200 is how every vsl-b opt-in got dropped unnoticed.
  return new Response(report, { status: 200 });
}
