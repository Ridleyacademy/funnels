// Opt-in → AXL (Accel) bridge (variant B's front door).
//
// COPY OF THE FUNNELS HANDLER, deliberately byte-identical apart from this note.
// The funnels version is the one proven live end to end (2026-08-05), so vsl-b
// gets that file rather than the older AC-only handler in ~/riddley/ship-vsl-b,
// which predates the 2026-08-04 cutover and would write the wrong system.
// Keeping the two identical means a fix on either arm is a straight copy and the
// arms can never quietly diverge in what they record.
//
// The apply.html paths below (QUIZ, cohortTags, the budget gate) are inert here:
// they key off q1..q13 / qbudget / dq_trigger, and the vsl-b door posts none of
// them. They are kept rather than stripped so this stays a copy, not a fork.
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

// Attribution, payload key -> AXL field (21 Aug 2026, EXECUTION-LIST item 2).
// ra-attrib.js posts last touch under the plain names and first touch under
// ft_*; this maps both onto the contact so an application (and later a
// booking and an order) can finally be split by campaign, ad set, ad,
// creative, placement and device. Until today 2 of 85 applications carried
// any of this.
//
// TWO DEPLOY GATES, stated plainly:
//   1. The accel-proxy worker forwards only whitelisted names; Attribution_*
//      needs the one-line pattern added in accel-proxy/src/worker.js and that
//      worker re-pasted into the Cloudflare dashboard.
//   2. Each field must exist on the AXL contact before it sticks. Creating
//      them in the AXL UI is the whole job, same as the Quiz_ fields.
// Until both land, the compact summary appended to `comment` below carries
// the same story through the already-whitelisted channel, so nothing waits.
const ATTRIB = [
  ['utm_source',       'Attribution_Source'],
  ['utm_medium',       'Attribution_Medium'],
  ['utm_campaign',     'Attribution_Campaign'],
  ['utm_term',         'Attribution_Adset'],
  ['utm_content',      'Attribution_Ad'],
  ['utm_id',           'Attribution_Utm_Id'],
  ['campaign_id',      'Attribution_Campaign_Id'],
  ['adset_id',         'Attribution_Adset_Id'],
  ['ad_id',            'Attribution_Ad_Id'],
  ['placement',        'Attribution_Placement'],
  ['site_source_name', 'Attribution_Site_Source'],
  ['fbclid',           'Attribution_FBCLID'],
  ['gclid',            'Attribution_GCLID'],
  ['gbraid',           'Attribution_GBRAID'],
  ['wbraid',           'Attribution_WBRAID'],
  ['device',           'Attribution_Device'],
  ['lt_ts',            'Attribution_Last_Touch_At'],
  ['ft_utm_source',    'Attribution_First_Source'],
  ['ft_utm_medium',    'Attribution_First_Medium'],
  ['ft_utm_campaign',  'Attribution_First_Campaign'],
  ['ft_utm_term',      'Attribution_First_Adset'],
  ['ft_utm_content',   'Attribution_First_Ad'],
  ['ft_fbclid',        'Attribution_First_FBCLID'],
  ['ft_gclid',         'Attribution_First_GCLID'],
  ['ft_landing',       'Attribution_First_Landing'],
  ['ft_referrer',      'Attribution_First_Referrer'],
  ['ft_ts',            'Attribution_First_Touch_At'],
];

// The compact interim line for `comment`, built from the same payload. Short
// labels because comment is capped at 500 by the proxy and the scenario still
// substring-matches the head of the string; everything here APPENDS after the
// existing "utm_source | source" join and never reorders it.
function attribSummary(q) {
  const bits = [];
  if (q.utm_campaign) bits.push('c:' + q.utm_campaign);
  if (q.utm_term) bits.push('as:' + q.utm_term);
  if (q.utm_content) bits.push('ad:' + q.utm_content);
  if (q.placement) bits.push('pl:' + q.placement);
  if (q.device) bits.push('dev:' + q.device);
  if (q.ft_utm_source && q.ft_utm_source !== q.utm_source) bits.push('ft:' + q.ft_utm_source);
  if (q.ft_utm_campaign && q.ft_utm_campaign !== q.utm_campaign) bits.push('ftc:' + q.ft_utm_campaign);
  return bits.join(' | ').slice(0, 360);
}

