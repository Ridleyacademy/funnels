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
const DEFAULT_SCENARIO_ID = 'h7YOCA0HikKRerkqkXgoOA';

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
  // Added 2026-08-06 with apply.html's budget gate: their answer once the gate names
  // the floor (can / later / no). Needs Quiz_Budget_Gate created in AXL before it
  // sticks to the contact; until then it still rides in the readable dump.
  ['qbudget', 'Budget gate',    'Quiz_Budget_Gate'],
  ['q11', 'Committed',        'Quiz_Commitment'],
  ['q13', 'Will show up',     'Quiz_Will_Attend'],
];

// Registers the lead in AXL via the accel-proxy worker. Server-to-server, so the
// proxy key never reaches the browser and the worker's lack of CORS headers is
// irrelevant (a browser-side call would die on the OPTIONS preflight).
// Dashboard-pasted variable names arrive with invisible whitespace more often
// than anyone would like — this exact handler once sat dead for an evening
// because the secret was saved as " ACCEL_PROXY_KEY" with a leading space.
// Exact name wins; otherwise any name that trims to a match counts.
function envVar(env, name) {
  if (env[name]) return env[name];
  try {
    const k = Object.keys(env).find((x) => x.trim() === name);
    return k ? env[k] : undefined;
  } catch (e) {
    return undefined;
  }
}

// Which apply.html cohort this lead belongs to, as tag NAMES. One function so the AXL
// write and the AC write can never drift apart. Order matters only for readability.
//
// The four cohorts, and why they are separate:
//   Not Ready       - said No on Q1/Q2 and left an email. Wants nothing pushed at them.
//   Budget Below    - the budget gate's "out of reach". The $27 course is the offer here,
//                     never another call invitation.
//   Budget Deferred - "not right now, but I still want the call". Booked, DQ calendar.
//                     A real lead on a longer clock, not a dead one.
//   Budget Cleared  - said they could reach the floor after all. Qualified, and the closer
//                     should know the low bracket was answered and then revised.
// What the budget gate's three codes mean, in the words the closer needs. The floor
// the applicant was shown is $3,000 (PROGRAM_FLOOR in apply.html), so "reach the floor"
// here means that number and nothing else.
const QBUDGET_LABELS = {
  can: 'Could reach $3,000 after all',
  later: 'Not right now, still wanted the call',
  no: 'Out of reach today',
};

const COHORT_TAGS = {
  notReady: 'VSL Application - Not Ready',
  budgetBelow: 'VSL Application - Budget Below',
  budgetDeferred: 'VSL Application - Budget Deferred',
  budgetCleared: 'VSL Application - Budget Cleared',
};

function cohortTags(lead) {
  const out = [];
  // The soft landing fires from Q1/Q2 and from the budget gate. Only the first is
  // "not ready"; the budget path gets its own tag below instead.
  if (lead.source === 'application-dq' && lead.dqTrigger !== 'budget') {
    out.push(COHORT_TAGS.notReady);
  }
  if (lead.qbudget === 'no') out.push(COHORT_TAGS.budgetBelow);
  else if (lead.qbudget === 'later') out.push(COHORT_TAGS.budgetDeferred);
  else if (lead.qbudget === 'can') out.push(COHORT_TAGS.budgetCleared);
  return out;
}

