/* Country-code phone field, as a widget.
   ------------------------------------------------------------------------
   The behaviour apply.html's contact step already has, lifted out so any other
   page in this flow can get it without a second copy of the logic.

   Usage: mark the input and load this after ra-phone.js.

     <input type="tel" id="ctPhone" data-ra-phone>
     <script defer src="ra-phone.js"></script>
     <script defer src="ra-phone-ui.js"></script>

   Add data-ra-phone-optional to allow an empty value (an optional field still
   validates whatever IS typed; it just accepts blank).

   Each attached input gets an API on the element as `_raPhone`:
     .iso()      selected country, e.g. "GB"
     .e164()     "+447400123456", or null when incomplete/invalid
     .isValid()  true when the number fits that country's numbering plan
   Read .e164() on submit. Storing the raw national string loses the country and
   a UK mobile ends up looking like a US one.

   ra-phone.js is deferred and may not have landed when someone types fast, so
   every path here falls back gracefully while it is missing. A slow script must
   never cost a lead. */
(function () {
  var CSS = [
    '.phonerow{display:flex;gap:8px;align-items:stretch}',
    '.phonerow .field,.phonerow input[type=tel]{flex:1 1 auto;min-width:0}',
    '.ccpill{display:flex;align-items:center;gap:7px;flex:0 0 auto;padding:0 13px;background:var(--paper);border:1.5px solid var(--line);border-radius:var(--radius-sm);color:var(--ink);font-family:var(--body);font-size:16px;font-weight:600;line-height:1;cursor:pointer;transition:border-color .2s var(--ease)}',
    '.ccpill:hover{border-color:var(--ink-soft)}',
    '.ccpill:focus-visible{outline:none;border-color:var(--cherry);box-shadow:0 0 0 3px rgba(232,20,32,.12)}',
    '.ccpill img{width:22px;height:16px;object-fit:cover;border-radius:3px;display:block}',
    '.ccpill i{font-style:normal;font-size:11px;color:var(--ink-soft)}',
    '.ccpanel{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;background:var(--paper);border-radius:0;padding:clamp(18px,3.5vw,26px);max-width:520px;margin:auto;max-height:92vh}',
    '@media(min-width:560px){.ccpanel{border-radius:var(--radius-lg);inset:auto;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(520px,92vw)}}',
    '.ccpanel[hidden]{display:none}',
    '.ccbackdrop{position:fixed;inset:0;z-index:59;background:rgba(20,8,8,.45)}',
    '.ccbackdrop[hidden]{display:none}',
    '.ccpanel__head{display:flex;align-items:center;justify-content:space-between;gap:10px;font-family:var(--display);text-transform:uppercase;letter-spacing:.06em;font-size:15px;color:var(--ink)}',
    '.ccpanel__close{background:none;border:0;color:var(--ink-soft);font-size:24px;line-height:1;cursor:pointer;min-width:44px;min-height:44px}',
    '.ccpanel__search{width:100%;margin-top:12px;background:var(--paper);border:1.5px solid var(--line);border-radius:var(--radius-sm);padding:12px 14px;font-size:16.5px;font-family:var(--body);color:var(--ink)}',
    '.ccpanel__search:focus{outline:none;border-color:var(--cherry);box-shadow:0 0 0 3px rgba(232,20,32,.12)}',
    '.ccpanel__list{flex:1 1 auto;min-height:220px;overflow-y:auto;-webkit-overflow-scrolling:touch;margin-top:10px}',
    '.ccrow{display:flex;align-items:center;gap:10px;width:100%;padding:11px 10px;background:none;border:0;border-radius:10px;font-family:var(--body);font-size:16px;color:var(--ink);text-align:left;cursor:pointer}',
    '.ccrow[hidden]{display:none}',
    '.ccrow:hover{background:var(--cream)}',
    '.ccrow.is-sel{background:#FDF0F0}',
    '.ccrow img{width:22px;height:16px;object-fit:cover;border-radius:3px;flex:0 0 auto}',
    '.ccrow__name{flex:1 1 auto}',
    '.ccrow__code{color:var(--ink-soft);font-variant-numeric:tabular-nums}',
    '.ccpanel__sep{height:1px;background:var(--line);margin:8px 4px}',
    '.ccpanel__none{color:var(--ink-soft);font-size:14.5px;padding:14px 10px}',
    '.ccerr{color:var(--cherry);font-size:14px;margin:6px 0 0}',
    '.ccerr[hidden]{display:none}'
  ].join('');

  /* Where are they? Best available signal, cheapest first. None of this is
     authoritative, which is why the pill stays one tap from being changed. */
  var TZ = {
    'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Phoenix': 'US',
    'America/Los_Angeles': 'US', 'America/Anchorage': 'US', 'Pacific/Honolulu': 'US', 'America/Detroit': 'US',
    'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Winnipeg': 'CA', 'America/Halifax': 'CA',
    'Europe/London': 'GB', 'Europe/Belfast': 'GB', 'Europe/Dublin': 'IE',
    'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU',
    'Australia/Adelaide': 'AU', 'Australia/Hobart': 'AU', 'Australia/Darwin': 'AU',
    'Pacific/Auckland': 'NZ', 'Africa/Johannesburg': 'ZA', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN',
    'Asia/Singapore': 'SG', 'Asia/Dubai': 'AE', 'Europe/Berlin': 'DE', 'Europe/Paris': 'FR', 'Europe/Amsterdam': 'NL',
    'Europe/Madrid': 'ES', 'Europe/Rome': 'IT'
  };

  /* Dial codes for the handful of countries guess() can return, so that while
     ra-phone.js is still in flight the pill cannot show "+1" over an iso of
     "GB" and store a +1 number for a British lead. Once the script lands the
     real metadata takes over and this is never consulted again. */
  var FALLBACK_DIAL = {
    US: '+1', CA: '+1', GB: '+44', IE: '+353', AU: '+61', NZ: '+64', ZA: '+27',
    IN: '+91', SG: '+65', AE: '+971', DE: '+49', FR: '+33', NL: '+31', ES: '+34', IT: '+39'
  };

  var PINNED = ['US', 'CA', 'GB', 'AU', 'NZ'];   // where Ridley actually advertises
  var LEAD_KEY = 'ridley_lead_v1';
  var cssDone = false;

  function P() { return window.RAPhone || null; }
  function flag(cc) { return 'https://flagcdn.com/w40/' + String(cc).toLowerCase() + '.png'; }

  function injectCss() {
    if (cssDone) return;
    cssDone = true;
    var s = document.createElement('style');
    s.setAttribute('data-ra-phone-ui', '');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function prior() {
    try { return JSON.parse(localStorage.getItem(LEAD_KEY) || '{}') || {}; } catch (e) { return {}; }
  }

  function guess() {
    var had = prior();
    if (had && had.phone_country) return had.phone_country;      /* what they picked last time */
    try { if (had && had.phone && P()) { var c = P().countryOf(had.phone); if (c) return c; } } catch (e) {}
    try { var tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz && TZ[tz]) return TZ[tz]; } catch (e) {}
    try { var m = String(navigator.language || '').match(/[-_]([A-Za-z]{2})$/); if (m) return m[1].toUpperCase(); } catch (e) {}
    return 'US';
  }

  function remember(cc) {
    try {
      var cur = prior();
      cur.phone_country = cc;
      localStorage.setItem(LEAD_KEY, JSON.stringify(cur));
    } catch (e) {}
  }

  function attach(input) {
    if (!input || input._raPhone) return input && input._raPhone;
    injectCss();

    var optional = input.hasAttribute('data-ra-phone-optional');
    var iso = 'US';
    var built = false;

    /* --- markup: pill + input in a row, panel appended to body --- */
    var row = document.createElement('div');
    row.className = 'phonerow';
    input.parentNode.insertBefore(row, input);

    var pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'ccpill';
    pill.setAttribute('aria-haspopup', 'dialog');
    pill.setAttribute('aria-expanded', 'false');
    pill.innerHTML = '<img alt="" width="22" height="16" decoding="async"><span></span><i aria-hidden="true">&#9662;</i>';
    var pillImg = pill.querySelector('img');
    var pillTxt = pill.querySelector('span');

    row.appendChild(pill);
    row.appendChild(input);
    input.setAttribute('inputmode', 'tel');
    input.setAttribute('autocomplete', 'tel-national');

    var errEl = document.createElement('p');
    errEl.className = 'ccerr';
    errEl.setAttribute('role', 'alert');
    errEl.hidden = true;
    row.parentNode.insertBefore(errEl, row.nextSibling);

    var backdrop = document.createElement('div');
    backdrop.className = 'ccbackdrop';
    backdrop.hidden = true;

    var panel = document.createElement('div');
    panel.className = 'ccpanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Select country code');
    panel.hidden = true;
    panel.innerHTML =
      '<div class="ccpanel__head">Select country code' +
      '<button type="button" class="ccpanel__close" aria-label="Close">&times;</button></div>' +
      '<input class="ccpanel__search" type="search" placeholder="Search countries" autocomplete="off" aria-label="Search countries">' +
      '<div class="ccpanel__list"></div>';
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    var closeEl = panel.querySelector('.ccpanel__close');
    var searchEl = panel.querySelector('.ccpanel__search');
    var listEl = panel.querySelector('.ccpanel__list');

    function dial() { var p = P(); return (p && p.dial(iso)) || FALLBACK_DIAL[iso] || '+1'; }

    function setCountry(cc, opts) {
      if (!cc) return;
      var p = P();
      if (p && !p.dial(cc)) return;   /* refuse a code the metadata cannot validate */
      /* No metadata yet and no dial code we can vouch for: sit on US rather than
         display a code that does not belong to the country we are storing. */
      if (!p && !FALLBACK_DIAL[cc]) cc = 'US';
      iso = cc;
      pillImg.src = flag(cc);
      pillTxt.textContent = dial();
      pill.setAttribute('aria-label', 'Country code ' + dial() + ', tap to change');
      if (p) input.placeholder = p.sample(cc);
      [].forEach.call(listEl.querySelectorAll('.ccrow'), function (r) {
        r.classList.toggle('is-sel', r.getAttribute('data-iso') === cc);
      });
      if (!(opts && opts.quiet)) { remember(cc); check(true); }
    }

    function build() {
      if (built || !listEl) return;
      var p = P();
      if (!p) {
        /* Script still in flight. Say so instead of opening an empty sheet, and
           give them a way through in the meantime. The poller below rebuilds
           this the moment the metadata lands. */
        listEl.innerHTML = '<p class="ccpanel__none">Country list is still loading. You can also type your number with its country code, like +44 7400 123456.</p>';
        return;
      }
      listEl.innerHTML = '';
      var all = p.countries();
      var byIso = {};
      all.forEach(function (c) { byIso[c.iso] = c; });

      function row2(c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ccrow' + (c.iso === iso ? ' is-sel' : '');
        b.setAttribute('data-iso', c.iso);
        b.setAttribute('data-name', c.name.toLowerCase());
        b.setAttribute('data-dial', c.dial);
        b.innerHTML = '<img alt="" width="22" height="16" loading="lazy" src="' + flag(c.iso) + '">' +
          '<span class="ccrow__name"></span><span class="ccrow__code"></span>';
        b.querySelector('.ccrow__name').textContent = c.name;
        b.querySelector('.ccrow__code').textContent = c.dial;
        b.addEventListener('click', function () { setCountry(c.iso); close(); input.focus(); });
        return b;
      }

      PINNED.forEach(function (cc) { if (byIso[cc]) listEl.appendChild(row2(byIso[cc])); });
      var sep = document.createElement('div');
      sep.className = 'ccpanel__sep';
      listEl.appendChild(sep);
      all.forEach(function (c) { listEl.appendChild(row2(c)); });
      built = true;
    }

    function filter() {
      var q = (searchEl.value || '').trim().toLowerCase();
      var any = false;
      [].forEach.call(listEl.querySelectorAll('.ccrow'), function (r) {
        var hit = !q || r.getAttribute('data-name').indexOf(q) >= 0 ||
          r.getAttribute('data-dial').indexOf(q) >= 0 ||
          r.getAttribute('data-iso').toLowerCase().indexOf(q) >= 0;
        r.hidden = !hit;
        if (hit) any = true;
      });
      var sep = listEl.querySelector('.ccpanel__sep');
      if (sep) sep.hidden = !!q;
      var none = listEl.querySelector('.ccpanel__none--empty');
      if (!any && !none) {
        var p2 = document.createElement('p');
        p2.className = 'ccpanel__none ccpanel__none--empty';
        p2.textContent = 'No country matches that.';
        listEl.appendChild(p2);
      } else if (any && none) {
        none.parentNode.removeChild(none);
      }
    }

    function open() {
      build();
      panel.hidden = false;
      backdrop.hidden = false;
      pill.setAttribute('aria-expanded', 'true');
      searchEl.value = '';
      filter();
      var sel = listEl.querySelector('.ccrow.is-sel');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
      setTimeout(function () { searchEl.focus(); }, 30);
    }

    function close() {
      panel.hidden = true;
      backdrop.hidden = true;
      pill.setAttribute('aria-expanded', 'false');
    }

    /* --- validation ---
       Optional fields accept blank but still reject a number that is present
       and wrong. Silence on a bad number is how a dead phone reaches the call
       list. */
    function check(quiet) {
      var v = (input.value || '').trim();
      if (!v) {
        errEl.hidden = true;
        return optional;
      }
      var p = P();
      if (!p) {                       /* metadata missing: fall back to a length check */
        var ok = v.replace(/\D/g, '').length >= 7;
        errEl.hidden = ok || quiet;
        if (!ok && !quiet) errEl.textContent = 'That number looks too short.';
        return ok;
      }
      var valid = p.isValid(v, iso);
      errEl.hidden = valid || quiet;
      if (!valid && !quiet) {
        errEl.textContent = 'That does not look like a ' + dial() + ' number. Example: ' + p.sample(iso);
      }
      return valid;
    }

    pill.addEventListener('click', function () { panel.hidden ? open() : close(); });
    closeEl.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    searchEl.addEventListener('input', filter);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });

    input.addEventListener('input', function () {
      var p = P();
      if (!p) return;
      var raw = (input.value || '').trim();
      /* Typed or pasted in international form: believe the number over the pill. */
      if (raw.charAt(0) === '+') {
        var c = p.countryOf(raw);
        if (c && c !== iso) setCountry(c, { quiet: true });
        errEl.hidden = true;
        return;
      }
      var caretAtEnd = input.selectionStart === raw.length;
      var formatted = p.format(raw, iso);
      if (formatted && formatted !== raw && caretAtEnd) input.value = formatted;
      errEl.hidden = true;
    });
    input.addEventListener('blur', function () { check(false); });

    var api = {
      iso: function () { return iso; },
      isValid: function () { return check(true); },
      check: function () { return check(false); },
      e164: function () {
        var v = (input.value || '').trim();
        if (!v) return null;
        var p = P();
        if (!p) return v;               /* better the raw string than nothing */
        return p.e164(v, iso) || (v.charAt(0) === '+' ? v : null);
      }
    };
    input._raPhone = api;

    setCountry(guess(), { quiet: true });

    /* ra-phone.js is deferred. Once it lands, redo the things that needed real
       metadata: the placeholder, the dial code, and the picker contents. */
    if (!P()) {
      var tries = 0;
      var t = setInterval(function () {
        if (P()) {
          clearInterval(t);
          built = false;
          build();
          setCountry(guess(), { quiet: true });
        } else if (++tries > 100) {
          clearInterval(t);
        }
      }, 100);
    }

    return api;
  }

  function init() {
    [].forEach.call(document.querySelectorAll('input[data-ra-phone]'), attach);
  }

  window.RAPhoneUI = { attach: attach, init: init };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
