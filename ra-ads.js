/* ============================================================================
   RA-ADS: Google Ads measurement for funnels.ridleyacademy.team
   Built 8/6. Account AW-631436705.

   The base gtag snippet is inline in the <head> of every page, as high as it
   goes, so the tag is live before this file lands. This file is everything
   that happens after that, and it is deliberately the only place any of it
   lives, so there is one file to read when a number looks wrong.

   THE ONE CONVERSION
   A completed Calendly booking. That is the whole list. The offer is a $3,000+
   programme sold on a consultation call, so a booked call is the only web event
   worth bidding on: page views, video plays and form starts are all noise at
   this price point and would train the bidder toward the wrong person.

   NOTHING FIRES ON PAGE LOAD. The conversion is sent from a Calendly
   `event_scheduled` postMessage and from nowhere else.

   WHY THE CLICK ID IS STORED (task 4, and it matters more than it looks)
   A booked call is not a customer. Roughly a third of booked calls show up and
   a fraction of those buy, and Google cannot tell the difference unless we tell
   it. Parking gclid in a first-party cookie and forwarding it into the booking
   record is what makes that later upload possible: once the click ID is sitting
   on the Calendly event, sales outcomes can be pushed back to Google Ads as
   offline conversions and Smart Bidding starts optimising toward people who buy
   instead of people who book and vanish.

   The click ID rides into Calendly as `salesforce_uuid`, not as utm_content.
   Two reasons. utm_content already carries ad-level attribution on this funnel
   and overwriting it would corrupt the Meta and Google reporting that is
   already running. And Calendly's own behaviour favours it: salesforce_uuid is
   preserved through the booking flow while utm_* parameters are documented as
   strippable. It is a generic 255-char identifier field, which is exactly what
   a gclid is.
   ========================================================================= */
(function () {
  'use strict';

  var AW           = 'AW-631436705';
  var CONVERSION   = 'AW-631436705/qmmVCLfcqt0cEKHri60C';  /* Call Booked */
  var CLICK_COOKIE = 'ra_gads_click';
  var CLICK_DAYS   = 90;
  var LEAD_KEY     = 'ridley_lead_v1';   /* written by shared.js / the opt-in door */
  var CLICK_KEYS   = ['gclid', 'gbraid', 'wbraid'];

  function gtag() { window.dataLayer = window.dataLayer || []; window.dataLayer.push(arguments); }

  function qp() {
    try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); }
  }

  /* ---- cookie plumbing ---------------------------------------------------
     Host-only on anything that is not the real domain (preview builds, local
     testing) so a failed Domain= attribute cannot silently drop the write.
     On the real domain the cookie is set at the registrable domain so a click
     that lands on one arm and books on another still carries its click ID. */
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
        + '; Path=/'
        + cookieDomain()
        + '; SameSite=Lax'
        + (location.protocol === 'https:' ? '; Secure' : '');
    } catch (e) {}
  }

  /* ---- task 4: capture gclid / gbraid / wbraid ---------------------------
     Runs on every page load. A click ID in the URL always wins and refreshes
     the 90 days; otherwise whatever is already banked stands, so a visitor who
     lands on an ad, wanders the site and books three days later still books
     with the click ID that paid for them attached. */
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
        if (saved && saved.value) {
          click = saved;
          /* Re-stamp so the 90 days runs from the last visit, not the first. */
          writeCookie(CLICK_COOKIE, raw);
        }
      } catch (e) {}
    }
    return click;
  }

  /* What Calendly should carry so the click ID lands in the booking record.
     Returned as a query fragment because every embed builder on this site
     assembles its URL by string concatenation. */
  function calendlyParams() {
    if (!click || !click.value) return '';
    return '&salesforce_uuid=' + encodeURIComponent(click.key + ':' + click.value);
  }

  /* ---- task 5: enhanced conversions --------------------------------------
     Calendly's postMessage does NOT hand back the invitee's email. The
     documented payload is URIs only (payload.invitee.uri, payload.event.uri),
     so there is no way to read what the visitor typed into the Calendly form
     from the parent page: it is a cross-origin iframe.

     What we use instead is the email we already hold and already prefilled the
     Calendly form with. On this funnel the booking page is reached from
     apply.html or the opt-in door, both of which write `ridley_lead_v1`, and
     shared.js pushes that same address into the embed as the `email` prefill.
     So in the normal path this is the identical address that ends up on the
     booking, and it is known at page load rather than at booking time, which
     means the hash is ready long before the conversion needs it.

     It is hashed here rather than sent raw. Google accepts either, and will
     hash a raw address itself, but there is no reason to put a plaintext email
     on the wire when SHA-256 is three lines.

     Where this is imperfect: a visitor who books with a different address than
     the one they opted in with is matched on the opt-in address. The fix is
     server side, and it is the same fix as the offline upload: resolve
     payload.invitee.uri against the Calendly API to read the true invitee
     email. That needs a token in a Worker, so it is deliberately not done here. */
  function normalizeEmail(raw) {
    return String(raw || '').trim().toLowerCase();
  }
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
    /* Only meaningful if it looks like an address, and only once per address. */
    if (!email || email.indexOf('@') < 1 || email === identified) return;
    var p = sha256Hex(email);
    if (!p) return;
    p.then(function (hash) {
      identified = email;
      gtag('set', 'user_data', { sha256_email_address: hash });
    }).catch(function () {});
  }

  /* ---- task 3: the conversion --------------------------------------------
     Registered from the <head>, which puts it ahead of the listener in
     shared.js that fires the Meta Schedule event and then sends the visitor to
     booked.html 400ms later. Ordering is the point: this handler runs first, so
     the conversion request is already in flight before that timer starts.

     `sent` makes it once-per-page. Calendly normally posts event_scheduled a
     single time, but a duplicated message must never become a duplicated
     conversion: this account is being rebuilt precisely because its numbers
     could not be trusted. */
  var sent = false;
  function onMessage(e) {
    if (!e || typeof e.origin !== 'string' || e.origin.indexOf('calendly.com') === -1) return;
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.event !== 'calendly.event_scheduled') return;
    if (sent) return;
    sent = true;

    /* No value or currency sent on purpose. A value on the tag OVERRIDES the
       conversion action's own default, so hardcoding 1.0 here would silently
       cancel out the real per-booking value set in the Google Ads UI and keep
       reporting every booked call as worth a dollar. Leaving it off means the
       value lives in exactly one place, the conversion action, and changing it
       is a UI edit rather than a site deploy. */
    gtag('event', 'conversion', {
      'send_to': CONVERSION
    });
  }

  captureClick();
  identify(knownEmail());
  window.addEventListener('message', onMessage);

  /* shared.js and the other arms' embed builders read these. */
  window.RA_ADS = {
    click: function () { return click; },
    calendlyParams: calendlyParams,
    identify: identify,
    conversionId: AW
  };
})();
