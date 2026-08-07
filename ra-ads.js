/* ============================================================================
   RA-ADS (vsl-b): Google Ads measurement for vsl-b.ridleyacademy.team
   Ported 8/7 from the funnels build. Account AW-631436705.

   WHAT IS DIFFERENT HERE, AND WHY.

   The funnels file fires ONE conversion, a booked call, and its comments argue
   that form starts are noise that would "train the bidder toward the wrong
   person" at a $3,000 price point. That was correct for funnels, which is a
   call funnel.

   vsl-b is not being run as a call funnel. The 8/7 decision was to judge this
   arm on COST PER LEAD, because Ridley's own numbers say the email list closes
   2 to 2.5x paid traffic (3.03%/1.66% list vs 0.78%/0.65% Facebook) while paid
   traffic to a call was 0.87x to 1.27x, i.e. marginal at best. So on this arm
   the door opt-in IS the thing worth bidding on, and the booked call is the
   secondary that tells us whether the lead was any good.

   Two conversions, therefore:
     DOOR_OPTIN  primary   - fires when the door is submitted
     CALL_BOOKED secondary - fires on Calendly event_scheduled

   Both are guarded: an unset placeholder label sends nothing at all rather
   than sending a malformed send_to. See CONVERSIONS below.
   ========================================================================= */
