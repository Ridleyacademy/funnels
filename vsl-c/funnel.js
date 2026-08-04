/* ============================================================
   RIDLEY FUNNEL · inner-page behaviors
   (thank-you, tripwire, upsell-1, upsell-2, order-complete)
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function safe(fn){ try { fn(); } catch (e) {} }
  function mmss(s){ s = Math.max(0, Math.round(s)); return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0'); }

  /* ---- reserve space for the FIXED bars so they never cover content ----
     The offer timer (.otobar, fixed top) and the mobile checkout bar
     (.stickycta, fixed bottom) each need the page pushed clear of them. The CSS
     does that with body padding, BUT ThriveCart's embed script injects its own
     stylesheet containing `@media(max-width:567px){html,body{padding:0!important}}`,
     which wipes that padding out on phones exactly where these bars live, so the
     bar ends up overlapping the text beneath (or above) it.
     We can't edit ThriveCart's stylesheet. Instead we set the padding straight on
     body as an INLINE !important value: an inline important declaration outranks
     any injected selector rule, so it wins no matter when ThriveCart loads. And
     because we MEASURE the bar rather than guess, it stays correct when the bar's
     text wraps to two lines on a narrow screen. Re-runs on resize/orientation and
     once more after fonts settle. */
  safe(function () {
    var topBar = document.querySelector('.otobar');
    var botBar = document.querySelector('.stickycta');
    if (!topBar && !botBar) return;
    var GAP = 8;
    var vis = function (el) { return el && getComputedStyle(el).display !== 'none'; };
    function apply() {
      /* the fixed top timer bar: always on, reserve its measured height + a gap */
      if (vis(topBar)) {
        var h = Math.ceil(topBar.getBoundingClientRect().height);
        document.body.style.setProperty('padding-top', (h + GAP) + 'px', 'important');
        var logo = document.querySelector('.sitelogo');
        if (logo) logo.style.setProperty('top', (h + GAP) + 'px', 'important');
      }
      /* the mobile checkout bar slides in and out with a transform, so its layout
         box (and height) is present whenever it is displayed, regardless of the
         .show scroll state. Reserve that height whenever the bar is displayed, and
         nothing on wide screens where it is display:none. */
      if (botBar) {
        if (vis(botBar)) {
          var hb = Math.ceil(botBar.getBoundingClientRect().height);
          document.body.style.setProperty('padding-bottom', hb + 'px', 'important');
        } else {
          document.body.style.removeProperty('padding-bottom');
        }
      }
    }
    apply();
    window.addEventListener('resize', apply, { passive: true });
    window.addEventListener('orientationchange', apply);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(apply);
    setTimeout(apply, 300);   // after ThriveCart's stylesheet has injected
    setTimeout(apply, 1500);
  });

  /* ---- FAQ accordion ---- */
  safe(function () {
    [].forEach.call(document.querySelectorAll('.faqx__item'), function (item) {
      var q = item.querySelector('.faqx__q');
      var a = item.querySelector('.faqx__a');
      if (!q || !a) return;
      q.addEventListener('click', function () {
        var open = item.classList.toggle('open');
        if (reduce) { a.style.height = open ? 'auto' : '0'; return; }
        if (open) {
          a.style.height = a.scrollHeight + 'px';
          setTimeout(function(){ if (item.classList.contains('open')) a.style.height = 'auto'; }, 480);
        } else {
          a.style.height = a.scrollHeight + 'px';
          requestAnimationFrame(function(){ a.style.height = '0'; });
        }
      });
    });
  });

  /* ---- order bump -> live total ---- */
  safe(function () {
    var bump = document.querySelector('.bump input[type="checkbox"]');
    if (!bump) return;
    var base = parseFloat(document.body.getAttribute('data-base') || '27');
    var add  = parseFloat(document.body.getAttribute('data-bump') || '37');
    var totalEl = document.querySelector('[data-total]');
    var rowEl = document.querySelector('[data-bump-row]');
    function upd(){
      var t = base + (bump.checked ? add : 0);
      if (totalEl) totalEl.textContent = '$' + t.toFixed(2);
      if (rowEl) rowEl.style.display = bump.checked ? 'flex' : 'none';
    }
    bump.addEventListener('change', upd);
    upd();
  });

  /* ---- countdown pills ---- */
  safe(function () {
    [].forEach.call(document.querySelectorAll('[data-countdown]'), function (el) {
      var remain = parseInt(el.getAttribute('data-countdown'), 10) || 600;
      var out = el.querySelector('[data-clock]') || el;
      out.textContent = mmss(remain);
      var iv = setInterval(function () {
        remain--;
        out.textContent = mmss(remain);
        if (remain <= 0) clearInterval(iv);
      }, 1000);
    });
  });

  /* ---- 95% progress bar fill ---- */
  safe(function () {
    [].forEach.call(document.querySelectorAll('.prog95__fill'), function (el) {
      var w = el.getAttribute('data-fill') || '95';
      setTimeout(function(){ el.style.width = w + '%'; }, 200);
    });
  });

  /* ---- VERSION B opt-in (optin.html) ----
     Saves the lead to the same store the booking form reads, so on the video
     page their name, phone and email are already filled in (they only answer
     the qualifying questions). Device autofill works via autocomplete attrs. */
  safe(function () {
    var f = document.getElementById('optinForm');
    if (!f) return;
    function flag(el){ el.focus(); el.style.borderColor = '#F50C1C'; }
    // live "correct" feedback: same green valid state as the booking form on the video page
    [['name', function (v) { return v.trim().length >= 2; }],
     ['phone', function (v) { return v.replace(/\D/g, '').length >= 7; }],
     ['email', function (v) { return /\S+@\S+\.\S+/.test(v.trim()); }]
    ].forEach(function (pair) {
      var el = f[pair[0]];
      if (!el) return;
      el.addEventListener('input', function () {
        var ok = pair[1](el.value || '');
        if (ok) el.style.borderColor = '';   // clear any error highlight
        el.classList.toggle('is-valid', ok);
      });
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = f.name.value.trim(), email = f.email.value.trim(), phone = f.phone.value.trim();
      if (name.length < 2) return flag(f.name);
      if (phone.replace(/\D/g, '').length < 7) return flag(f.phone);
      if (!/\S+@\S+\.\S+/.test(email)) return flag(f.email);
      try {
        localStorage.setItem('ridley_lead_v1', JSON.stringify({ name: name, phone: phone, email: email, consent: true }));
      } catch (err) {}
      // INTEGRATION POINT: also push this lead to the CRM / email list here.
      // Meta Pixel: the opt-in is variant B's front door, so this is its Lead
      // moment (variant A's Lead fires on the booking form in main.js instead).
      if (window.__raTrack) window.__raTrack('Lead', { content_name: 'Opt-in page' });
      window.location.href = 'index.html';
    });
  });

  /* ---- forms that just advance the funnel ----
     INTEGRATION POINT: post to NMI (payment) / ThriveCart (cart abandonment:
     capture the email field on blur) before navigating. */
  safe(function () {
    [].forEach.call(document.querySelectorAll('form[data-next]'), function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        // hard gate: no advancing past a checkout with empty/invalid fields
        if (!f.checkValidity()) { f.reportValidity(); return; }
        window.location.href = f.getAttribute('data-next');
      });
    });
  });

  /* ---- add-to-calendar (Google link + .ics with 1hr & 5min alarms) ----
     INTEGRATION POINT: inject the real booking datetime from Calendly. ---- */
  safe(function () {
    [].forEach.call(document.querySelectorAll('[data-cal]'), function (btn) {
      btn.addEventListener('click', function () {
        var type = btn.getAttribute('data-cal');
        var title = 'My Free Piano Consultation with Ridley Academy';
        var details = 'Your 1-on-1 call with the Ridley Academy team. Have your questions ready.';
        var start = new Date(Date.now() + 2 * 864e5); start.setHours(15, 0, 0, 0);
        var end = new Date(start.getTime() + 30 * 6e4);
        function z(d){ return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'; }
        if (type === 'google') {
          var u = new URL('https://calendar.google.com/calendar/render');
          u.searchParams.set('action', 'TEMPLATE');
          u.searchParams.set('text', title);
          u.searchParams.set('details', details);
          u.searchParams.set('dates', z(start) + '/' + z(end));
          window.open(u.toString(), '_blank');
        } else if (type === 'ics') {
          var ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Ridley Academy//Funnel//EN','BEGIN:VEVENT',
            'UID:' + Date.now() + '@ridleyacademy','DTSTAMP:' + z(new Date()),'DTSTART:' + z(start),'DTEND:' + z(end),
            'SUMMARY:' + title,'DESCRIPTION:' + details,
            'BEGIN:VALARM\nTRIGGER:-PT1H\nACTION:DISPLAY\nDESCRIPTION:Your piano call is in 1 hour\nEND:VALARM',
            'BEGIN:VALARM\nTRIGGER:-PT5M\nACTION:DISPLAY\nDESCRIPTION:Your piano call is in 5 minutes\nEND:VALARM',
            'END:VEVENT','END:VCALENDAR'].join('\n');
          var a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
          a.download = 'piano-consultation.ics';
          a.click();
        } else {
          /* Opens WhatsApp with the reminder drafted (visitor can send it to
             themselves or anyone). INTEGRATION POINT: swap for an automated
             reminder flow (Twilio / 360dialog) with the business number. */
          var msg = 'Reminder: my FREE piano consultation with Ridley Academy is coming up! 1-hour and 5-minute alerts are set in my calendar.';
          window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
        }
        btn.classList.add('done');
        var lbl = btn.querySelector('[data-cal-label]');
        if (lbl) lbl.textContent = 'Added ✓';
      });
    });
  });

  /* ---- Meta Pixel: paid-step events ----
     Detected from what is actually ON the page rather than from the filename, so
     these keep working if a page is ever renamed or reused.
       .thrivecart-embeddable          -> the $27 checkout  = InitiateCheckout
       .thrivecart-custom-upsell-target -> a one-click upsell = ViewContent
     Purchase is intentionally absent: ThriveCart fires it with the real order
     value, and a second one from here would double-count every sale. ---- */
  safe(function () {
    var t = window.__raTrack;
    if (!t) return;
    if (document.querySelector('.thrivecart-embeddable')) {
      t('InitiateCheckout', { content_name: '4 Magic Chords', value: 27.00, currency: 'USD' });
      return;
    }
    var upsell = document.querySelector('.thrivecart-custom-upsell-target');
    if (upsell) {
      // the offer's price lives in the page's own headline block, so read it
      // instead of hard-coding a number that can drift from the copy
      var el = document.querySelector('.anchorx__new, .vtotal__new');
      var val = el ? parseFloat(el.textContent.replace(/[^0-9.]/g, '')) : null;
      t('ViewContent', {
        content_name: (document.title || 'Upsell').split('|')[0].trim(),
        content_type: 'product',
        value: isFinite(val) ? val : undefined,
        currency: 'USD'
      });
    }
  });
})();
