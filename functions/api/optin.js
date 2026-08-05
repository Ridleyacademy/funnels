// Opt-in → AXL (Accel) bridge (variant B's front door).
// funnel.js posts {name, phone, email, consent} here on opt-in submit; this
// registers the lead in AXL through the accel-proxy worker, which holds the
// Accel bearer token so it never ships to the browser.
//
// AXL is the system of record. ActiveCampaign is deliberately NOT written here:
// per Chris on 2026-08-04, registration goes through AXL only. Bookings still
// reach AC via Calendly's native integration; that path is untouched by this file.
//
// The proxy URL and the scenario id are not secrets — the URL is a public
// endpoint that refuses anything without a key, and the scenario id is already
// in the worker's ALLOWED_SCENARIOS in plain text. They are defaulted here so
// this works with nothing configured, and an env var still wins if either ever
// needs to change without a deploy.
//
// ACCEL_PROXY_KEY is the one real secret and has no default. This repo is
// public, so it cannot be committed. Set it on the Pages project and it will
// pick it up; until then the handler says so instead of failing quietly.
const DEFAULT_PROXY_URL = 'https://accel-proxy.system-2f6.workers.dev/api/run';
// AXL scenario "Outside Registration", confirmed by name against the AXL API.
const DEFAULT_SCENARIO_ID = 'INRywfcMbUS2YYjGpjuyEQ';

// The quiz, in the order the visitor answers it. apply.html posts these as q1..q13
// (multi-selects already flattened to comma strings), and the team wants them on
// the contact so they can read the lead before they dial.
//
// Each entry maps a posted key to the label used in the readable dump and to an
// AXL field name. The worker forwards anything Quiz_-prefixed, so adding a field
// in AXL and adding a line here is the whole job — no worker change needed.
const QUIZ = [
  ['q1',  'Play real music',  'Quiz_Play_Music'],
  ['q2',  'Move forward',     'Quiz_Move_Forward'],
  ['q3',  'Age',              'Quiz_Age'],
  ['q4',  'I want to',        'Quiz_Want_To'],
  ['q5',  "I can't seem to",  'Quiz_Cant_Seem_To'],
  ['q6',  'Afraid of',        'Quiz_Afraid_Of'],
  ['q7',  'Tried',            'Quiz_Tried'],
  ['q10', 'Ready to invest',  'Quiz_Investment'],
  ['q11', 'Committed',        'Quiz_Commitment'],
  ['q13', 'Will show up',     'Quiz_Will_Attend'],
];

// Registers the lead in AXL via the accel-proxy worker. Server-to-server, so the
// proxy key never reaches the browser and the worker's lack of CORS headers is
// irrelevant (a browser-side call would die on the OPTIONS preflight).
async function axl(env, lead) {
  const url = env.ACCEL_PROXY_URL || DEFAULT_PROXY_URL;
  const scenarioId = env.ACCEL_SCENARIO_ID || DEFAULT_SCENARIO_ID;
  if (!env.ACCEL_PROXY_KEY) {
    // Diagnostic: names only, never values. JSON.stringify makes a name with a
    // stray space or invisible character show itself in quotes. This tells us
    // which project/environment the runtime is actually reading when the key
    // "exists in the dashboard" but not here.
    let names = [];
    try { names = Object.keys(env).sort(); } catch (e) {}
    return 'axl:no_proxy_key visible_env=' + JSON.stringify(names);
  }

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

  // Quiz answers, both ways: one field per answer for anything the team wants to
  // segment on, and a single readable dump for call prep. Only fields that
  // actually exist in AXL will stick, so sending both costs nothing and means
  // creating a field there is the only step to switch one on.
  const readable = [];
  for (const [key, label, field] of QUIZ) {
    const v = lead.quiz && lead.quiz[key];
    if (!v) continue;
    contactData[field] = v;
    readable.push(label + ': ' + v);
  }
  if (lead.route) {
    contactData.Quiz_Route = lead.route;
    readable.push('Route: ' + lead.route);
  }
  if (readable.length) contactData.Quiz_Answers = readable.join('\n');

  // State tags, confirmed against Scenario.Run's contract (tags is an array of
  // tag NAMES; unknown names are created on the fly). "VSL quiz completed"
  // without "VSL booked call" is the abandon list — the whole reason to capture
  // before Calendly. Tagged on the call itself rather than via the scenario's
  // comment-substring conditions, which our traffic doesn't cleanly fit.
  if (readable.length) {
    contactData.tags = ['VSL quiz completed'];
    if (lead.route === 'dq') contactData.tags.push('VSL quiz disqualified');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-Proxy-Key': env.ACCEL_PROXY_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenarioId,
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
    route: typeof d.route === 'string' ? d.route.slice(0, 40) : '',
    // apply.html posts answers as top-level q1..q13 alongside everything else.
    quiz: d,
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