async function axl(env, lead) {
  const url = envVar(env, 'ACCEL_PROXY_URL') || DEFAULT_PROXY_URL;
  const scenarioId = envVar(env, 'ACCEL_SCENARIO_ID') || DEFAULT_SCENARIO_ID;
  const proxyKey = envVar(env, 'ACCEL_PROXY_KEY');
  if (!proxyKey) {
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
    const raw = lead.quiz && lead.quiz[key];
    if (!raw) continue;
    // Every other answer is already the sentence the applicant read. The budget gate
    // posts a three-letter code, so it gets translated here rather than leaving
    // "no" sitting on a contact card for the closer to guess at.
    const v = key === 'qbudget' ? QBUDGET_LABELS[raw] || raw : raw;
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
    // Cohort tags, added 2026-08-06 with the apply.html soft landing and budget gate.
    // Names mirror the AC tags below one for one, so a segment built on either side
    // means the same thing. AXL creates an unknown tag name on the fly.
    for (const name of cohortTags(lead)) contactData.tags.push(name);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-Proxy-Key': proxyKey, 'Content-Type': 'application/json' },
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

// Mirror the opt-in into ActiveCampaign as a tag, so the nurture side of the
// funnel has something to trigger on. AXL stays the system of record: this
// writes a contact and a tag, nothing else.
//
// Why this exists: bookings reach AC (Calendly writes `consultation-booked` and
// `VSL Booked a Call`), but since the 2026-08-04 AXL cutover nothing told AC an
// opt-in had happened. So AC knew who booked and had no idea who didn't, and
// automation 599 (Front Gate Nurture - Opt-in No Booking) had no trigger.
//
// Failures here are swallowed on purpose. AXL is the record; if AC is down or
// misconfigured, the lead must still register. The return string says which
// half worked so `curl` on /api/optin remains the diagnosis.
async function ac(env, lead) {
  const base = envVar(env, 'AC_URL');
  const key = envVar(env, 'AC_KEY');
  if (!base || !key) return 'ac:skipped_no_config';

  const root = base.replace(/\/+$/, '');
  const headers = { 'Api-Token': key, 'Content-Type': 'application/json' };

  // contact/sync upserts on email, so a repeat opt-in updates rather than dupes.
  // Singular `contact`, not `contacts`: the plural path is the list endpoint and
  // 404s on POST, which would silently cost every lead its AC tag.
  const sync = await fetch(root + '/api/3/contact/sync', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      contact: {
        email: lead.email,
        firstName: lead.firstName || '',
        phone: lead.phone || '',
      },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!sync.ok) return 'ac:sync_' + sync.status;

  const contactId = ((await sync.json().catch(() => ({}))).contact || {}).id;
  if (!contactId) return 'ac:no_contact_id';

  // Tag ids, not names: AC's contactTags endpoint takes an id. These are the
  // live ids in creatorsecretsads, checked 2026-08-06. `VSL Opt-in` is what
  // automation 599 triggers on; the quiz tags mirror the AXL ones so the same
  // segmentation is available on both sides.
  // 642-645 created 2026-08-06, ids read back from the API at creation. Their names are
  // COHORT_TAGS above, character for character, so the AXL and AC sides stay one taxonomy.
  const TAGS = {
    optin: 634, quizDone: 640, quizDq: 641,
    'VSL Application - Not Ready': 642,
    'VSL Application - Budget Below': 643,
    'VSL Application - Budget Deferred': 644,
    'VSL Application - Budget Cleared': 645,
  };
  const wanted = [TAGS.optin];
  // 641 is a suppression signal as well as a label: it takes them out of the Front Gate
  // Nurture (599), which exists to push a booking. Someone who just declined a call
  // should not receive it, so every dq route keeps this tag.
  if (lead.route === 'dq') wanted.push(TAGS.quizDq);
  else if (lead.quizAnswered) wanted.push(TAGS.quizDone);
  for (const name of cohortTags(lead)) {
    if (TAGS[name]) wanted.push(TAGS[name]);
  }

  const results = [];
  for (const tagId of wanted) {
    const r = await fetch(root + '/api/3/contactTags', {
      method: 'POST',
      headers,
      body: JSON.stringify({ contactTag: { contact: contactId, tag: tagId } }),
      signal: AbortSignal.timeout(10000),
    });
    results.push(tagId + ':' + (r.ok ? 'ok' : r.status));
  }
  return 'ac:' + results.join(',');
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
    // apply.html cohort signals. dq_trigger says which answer opened the soft landing
    // ('q1' | 'q2' | 'budget'); qbudget is the budget gate's answer ('can'|'later'|'no').
    // Both are read by cohortTags() and neither is ever trusted beyond an exact match.
    dqTrigger: typeof d.dq_trigger === 'string' ? d.dq_trigger.slice(0, 20) : '',
    qbudget: typeof d.qbudget === 'string' ? d.qbudget.slice(0, 20) : '',
    // apply.html posts answers as top-level q1..q13 alongside everything else.
    quiz: d,
  };
  lead.quizAnswered = QUIZ.some(([key]) => d[key]);

  let report;
  try {
    report = await axl(env, lead);
    console.log('optin ' + email + ' -> ' + report);
  } catch (e) {
    report = 'axl:FAIL ' + e.message;
    console.error('optin ' + email + ' -> ' + report);
  }

  // Second write, after AXL and never in front of it. A dead AC must not cost
  // us the registration, so this only ever appends to the report.
  let acReport;
  try {
    acReport = await ac(env, lead);
  } catch (e) {
    acReport = 'ac:FAIL ' + e.message;
  }
  console.log('optin ' + email + ' -> ' + acReport);
  report = report + ' ' + acReport;

  // Always 200 so the beacon never retries, but the body states what actually
  // happened. A silent 200 is how every vsl-b opt-in got dropped unnoticed.
  return new Response(report, { status: 200 });
}
