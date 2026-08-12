/* ============================================================
   RIDLEY ACADEMY : WEBINAR FUNNEL — ONE CONFIG FOR THE WHOLE FLOW

   Every dated, priced or linked thing in this funnel reads from
   this file. register, confirm, delivery, apply and replay all
   load it. Set it once per event and the whole funnel moves.

   Before 12 Aug the date lived inside register.html, the session
   lived inside confirm.html, the calendars lived inside apply.html
   and the expiry lived inside replay.html. Four places, four
   chances to ship a page pointing at last month's event.

   ---------- HOW TO RUN AN EVENT ----------
   1. Set startISO to the absolute instant of the broadcast, WITH
      its real UTC offset. Everything dated derives from it and
      renders in the VISITOR'S own timezone.
   2. Set joinUrl to the room link.
   3. Set the video ids once they exist.
   4. Leave everything else alone.

   ---------- FAIL-SAFE CONTRACT ----------
   Nothing here is allowed to ship a half-configured page. Every
   consumer treats an empty value as "hide this", never as "render
   an empty box":
     - startISO empty  -> date chips keep their written placeholder,
                          countdowns stay hidden, calendar buttons
                          hide rather than build dead links
     - checkoutUrl empty or offerMode !== 'checkout'
                       -> the $27 block is removed from confirm
     - video id empty  -> the facade stays a poster and no-ops
     - replay expiry unset -> the countdown strip does not render
   A missing value costs a section. A wrong value costs the event.
   ============================================================ */

window.RIDLEY_EVENT = {

  /* ---------- the broadcast ---------- */

  /* ISO 8601 WITH offset. e.g. '2026-08-19T19:00:00+01:00' (Wed 19 Aug, 7pm UK).
     Tuesday to Thursday, 6pm or 7pm in the dominant market. Never Monday.
     Null until the event is actually booked. */
  startISO: '2026-08-19T19:00:00+01:00',   /* PREVIEW: demo date, not a booked event */

  minutes: 90,
  title:   'Ridley Academy Live Masterclass with Stephen Ridley',
  details: 'Ninety minutes with Stephen Ridley. Have a keyboard nearby if you can.',

  /* the room link, e.g. the Zoom or Everwebinar join url */
  joinUrl: '',   /* PREVIEW: no room booked yet */

  /* ---------- what the webinar sells ----------
     'call'     the room ends on a booked call. apply.html is the
                endpoint, the $27 pre-sell still runs on confirm.
     'checkout' the room ends on a direct checkout. apply.html is
                not used at all.
     Do not offer both. The split option loses to book-a-call-only
     every time it has been tested.

     This governs the ROOM ENDING only. The $27 tripwire below runs
     on the confirmation page either way; the two are independent
     decisions and gating one on the other hides a working offer.

     Set to 'call': the live offer is Accelerator at $5,997, which
     is not closeable in the room at that price. */
  offerMode: 'call',

  /* ---------- the $27 pre-sell on confirm.html ----------
     ThriveCart product 1168: $27 + $37 bump + $97 and $197 upsells.
     Built and never switched on. Paste the live cart url here and
     the block appears; leave it empty and the block is removed.
     Julian holds ThriveCart. */
  checkoutUrl: '',
  deliveryUrl: 'delivery.html',

  /* Where the "start playing" buttons on delivery.html point.
     Empty is the normal state: the four lessons live on the delivery
     page itself, and the buttons scroll to them. Set this only if the
     course moves to its own platform, and every CTA follows it. */
  courseUrl: '',

  /* ---------- booking ----------
     Free Piano Consultation, pooled round-robin, 30 min.
     Verified live 4 Aug in AUDIT-BOOKING-LINKS.md. The old
     d3xy-58j-rxw link that used to sit in apply.html is stale.

     A, B and C are the three routing bands. They are the same
     calendar until there is enough volume to justify banding
     (see ROUTING_MODE in apply.html). R is the disqualified
     re-route, which goes to the mini course, not to a rejection. */
  calendars: {
    A: 'https://calendly.com/d/dv25-nhh-w9v/free-piano-consultation?hide_gdpr_banner=1',
    B: 'https://calendly.com/d/dv25-nhh-w9v/free-piano-consultation?hide_gdpr_banner=1',
    C: 'https://calendly.com/d/dv25-nhh-w9v/free-piano-consultation?hide_gdpr_banner=1'
  },

  /* ---------- video ----------
     YouTube ids, or a full embed url for a different host.
     Empty ids leave the poster facade in place and no-op on click,
     so the page is safe to ship before the shoot. */
  videos: {
    primary:  '',          /* confirm: who Stephen is, on our terms */
    breakouts: ['', '', '', '', ''],
    delivery: ['', '', '', ''],   /* the four chord lessons */
    replay:   ''
  },

  /* ---------- replay window ----------
     Hours after the broadcast ENDS that replay.html stays open.
     Derived from startISO so it can never point at a past event.
     expiresISO below overrides it when the server sets a real one,
     which is the only way the deadline actually means anything:
     client-side expiry is a courtesy, not a gate. */
  replayHours: 72,
  expiresISO:  ''
};

/* ============================================================
   Derived helpers. Pure reads, no DOM. Every page uses these
   rather than re-parsing the ISO string itself.
   ============================================================ */