(function () {
  'use strict';

  var AW           = 'AW-631436705';
  var CLICK_COOKIE = 'ra_gads_click';
  var CLICK_DAYS   = 90;
  var LEAD_KEY     = 'ridley_lead_v1';
  var CLICK_KEYS   = ['gclid', 'gbraid', 'wbraid'];

  /* The conversion labels.

     CALL_BOOKED is the live funnels label and is correct as-is: a conversion
     action is account-level, not site-level, so the same action can be fired
     from both arms and segmented by campaign.

     DOOR_OPTIN has to be CREATED in the Google Ads UI first (Goals >
     Conversions > New conversion action > Website > Manual). Paste its label
     here in the form 'AW-631436705/xxxxxxxxxxxxxxxxx'. Until then it stays as
     the placeholder below and nothing is sent, which is deliberate: a
     malformed send_to still counts as a fired tag in some reporting paths and
     would put a phantom number in front of a bidding decision. Silence is the
     safer failure. */
  var PLACEHOLDER = 'PASTE_DOOR_OPTIN_LABEL_HERE';
  var CONVERSIONS = {
    doorOptin:  'PASTE_DOOR_OPTIN_LABEL_HERE',
    callBooked: 'AW-631436705/qmmVCLfcqt0cEKHri60C'
  };

  function ready(label) {
    return typeof label === 'string' && label.indexOf(PLACEHOLDER) === -1 && label.indexOf('/') > 0;
  }

  function gtag() { window.dataLayer = window.dataLayer || []; window.dataLayer.push(arguments); }

  function qp() {
    try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); }
  }

  /* ---- click id capture (identical to funnels) --------------------------- */
  function cookieDomain() {
    var h = location.hostname;
    return /(^|\.)ridleyacademy\.team$/.test(h) ? '; Domain=.ridleyacademy.team' : '';
  }
  function readCookie(name) {
    var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    if (!m) return '';
    try { return decodeURIComponent(m[2]); } catch (e) { return ''; }
  }
  function writeCookie(name, value) {
    try {
      document.cookie = name + '=' + encodeURIComponent(value)
        + '; Max-Age=' + (CLICK_DAYS * 86400)
        + '; Path=/' + cookieDomain() + '; SameSite=Lax'
        + (location.protocol === 'https:' ? '; Secure' : '');
    } catch (e) {}
  }

  var click = null;
  function captureClick() {
    var p = qp();
    for (var i = 0; i < CLICK_KEYS.length; i++) {
      var k = CLICK_KEYS[i], v = p.get(k);
      if (v) {
        click = { key: k, value: v, ts: Date.now() };
        writeCookie(CLICK_COOKIE, JSON.stringify(click));
        return click;
      }
    }
    var raw = readCookie(CLICK_COOKIE);
    if (raw) {
      try {
        var saved = JSON.parse(raw);
        if (saved && saved.value) { click = saved; writeCookie(CLICK_COOKIE, raw); }
      } catch (e) {}
    }
    return click;
  }

  /* Carried into Calendly so the click id lands on the booking record, which is
     what makes a later offline upload of real sales outcomes possible. */
  function calendlyParams() {
    if (!click || !click.value) return '';
    return '&salesforce_uuid=' + encodeURIComponent(click.key + ':' + click.value);
  }

  /* ---- enhanced conversions ---------------------------------------------
     On this arm the email is known EARLIER and more reliably than on funnels:
     the door collects it before the video plays, so by the time any conversion
     fires we already hold the address the visitor typed. Hashed here rather
     than sent raw. */
  function normalizeEmail(raw) { return String(raw || '').trim().toLowerCase(); }
  function knownEmail() {
    var p = qp().get('email');
    if (p) return normalizeEmail(p);
    try {
      var lead = JSON.parse(localStorage.getItem(LEAD_KEY) || '{}') || {};
      if (lead.email) return normalizeEmail(lead.email);
    } catch (e) {}
    return '';
  }
  function sha256Hex(text) {
    try {
      if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) return null;
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
        .then(function (buf) {
          var b = new Uint8Array(buf), out = '';
          for (var i = 0; i < b.length; i++) out += b[i].toString(16).padStart(2, '0');
          return out;
        });
    } catch (e) { return null; }
  }
  var identified = '';
  function identify(email) {
    email = normalizeEmail(email);
    if (!email || email.indexOf('@') < 1 || email === identified) return;
    var p = sha256Hex(email);
    if (!p) return;
    p.then(function (hash) {
      identified = email;
      gtag('set', 'user_data', { sha256_email_address: hash });
    }).catch(function () {});
  }

  /* ---- the door opt-in conversion ----------------------------------------
     Observed off the dataLayer rather than wired into the door's submit
     handler. The door already pushes `rdly_optin` there, once per email, and
     deliberately pushes `rdly_optin_repeat` instead for someone who has opted
     in before. Reading that signal means the dedupe logic lives in exactly one
     place and this file cannot drift from it: if the door stops counting a
     visitor as new, the conversion stops too, automatically.

     No value or currency, for the same reason as funnels: a value on the tag
     overrides the conversion action's own default, so the number lives in the
     Google Ads UI and stays a UI edit rather than a site deploy. */
  var optinSent = false;
  function onOptin() {
    if (optinSent) return;
    optinSent = true;
    identify(knownEmail());
    if (!ready(CONVERSIONS.doorOptin)) return;   /* label not created yet */
    gtag('event', 'conversion', { 'send_to': CONVERSIONS.doorOptin });
  }

  function watchDataLayer() {
    window.dataLayer = window.dataLayer || [];
    /* Anything already queued before this file ran. */
    try {
      for (var i = 0; i < window.dataLayer.length; i++) {
        var e = window.dataLayer[i];
        if (e && e.event === 'rdly_optin') { onOptin(); break; }
      }
    } catch (e) {}
    var push = window.dataLayer.push;
    window.dataLayer.push = function () {
      try {
        for (var i = 0; i < arguments.length; i++) {
          var a = arguments[i];
          if (a && a.event === 'rdly_optin') onOptin();
        }
      } catch (e) {}
      return push.apply(this, arguments);
    };
  }

  /* ---- the booked-call conversion ---------------------------------------- */
  var bookedSent = false;
  function onMessage(e) {
    if (!e || typeof e.origin !== 'string' || e.origin.indexOf('calendly.com') === -1) return;
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.event !== 'calendly.event_scheduled') return;
    if (bookedSent) return;
    bookedSent = true;
    if (!ready(CONVERSIONS.callBooked)) return;
    gtag('event', 'conversion', { 'send_to': CONVERSIONS.callBooked });
  }

  captureClick();
  identify(knownEmail());
  watchDataLayer();
  window.addEventListener('message', onMessage, false);

  window.RAAds = {
    click: function () { return click; },
    calendlyParams: calendlyParams,
    /* Exposed so a deploy can be checked from the console without opting in:
       RAAds.status() should show doorOptin:false until the label is pasted. */
    status: function () {
      return {
        account: AW,
        doorOptinReady: ready(CONVERSIONS.doorOptin),
        callBookedReady: ready(CONVERSIONS.callBooked),
        clickId: click ? click.key : null,
        emailKnown: !!knownEmail()
      };
    }
  };
})();