// The rewritten money question's three answers, matched on their stable
// prefixes, each with its own tag so reporting can split "ready and able"
// from "payment plan" without parsing sentences (EXECUTION-LIST item 5: both
// Yes answers are financially capable, REPORTED AS SEPARATE LINES; every
// high-ticket order to date was paid on a plan, so payment plan is what a
// real buyer looks like, not a lesser tier).
const INVEST_TAGS = [
  [/^Yes, I am ready and able/, 'VSL Invest - Ready Full'],
  [/^Yes, with a payment plan/, 'VSL Invest - Payment Plan'],
  [/^No, that investment/,      'VSL Invest - Not Possible'],
];

function investTag(lead) {
  const answer = String((lead.quiz && lead.quiz.q10) || '');
  for (const [pattern, name] of INVEST_TAGS) {
    if (pattern.test(answer)) return name;
  }
  return null;
}

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
  // Two codes, one meaning. apply.html wrote 'can'; quiz.html writes 'ok' and says
  // so in its own comment. Only 'can' was ever mapped, so the quiz's cleared-budget
  // applicants reached the closer with a bare "ok" on the card and, worse, missed
  // the Budget Cleared tag entirely (see cohortTags). Both codes are kept: the
  // funnels arm still posts 'can'.
  can: 'Could reach $3,000 after all',
  ok: 'Could reach $3,000 after all',
  later: 'Not right now, still wanted the call',
  no: 'Out of reach today',
};

const COHORT_TAGS = {
  notReady: 'VSL Application - Not Ready',
  budgetBelow: 'VSL Application - Budget Below',
  budgetDeferred: 'VSL Application - Budget Deferred',
  budgetCleared: 'VSL Application - Budget Cleared',
};

// Not getting a calendar today, whichever exit sent them there. 'dq' is the soft
// landing (still books, tagged so the closer can tier the call); 'tripwire' is the
// hard exit, taken by the budget gate's "out of reach" and, from 19 Aug, by the
// commitment floor at 5/10.
//
// Both need the same tag. 641 is a suppression signal as much as a label: it lifts
// them out of the Front Gate Nurture (599), which exists to push a booking, and it
// is the trigger for the $27 downsell (600). Before this, 'tripwire' fell to the
// else-branch and took quizDone instead, so the people we had just steered AWAY
// from a call were the ones still being emailed to book one, and none of them ever
// reached the downsell they had just been sent to the page for.
function isDqRoute(route) {
  return route === 'dq' || route === 'tripwire';
}

// Which funnel produced this lead, as a tag NAME.
//
// This used to live ONLY in the AXL scenario "Outside Registration", which
// branched on substrings of the registration `comment`. That chain tested five
// literals — vsl-b-door, application-vslb, application, optin, quiz — so any arm
// whose source was not one of them fell through and got no source tag at all.
// It broke silently the moment this funnel shipped: `vsl-b-simple` matches none
// of the five, and `custom-time` never matched either, so those leads landed in
// AXL indistinguishable from each other.
//
// Doing it here instead means a new arm is tagged by the same commit that
// creates it, rather than by remembering to hand-edit a scenario graph. The
// scenario's own chain is left alone: it re-adds the same tag for the arms it
// already knew about, and adding a tag twice is idempotent.
//
// Ordered, first match wins, because the strings nest: "application-vslb" also
// contains "application", and "vsl-b-simple" also starts with "vsl-b".
const SOURCE_TAGS = [
  [/^vsl-b-simple/, 'VSL Source - VSL-B Simple'],
  [/^vsl-b-door/, 'VSL Source - VSL-B Door'],
  [/^application-vslb/, 'VSL Source - VSL-B Application'],
  [/^application/, 'VSL Source - Application'],
  [/^custom-time/, 'VSL Source - Custom Time'],
  [/optin/, 'VSL Source - Funnels Opt-in'],
  [/quiz/, 'VSL Source - Quiz Funnel'],
];