window.RIDLEY_EVENT.start = function(){
  if (!this.startISO) return null;
  var d = new Date(this.startISO);
  return isNaN(d) ? null : d;
};

window.RIDLEY_EVENT.end = function(){
  var s = this.start();
  return s ? new Date(s.getTime() + (this.minutes || 90) * 60000) : null;
};

/* server-set expiry wins; otherwise end of broadcast + replayHours */
window.RIDLEY_EVENT.replayExpiry = function(){
  if (this.expiresISO){
    var x = new Date(this.expiresISO);
    if (!isNaN(x)) return x;
  }
  var e = this.end();
  return e ? new Date(e.getTime() + (this.replayHours || 72) * 3600000) : null;
};

/* the $27 block only renders when there is a real cart behind it */
window.RIDLEY_EVENT.hasCheckout = function(){
  return !!(this.checkoutUrl && this.checkoutUrl.indexOf('http') === 0);
};

/* ============================================================
   Attribution.

   Added 12 Aug. Before this, a webinar registration POSTed name,
   email and phone and nothing else, so every registrant arrived in
   AXL with no source. That is not a reporting nicety on this
   funnel specifically: the six-year scan found YouTube-sourced
   registrants close at roughly 1.5x Facebook-sourced ones on the
   same webinar and the same offer. Without a source on the
   registration, the single most valuable split we know about is
   unmeasurable here.

   Wire format matches the live vsl-b door exactly, and that match
   is deliberate rather than stylistic. The Accel proxy joins
   `source` and `utm_source` into the AXL registration's `comment`,
   which is the ONLY attribution field on the worker's whitelist.
   Sending a wider set of fields does not get them stored, so the
   extra click ids stay in the local lead object for downstream
   pages and only utm_source rides the wire.
   ============================================================ */
window.RIDLEY_EVENT.attribution = function(){
  var out = {};
  try {
    var p = new URLSearchParams(location.search);
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','el']
      .forEach(function(k){
        var v = p.get(k);
        if (v) out[k] = v.slice(0, 80);
      });
  } catch (e) {}
  return out;
};

/* the subset the worker will actually store */
window.RIDLEY_EVENT.wireAttribution = function(){
  var a = this.attribution();
  return a.utm_source ? { utm_source: a.utm_source } : {};
};

/* ============================================================
   Shared date painting.

   Fills every [data-slot] on the page in the VISITOR'S timezone:
     date      Tuesday 19 August
     time      7:00 PM your time
     short     Tue 19 Aug
     btn-when  Tue 19 Aug at 7:00 PM   (the label inside the CTA)

   Leaves the written placeholder in place when there is no date,
   so a half-configured page never reads "undefined".
   ============================================================ */
window.RIDLEY_EVENT.paintDate = function(root){
  var when = this.start();
  if (!when) return false;
  root = root || document;

  function put(slot, txt){
    var nodes = root.querySelectorAll('[data-slot="' + slot + '"]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = txt;
  }
  function fmt(opts){
    try { return new Intl.DateTimeFormat(undefined, opts).format(when); }
    catch (e) { return null; }
  }

  var dateTxt  = fmt({ weekday:'long', day:'numeric', month:'long' });
  var timeTxt  = fmt({ hour:'numeric', minute:'2-digit' });
  var shortTxt = fmt({ weekday:'short', day:'numeric', month:'short' });
  /* "12:00 PM Mountain Daylight Time" beats "12:00 PM America/Denver".
     The IANA id is what the browser reports and nobody reads their own
     timezone that way, but this is the line a reader checks against
     their own clock. Falls back to the plain phrasing if the runtime
     will not give a named zone. */
  var zoneTxt  = fmt({ hour:'numeric', minute:'2-digit', timeZoneName:'long' });

  if (dateTxt)  put('date', dateTxt);
  if (zoneTxt)      put('time', zoneTxt);
  else if (timeTxt) put('time', timeTxt + ' your time');
  if (shortTxt) put('short', shortTxt);
  /* Date inside the button: the commitment is made at the click,
     not read passively further up the page. */
  if (shortTxt && timeTxt) put('btn-when', shortTxt + ' at ' + timeTxt);
  return true;
};

/* ============================================================
   Shared countdown. Drives any element containing [data-cd="d|h|m|s"].
   Hidden until there is a real future target, so a misconfigured
   page never shows "00 00 00 00".
   ============================================================ */
window.RIDLEY_EVENT.countdown = function(el, target){
  if (!el || !target) return;
  var out = {};
  ['d','h','m','s'].forEach(function(k){ out[k] = el.querySelector('[data-cd="' + k + '"]'); });
  if (!out.d || !out.h || !out.m || !out.s) return;

  var pad = function(n){ return n < 10 ? '0' + n : '' + n; };
  var timer;

  function tick(){
    var left = target.getTime() - Date.now();
    if (left <= 0){ el.hidden = true; clearInterval(timer); return; }
    var s = Math.floor(left / 1000);
    out.d.textContent = pad(Math.floor(s / 86400));
    out.h.textContent = pad(Math.floor(s % 86400 / 3600));
    out.m.textContent = pad(Math.floor(s % 3600 / 60));
    out.s.textContent = pad(s % 60);
  }

  tick();
  if (target.getTime() > Date.now()) el.hidden = false;
  timer = setInterval(tick, 1000);
};
