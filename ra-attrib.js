/* ============================================================================
   RA-ATTRIB (vsl-b): attribution capture and persistence for the whole journey.

   Built 21 Aug 2026 against the number that forced it: 2 of 85 applications in
   AXL carry any traffic source at all, so nothing downstream can be split by
   campaign, ad set, creative or placement. This file is the page-side half of
   the fix (EXECUTION-LIST-20260821.md item 2).

   WHAT IT DOES, on every page that loads it (index, watch, quiz):

     1. Reads the ad parameters off the current URL:
          utm_source / utm_medium / utm_campaign / utm_term / utm_content /
          utm_id, fbclid, gclid, gbraid, wbraid, placement, site_source_name,
          ad_id, adset_id, campaign_id
        Convention for Meta url_tags (set on the ads, not here):
          utm_campaign={{campaign.name}}  utm_term={{adset.name}}
          utm_content={{ad.name}}         placement={{placement}}
          campaign_id={{campaign.id}}     adset_id={{adset.id}}
          ad_id={{ad.id}}                 site_source_name={{site_source_name}}

     2. Persists TWO touches, localStorage first, cookie as the fallback for
        storage-blocked browsers:
          first touch  WRITE ONCE. Set the first time this browser is ever
                       seen, never overwritten. Records the params plus the
                       landing path, the referrer and a timestamp, so a
                       multi-visit journey keeps the ad that started it.
          last touch   Overwritten ONLY by a visit whose URL carries at least
                       one ad signal. Internal hops (door -> watch -> quiz)
                       carry no params and must not blank the paid click.

     3. Exposes what the capture pages need:
          RAAttrib.first() / RAAttrib.last()   the stored touch objects
          RAAttrib.device()                    'mobile' | 'tablet' | 'desktop'
          RAAttrib.optinFields()               flat fields for the /api/optin
                                               payload (last touch under its
                                               own names, first touch under
                                               ft_*, plus device / landing /
                                               referrer)
          RAAttrib.calendlyParams()            '&utm_source=...' etc for the
                                               embed URL, so the booking
                                               record carries the same story

   RELATION TO RA-ADS.JS: ra-ads owns the Google click id cookie and the Google
   conversions; nothing here replaces it. This file carries the full first and
   last touch into the CRM record, which ra-ads never did.

   The server half lives in functions/api/optin.js (maps these fields onto the
   AXL contact) and accel-proxy/src/worker.js (whitelists Attribution_*).
   ========================================================================= */