function sourceTag(lead) {
  const src = String(lead.source || '').trim().toLowerCase();
  if (!src) return null;
  for (const [pattern, name] of SOURCE_TAGS) {
    if (pattern.test(src)) return name;
  }
  return null;
}

function cohortTags(lead) {
  const out = [];
  // The soft landing fires from Q1/Q2 and from the budget gate. Only the first is
  // "not ready"; the budget path gets its own tag below instead.
  //
  // Matched as a pattern, not a literal. funnels posts "application-dq" and this
  // arm posts "application-vslb-dq" so the two are separable in AXL's comment
  // field; an exact match on the funnels string would silently drop the Not Ready
  // tag for every vsl-b applicant who said No on Q1 or Q2. Any future arm that
  // follows the same "application[-arm]-dq" shape is covered without a code change.
  // Two ways to know a readiness exit, because the two arms say it differently:
  //   - dq_trigger, which quiz.html posts from 19 Aug ('commitment', or 'q1' if the
  //     hard DQ there is ever restored). This is the reliable one.
  //   - the legacy "application[-arm]-dq" source shape, still posted by the funnels
  //     arm. quiz.html posts source 'quiz', so the pattern alone never matched it and
  //     no hard DQ from this funnel has ever carried a cohort tag.
  // The budget gate is excluded from both: its applicants are a money story and take
  // the Budget_* tags below instead.
  // 'invest' joined 'budget' in the exclusion on 21 Aug 2026: it is the
  // rewritten money question's "No, that investment is not currently
  // possible", a money story that takes its own VSL Invest tag (see
  // INVEST_TAGS), not a readiness one. Without this line every financial DQ
  // would be mis-shelved as Not Ready.
  if (lead.dqTrigger !== 'budget' && lead.dqTrigger !== 'invest' &&
      (lead.dqTrigger || /^application(-[a-z0-9]+)?-dq$/.test(lead.source || ''))) {
    out.push(COHORT_TAGS.notReady);
  }
  if (lead.qbudget === 'no') out.push(COHORT_TAGS.budgetBelow);
  else if (lead.qbudget === 'later') out.push(COHORT_TAGS.budgetDeferred);
  // 'ok' is quiz.html's code for what apply.html called 'can'. See QBUDGET_LABELS.
  else if (lead.qbudget === 'can' || lead.qbudget === 'ok') out.push(COHORT_TAGS.budgetCleared);
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
  let attribution =
    lead.comment || [lead.utm_source, lead.source].filter(Boolean).join(' | ');
  // The compact summary rides in comment too, appended after the head the
  // scenario substring-matches on. This is the channel that works with the
  // proxy deployed TODAY; the Attribution_* fields below are the durable one.
  const summary = attribSummary(lead.quiz || {});
  if (summary) attribution = [attribution, summary].filter(Boolean).join(' | ');
  if (attribution) contactData.comment = attribution.slice(0, 490);

  // The full attribution set as named fields. Same contract as the Quiz_
  // fields: only ones that exist in AXL stick, and the proxy must whitelist
  // the Attribution_ prefix before any of them travel (see the ATTRIB note).
  for (const [key, field] of ATTRIB) {
    const v = lead.quiz && lead.quiz[key];
    if (v !== undefined && v !== null && v !== '') contactData[field] = String(v).slice(0, 300);
  }

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
  contactData.tags = [];
  // Source first, and unconditionally: a two-field opt-in answers no quiz, so
  // gating the whole tag block on `readable.length` (as it used to) meant a plain
  // capture reached AXL with no source tag whatsoever.
  const src = sourceTag(lead);
  if (src) contactData.tags.push(src);
  if (readable.length) {
    contactData.tags.push('VSL quiz completed');
    if (isDqRoute(lead.route)) contactData.tags.push('VSL quiz disqualified');
    // Cohort tags, added 2026-08-06 with the apply.html soft landing and budget gate.
    // Names mirror the AC tags below one for one, so a segment built on either side
    // means the same thing. AXL creates an unknown tag name on the fly.
    for (const name of cohortTags(lead)) contactData.tags.push(name);
    // The money answer's own tag (21 Aug 2026). Splits "ready and able" from
    // "payment plan" from "not possible" in one filter, whatever the route did.
    const invest = investTag(lead);
    if (invest) contactData.tags.push(invest);
  }
  // An empty array would be sent as `tags: []`, which is not the same thing as
  // "this lead has no tag opinion" — drop the key so the scenario's own tagging
  // is the only writer when we genuinely have nothing to say.
  if (!contactData.tags.length) delete contactData.tags;

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

  // List subscription, and it is NOT optional. AC will not deliver an automation
  // email to a contact who is subscribed to no list: every opt-in this worker
  // created before 2026-08-16 sat with contactLists=[] and automation 601 sent
  // zero emails ever because each send attempt found no eligible recipient and
  // demoted the campaign back to Draft. Found in the 8/16 audit; the 494-contact
  // backlog was list-subscribed by hand the same day. List 1 is "RA Prospects
  // Non Buyers", the account's standing prospects list; status 1 = subscribed.
  // Re-subscribing an existing member is a no-op, so repeat opt-ins are safe.
  const listSub = await fetch(root + '/api/3/contactLists', {
    method: 'POST',
    headers,
    body: JSON.stringify({ contactList: { list: 1, contact: contactId, status: 1 } }),
    signal: AbortSignal.timeout(10000),
  });

  // Tag ids, not names: AC's contactTags endpoint takes an id. These are the
  // live ids in creatorsecretsads, checked 2026-08-06. `VSL Opt-in` is what
  // automation 599 triggers on; the quiz tags mirror the AXL ones so the same
  // segmentation is available on both sides.
  // 642-645 created 2026-08-06, ids read back from the API at creation. Their names are
  // COHORT_TAGS above, character for character, so the AXL and AC sides stay one taxonomy.
  // 646 created 2026-08-12. It is the ARM tag, and it exists because AC had no way to
  // tell the two funnel arms apart: both write the same opt-in, quiz and cohort tags,
  // and only AXL's `comment` carried the arm. AXL gets its copy from the registration
  // scenario (a `comment contains application-vslb` branch ahead of the generic
  // `application` one), so it is deliberately NOT in cohortTags() — that function is
  // the shared taxonomy, this is the one tag each system writes its own way.
  const TAGS = {
    optin: 634, quizDone: 640, quizDq: 641,
    'VSL Application - Not Ready': 642,
    'VSL Application - Budget Below': 643,
    'VSL Application - Budget Deferred': 644,
    'VSL Application - Budget Cleared': 645,
    vslbApplication: 646,
  };
  const wanted = [TAGS.optin];
  // Matched as a pattern, like cohortTags() does, so the soft-DQ arm
  // ("application-vslb-dq") is tagged as the same arm as a qualified one. The door
  // ("vsl-b-door") is deliberately not included: it is the same arm but not an
  // application, and conflating the two would break any count of applications.
  if (/^application-vslb(-dq)?$/.test(lead.source || '')) wanted.push(TAGS.vslbApplication);
  // Both dq routes take 641; see isDqRoute for what that tag actually does.
  if (isDqRoute(lead.route)) wanted.push(TAGS.quizDq);
  else if (lead.quizAnswered) wanted.push(TAGS.quizDone);
  for (const name of cohortTags(lead)) {
    if (TAGS[name]) wanted.push(TAGS[name]);
  }

  const results = ['list1:' + (listSub.ok ? 'ok' : listSub.status)];
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