(function () {
  'use strict';

  var STORE_KEY   = 'ridley_attrib_v1';
  var COOKIE_NAME = 'ra_attrib';
  var COOKIE_DAYS = 90;
  var MAX_VAL_LEN = 150;

  /* Every parameter worth carrying. Order matters only for readability. */
  var AD_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'utm_id', 'fbclid', 'gclid', 'gbraid', 'wbraid',
    'placement', 'site_source_name', 'campaign_id', 'adset_id', 'ad_id'
  ];

  function q() {
    try { return new URLSearchParams(location.search); }
    catch (e) { return new URLSearchParams(''); }
  }

  /* ---- storage: localStorage first, cookie fallback ---------------------- */
  function cookieDomain() {
    var h = location.hostname;
    return /(^|\.)ridleyacademy\.team$/.test(h) ? '; Domain=.ridleyacademy.team' : '';
  }
  function readCookie() {
    var m = document.cookie.match('(^|;)\\s*' + COOKIE_NAME + '\\s*=\\s*([^;]+)');
    if (!m) return null;
    try { return JSON.parse(decodeURIComponent(m[2])); } catch (e) { return null; }
  }
  function writeCookie(obj) {
    try {
      document.cookie = COOKIE_NAME + '=' + encodeURIComponent(JSON.stringify(obj))
        + '; Max-Age=' + (COOKIE_DAYS * 86400)
        + '; Path=/' + cookieDomain() + '; SameSite=Lax'
        + (location.protocol === 'https:' ? '; Secure' : '');
    } catch (e) {}
  }
  function load() {
    var v = null;
    try { v = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) {}
    if (!v) v = readCookie();
    return (v && typeof v === 'object') ? v : {};
  }
  function save(state) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
    writeCookie(state);
  }

  /* ---- what THIS pageview carries ---------------------------------------- */
  function currentTouch() {
    var p = q(), t = {}, any = false;
    for (var i = 0; i < AD_PARAMS.length; i++) {
      var v = p.get(AD_PARAMS[i]);
      if (v) { t[AD_PARAMS[i]] = String(v).slice(0, MAX_VAL_LEN); any = true; }
    }
    t.ts = Date.now();
    return { touch: t, hasAdSignal: any };
  }

  function device() {
    var ua = navigator.userAgent || '';
    if (/iPad|Tablet|PlayBook|Silk/i.test(ua) ||
        (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'tablet';
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  /* ---- persist ------------------------------------------------------------ */
  var state = load();
  var now = currentTouch();

  /* First touch is written exactly once per browser, ad signal or not: an
     organic first visit is a true first touch and later paid clicks must not
     rewrite history. The landing path and referrer only mean anything on the
     visit that set the record, so they live here and not on last touch. */
  function copyTouch(t) {
    var c = {};
    for (var k in t) c[k] = t[k];
    return c;
  }
  if (!state.ft) {
    state.ft = copyTouch(now.touch);
    state.ft.lp = (location.pathname + location.search).slice(0, MAX_VAL_LEN);
    if (document.referrer) state.ft.ref = String(document.referrer).slice(0, MAX_VAL_LEN);
    save(state);
  }
  /* Last touch only moves when a click actually carried something. Copied,
     never aliased to the first-touch object, so neither can mutate the other. */
  if (now.hasAdSignal) {
    state.lt = copyTouch(now.touch);
    save(state);
  }

  /* ---- read API ----------------------------------------------------------- */
  function first() { return state.ft || {}; }
  function last()  { return state.lt || state.ft || {}; }

  /* Flat payload fields for /api/optin. Last touch rides under the plain
     names (utm_source, fbclid, ...), first touch under ft_ prefixed names,
     because the plain names are what every existing reader of the payload
     already expects to mean "the click being paid for right now". */
  function optinFields() {
    var out = {}, lt = last(), ft = first(), k;
    for (k in lt) if (k !== 'ts' && k !== 'lp' && k !== 'ref') out[k] = lt[k];
    for (k in ft) if (k !== 'ts' && k !== 'lp' && k !== 'ref') out['ft_' + k] = ft[k];
    if (ft.lp)  out.ft_landing  = ft.lp;
    if (ft.ref) out.ft_referrer = ft.ref;
    if (ft.ts)  out.ft_ts = new Date(ft.ts).toISOString();
    if (lt.ts)  out.lt_ts = new Date(lt.ts).toISOString();
    out.device = device();
    return out;
  }

  /* Calendly stores exactly five utm fields on the invitee, so the booking
     record gets the last touch under those names. The click id rides in
     utm_content only when the ad name is absent, never displacing it. */
  function calendlyParams() {
    var lt = last(), out = '', map = {
      utm_source: lt.utm_source, utm_medium: lt.utm_medium,
      utm_campaign: lt.utm_campaign, utm_term: lt.utm_term,
      utm_content: lt.utm_content || lt.fbclid || lt.gclid
    };
    for (var k in map) {
      if (map[k]) out += '&' + k + '=' + encodeURIComponent(map[k]);
    }
    return out;
  }

  window.RAAttrib = {
    first: first,
    last: last,
    device: device,
    optinFields: optinFields,
    calendlyParams: calendlyParams,
    /* console check on a deployed page: RAAttrib.status() */
    status: function () {
      return { first: first(), last: last(), device: device() };
    }
  };
})();
