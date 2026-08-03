/* ============================================================
   RIDLEY ACADEMY · /start  (kourse-format apply page)
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function safe(fn){ try { fn(); } catch (e) { /* never break the page */ } }

  /* ---- Meta Pixel conversion events ----
     CURRENT CONFIGURATION (Ori 7/27, reversing the earlier single-page scoping):
     the pixel base code (init + PageView) is in the <head> of EVERY page, so the
     ads can learn from the whole funnel. The track() calls below are therefore
     LIVE and fire at the correct moments:
       Lead             - booking form submitted (index)
       InitiateCheckout - the $27 checkout is on screen (tripwire, via funnel.js)
       ViewContent      - an upsell offer is on screen (upsells, via funnel.js,
                          value read from the page's own price block)
     Schedule fires ONLY from thank-you.html's inline head script (the booking
     handler here deliberately does not fire it - both would double-count).
     Purchase is never fired from any page: ThriveCart owns the transaction and
     fires it with the true amount. ---- */
  function track(event, params) {
    try { if (window.fbq) window.fbq('track', event, params || {}); } catch (e) {}
  }
  window.__raTrack = track;

  /* ---- cross-browser :has() mirrors ----
     Older browsers (roughly pre-2022 Safari / pre-Dec-2023 Firefox) don't support the CSS
     :has() selector. Every layout rule that relies on it is duplicated in the stylesheets
     against these plain JS-added classes, which work on every browser ever shipped. */
  safe(function () {
    if (document.querySelector('.stickycta')) document.body.classList.add('has-stickycta');
    [].forEach.call(document.querySelectorAll('.pviz'), function (p) {
      p.classList.add(p.querySelector('.pviz__joy') ? 'has-joy' : 'no-joy');
    });
    [].forEach.call(document.querySelectorAll('.pviz__box'), function (b) {
      if (b.querySelector('img')) b.classList.add('has-img');
    });
  });

  // rAF smooth scroll (CSS smooth-scroll / scrollIntoView{smooth} is unreliable in some embeds)
  function scrollToEl(el, block) {
    if (!el) return;
    var se = document.scrollingElement || document.documentElement;
    var html = document.documentElement, prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto'; /* CSS smooth-scroll fights the rAF loop */
    var rect = el.getBoundingClientRect();
    var dest;
    if (block === 'center') dest = se.scrollTop + rect.top - (window.innerHeight - rect.height) / 2;
    else dest = se.scrollTop + rect.top - 70; /* 'start' (clear the fixed top bar) */
    dest = Math.max(0, Math.min(dest, se.scrollHeight - window.innerHeight));
    if (reduce) { se.scrollTop = dest; html.style.scrollBehavior = prev; return; }
    var start = se.scrollTop, diff = dest - start, t0 = null, dur = 460;
    function step(ts){ if (t0 === null) t0 = ts; var p = Math.min((ts - t0) / dur, 1);
      se.scrollTop = start + diff * (1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(step); else html.style.scrollBehavior = prev; }
    requestAnimationFrame(step);
  }

  /* ---- fixed logo + nav: light text over dark sections, ink over light sections ---- */
  safe(function () {
    var logo = document.getElementById('sitelogo');
    if (!logo) return;
    var darks = [].slice.call(document.querySelectorAll('.band-dark, .foot'));
    function overDark() {
      var lr = logo.getBoundingClientRect(); var y = (lr.top + lr.bottom) / 2;
      for (var i = 0; i < darks.length; i++) { var r = darks[i].getBoundingClientRect(); if (r.top <= y && r.bottom >= y) return true; }
      return false;
    }
    function upd() { logo.classList.toggle('is-dark', !overDark()); }
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd, { passive: true });
    upd();
  });

  /* ---- scroll progress bar ---- */
  safe(function () {
    var bar = document.getElementById('progress');
    if (!bar) return;
    function upd(){
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (h.scrollTop || window.pageYOffset) / max : 0;
      bar.style.width = (p * 100).toFixed(2) + '%';
    }
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd, { passive: true });
    upd();
  });

  /* ---- sticky mobile CTA (after hero) ---- */
  safe(function () {
    var sticky = document.getElementById('stickycta');
    if (!sticky) return;
    function upd(){
      var y = window.pageYOffset || document.documentElement.scrollTop;
      var nearEnd = (y + window.innerHeight) > (document.documentElement.scrollHeight - 560);
      if (y > window.innerHeight * 0.8 && !nearEnd) sticky.classList.add('show');
      else sticky.classList.remove('show');
    }
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  });

  /* ---- reveal on scroll ---- */
  safe(function () {
    var els = [].slice.call(document.querySelectorAll('.reveal'));
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (el){ el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (ents){
      ents.forEach(function (e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el){ io.observe(el); });
  });

  /* ---- count-up stats ---- */
  safe(function () {
    var nums = [].slice.call(document.querySelectorAll('[data-count]'));
    if (!nums.length) return;
    function fmt(n){ return n.toLocaleString('en-US'); }
    function run(el){
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduce){ el.textContent = fmt(target) + suffix; return; }
      var dur = 2200, t0 = null;
      function step(ts){
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
    var io;
    function arm(){
      if (io) io.disconnect();
      io = new IntersectionObserver(function (ents){
        ents.forEach(function (e){ if (e.isIntersecting){ run(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.6, rootMargin: '0px 0px -12% 0px' });
      nums.forEach(function (el){
        el.textContent = '0' + (el.getAttribute('data-suffix') || '');
        io.observe(el);
      });
    }
    arm();
    // back/forward restores the page with the numbers already at their final
    // values; re-arm so they visibly count up again when they come into view
    window.addEventListener('pageshow', function (e) { if (e.persisted) arm(); });
  });

  /* ---- VSL play facade (all players) ---- */
  safe(function () {
    var players = [].slice.call(document.querySelectorAll('.vplayer'));
    players.forEach(function (player) {
      var vid = player.querySelector('video');
      if (!vid) return;
      player.addEventListener('click', function () {
        if (player.classList.contains('is-playing')) {
          if (vid.paused) vid.play(); else vid.pause();
          return;
        }
        player.classList.add('is-playing');
        vid.controls = true;
        vid.muted = false;
        var p = vid.play();
        if (p && p.catch) p.catch(function () {});
        // bring the video to the center of the screen when it starts
        scrollToEl(player.closest('.vwrap') || player, 'center');
      });
    });
  });

  /* ---- one SOUND at a time ----
     Whoever starts audible playback claims the floor and the previous audible
     video is paused where it stands (resumable from that same spot with a tap).
     Muted ambient previews never claim, so the page's silent b-roll feel stays.
     Shared with the chromeless-YouTube block below via window. ---- */
  window.__soloPlay = (function () {
    var holder = null;
    return function (key, pauseFn) {
      if (holder && holder.key !== key) { try { holder.pause(); } catch (e) {} }
      holder = { key: key, pause: pauseFn };
    };
  })();

  /* ---- inline videos: every .vembed autoplays MUTED and loops silently
         (browsers require mute for autoplay); one click on its sound pill
         restarts it from 0 WITH sound. Identical behavior for the hero VSL and
         the testimonials video so they match. Below-the-fold videos also get a
         play() nudge when they scroll into view, plus a first-gesture retry for
         devices (iOS Low Power Mode, data-saver) that block even muted autoplay
         until the user touches the page. ---- */
  safe(function () {
    var embeds = [].slice.call(document.querySelectorAll('.vembed'));
    if (!embeds.length) return;
    /* ---- connection-aware playback ----
       The answer videos are large. On a metered or genuinely slow connection,
       autoplaying them is worse than useless: it burns the visitor's data and
       still stalls. In that case we leave every video parked on its poster with
       its normal controls, so they choose what to watch. Everyone else gets the
       silent-autoplay experience. */
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var frugal = !!(conn && (conn.saveData === true ||
      /^(slow-)?2g$/.test(conn.effectiveType || '') || conn.effectiveType === '3g'));

    function playMuted(v) {
      if (frugal) return;
      if (!v || !v.paused || !v.muted) return;
      /* preload="none" videos have fetched nothing yet; asking to play is what
         starts the download, so raise preload first for a faster first frame */
      if (v.preload === 'none') v.preload = 'auto';
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
    /* Is this block within roughly a screen and a half of the viewport? Used to keep
       the first-gesture kick from starting EVERY video on a page that has several of
       them (thank-you.html has one per question), which would put them all in a
       bandwidth fight and leave none of them actually buffered. */
    function near(em) {
      var r = em.getBoundingClientRect(), vh = window.innerHeight || 0;
      return r.bottom > -vh * 1.5 && r.top < vh * 2.5;
    }
    function kickAll() { embeds.forEach(function (em) { if (near(em)) playMuted(em.querySelector('video')); }); }

    /* ---- ONE background video at a time ----
       thank-you.html carries four answer videos plus the hero. Letting them all
       stream at once asks for roughly 50 Mbps, which no normal connection has, so
       every one of them stalls and the visitor sees a page of frozen players. This
       hands the pipe to a single video: whichever one the visitor is closest to
       claims it, and the previous holder is paused.
       Exempt: the hero VSL (data-vsl) always keeps playing, because its real
       playback time drives the offer timer and the gated variant's reveal, and any
       video the visitor has unmuted, because they are deliberately watching it. */
    var holder = null;
    function claim(v) {
      if (!v || v.hasAttribute('data-vsl')) { playMuted(v); return; }
      if (holder && holder !== v && holder.muted && !holder.hasAttribute('data-vsl')) holder.pause();
      holder = v;
      playMuted(v);
    }
    window.addEventListener('touchstart', kickAll, { passive: true, once: true });
    window.addEventListener('scroll', kickAll, { passive: true, once: true });
    window.addEventListener('pointerdown', kickAll, { passive: true, once: true });

    embeds.forEach(function (em) {
      var v = em.querySelector('video');
      var btn = em.querySelector('.vsound');
      if (!v) return;
      // nudge play when the video scrolls into view (some browsers won't
      // autoplay a muted video that starts off-screen)
      if ('IntersectionObserver' in window) {
        /* rootMargin gives a full screen of lead time: a video starts buffering
           and playing before it scrolls into view, so it is already running by the
           time the visitor arrives. On the way out it PAUSES, handing the bandwidth
           back to whatever they are actually looking at.
           Two things are never paused: the hero VSL (data-vsl), whose currentTime
           drives the offer timer and the gated reveal, and any video the visitor
           has unmuted, i.e. is genuinely watching. */
        var io = new IntersectionObserver(function (ents) {
          ents.forEach(function (e) {
            if (e.isIntersecting) { claim(v); return; }
            if (!v.hasAttribute('data-vsl') && v.muted) v.pause();
          });
        }, { threshold: 0, rootMargin: '100% 0px 100% 0px' });
        io.observe(em);
      } else { playMuted(v); }

      /* ---- keep the OPENING of each answer permanently buffered ----
         The sound pill restarts the video at 0. If the silent preview has been
         running for two minutes, the browser has long since dropped the opening
         from its buffer, so "click for sound" would sit there re-downloading the
         very start. Fix: a long answer's SILENT preview loops over its first
         PREVIEW_CAP seconds, so second 0 is always hot and sound starts instantly.
         The cap is tied to v.muted, so it lifts by itself the moment the visitor
         asks for sound and the full answer then plays straight through.
         Two exclusions: the hero VSL (data-vsl), whose real playback time drives
         the offer timer and the gated reveal, and anything short enough to loop
         naturally. Side benefit: a page of long answers streams a few MB in the
         background instead of hundreds. */
      var PREVIEW_CAP = 30;
      if (!v.hasAttribute('data-vsl')) {
        v.addEventListener('timeupdate', function () {
          if (!v.muted) return;                                  // they asked for sound: no cap
          var d = v.duration;
          if (!d || !isFinite(d) || d <= PREVIEW_CAP * 2) return; // short clip: let it loop on its own
          if (v.currentTime > PREVIEW_CAP) { try { v.currentTime = 0; } catch (e) {} }
        });
      }

      /* Native players are SEEKABLE (only the VSL is locked, and the VSL is a
         YouTube embed handled below): restricted native controls provide the
         rewind/forward. Right-click stays blocked (its menu offers download /
         casting), audible playback claims the solo floor, a tap on the video
         toggles pause/resume, and any engaged pause shows the Tap To Play chip
         (the .is-paused chip is visual only - the resume tap passes through to
         the video). */
      v.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      v.addEventListener('pause', function () { if (!v.muted) em.classList.add('is-paused'); });
      v.addEventListener('play', function () { em.classList.remove('is-paused'); });
      function claimNative() {
        window.__soloPlay && window.__soloPlay('native:' + (v.currentSrc || v.src), function () { v.pause(); });
      }
      /* claim on BOTH signals: 'play' (a paused video resuming audibly) and
         'volumechange' (the pill unmuting an ALREADY-playing preview - that
         path fires no 'play' event, which is exactly the case the first QA
         run caught slipping through) */
      v.addEventListener('play', function () { if (!v.muted) claimNative(); });
      v.addEventListener('volumechange', function () { if (!v.muted && !v.paused) claimNative(); });
      v.addEventListener('click', function () {
        if (v.muted) return;   // pre-engage, the pill owns every click
        if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });

      if (!btn) return;
      btn.addEventListener('click', function () {
        try { v.currentTime = 0; } catch (e) {}
        v.muted = false;
        v.volume = 1;
        v.loop = false;          // silent preview looped; the real watch plays once
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
        btn.classList.add('is-off');
        setTimeout(function () { btn.style.display = 'none'; }, 500);
        // the HERO video kicks off the progress strip + offer timer
        if (v.hasAttribute('data-vsl')) {
          if (window.__raPlay) window.__raPlay();
          if (window.__raVslStarted) window.__raVslStarted();
        }
      });
    });
  });

  /* ============================================================
     STAGED PRELOADER
     Everything on the page gets warmed, but in a strict priority order,
     one item at a time, so nothing ever competes with the thing the
     visitor is actually looking at. The ladder (per Ori):

       1. the MAIN VSL (already eager in the markup)   <- absolute priority
       2. the ThriveCart checkout script
       3. the testimonial video (page's remaining videos)
       4. everything else across the WHOLE funnel: the other pages,
          their scripts (upsell embeds, the YouTube player API), the
          YouTube thumbnails, and every heavy image on the later pages,
          so each next step opens with zero visible loading.

     Each stage waits for the previous one before starting, with a
     timeout so a slow item can never block the queue forever. Stage 4
     is plain low-priority prefetch, so even while it runs the browser
     always favors whatever the visitor is actively watching.

     Skipped entirely on metered/slow connections (see `frugal`): there,
     eagerly pulling this much would hurt far more than it helps.
     ============================================================ */
  safe(function () {
    var conn2 = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn2 && (conn2.saveData === true ||
        /^(slow-)?2g$/.test(conn2.effectiveType || '') || conn2.effectiveType === '3g')) return;

    var vids = [].slice.call(document.querySelectorAll('.vembed video'));
    /* the priority video is the VSL if this page has one, else the first */
    var primary = document.querySelector('.vembed video[data-vsl]') || null;
    var rest = vids.filter(function (v) { return v !== primary; });

    /* QA trace: window.__warmLog records what warmed, in order */
    var LOG = window.__warmLog = [];

    /* resolves once a video holds `secs` of buffer, or after `capMs` regardless */
    function buffered(v, secs, capMs) {
      return new Promise(function (done) {
        var settled = false;
        function finish() {
          if (settled) return;
          settled = true;
          v.removeEventListener('progress', check);
          v.removeEventListener('canplaythrough', finish);
          done();
        }
        function check() {
          try {
            if (v.buffered.length && v.buffered.end(v.buffered.length - 1) - (v.currentTime || 0) >= secs) finish();
          } catch (e) {}
        }
        v.addEventListener('progress', check);
        v.addEventListener('canplaythrough', finish);
        setTimeout(finish, capMs);
        check();
      });
    }

    /* pull a URL into the HTTP cache without executing it (low priority) */
    function warmUrl(href, as) {
      return new Promise(function (done) {
        LOG.push(href.replace(location.origin, ''));
        var l = document.createElement('link');
        l.rel = 'prefetch';
        l.href = href;
        if (as) l.as = as;
        l.onload = l.onerror = function () { done(); };
        document.head.appendChild(l);
        setTimeout(done, 8000);
      });
    }

    /* STAGE 2: the checkout script. Warm it from every page that is not
       already loading it itself (tripwire/upsells load their own copy). */
    var checkoutQueue = [];
    if (!document.querySelector('script[src*="thrivecart"], link[rel="preload"][href*="thrivecart"]')) {
      checkoutQueue.push(['https://tinder.thrivecart.com/embed/v1/thrivecart.js', 'script']);
    }

    /* STAGE 4: the whole-funnel warm list. Pages first (small HTML), then
       the scripts the later pages boot with, then the YouTube thumbnails,
       then every heavy image on the later pages. All real files: this list
       mirrors what the pages actually reference. The browser's cache
       dedupes anything the current page already loaded. */
    var here = location.pathname.split('/').pop() || 'index.html';
    var SITE_WARM = [
      ['tripwire.html'], ['upsell-1.html'], ['upsell-2.html'],
      ['thank-you.html'], ['order-complete.html'],
      ['https://tinder.thrivecart.com/embed/v1/thrivecart.upsells.js', 'script'],
      ['https://www.youtube.com/iframe_api', 'script'],
      ['https://i.ytimg.com/vi/-bxw1Tqipts/hqdefault.jpg', 'image'],
      ['https://i.ytimg.com/vi/yKUhowGRyZc/hqdefault.jpg', 'image'],
      ['https://i.ytimg.com/vi/sk_rptdXxgs/hqdefault.jpg', 'image'],
      ['https://i.ytimg.com/vi/rrBxtVK_bhE/hqdefault.jpg', 'image'],
      ['https://i.ytimg.com/vi/HilWGNLjv2I/hqdefault.jpg', 'image'],
      ['images/real/tw-lesson.jpg', 'image'], ['images/real/tw-joy.jpg', 'image'],
      ['images/product/box-4chords.png', 'image'], ['images/product/workbook-100songs.png', 'image'],
      ['images/real/tw-minicourse.jpg', 'image'],
      ['images/singing/box-start-singing.png', 'image'], ['images/singing/box-singing-mastery.png', 'image'],
      ['images/singing/vocal-care-book.png', 'image'], ['images/singing/perf-banner.jpg', 'image'],
      ['images/real/perf-singing.jpg', 'image'],
      ['images/product/box-insider.png', 'image'], ['images/real/credit-voucher.jpg', 'image'],
      ['images/real/real-hall.jpg', 'image'], ['images/real/real-bench.jpg', 'image'],
      ['images/real/real-joy.jpg', 'image'], ['images/real/real-crowd.jpg', 'image'],
      ['images/reviews/tp-andrea-kenney.png', 'image'], ['images/reviews/tp-glenwood-clark.png', 'image'],
      ['images/reviews/tp-patric.png', 'image'], ['images/reviews/wall-heather-f.png', 'image'],
      ['images/reviews/wall-dan-seegmiller.png', 'image'], ['images/reviews/wall-jessie.png', 'image'],
      ['images/reviews/wall-caroline.png', 'image'], ['images/reviews/wall-clyde-simmons.png', 'image']
    ].filter(function (item) { return item[0] !== here; });

    function seq(list) {
      return list.reduce(function (chain, item) {
        return chain.then(function () { return warmUrl(item[0], item[1]); });
      }, Promise.resolve());
    }

    (function run() {
      /* stage 1: the main video gets the connection to itself first */
      var start;
      if (primary) start = buffered(primary, 12, 12000);
      else if (document.querySelector('.vembed--yt[data-vsl]')) {
        /* the YouTube hero buffers itself adaptively; give it a clean 6s
           runway before anything else touches the connection */
        start = new Promise(function (res) { setTimeout(res, 6000); });
      } else start = Promise.resolve();
      start.then(function () {
        /* stage 2: the checkout */
        return seq(checkoutQueue);
      }).then(function () {
        /* stage 3: the page's remaining videos (the testimonial), one at a
           time. Upgrade preload without load()-ing an element that already
           has data: load() would restart a playing preview. */
        return rest.reduce(function (chain, v) {
          return chain.then(function () {
            v.preload = 'auto';
            if (v.paused && v.readyState === 0) { try { v.load(); } catch (e) {} }
            LOG.push('video:' + (v.currentSrc || '').split('/').pop());
            return buffered(v, 8, 10000);
          });
        }, Promise.resolve());
      }).then(function () {
        /* stage 4: warm the rest of the funnel */
        return seq(SITE_WARM);
      });
    })();
  });

  /* ---- VSL playback extras (per the brief) ----
     1) a progress bar under the video that moves fast at first, then slows,
        so the video FEELS shorter than it is;
     2) a 20-minute offer timer that slides in ~10 minutes into watching. ---- */
  safe(function () {
    var fill = document.getElementById('vprogFill');
    var urg = document.getElementById('urgency20');
    if (!fill && !urg) return;
    var started = false;
    window.__raPlay = function (delayOverrideMs) {
      if (started) return; started = true;
      if (fill) {
        var T = 1680; // assumed full length in seconds; bar races early, crawls late
        if (reduce) { fill.style.width = '35%'; }
        else {
          var t0 = performance.now();
          (function step (now) {
            var p = Math.min((now - t0) / 1000 / T, 1);
            fill.style.width = ((1 - Math.pow(1 - p, 2.4)) * 100).toFixed(2) + '%';
            if (p < 1) requestAnimationFrame(step);
          })(t0);
        }
      }
      if (urg) {
        setTimeout(function () {
          urg.hidden = false;
          requestAnimationFrame(function () { urg.classList.add('show'); });
          var remain = 20 * 60;
          var out = urg.querySelector('[data-clock]');
          var iv = setInterval(function () {
            remain--;
            if (out) out.textContent = Math.floor(remain / 60) + ':' + String(remain % 60).padStart(2, '0');
            if (remain <= 0) clearInterval(iv);
          }, 1000);
        }, typeof delayOverrideMs === 'number' ? delayOverrideMs : 600000); // ~10 min in
      }
    };
  });

  /* ---- featured YouTube video: custom thumbnail + large rotating real testimonials -> load on click ---- */
  safe(function () {
    var box = document.getElementById('ytembed');
    var facade = document.getElementById('ytfacade');
    if (!box || !facade) return;
    var qEl = facade.querySelector('[data-yt-quote]');
    var cEl = facade.querySelector('[data-yt-cite]');
    /* verbatim fragments from real Trustpilot reviews (see TRANSCRIPTIONS.md) */
    var quotes = [
      ['"The best piano teacher I have ever had"', 'David Clarke · Verified · Trustpilot'],
      ['"I\'m 68... I have learned to play the piano with both hands"', 'Glenwood Clark · Verified · Trustpilot'],
      ['"10 minutes a day is enough to progress fast"', 'Patric · Verified · Trustpilot'],
      ['"It is streamlined, effective, and exciting"', 'Alice Saddler · Verified · Trustpilot'],
      ['"My goal to play piano in less than 6 months!"', 'Carlos Rodriguez · Verified · Trustpilot'],
      ['"I can play piano now!"', 'Julie Springer · Verified · Trustpilot']
    ];
    var i = 0;
    function render() { if (qEl) qEl.textContent = quotes[i][0]; if (cEl) cEl.textContent = quotes[i][1]; }
    render();
    var timer;
    if (!reduce) timer = setInterval(function () {
      if (qEl) qEl.style.opacity = '0'; if (cEl) cEl.style.opacity = '0';
      setTimeout(function () { i = (i + 1) % quotes.length; render(); if (qEl) qEl.style.opacity = '1'; if (cEl) cEl.style.opacity = '1'; }, 380);
    }, 3600);

    // self-hosted MP4 behind the facade. preload=metadata (not auto) keeps this
    // ~22MB file OFF the initial page load for speed; it buffers just-in-time when
    // the section scrolls into view (autoplay-on-scroll) or on first click.
    var v = document.createElement('video');
    v.src = 'videos/real-results.mp4';
    v.controls = true;
    v.setAttribute('controlsList', 'nodownload');
    v.setAttribute('playsinline', '');
    v.preload = 'metadata';
    v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;background:#000;object-fit:contain;visibility:hidden';
    var tr = document.createElement('track');
    tr.kind = 'subtitles'; tr.label = 'English'; tr.srclang = 'en'; tr.src = 'videos/real-results.en.vtt';
    v.appendChild(tr);
    box.insertBefore(v, facade);

    var built = false, engaged = false;
    function showVideo() {
      if (built) return; built = true;
      if (timer) clearInterval(timer);
      facade.classList.add('is-off');
      setTimeout(function () { facade.style.display = 'none'; }, 500);
      v.style.visibility = 'visible';
    }
    function captions(on) {
      try { if (tr.track) tr.track.mode = on ? 'showing' : 'hidden'; } catch (e) {}
    }

    /* unmute pill (same look as the VSL one) */
    var pill = document.createElement('button');
    pill.type = 'button'; pill.className = 'vsound'; pill.id = 'ytSound';
    pill.setAttribute('aria-label', 'Restart the testimonials with sound');
    pill.innerHTML = '<span class="vsound__pill">🔊 Click For Sound</span>';
    pill.style.display = 'none';
    box.appendChild(pill);

    /* one click anywhere = restart from 0 WITH sound */
    function engage() {
      if (engaged) return; engaged = true;
      showVideo();
      pill.classList.add('is-off');
      setTimeout(function () { pill.style.display = 'none'; }, 500);
      try { v.currentTime = 0; } catch (e) {}
      v.muted = false;
      captions(false);
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
    facade.addEventListener('click', engage);
    pill.addEventListener('click', engage);

    /* AUTOPLAY ON SCROLL: the moment the video section comes into view it
       starts MUTED with captions (autoplay rules require mute); it pauses
       again if scrolled away before the visitor engages */
    if (!reduce && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (engaged) { io.disconnect(); return; }
          if (en.isIntersecting) {
            if (!built) {
              showVideo();
              v.muted = true;
              captions(true);
              pill.style.display = '';
            }
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          } else if (built) {
            v.pause();
          }
        });
      }, { threshold: 0.45 });
      io.observe(box);
    }
  });

  /* ---- "Click Here" + every "Book a call" CTA opens the on-page booking (nothing leaves the page) ---- */
  safe(function () {
    var book = document.getElementById('book');
    var cta = document.querySelector('.bookcta');
    if (!book) return;
    function openBooking() {
      book.removeAttribute('hidden');
      book.classList.add('book--open');
      if (cta) cta.style.display = 'none';
      document.dispatchEvent(new CustomEvent('book:open')); // triggers Calendly preload
      scrollToEl(book, 'start');
      var first = book.querySelector('[name="name"]');
      if (first) setTimeout(function () { try { first.focus(); } catch (e) {} }, 420);
    }
    var btn = document.getElementById('bookOpen');
    if (btn) btn.addEventListener('click', openBooking);
    // any in-page "#book" CTA opens the booking instead of jumping
    [].forEach.call(document.querySelectorAll('a[href="#book"]'), function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); openBooking(); });
    });
    // placeholder "#" links must never navigate/jump away from this page
    [].forEach.call(document.querySelectorAll('a[href="#"]'), function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); });
    });
  });

  /* ---- booking · side-by-side form + Calendly (qualifying drops in on first input) ---- */
  safe(function () {
    var widget = document.getElementById('book');
    if (!widget) return;
    var host = document.getElementById('calInline');
    var form = document.getElementById('bookForm');
    var mock = document.getElementById('calMock');
    var overlay = document.getElementById('calOverlay');
    var qual = document.getElementById('qualBlock');
    var tabForm = document.getElementById('tabForm');
    var tabCal = document.getElementById('tabCal');
    if (!host || !form) return;

    // the client's canonical share link (event was renamed to "Masterclass"; the old
    // ...-piano-consultation slug still resolves to the same event as a fallback)
    var BASE = 'https://calendly.com/d/dv25-nhh-w9v/free-piano-consultation';
    // Loaded via Calendly's OFFICIAL widget.js (in the page head) instead of a hand-built iframe,
    // which Calendly refuses to frame on some setups. Brand theme + hide the details panel/GDPR banner.
    // CALENDAR RED = #AC1818 (user decision, matches the custom calendar's day numbers) so
    // every red in the booking experience is the same: our day numbers, slot pills, and the
    // Calendly-themed accents incl. the Schedule Event button fill on the confirm step.
    var CAL_URL = BASE + '?hide_gdpr_banner=1&hide_event_type_details=1' +
      '&background_color=fffbf4&text_color=000000&primary_color=AC1818';

    /* ================= CUSTOM BRANDED CALENDAR =================
       Our own fully brand-styled day/time picker (bold red day numbers, no circles) that
       replaces Calendly's date/time screens. Calendly is only used for the FINAL step: picking
       a slot deep-links straight into the event's "Enter Details" form (slot URLs verified
       working on this d/ link), so bookings, reminders and calendar sync are unchanged.
       ACTIVATION: set CCAL.endpoint to the availability Worker URL (real data, see README) -
       or preview with ?customcal=demo (fabricated slots; details form loads for real, but
       Calendly may refuse to finalize a demo slot that isn't genuinely free). Default = OFF ->
       the standard Calendly widget flow below runs exactly as before. */
    var CCAL = {
      endpoint: '',   // e.g. 'https://ridley-availability.<account>.workers.dev' once Stephen's API token is wired
      demo: /[?&]customcal=demo/.test(location.search)
    };
    var ccalActive = !!(CCAL.endpoint || CCAL.demo);

    function p2(n) { return (n < 10 ? '0' : '') + n; }
    var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var DOWS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

    // demo availability: next 3 weeks, Sundays off, classic coaching hours (Eastern, July = -04:00)
    function ccalDemoDays() {
      var out = [], now = new Date();
      for (var i = 1; i <= 21; i++) {
        var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        if (d.getDay() === 0) continue;
        var key = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
        var slots = [];
        [10, 11, 14, 15, 16, 17].forEach(function (h) {
          [0, 30].forEach(function (m) {
            slots.push(key + 'T' + p2(h) + ':' + p2(m) + ':00-04:00');
          });
        });
        out.push({ date: key, slots: slots });
      }
      return out;
    }
    // Worker contract: GET endpoint -> JSON [{date:'YYYY-MM-DD', slots:['ISO', ...]}, ...]
    function ccalFetchDays(cb) {
      if (!CCAL.endpoint) { cb(ccalDemoDays()); return; }
      fetch(CCAL.endpoint).then(function (r) { return r.json(); })
        .then(function (j) { cb(j && j.length ? j : null); })
        .catch(function () { cb(null); });
    }

    var ccalData = null;    // [{date, slots}]
    var ccalByDate = {};    // date -> slots
    var ccalMonths = [];    // ['2026-07', ...] in order
    var ccalMi = 0;         // current month index

    function ccalTzLine() {
      var tz = 'your local time';
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' '); } catch (e) {}
      var now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
      return '<div class="ccal__tz"><b>Time zone</b><br>&#127760; ' + tz + ' (' + now + ')' +
        (CCAL.demo ? '<br><span style="opacity:.55">demo availability - live slots connect with the booking key</span>' : '') + '</div>';
    }
    function ccalFmtTime(iso) {
      return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(/\s/g, '');
    }
    function initCCal() {
      host.classList.add('has-ccal');   // compact mobile height (JS class = works on every browser)
      host.innerHTML = '<div class="ccal"><div class="ccal__loading"><span>Loading available days&hellip;</span></div></div>';
      ccalFetchDays(function (days) {
        if (!days) {   // availability feed unreachable -> fall back to the stock Calendly widget flow
          ccalActive = false;
          host.classList.remove('has-ccal');
          buildCal(currentPrefill());
          return;
        }
        ccalData = days;
        ccalByDate = {}; ccalMonths = [];
        days.forEach(function (d) {
          if (!d.slots || !d.slots.length) return;
          ccalByDate[d.date] = d.slots;
          var m = d.date.slice(0, 7);
          if (ccalMonths.indexOf(m) === -1) ccalMonths.push(m);
        });
        ccalMonths.sort();
        ccalMi = 0;
        ccalRenderMonth();
      });
    }
    function ccalRenderMonth() {
      ccalSetConfirm(false);
      var ym = ccalMonths[ccalMi];
      if (!ym) { host.innerHTML = '<div class="ccal"><div class="ccal__loading"><span>No open times right now - please check back soon.</span></div></div>'; return; }
      var y = +ym.slice(0, 4), m = +ym.slice(5, 7);
      var firstDow = new Date(y, m - 1, 1).getDay();
      var daysInMonth = new Date(y, m, 0).getDate();
      var html = '<div class="ccal">' +
        '<div class="ccal__title">Select a Day</div>' +
        '<div class="ccal__nav">' +
          '<button type="button" class="ccal__arrow" data-nav="-1"' + (ccalMi === 0 ? ' disabled' : '') + '>&#8249;</button>' +
          '<b>' + MONTHS[m - 1] + ' ' + y + '</b>' +
          '<button type="button" class="ccal__arrow" data-nav="1"' + (ccalMi >= ccalMonths.length - 1 ? ' disabled' : '') + '>&#8250;</button>' +
        '</div>' +
        '<div class="ccal__dow">' + DOWS.map(function (d) { return '<div>' + d + '</div>'; }).join('') + '</div>' +
        '<div class="ccal__grid">';
      for (var b = 0; b < firstDow; b++) html += '<div></div>';
      for (var n = 1; n <= daysInMonth; n++) {
        var key = ym + '-' + p2(n);
        if (ccalByDate[key]) html += '<button type="button" class="ccal__day is-avail" data-day="' + key + '">' + n + '</button>';
        else html += '<div class="ccal__day">' + n + '</div>';
      }
      html += '</div>' + ccalTzLine() + '</div>';
      host.innerHTML = html;
      [].forEach.call(host.querySelectorAll('.ccal__arrow'), function (b) {
        b.addEventListener('click', function () { ccalMi += +b.getAttribute('data-nav'); ccalRenderMonth(); });
      });
      [].forEach.call(host.querySelectorAll('.ccal__day.is-avail'), function (b) {
        b.addEventListener('click', function () { ccalRenderDay(b.getAttribute('data-day')); });
      });
    }
    function ccalRenderDay(key) {
      var slots = ccalByDate[key] || [];
      var d = new Date(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10));
      var head = d.toLocaleDateString([], { weekday: 'long' });
      var sub = d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
      var html = '<div class="ccal">' +
        '<button type="button" class="ccal__back">&#8249; All days</button>' +
        '<div class="ccal__dayhead">' + head + '</div>' +
        '<div class="ccal__daysub">' + sub + ' &middot; 30 min call</div>' +
        '<div class="ccal__slots">' +
          slots.map(function (s) { return '<button type="button" class="ccal__slot" data-slot="' + s + '">' + ccalFmtTime(s) + '</button>'; }).join('') +
        '</div>' + ccalTzLine() + '</div>';
      host.innerHTML = html;
      host.querySelector('.ccal__back').addEventListener('click', ccalRenderMonth);
      [].forEach.call(host.querySelectorAll('.ccal__slot'), function (b) {
        b.addEventListener('click', function () { ccalConfirm(b.getAttribute('data-slot'), key); });
      });
    }
    function ccalSetConfirm(on) {
      var bc = document.getElementById('bookCal');
      if (bc) bc.classList.toggle('is-confirm', !!on);
    }
    function ccalConfirm(slotIso, dayKey) {
      // hand off to Calendly ONLY for the final confirm: the slot deep-link opens the event's
      // "Enter Details" form directly (verified live), prefilled with the visitor's info.
      // The panel pulses (Book-CTA style) to spotlight the Schedule Event button - the button
      // itself lives inside Calendly's iframe, so the glow is ours, its fill color theirs (AC1818).
      var url = BASE + '/' + slotIso + '?hide_gdpr_banner=1&hide_event_type_details=1' +
        '&background_color=fffbf4&text_color=000000&primary_color=AC1818';
      function backPill() {
        var back = document.createElement('button');
        back.type = 'button'; back.className = 'ccal__change'; back.innerHTML = '&#8249; change time';
        back.addEventListener('click', function () { ccalSetConfirm(false); ccalRenderDay(dayKey); });
        host.appendChild(back);
      }
      host.innerHTML = '<div class="ccal"><div class="ccal__loading"><span>Locking in ' + ccalFmtTime(slotIso) + '&hellip;</span></div></div>';
      backPill();   // the way back always exists, even while loading
      whenCalendly(function () {
        host.innerHTML = '';
        backPill();
        try { window.Calendly.initInlineWidget({ url: url, parentElement: host, prefill: prefillFor(currentPrefill()) }); } catch (e) {}
        var f = host.querySelector('iframe');
        if (f) f.addEventListener('load', kickSmsPrefillSoon, { once: true });
        ccalSetConfirm(true);
      });
      // escape hatch: if Calendly's script is blocked (ad blocker / outage), give a direct
      // link to the same slot on their secure page so the booking can ALWAYS be completed
      setTimeout(function () {
        if (window.Calendly && window.Calendly.initInlineWidget) return;
        var L = host.querySelector('.ccal__loading');
        if (L) L.innerHTML = '<span>Finish locking in your time on our secure booking page:</span>' +
          '<a class="btn btn--fire" style="margin-top:.5em" target="_blank" rel="noopener" href="' + url +
          '">Confirm ' + ccalFmtTime(slotIso) + ' &#8250;</a>';
      }, 6000);
    }
    /* ================= /CUSTOM BRANDED CALENDAR ================= */

    var name  = form.querySelector('[name="name"]');
    var email = form.querySelector('[name="email"]');
    var phone = form.querySelector('[name="phone"]');
    var consent = form.querySelector('.book__consent input');
    var answers = { q1: '', q2: '', q3: '', q4: '' };
    var q3El = document.getElementById('qual3');
    if (q3El) q3El.addEventListener('input', function () {
      answers.q3 = (q3El.value || '').trim();
    });
    var STORE_KEY = 'ridley_lead_v1';

    /* ---- COUNTRY-CODE PICKER, replicated from Calendly's own panel (Ori 7/26) ----
       Tapping the flag pill opens the .ccpanel sheet over the booking card:
       pinned common countries, a divider, then the full A-Z list. Each row =
       flag image (flagcdn, lazy) + English name + native name in parentheses
       + right-aligned dial code; the selected row is fire red; Close sits at
       the bottom. Data: "Name|ISO|dial|native" (native empty when it matches
       the English name, exactly like Calendly's list). NANP territories show
       their real prefix (+1242 Bahamas...) while US/CA/DO/JM/PR show +1,
       mirroring Calendly. */
    var CC_DATA = "Afghanistan|AF|93|افغانستان;Albania|AL|355|Shqipëri;Algeria|DZ|213|الجزائر;American Samoa|AS|1684|;Andorra|AD|376|;Angola|AO|244|;Anguilla|AI|1264|;Antigua and Barbuda|AG|1268|;Argentina|AR|54|;Armenia|AM|374|Հայաստան;Aruba|AW|297|;Australia|AU|61|;Austria|AT|43|Österreich;Azerbaijan|AZ|994|Azərbaycan;Bahamas|BS|1242|;Bahrain|BH|973|البحرين;Bangladesh|BD|880|বাংলাদেশ;Barbados|BB|1246|;Belarus|BY|375|Беларусь;Belgium|BE|32|België;Belize|BZ|501|;Benin|BJ|229|Bénin;Bermuda|BM|1441|;Bhutan|BT|975|;Bolivia|BO|591|;Bosnia and Herzegovina|BA|387|Босна и Херцеговина;Botswana|BW|267|;Brazil|BR|55|Brasil;British Indian Ocean Territory|IO|246|;British Virgin Islands|VG|1284|;Brunei|BN|673|;Bulgaria|BG|359|България;Burkina Faso|BF|226|;Burundi|BI|257|Uburundi;Cambodia|KH|855|កម្ពុជា;Cameroon|CM|237|Cameroun;Canada|CA|1|;Cape Verde|CV|238|Kabu Verdi;Caribbean Netherlands|BQ|599|;Cayman Islands|KY|1345|;Central African Republic|CF|236|République centrafricaine;Chad|TD|235|Tchad;Chile|CL|56|;China|CN|86|中国;Christmas Island|CX|61|;Cocos (Keeling) Islands|CC|61|;Colombia|CO|57|;Comoros|KM|269|جزر القمر;Congo (DRC)|CD|243|Jamhuri ya Kidemokrasia ya Kongo;Congo (Republic)|CG|242|Congo-Brazzaville;Cook Islands|CK|682|;Costa Rica|CR|506|;Côte d'Ivoire|CI|225|;Croatia|HR|385|Hrvatska;Cuba|CU|53|;Curaçao|CW|599|;Cyprus|CY|357|Κύπρος;Czech Republic|CZ|420|Česká republika;Denmark|DK|45|Danmark;Djibouti|DJ|253|;Dominica|DM|1767|;Dominican Republic|DO|1|República Dominicana;Ecuador|EC|593|;Egypt|EG|20|مصر;El Salvador|SV|503|;Equatorial Guinea|GQ|240|Guinea Ecuatorial;Eritrea|ER|291|;Estonia|EE|372|Eesti;Ethiopia|ET|251|;Falkland Islands|FK|500|Islas Malvinas;Faroe Islands|FO|298|Føroyar;Fiji|FJ|679|;Finland|FI|358|Suomi;France|FR|33|;French Guiana|GF|594|Guyane française;French Polynesia|PF|689|Polynésie française;Gabon|GA|241|;Gambia|GM|220|;Georgia|GE|995|საქართველო;Germany|DE|49|Deutschland;Ghana|GH|233|Gaana;Gibraltar|GI|350|;Greece|GR|30|Ελλάδα;Greenland|GL|299|Kalaallit Nunaat;Grenada|GD|1473|;Guadeloupe|GP|590|;Guam|GU|1671|;Guatemala|GT|502|;Guernsey|GG|44|;Guinea|GN|224|Guinée;Guinea-Bissau|GW|245|Guiné Bissau;Guyana|GY|592|;Haiti|HT|509|;Honduras|HN|504|;Hong Kong|HK|852|香港;Hungary|HU|36|Magyarország;Iceland|IS|354|Ísland;India|IN|91|भारत;Indonesia|ID|62|;Iran|IR|98|ایران;Iraq|IQ|964|العراق;Ireland|IE|353|;Isle of Man|IM|44|;Israel|IL|972|ישראל;Italy|IT|39|Italia;Jamaica|JM|1|;Japan|JP|81|日本;Jersey|JE|44|;Jordan|JO|962|الأردن;Kazakhstan|KZ|7|Казахстан;Kenya|KE|254|;Kiribati|KI|686|;Kosovo|XK|383|;Kuwait|KW|965|الكويت;Kyrgyzstan|KG|996|Кыргызстан;Laos|LA|856|ລາວ;Latvia|LV|371|Latvija;Lebanon|LB|961|لبنان;Lesotho|LS|266|;Liberia|LR|231|;Libya|LY|218|ليبيا;Liechtenstein|LI|423|;Lithuania|LT|370|Lietuva;Luxembourg|LU|352|;Macau|MO|853|澳門;Madagascar|MG|261|Madagasikara;Malawi|MW|265|;Malaysia|MY|60|;Maldives|MV|960|;Mali|ML|223|;Malta|MT|356|;Marshall Islands|MH|692|;Martinique|MQ|596|;Mauritania|MR|222|موريتانيا;Mauritius|MU|230|Moris;Mayotte|YT|262|;Mexico|MX|52|México;Micronesia|FM|691|;Moldova|MD|373|Republica Moldova;Monaco|MC|377|;Mongolia|MN|976|Монгол;Montenegro|ME|382|Crna Gora;Montserrat|MS|1664|;Morocco|MA|212|المغرب;Mozambique|MZ|258|Moçambique;Myanmar (Burma)|MM|95|မြန်မာ;Namibia|NA|264|Namibië;Nauru|NR|674|;Nepal|NP|977|नेपाल;Netherlands|NL|31|Nederland;New Caledonia|NC|687|Nouvelle-Calédonie;New Zealand|NZ|64|;Nicaragua|NI|505|;Niger|NE|227|Nijar;Nigeria|NG|234|;Niue|NU|683|;Norfolk Island|NF|672|;North Korea|KP|850|조선 민주주의 인민 공화국;North Macedonia|MK|389|Македонија;Northern Mariana Islands|MP|1670|;Norway|NO|47|Norge;Oman|OM|968|عُمان;Pakistan|PK|92|پاکستان;Palau|PW|680|;Palestine|PS|970|فلسطين;Panama|PA|507|Panamá;Papua New Guinea|PG|675|;Paraguay|PY|595|;Peru|PE|51|Perú;Philippines|PH|63|;Poland|PL|48|Polska;Portugal|PT|351|;Puerto Rico|PR|1|;Qatar|QA|974|قطر;Réunion|RE|262|La Réunion;Romania|RO|40|România;Russia|RU|7|Россия;Rwanda|RW|250|;Saint Barthélemy|BL|590|;Saint Helena|SH|290|;Saint Kitts and Nevis|KN|1869|;Saint Lucia|LC|1758|;Saint Martin|MF|590|Saint-Martin (partie française);Saint Pierre and Miquelon|PM|508|Saint-Pierre-et-Miquelon;Saint Vincent and the Grenadines|VC|1784|;Samoa|WS|685|;San Marino|SM|378|;São Tomé and Príncipe|ST|239|São Tomé e Príncipe;Saudi Arabia|SA|966|المملكة العربية السعودية;Senegal|SN|221|Sénégal;Serbia|RS|381|Србија;Seychelles|SC|248|;Sierra Leone|SL|232|;Singapore|SG|65|;Sint Maarten|SX|1721|;Slovakia|SK|421|Slovensko;Slovenia|SI|386|Slovenija;Solomon Islands|SB|677|;Somalia|SO|252|Soomaaliya;South Africa|ZA|27|;South Korea|KR|82|대한민국;South Sudan|SS|211|جنوب السودان;Spain|ES|34|España;Sri Lanka|LK|94|ශ්‍රී ලංකාව;Sudan|SD|249|السودان;Suriname|SR|597|;Svalbard and Jan Mayen|SJ|47|;Swaziland|SZ|268|;Sweden|SE|46|Sverige;Switzerland|CH|41|Schweiz;Syria|SY|963|سوريا;Taiwan|TW|886|台灣;Tajikistan|TJ|992|;Tanzania|TZ|255|;Thailand|TH|66|ไทย;Timor-Leste|TL|670|;Togo|TG|228|;Tokelau|TK|690|;Tonga|TO|676|;Trinidad and Tobago|TT|1868|;Tunisia|TN|216|تونس;Turkey|TR|90|Türkiye;Turkmenistan|TM|993|;Turks and Caicos Islands|TC|1649|;Tuvalu|TV|688|;U.S. Virgin Islands|VI|1340|;Uganda|UG|256|;Ukraine|UA|380|Україна;United Arab Emirates|AE|971|الإمارات العربية المتحدة;United Kingdom|GB|44|;United States|US|1|;Uruguay|UY|598|;Uzbekistan|UZ|998|Oʻzbekiston;Vanuatu|VU|678|;Vatican City|VA|39|Città del Vaticano;Venezuela|VE|58|;Vietnam|VN|84|Việt Nam;Wallis and Futuna|WF|681|Wallis-et-Futuna;Western Sahara|EH|212|الصحراء الغربية;Yemen|YE|967|اليمن;Zambia|ZM|260|;Zimbabwe|ZW|263|;Åland Islands|AX|358|";
    var CC_PINNED = ['US', 'GB', 'DE', 'FR', 'AU', 'CN'];   // top section, Calendly's order
    var ccDial = '+1';    // the selected dial code; every prefill path reads this
    var ccIso = 'US';
    (function initCC() {
      var pill = document.getElementById('ccFlag');
      var pillImg = document.getElementById('ccFlagImg');
      var pillTxt = document.getElementById('ccFlagTxt');
      var panel = document.getElementById('ccPanel');
      var list = document.getElementById('ccList');
      var closeBtn = document.getElementById('ccClose');
      if (!pill || !panel || !list) return;

      var byIso = {};
      var all = CC_DATA.split(';').map(function (row) {
        var p = row.split('|');
        var c = { name: p[0], iso: p[1], dial: '+' + p[2], native: p[3] || '' };
        byIso[c.iso] = c;
        return c;
      });

      function makeRow(c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ccrow' + (c.iso === ccIso ? ' is-sel' : '');
        b.setAttribute('data-iso', c.iso);
        b.innerHTML = '<img src="https://flagcdn.com/w40/' + c.iso.toLowerCase() + '.png" alt="" loading="lazy" decoding="async">' +
          '<span class="ccrow__name">' + c.name + (c.native ? ' <i>(' + c.native + ')</i>' : '') + '</span>' +
          '<span class="ccrow__code">' + c.dial + '</span>';
        b.addEventListener('click', function () { window.__setCC(c.iso); closePanel(); });
        return b;
      }
      CC_PINNED.forEach(function (iso) { if (byIso[iso]) list.appendChild(makeRow(byIso[iso])); });
      var div = document.createElement('div');
      div.className = 'ccdivider';
      list.appendChild(div);
      all.forEach(function (c) { list.appendChild(makeRow(c)); });

      /* exposed so restoreLead (further down) can re-apply a saved country */
      window.__setCC = function (iso) {
        var c = byIso[iso];
        if (!c) return;
        ccIso = c.iso; ccDial = c.dial;
        pillImg.src = 'https://flagcdn.com/w40/' + c.iso.toLowerCase() + '.png';
        pillTxt.textContent = c.dial;
        [].forEach.call(list.querySelectorAll('.ccrow'), function (r) {
          r.classList.toggle('is-sel', r.getAttribute('data-iso') === iso);
        });
        /* the dial code is part of the phone number: persist it and rebuild the
           invisible prefilled calendar so Calendly gets the new full number */
        try { saveLead(); scheduleUpgrade(); } catch (e) {}
      };
      function openPanel() {
        panel.removeAttribute('hidden');
        var sel = list.querySelector('.ccrow.is-sel');
        if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'center' });
      }
      function closePanel() { panel.setAttribute('hidden', ''); }
      pill.addEventListener('click', openPanel);
      closeBtn.addEventListener('click', closePanel);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
    })();

    // Calendly wants the phone in full international format, and the SELECTED
    // country code must ALWAYS be the prefix. (A 9-digit US typo used to fall
    // through as bare +727..., which Calendly's field read as +7 = RUSSIA and
    // flagged accordingly. Never again: every branch below stamps the chosen
    // code on the front, whatever the length of what was typed/autofilled.)
    // +1 family keeps the US conventions; NANP territories (+1242...) prepend
    // their full prefix to 7-digit island locals; every other code strips the
    // national leading zero(s) (e.g. UK 07911... -> +447911...). A number the
    // visitor typed with its own + passes through untouched.
    function telE164(raw, cc) {
      var d = String(raw || '').replace(/[^\d+]/g, '');
      if (!d) return '';
      if (d.charAt(0) === '+') return d;
      d = d.replace(/\D/g, '');
      cc = cc || ccDial || '+1';
      if (cc.charAt(1) === '1') {
        if (d.length === 11 && d.charAt(0) === '1') return '+' + d;
        if (d.length === 10) return '+1' + d;
        if (cc.length > 2 && d.length === 7) return cc + d;   // island local number
        return '+1' + d;   // odd length: still +1, matching the visitor's selection
      }
      return cc + d.replace(/^0+/, '');
    }
    // Prefill ONLY the contact fields (name/email/phone) so the calendar preloaded while the visitor
    // types is identical to the one shown on Continue -> Continue reveals it with ZERO reload. Phone
    // goes into Calendly's SMS-reminder field AND the first custom question a1 (real a-slot depends on
    // the event's question order in Stephen's Calendly).
    function prefillFor(p) {
      var pf = {};
      if (!p) return pf;
      if (p.name)  pf.name  = p.name;
      if (p.email) pf.email = p.email;
      var tel = telE164(p.phone);
      if (tel) { pf.smsReminderNumber = tel; pf.customAnswers = { a1: tel }; }
      return pf;
    }
    // WHY THE SMS BOX NEEDS THIS: Calendly's widget.js WHITELISTS the prefill keys it forwards
    // into the booking iframe (name/firstName/lastName/email/a1-a10/guests) and silently DROPS
    // smsReminderNumber - read straight from assets.calendly.com/assets/external/widget.js
    // (getDeferredPrefillPayload). Prefill actually travels as postMessage
    // {event:'calendly.prefill', payload} fired on iframe load. So we re-send that same envelope
    // OURSELVES with the phone under every plausible key ("Send text messages to" input is
    // name="phone_number" in their DOM), and re-fire when the details form mounts.
    function kickSmsPrefill() {
      var p = currentPrefill();
      var tel = telE164(p.phone);
      var payload = {};
      if (p.name)  payload.name = p.name;
      if (p.email) payload.email = p.email;
      if (tel) {
        payload.a1 = tel;
        payload.smsReminderNumber = tel; payload.sms_reminder_number = tel;
        payload.phone_number = tel;      payload.phoneNumber = tel;
      }
      if (!Object.keys(payload).length) return;
      var msg = { event: 'calendly.prefill', payload: payload };
      [].forEach.call(host.querySelectorAll('iframe'), function (f) {
        try { if (f.contentWindow) f.contentWindow.postMessage(msg, 'https://calendly.com'); } catch (e) {}
      });
    }
    // fire now + twice more, mirroring widget.js's own load(x3) retry rhythm
    function kickSmsPrefillSoon() {
      kickSmsPrefill();
      setTimeout(kickSmsPrefill, 350);
      setTimeout(kickSmsPrefill, 1100);
    }
    // the "Enter Details" form (with the SMS box) mounts right after a time is picked -
    // re-send at that moment so the data is waiting when the form reads it. Safe: this is
    // before the visitor can have typed anything into the details step.
    window.addEventListener('message', function (e) {
      if (e && e.data && typeof e.data === 'object' &&
          e.data.event === 'calendly.date_and_time_selected') kickSmsPrefillSoon();
    });
    // wait for the official widget.js (async in the head) to be ready, then run cb
    function whenCalendly(cb) {
      if (window.Calendly && window.Calendly.initInlineWidget) { cb(); return; }
      var n = 0, iv = setInterval(function () {
        if (window.Calendly && window.Calendly.initInlineWidget) { clearInterval(iv); cb(); }
        else if (++n > 200) { clearInterval(iv); }   // ~25s ceiling, then stop quietly
      }, 125);
    }
    var builtKey = null;   // contact key the LIVE calendar was built with (null = not built yet)
    var calFrozen = false; // once the visitor is picking a time, NEVER touch the widget
    var upgrading = false;
    function keyOf(p) { return p ? ((p.name || '') + '|' + (p.email || '') + '|' + (p.phone || '')) : ''; }

    // direct-iframe URL (fallback path): same link with embed params + contact prefill in the URL
    function rawCalUrl(p) {
      var u = CAL_URL + '&embed_domain=' + encodeURIComponent(location.hostname) + '&embed_type=Inline';
      if (p) {
        if (p.name)  u += '&name='  + encodeURIComponent(p.name);
        if (p.email) u += '&email=' + encodeURIComponent(p.email);
        var tel = telE164(p.phone);
        if (tel) u += '&a1=' + encodeURIComponent(tel) + '&location=' + encodeURIComponent(tel);
      }
      return u;
    }
    // BUILD ONCE, IMMEDIATELY at page open, and never rebuild while the visitor types.
    // (The old version reloaded the widget on every contact keystroke to inject the prefill,
    // which kept throwing away the loaded calendar - that was the visible slowness.)
    function buildCal(p) {
      whenCalendly(function () {
        if (builtKey !== null) return;                 // already built - never rebuild the live one
        builtKey = keyOf(p);
        host.innerHTML = '';                           // clear the "Loading…" fallback
        try { window.Calendly.initInlineWidget({ url: CAL_URL, parentElement: host, prefill: prefillFor(p) }); } catch (e) {}
        var f0 = host.querySelector('iframe');
        if (f0) f0.addEventListener('load', kickSmsPrefillSoon, { once: true });
      });
      // resilience: if widget.js hasn't arrived within 5s (blocked by an ad blocker / slow network),
      // embed the calendar as a plain iframe instead - still preloaded, still opens instantly
      setTimeout(function () {
        if (builtKey !== null || (window.Calendly && window.Calendly.initInlineWidget)) return;
        builtKey = keyOf(p);
        host.innerHTML = '';
        var f = document.createElement('iframe');
        f.src = rawCalUrl(p);
        f.title = 'Ridley Academy Piano Consultation booking';
        f.setAttribute('frameborder', '0');
        f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block';
        f.addEventListener('load', kickSmsPrefillSoon, { once: true });
        host.appendChild(f);
      }, 5000);
    }

    // INVISIBLE double-buffered upgrade: as soon as the contact details are complete, load a
    // PREFILLED copy hidden BEHIND the live calendar and swap it in only once it has fully loaded.
    // The visitor never sees a loading state - if the prefilled copy isn't ready when they press
    // Continue, they get the already-loaded calendar instantly and the prefill lands right after.
    // If the data changes while an upgrade is in flight, the newest data is QUEUED so the final
    // calendar always carries exactly what they typed (name/email/phone -> Calendly's details step).
    var pendingUpgrade = null;
    function upgradeCal(p) {
      if (ccalActive) return;   // custom calendar reads the form live at confirm - no buffered swaps
      var key = keyOf(p);
      if (calFrozen || builtKey === null || key === builtKey || !key) return;
      if (upgrading) { pendingUpgrade = p; return; }   // remember the newest data for when this one finishes
      upgrading = true;
      function finish() {
        upgrading = false;
        var q = pendingUpgrade; pendingUpgrade = null;
        if (q) upgradeCal(q);                          // chain the queued (newest) data
      }
      var buf = document.createElement('div');
      buf.style.cssText = 'position:absolute;inset:0;visibility:hidden;pointer-events:none';
      host.appendChild(buf);
      var ifr = null;
      if (window.Calendly && window.Calendly.initInlineWidget) {
        // official widget available -> prefill via the widget API
        try { window.Calendly.initInlineWidget({ url: CAL_URL, parentElement: buf, prefill: prefillFor(p) }); }
        catch (e) { buf.remove(); finish(); return; }
        ifr = buf.querySelector('iframe');
      } else {
        // widget.js blocked (the live calendar is the raw-iframe fallback) -> prefill via URL params
        ifr = document.createElement('iframe');
        ifr.src = rawCalUrl(p);
        ifr.title = 'Ridley Academy Piano Consultation booking';
        ifr.setAttribute('frameborder', '0');
        ifr.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block';
        buf.appendChild(ifr);
      }
      if (!ifr) { buf.remove(); finish(); return; }
      var done = false;
      var to = setTimeout(function () { if (!done) { done = true; buf.remove(); finish(); } }, 20000);
      ifr.addEventListener('load', function () {
        if (done) return; done = true; clearTimeout(to);
        if (calFrozen) { buf.remove(); finish(); return; }   // they're already picking - don't reset them
        [].slice.call(host.children).forEach(function (c) { if (c !== buf) c.remove(); });
        buf.style.visibility = ''; buf.style.pointerEvents = '';
        builtKey = key; finish();
        kickSmsPrefillSoon();   // freshly swapped-in calendar -> hand it the SMS phone too
      });
    }
    // start the prefilled upgrade the MOMENT the contact details are complete (debounced while
    // they finish typing) - it has the whole qualifying-questions stretch to load invisibly,
    // so by Continue the calendar already carries their name/email/phone into "Enter Details"
    var upgradeTimer;
    function scheduleUpgrade() {
      clearTimeout(upgradeTimer);
      upgradeTimer = setTimeout(function () { if (contactReady()) upgradeCal(currentPrefill()); }, 700);
    }
    // once the visitor clicks into the calendar iframe to pick a time, freeze so a background swap never resets them
    window.addEventListener('blur', function () {
      if (document.activeElement && document.activeElement.tagName === 'IFRAME' &&
          host.contains(document.activeElement)) calFrozen = true;
    });
    function currentPrefill() {
      return { name: (name.value || '').trim(), email: (email.value || '').trim(),
        phone: (phone.value || '').trim(), q1: answers.q1, q2: answers.q2 };
    }
    function contactReady() {
      return nameOk() && phoneOk() && /\S+@\S+\.\S+/.test((email.value || '').trim());
    }
    // Continue: reveal the calendar, but ONLY once it actually carries the visitor's
    // details. The overlay covers the calendar and blocks clicks, so while it is up they
    // can never touch (and "freeze") an un-prefilled calendar. We keep it up until the
    // prefilled copy is in place - which has usually finished loading during the qualifying
    // questions, so the reveal stays instant - guaranteeing their name/email/phone reach
    // Calendly's "Enter Details" step every time instead of racing the calendar's load.
    function unlockCalendar(p) {
      if (tabForm) tabForm.classList.remove('is-active');
      if (tabCal) tabCal.classList.add('is-active');
      // custom branded calendar: it's ours, always ready - reveal instantly (the visitor's
      // details are read live at the final confirm step, so there is no prefill race)
      if (ccalActive) { if (overlay) overlay.setAttribute('hidden', ''); return; }
      var key = keyOf(p);
      // already prefilled with exactly this data -> reveal instantly
      if (!key || builtKey === key) { if (overlay) overlay.setAttribute('hidden', ''); return; }
      // otherwise keep the calendar covered while the prefilled copy loads in behind it
      var msg = overlay && overlay.querySelector('span');
      if (msg) msg.textContent = 'Loading your available times…';
      if (overlay) overlay.removeAttribute('hidden');
      upgradeCal(p);
      var t0 = Date.now();
      var poll = setInterval(function () {
        if (builtKey === key || Date.now() - t0 > 12000) {   // ready (or safety timeout) -> reveal
          clearInterval(poll);
          if (overlay) overlay.setAttribute('hidden', '');
        }
      }, 120);
    }

    /* ---- the single qualifying rule ----
       Used by BOTH the Continue button and the live pill handler below, so the
       calendar can never disagree with the answers currently on screen. */
    /* QUESTIONS v2 (7/31): q2 is now a spend range, not a Yes/No, so it can no longer
       disqualify anyone. Timing is the only remaining hard signal. Spend and q3 ride
       along as closer context and land in AC as custom fields.
       QUESTIONS v2.1 (8/2): q4 (capacity) added and DELIBERATELY EXCLUDED from this
       function. It routes and prioritises, it does not reject. "Under $1,500" is a
       tripwire-first lead and a nurture lead, not a bounce, and "I'd want to see the
       options first" is a soft yes that a gate would read as a no. If the calendar ever
       genuinely overfills, tighten by routing low bands to booking-b, not by blocking.
       OPEN DECISION (plan Track C item 4): whether "Not any time soon" should keep
       hard-redirecting to the tripwire, or route softly to the booking-b calendar.
       Left as-is pending Chris. The capture beacon below now fires BEFORE this runs,
       so a redirected visitor is still a contact either way. */
    function isDisqualified() {
      return answers.q1 === 'Not any time soon';
    }

    /* Re-lock the calendar. Needed because Continue reveals it, and the visitor can
       then scroll back up and change an answer to a disqualifying one: without this
       the calendar would sit there open and they could book a call they are not
       qualified for. Puts the overlay back, returns the tab state to the form, and
       clears the "ready" key so a later re-qualify rebuilds the prefill properly. */
    function lockCalendar(reason) {
      if (tabCal) tabCal.classList.remove('is-active');
      if (tabForm) tabForm.classList.add('is-active');
      if (!overlay) return;
      var msg = overlay.querySelector('span');
      if (msg) msg.textContent = reason || 'Please fill out the form before choosing your time slot.';
      overlay.removeAttribute('hidden');
    }

    // persist everything the visitor types so a returning visitor is auto-filled
    function saveLead() {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({
          name: name.value, phone: phone.value, email: email.value, cc: ccDial, ccIso: ccIso,
          q1: answers.q1, q2: answers.q2, q3: answers.q3, q4: answers.q4, consent: !!(consent && consent.checked)
        }));
      } catch (e) {}
    }
    function selectPill(key, val) {
      var grp = qual && qual.querySelector('.qual__opts[data-q="' + key + '"]');
      if (!grp) return;
      grp.querySelectorAll('.qual__opt').forEach(function (o) {
        o.classList.toggle('is-sel', o.getAttribute('data-val') === val);
      });
      answers[key] = val;
    }

    // THE function: show the qualifying section ONLY when a real name + phone number are filled in
    function nameOk()  { return name.value.trim().length >= 2; }
    function phoneOk() { return phone.value.replace(/\D/g, '').length >= 7; }
    function emailOk() { return /\S+@\S+\.\S+/.test((email.value || '').trim()); }
    function syncQual() {
      if (!qual) return;
      if (nameOk() && phoneOk()) qual.removeAttribute('hidden');   // both filled -> show
      else qual.setAttribute('hidden', '');                         // otherwise -> hide
    }
    // live "correct" feedback: each contact box turns green the moment its content is valid
    function paintValid(el, ok) {
      if (!el) return;
      if (ok) { el.style.borderColor = ''; el.style.boxShadow = ''; }  // clear any error highlight
      el.classList.toggle('is-valid', !!ok);
    }
    function markValidity() {
      paintValid(name, nameOk());
      paintValid(phone, phoneOk());
      paintValid(email, emailOk());
    }
    // typing NEVER touches the LIVE calendar (that's what kept restarting the load) - it saves the
    // lead and, once name+phone+email are all complete, kicks off the INVISIBLE prefilled upgrade
    [name, phone].forEach(function (el) {
      if (el) el.addEventListener('input', function () { syncQual(); markValidity(); saveLead(); scheduleUpgrade(); });
    });
    if (email) email.addEventListener('input', function () { markValidity(); saveLead(); scheduleUpgrade(); });
    if (consent) consent.addEventListener('change', saveLead);

    // option-pill selection (one per question) + persist. By the time they're answering these,
    // the contact fields are done -> kick off the INVISIBLE prefilled upgrade in the background.
    if (qual) qual.querySelectorAll('.qual__opts').forEach(function (grp) {
      var key = grp.getAttribute('data-q');
      grp.querySelectorAll('.qual__opt').forEach(function (opt) {
        opt.addEventListener('click', function () {
          selectPill(key, opt.getAttribute('data-val'));
          saveLead();
          /* Answer changed AFTER the calendar was opened: if the new answer
             disqualifies them, shut the calendar again immediately rather than
             leaving a bookable calendar in front of someone who no longer fits. */
          if (isDisqualified()) {
            lockCalendar('Based on your answers, let\'s start you somewhere better suited. Press Continue.');
            return;
          }
          if (contactReady()) upgradeCal(currentPrefill());
        });
      });
    });

    // backstop: if somehow not built yet when the booking opens, build now
    document.addEventListener('book:open', function () { if (!ccalActive) buildCal(currentPrefill()); });

    // auto-fill a returning visitor from their saved details
    function restoreLead() {
      var d; try { d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { d = null; }
      if (!d) return;
      if (d.name)  name.value  = d.name;
      if (d.phone) phone.value = d.phone;
      if (d.email) email.value = d.email;
      /* restore the saved country so a returning visitor's dial code sticks */
      if (d.ccIso && window.__setCC) window.__setCC(d.ccIso);
      if (consent && d.consent) consent.checked = true;
      // auto-fill the CONTACT fields only. The qualifying options are intentionally
      // NOT restored, so the dropdown always appears fully unselected (every visitor
      // answers them fresh). The section also stays hidden on load until name + phone.
    }
    restoreLead();
    syncQual();       // a Version B lead arrives prefilled: show the qualifying questions right away
    markValidity();   // restored details show their green "correct" state immediately

    // PRELOAD: build the calendar IMMEDIATELY at page open (behind the collapsed booking section),
    // so Calendly's slow first render is long finished by the time anyone presses Continue.
    // A returning visitor's restored contact details prefill this very first build.
    if (ccalActive) initCCal(); else buildCal(currentPrefill());

    function flag(el) { if (el) { el.focus(); el.style.borderColor = 'var(--gold)'; el.style.boxShadow = '0 0 0 3px rgba(193,154,78,.22)'; } }
    function flagGroup(key) {
      var grp = qual && qual.querySelector('.qual__opts[data-q="' + key + '"]');
      if (grp) { grp.style.outline = '2px solid var(--gold)'; grp.style.outlineOffset = '4px'; grp.style.borderRadius = '10px';
        scrollToEl(grp, 'center'); }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nv = name.value.trim(), ev = email.value.trim(), pv = phone.value.trim();
      if (!nv) return flag(name);
      if (!pv) return flag(phone);
      if (!/\S+@\S+\.\S+/.test(ev)) return flag(email);
      syncQual();
      if (!answers.q1) return flagGroup('q1');
      if (!answers.q2) return flagGroup('q2');
      // q4 is required to ANSWER but is never disqualifying. Guarded on the group
      // actually existing: main.js is shared across pages (vsl-a, vsl-b, funnel-build)
      // and an unguarded check would silently dead-end submit on any page without it.
      if (qual && qual.querySelector('.qual__opts[data-q="q4"]') && !answers.q4) return flagGroup('q4');

      // The form is valid and we now hold a real name, email and phone, so this
      // is the Lead moment for BOTH branches (qualified and unqualified alike).
      // Fired before the redirect below, which is why it goes here and not in
      // the qualified branch only.
      track('Lead', { content_name: 'Piano consultation form', status: 'submitted' });

      // CRM: record the completed application (the Lead moment) so a contact exists
      // whether or not they go on to pick a slot. Fires for BOTH branches; dq tells AC
      // which one, so tripwire-routed contacts get tagged out of the booking nurture.
      // This is the fix for "they type their details and then vanish": until this
      // shipped, nothing reached AC until a call was actually booked.
      // NOTE: /api/optin currently serves static HTML (functions/ was never deployed),
      // so this beacon is a no-op until Ange redeploys via wrangler. Harmless meanwhile.
      try {
        var crmPayload = JSON.stringify({
          source: 'application',
          name: nv, email: ev, phone: telE164(pv),
          consent: !!(consent && consent.checked),
          q1: answers.q1, q2: answers.q2, q3: answers.q3, q4: answers.q4,
          dq: isDisqualified()
        });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/optin', new Blob([crmPayload], { type: 'application/json' }));
        } else {
          fetch('/api/optin', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: crmPayload }).catch(function () {});
        }
      } catch (e) {}

      // FUNNEL ROUTING (per Steven's brief): leads who can't start soon are sent to the
      // $27 tripwire offer instead of the calendar. Same isDisqualified() the pill
      // handler uses, so the two can never disagree. With the beacon above in place
      // this no longer loses the lead, which is what made the hard redirect safe to keep
      // while Chris decides between this and soft-routing to booking-b.
      if (isDisqualified()) { lockCalendar(); window.location.href = 'tripwire.html'; return; }

      unlockCalendar({ name: nv, email: ev, phone: pv, q1: answers.q1, q2: answers.q2, q3: answers.q3, q4: answers.q4 });

      // center the calendar in the viewport and hold the page still,
      // so the visitor scrolls INSIDE the calendar to pick their time
      scrollToEl(host, 'center');
    });
  });

  /* (the simulated "someone just joined" toast that used to live here was
     REMOVED at Ori's request - fabricated activity notices undercut the real
     Trustpilot proof and carry FTC risk. Do not reintroduce.) */

  /* ---- testimonial marquee: duplicate each track for a seamless loop ---- */
  safe(function () {
    [].forEach.call(document.querySelectorAll('[data-marquee] .tmarquee__track'), function (track) {
      track.innerHTML += track.innerHTML;
    });
  });

  /* ---- rotating testimonial carousel ---- */
  safe(function () {
    var car = document.getElementById('tcarousel');
    if (!car) return;
    var cards = [].slice.call(car.querySelectorAll('.tc-card'));
    if (!cards.length) return;
    var pool = [
      {q:"I'd given up on ever learning. Six weeks later I'm playing pieces I never thought possible.",n:"Frances B.",loc:"Idaho",i:"F",s:"Trustpilot"},
      {q:"After two failed attempts with other teachers, this is the one that finally stuck.",n:"Gordon M.",loc:"Ohio",i:"G",s:"Google"},
      {q:"I'm 72 and learning piano for the first time. My only regret is not starting sooner.",n:"Lillian R.",loc:"Florida",i:"L",s:"Trustpilot"},
      {q:"Ten minutes a day sounded too good to be true. It isn't. I'm playing real songs.",n:"Ralph K.",loc:"Texas",i:"R",s:"Sitejabber"},
      {q:"The way Stephen breaks things down made it click when nothing else did.",n:"Brenda S.",loc:"Michigan",i:"B",s:"Trustpilot"},
      {q:"I surprised my whole family at Thanksgiving. There wasn't a dry eye in the room.",n:"Leonard T.",loc:"Georgia",i:"L",s:"Google"},
      {q:"No talent, no time, no problem. This method meets you exactly where you are.",n:"Maxine P.",loc:"Arizona",i:"M",s:"Trustpilot"},
      {q:"I can finally sit down and play the songs that mean something to me.",n:"Albert W.",loc:"Oregon",i:"A",s:"Trustpilot"},
      {q:"The progress is real and it's fast. I'm shocked at how far I've come.",n:"Doris H.",loc:"Colorado",i:"D",s:"Google"},
      {q:"I play more in a week than I did in years of lessons as a kid.",n:"Eugene F.",loc:"Nevada",i:"E",s:"Trustpilot"},
      {q:"My happy place is now the piano bench. Who knew?",n:"Gladys C.",loc:"Virginia",i:"G",s:"Sitejabber"},
      {q:"I booked my call expecting a hard sell. Instead I found a real plan.",n:"Herbert L.",loc:"Tennessee",i:"H",s:"Trustpilot"}
    ];
    var idx = 0;
    function render() {
      cards.forEach(function (card, k) {
        var it = pool[(idx + k) % pool.length];
        var q = card.querySelector('[data-c-quote]');
        var nm = card.querySelector('[data-c-name]');
        var ini = card.querySelector('[data-c-init]');
        if (q) q.textContent = '"' + it.q + '"';
        if (nm) nm.innerHTML = it.n + '<small><span class="tp-tag">✔ Verified</span> · ' + it.s + ' · ' + it.loc + '</small>';
        if (ini) ini.textContent = it.i;
      });
    }
    render();
    if (reduce) return;
    setInterval(function () {
      car.classList.add('is-fading');
      setTimeout(function () { idx = (idx + cards.length) % pool.length; render(); car.classList.remove('is-fading'); }, 420);
    }, 4500);
  });

  /* ---- Playable piano: pick a song, follow the glowing key, dopamine ---- */
  safe(function () {
    var kb = document.getElementById('pianoKb');
    if (!kb) return;
    var statusEl = document.getElementById('pianoStatus');
    var doneEl = document.getElementById('pianoDone');
    var doneSong = document.getElementById('pianoDoneSong');
    var againBtn = document.getElementById('pianoAgain');
    var songsWrap = document.getElementById('pianoSongs');
    var confetti = document.getElementById('pianoConfetti');

    var WHITES = ['C4','D4','E4','F4','G4','A4','B4','C5'];
    var BLACKS = [{n:'C#4',a:0},{n:'D#4',a:1},{n:'F#4',a:3},{n:'G#4',a:4},{n:'A#4',a:5}];
    var SONGS = [
      { name:'Twinkle Twinkle', seq:['C4','C4','G4','G4','A4','A4','G4','F4','F4','E4','E4','D4','D4','C4'] },
      { name:'Ode To Joy',      seq:['E4','E4','F4','G4','G4','F4','E4','D4','C4','C4','D4','E4','E4','D4','D4'] },
      { name:'Happy Birthday',  seq:['C4','C4','D4','C4','F4','E4','C4','C4','D4','C4','G4','F4','C4','C4','C5','A4','F4','E4','D4','A#4','A#4','A4','F4','G4','F4'] }
    ];
    var SEMI = {C:-9,'C#':-8,D:-7,'D#':-6,E:-5,F:-4,'F#':-3,G:-2,'G#':-1,A:0,'A#':1,B:2};
    function freq(note){
      var m = note.match(/^([A-G]#?)(\d)$/);
      return 440 * Math.pow(2, (SEMI[m[1]] + (parseInt(m[2],10) - 4) * 12) / 12);
    }

    /* build the keys */
    var keyEls = {};
    WHITES.forEach(function (n) {
      var k = document.createElement('div');
      k.className = 'pkey'; k.dataset.note = n; k.textContent = n.replace(/\d/,'');
      kb.appendChild(k); keyEls[n] = k;
    });
    BLACKS.forEach(function (b) {
      var k = document.createElement('div');
      k.className = 'pkey pkey--black'; k.dataset.note = b.n;
      k.style.left = 'calc(' + ((b.a + 1) * 12.5) + '% - 4.5%)';
      kb.appendChild(k); keyEls[b.n] = k;
    });

    /* sound: REAL grand piano samples (Salamander Grand, Yamaha C5),
       pitch-shifted to the nearest key. Preloaded at page open so the
       first press is instant. Synth fallback if samples fail to load. */
    var ctx, buffers = {};
    var SAMPLES = [ ['C4',-9], ['Ds4',-6], ['Fs4',-3], ['A4',0], ['C5',3] ];
    function semis(note){
      var m = note.match(/^([A-G]#?)(\d)$/);
      return SEMI[m[1]] + (parseInt(m[2],10) - 4) * 12;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      SAMPLES.forEach(function (sm) {
        fetch('audio/' + sm[0] + '.mp3')
          .then(function (r) { return r.arrayBuffer(); })
          .then(function (ab) { return ctx.decodeAudioData(ab); })
          .then(function (buf) { buffers[sm[1]] = buf; })
          .catch(function () {});
      });
    } catch (e) {}
    function tone(note) {
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        var t = ctx.currentTime, target = semis(note);
        /* nearest loaded sample */
        var best = null, bestD = 99;
        Object.keys(buffers).forEach(function (k) {
          var d = Math.abs(target - k);
          if (d < bestD) { bestD = d; best = parseInt(k, 10); }
        });
        if (best !== null) {
          var src = ctx.createBufferSource();
          src.buffer = buffers[best];
          src.playbackRate.value = Math.pow(2, (target - best) / 12);
          var g = ctx.createGain();
          g.gain.setValueAtTime(0.9, t);
          g.gain.setValueAtTime(0.9, t + 0.55);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.35);
          src.connect(g); g.connect(ctx.destination);
          src.start(t); src.stop(t + 1.4);
          return;
        }
        /* fallback synth while samples load */
        var f = freq(note);
        var g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.0001, t);
        g2.gain.exponentialRampToValueAtTime(0.5, t + 0.008);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
        var o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = f;
        var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
        var g3 = ctx.createGain(); g3.gain.value = 0.25;
        o1.connect(g2); o2.connect(g3); g3.connect(g2); g2.connect(ctx.destination);
        o1.start(t); o2.start(t); o1.stop(t + 1.6); o2.stop(t + 1.6);
      } catch (e) {}
    }

    /* guide state */
    var songIdx = 0, step = 0;
    function target(){ return SONGS[songIdx].seq[step]; }
    function paintTarget(){
      Object.keys(keyEls).forEach(function (n) { keyEls[n].classList.remove('is-target'); });
      var t = target();
      if (t) keyEls[t].classList.add('is-target');
      if (statusEl) statusEl.innerHTML = SONGS[songIdx].name + ' · follow the glowing key · note <b>' + (step + 1) + '</b> of ' + SONGS[songIdx].seq.length;
    }
    function reset(i){
      songIdx = i; step = 0;
      doneEl.hidden = true;
      if (statusEl) statusEl.style.display = '';
      paintTarget();
    }
    function celebrate(){
      Object.keys(keyEls).forEach(function (n) { keyEls[n].classList.remove('is-target'); });
      if (statusEl) statusEl.style.display = 'none';
      doneSong.textContent = SONGS[songIdx].name;
      doneEl.hidden = false;
      burst();
      step = 0;
    }
    kb.addEventListener('pointerdown', function (e) {
      var k = e.target.closest('.pkey');
      if (!k) return;
      e.preventDefault();
      tone(k.dataset.note);
      k.classList.add('is-down');
      setTimeout(function(){ k.classList.remove('is-down'); }, 140);
      if (!doneEl.hidden) return;                       // celebration showing
      if (k.dataset.note === target()) {
        step++;
        if (step >= SONGS[songIdx].seq.length) celebrate();
        else paintTarget();
      }
    });
    if (songsWrap) songsWrap.addEventListener('click', function (e) {
      var b = e.target.closest('.songbtn');
      if (!b) return;
      [].forEach.call(songsWrap.querySelectorAll('.songbtn'), function (x) { x.classList.remove('is-sel'); });
      b.classList.add('is-sel');
      reset(parseInt(b.dataset.song, 10));
    });
    if (againBtn) againBtn.addEventListener('click', function () { reset(songIdx); });

    /* confetti burst in brand colors */
    function burst(){
      if (!confetti || reduce) return;
      var sec = confetti.parentElement, r = sec.getBoundingClientRect();
      confetti.width = r.width; confetti.height = r.height;
      var c2d = confetti.getContext('2d');
      var colors = ['#FF2230','#FF4A4F','#FFB42B','#FFC04A','#FCF4EA'];
      var parts = [];
      for (var i = 0; i < 110; i++) parts.push({
        x: r.width/2, y: r.height*0.55,
        vx: (Math.random()-0.5)*14, vy: -(4+Math.random()*11),
        s: 4+Math.random()*6, c: colors[i%colors.length], rot: Math.random()*6.28, vr: (Math.random()-0.5)*0.3, life: 1
      });
      var t0 = performance.now();
      (function frame(now){
        var dt = Math.min((now-t0)/1000, 2.2); 
        c2d.clearRect(0,0,confetti.width,confetti.height);
        parts.forEach(function(p){
          p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.rot += p.vr; p.life -= 0.008;
          if (p.life <= 0) return;
          c2d.save(); c2d.globalAlpha = Math.max(0,p.life); c2d.translate(p.x,p.y); c2d.rotate(p.rot);
          c2d.fillStyle = p.c; c2d.fillRect(-p.s/2,-p.s/2,p.s,p.s*0.6); c2d.restore();
        });
        if (dt < 2.2) requestAnimationFrame(frame);
        else c2d.clearRect(0,0,confetti.width,confetti.height);
      })(t0);
    }

    paintTarget();
  });

  /* ---- Calendly booked -> confirmation page (funnel step 2) ----
     Calendly's inline iframe posts a `calendly.event_scheduled` message
     the moment the visitor books. We give them a beat to see Calendly's
     own confirmation, then move them to the thank-you page. */
  safe(function () {
    window.addEventListener('message', function (e) {
      if (!e || !e.data || typeof e.data !== 'object') return;
      if (e.data.event === 'calendly.event_scheduled') {
        /* NOTE: the Meta "Schedule" conversion is NOT fired here. The pixel is
           scoped to thank-you.html only (client request), so the conversion is
           fired by that page on load instead. Deliberately not left in as a
           guarded no-op: if the pixel is ever re-added site-wide, having it in
           both places would count every booking twice. */
        setTimeout(function () { window.location.href = 'thank-you.html'; }, 1600);
      }
      /* Auto-size the booking frame to Calendly's reported content height for
         each step (calendar / times / details). This keeps the "Schedule Event"
         button always fully visible with NO internal scrolling, and no wasted
         empty space on the shorter steps. */
      if (e.data.event === 'calendly.page_height' && e.data.payload) {
        var h = parseInt(e.data.payload.height, 10);
        if (h > 200) {
          var host = document.getElementById('calInline');
          var bc = document.getElementById('bookCal');
          if (host) { host.style.flex = 'none'; host.style.height = h + 'px'; host.style.minHeight = h + 'px'; }
          if (bc) { bc.style.minHeight = h + 'px'; }
        }
      }
      /* The moment they pick a time slot, Calendly shows "Enter Details" (prefilled with their
         name/email/phone). Scroll the page so the BOTTOM of the calendar - where the
         "Schedule Event" button sits - is on screen, so they never have to scroll to find it.
         Small delay lets Calendly render the step + the page_height resize land first. */
      if (e.data.event === 'calendly.date_and_time_selected') {
        setTimeout(function () {
          var bc = document.getElementById('bookCal');
          if (!bc) return;
          var r = bc.getBoundingClientRect();
          if (r.bottom <= window.innerHeight - 8) return;   // button already on screen
          var se = document.scrollingElement || document.documentElement;
          var top = Math.max(0, se.scrollTop + r.bottom - window.innerHeight + 16);
          try { window.scrollTo({ top: top, behavior: 'smooth' }); }
          catch (err) { se.scrollTop = top; }
        }, 480);
      }
    });
  });
})();

/* ============================================================
   GATED VSL VARIANT (A/B test) - runs only when the inline
   bootstrap in index.html put .is-gated on <html> (?v=gated or
   the /gated entry). Everything below the hero video stays
   hidden until the VSL reaches GATE_AT seconds, then the page
   reveals in place. The unlock is remembered for the BROWSER
   SESSION only (sessionStorage, per Ori 7/24): refresh or going
   back keeps the page open, but closing the tab/browser and
   returning restarts the 2-minute gate from scratch.
   GATE_AT = 120s (2:00) per Chris Cook 7/23: title + video only,
   then the rest of the page appears at the two-minute mark.
   (It was 556s / 9:16, the frame where the video's own "CLICK
   THE BUTTON BELOW" ticker fades in. Kept here in case the long
   gate is ever wanted back: 556 is measured, not guessed.)
   The clock is PLAYBACK time, not wall-clock, so a paused video
   pauses the countdown.
   If a shorter clip is ever dropped in, the gate falls back to
   85% of its length so the variant stays testable.
   ?gate=SECONDS overrides the marker for quick testing.
   ============================================================ */
(function () {
  var root = document.documentElement;
  function gatedNow() { return (' ' + root.className + ' ').indexOf(' is-gated ') > -1; }
  if (!gatedNow()) return;
  var GATE_AT = 120;
  var m = location.search.match(/[?&]gate=(\d+(?:\.\d+)?)/);
  if (m) GATE_AT = parseFloat(m[1]);
  function gateOpen() {
    if (!gatedNow()) return;
    root.className = (' ' + root.className + ' ').replace(' is-gated ', ' ').replace(/^\s+|\s+$/g, '') + ' gate-opened';
    try { sessionStorage.setItem('ra_gate_open', '1'); } catch (e) {}
    countdownDone();
  }

  /* ---- VISIBLE COUNTDOWN TO UNLOCK (Chris 7/31) ----
     "Your booking link opens in 1:47", sitting under the video.
     Two deliberate choices worth keeping:
     1. It counts PLAYBACK time, the same clock the gate itself uses, so pausing
        the video pauses the number. A visitor can always verify it against the
        scrubber, which is the whole reason it is allowed to create urgency.
     2. It counts down to something OPENING, not to an offer expiring. No fake
        scarcity clock, nothing that resets on refresh. The existing 20-minute
        urgency banner stays suppressed in gated mode (.is-gated .urgency20).
     getTime is supplied by whichever playback path is active below. */
  var getTime = null;
  var pill = null, pillNum = null, ticker = null;

  function fmt(s) {
    s = Math.max(0, Math.ceil(s));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }
  function buildPill() {
    var host = document.getElementById('vembed') || document.getElementById('vslVideo');
    if (!host || !host.parentNode) return;
    pill = document.createElement('div');
    pill.className = 'gatepill';
    pill.setAttribute('role', 'status');
    pill.setAttribute('aria-live', 'polite');
    pill.innerHTML = '<span class="gatepill__dot" aria-hidden="true"></span>' +
      'Your booking link opens in <b id="gatepillNum">' + fmt(GATE_AT) + '</b>';
    host.parentNode.insertBefore(pill, host.nextSibling);
    pillNum = document.getElementById('gatepillNum');
  }
  function startCountdown() {
    if (pill || !gatedNow()) return;
    buildPill();
    if (!pill) return;
    ticker = setInterval(function () {
      if (!gatedNow()) return countdownDone();
      if (!getTime) return;
      var t = getTime();
      if (t == null) return;
      // mirror the gate's own short-clip fallback so pill and gate never disagree
      pillNum.textContent = fmt(markerFor() - t);
    }, 250);
  }
  function countdownDone() {
    if (ticker) { clearInterval(ticker); ticker = null; }
    if (!pill) return;
    pill.classList.add('is-open');
    pill.innerHTML = '<span class="gatepill__dot" aria-hidden="true"></span>Your booking link is open below';
    setTimeout(function () { if (pill) pill.classList.add('is-fading'); }, 4000);
  }
  function markerFor() { return GATE_AT; }
  /* NATIVE <video>: read real playback time, so the reveal is tied to how much
     of the VSL was actually watched rather than to wall-clock time. Because the
     sound pill restarts the video from 0, this correctly re-measures from the
     start of the watch the visitor is actually listening to. */
  var v = document.getElementById('vslVideo');
  if (v) {
    var marker = function () {
      var d = v.duration;
      if (d && isFinite(d) && d < GATE_AT) return Math.max(1, d * 0.85);
      return GATE_AT;
    };
    markerFor = marker;
    getTime = function () { return v.currentTime; };
    startCountdown();
    v.addEventListener('timeupdate', function () { if (v.currentTime >= marker()) gateOpen(); });
    v.addEventListener('ended', gateOpen);
    v.addEventListener('error', gateOpen);
    if (v.error) gateOpen();
  } else if (document.querySelector('.vembed--yt[data-vsl]')) {
    /* YOUTUBE hero: poll real playback time through the bridge the chromeless
       player block exposes (window.__ytHeroTime / __ytHeroDuration). Identical
       semantics to the native path, including the short-clip 85% fallback, so
       the reveal still tracks how much was actually WATCHED. */
    markerFor = function () {
      var d = window.__ytHeroDuration ? window.__ytHeroDuration() : 0;
      return (d && isFinite(d) && d < GATE_AT) ? Math.max(1, d * 0.85) : GATE_AT;
    };
    getTime = function () {
      try { var t = window.__ytHeroTime && window.__ytHeroTime(); return t == null ? null : t; }
      catch (e) { return null; }
    };
    startCountdown();
    var poll = setInterval(function () {
      try {
        if (!gatedNow()) { clearInterval(poll); return; }
        var t = window.__ytHeroTime && window.__ytHeroTime();
        if (t == null) return;
        if (t >= markerFor()) { clearInterval(poll); gateOpen(); }
      } catch (e) {}
    }, 1000);
  } else { gateOpen(); }

  /* SAFETY NET: unlock SAFETY_AT seconds after page load no matter what, so a
     visitor can never be permanently locked out if playback never starts (a
     blocked autoplay they never tap, a stalled network, a codec refusal). A
     stuck gate would mean they can never reach the booking button, so this
     always fails OPEN. ?safety=SECONDS overrides it for testing.
     Scaled to the 2:00 gate: 5 minutes total. Long enough that a normally
     playing video always wins the race (so the reveal stays tied to real
     watch time), short enough that a visitor whose player never starts is
     not stranded without a booking button. */
  var SAFETY_AT = GATE_AT + 180;
  var sm = location.search.match(/[?&]safety=(\d+(?:\.\d+)?)/);
  if (sm) SAFETY_AT = parseFloat(sm[1]);
  setTimeout(gateOpen, SAFETY_AT * 1000);
})();

/* ============================================================
   HERO VSL RESILIENCE
   The VSL is a native <video> on a direct CDN file, so the sound
   pill (wired in the shared .vembed block above) already restarts
   it from 0 with sound in one tap, and playback time is readable.
   This block only covers the ways a big streamed file can fail:
     1) autoplay refused -> retry muted on the first real gesture
     2) the file cannot load at all -> surface the pill as a plain
        play affordance instead of leaving a dead black rectangle
   ============================================================ */
(function () {
  var v = document.getElementById('vslVideo');
  if (!v) return;

  // If muted autoplay was refused (iOS Low Power Mode, data saver), start it on
  // the first gesture anywhere on the page. Harmless if it is already playing.
  function kick() {
    if (v.paused && v.muted) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  }
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, kick, { passive: true, once: true });
  });

  // If the stream genuinely fails, don't leave a black box behind an overlay
  // the visitor cannot get past: drop the overlay so the poster and the native
  // controls (and the browser's own error UI) are reachable.
  v.addEventListener('error', function () {
    var btn = document.getElementById('vslSound');
    if (btn) btn.style.display = 'none';
  });

  /* Meta Pixel: VSL watch depth. These are the highest-intent custom audiences
     this funnel can produce - someone who sat through nine minutes of the pitch
     is worth retargeting far harder than someone who bounced off the hero. Only
     possible at all because the VSL is a native <video> we can read; the old
     cross-origin player exposed no playback time.
     Milestones are absolute seconds, not percentages, so they stay meaningful
     if the cut length ever changes. 556s = the frame where the video's own
     "click the button below" ticker appears, matching the variant B gate. */
  /* NOTE: this block sits OUTSIDE the main IIFE, so the safe() helper defined up
     there is not in scope here. Use a plain try/catch.
     GATED ON data-vsl: thank-you.html reuses id="vslVideo" for its pre-call
     video, and that page is the one carrying the pixel. Without this guard, a
     pre-call video longer than 60s would fire sales-VSL watch milestones on the
     confirmation page and pollute the conversion data. Only the index hero
     carries data-vsl. */
  try {
    if (!v.hasAttribute('data-vsl')) return;
    var marks = [
      { at: 60,  name: 'VSL_1min' },
      { at: 180, name: 'VSL_3min' },
      { at: 300, name: 'VSL_5min' },
      { at: 556, name: 'VSL_ReachedOffer' }
    ];
    var sent = {};
    v.addEventListener('timeupdate', function () {
      for (var i = 0; i < marks.length; i++) {
        if (!sent[marks[i].name] && v.currentTime >= marks[i].at) {
          sent[marks[i].name] = 1;
          try { if (window.fbq) window.fbq('trackCustom', marks[i].name, { seconds: marks[i].at }); } catch (e) {}
        }
      }
    });
  } catch (e) {}
})();

/* ============================================================
   CHROMELESS YOUTUBE EMBEDS (.vembed--yt)
   The thank-you page's videos are hosted on the Ridley YouTube
   channel (adaptive streaming - solves the heavy-file stalling),
   but rendered with NO YouTube chrome the visitor can act on:
     - IFrame API player, controls=0, rel=0, nocookie host
     - a transparent .ytshield above the iframe swallows every
       click, so the logo/title/recommendation overlays are never
       clickable and there is no way out of the page
     - all control comes from OUR ui: muted autoplay preview that
       loops the first 30s (keeps the opening hot), the Click For
       Sound pill (restarts from 0 WITH sound in one tap), then
       tap-to-pause/resume on the shield
     - on ENDED we snap back to the first frame and pause, so the
       end-screen recommendation wall never lingers
   Mirrors the native-video behavior everywhere else on the site.
   NOTE: standalone IIFE - main wrapper helpers (safe, reduce) are
   NOT in scope here, so everything is try/catch'd locally.
   ============================================================ */
(function () {
  try {
    var mounts = [].slice.call(document.querySelectorAll('.vembed--yt'));
    if (!mounts.length) return;

    /* pull in the IFrame API once; it calls onYouTubeIframeAPIReady when live */
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    var prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (prevReady) { try { prevReady(); } catch (e) {} }
      mounts.forEach(function (em) { try { build(em); } catch (e) {} });
    };

    function build(em) {
      var mount = em.querySelector('.ytv');
      /* FAST-BOOT PATH: the index hero ships a ready-made iframe straight from
         the HTML (inline script in index.html) so the VSL starts loading during
         parse instead of after this file runs. When that iframe exists, ATTACH
         to it (its src already carries the playerVars + enablejsapi + origin);
         otherwise build from the .ytv mount as before. */
      var liveFrame = em.querySelector('iframe');
      var shield = em.querySelector('.ytshield');
      var btn = em.querySelector('.vsound');
      var id = em.getAttribute('data-yt');
      if ((!mount && !liveFrame) || !id) return;

      var engaged = false;      // becomes true on Click For Sound
      var soloPausedAt = 0;     // set when the solo bus pauses this player
      var isVsl = em.hasAttribute('data-vsl');   // the index hero
      var PREVIEW_CAP = 30;  // silent preview loops the opening, same as native

      var player = new YT.Player(liveFrame || mount, {
        host: 'https://www.youtube-nocookie.com',
        videoId: id,
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, rel: 0, playsinline: 1,
          disablekb: 1, fs: 0, iv_load_policy: 3, origin: location.origin
        },
        events: {
          onReady: function (e) {
            try { e.target.mute(); e.target.playVideo(); } catch (err) {}
          },
          onStateChange: function (e) {
            /* never let the end-screen recommendation wall sit there: snap back
               to the first frame. Muted preview -> keep looping; after sound ->
               show frame 0, paused (clicks are blocked by the shield anyway). */
            if (e.data === YT.PlayerState.PLAYING && shield) {
              shield.classList.remove('is-need-tap');
              shield.classList.remove('is-paused');
              shield.classList.remove('is-direct');   // solid wall again
            }
            /* audible playback claims the solo floor; the previous audible
               video pauses in place, resumable with a tap */
            if (e.data === YT.PlayerState.PLAYING && engaged) claimYt();
            /* unmute refused -> the player pauses itself right after an engage;
               surface the Tap To Play chip so the next tap carries fresh
               activation (never fires on a deliberate shield pause, which
               happens well outside the grace window) */
            if (e.data === YT.PlayerState.PAUSED && engaged && shield) {
              /* paused BY the solo bus (another video took the sound): always
                 the resume pill, never the blocked-unmute chip */
              if (Date.now() - soloPausedAt < 1200) shield.classList.add('is-paused');
              else if ((Date.now() - lastEngage) < 4000) showChip();
              /* a deliberate pause: cover YouTube's centered red play button
                 with our own fire pill so no YT symbol ever shows */
              else shield.classList.add('is-paused');
            }
            if (e.data === YT.PlayerState.ENDED) {
              try {
                player.seekTo(0, true);
                if (engaged) player.pauseVideo(); else player.playVideo();
              } catch (err) {}
            }
          }
        }
      });

      /* the GATE (variant B) reads the hero's real playback time through this
         bridge - a cross-origin iframe's clock is only reachable via the API */
      if (isVsl) {
        window.__ytHeroTime = function () { try { return player.getCurrentTime(); } catch (e) { return null; } };
        window.__ytHeroDuration = function () { try { return player.getDuration(); } catch (e) { return 0; } };
      }

      /* silent-preview cap: keeps second 0 always fresh so Click For Sound is
         instant; releases itself the moment they engage */
      setInterval(function () {
        try {
          if (engaged || isVsl) return;   // VSL preview runs uncapped: the gate reads true elapsed time
          var d = player.getDuration ? player.getDuration() : 0;
          if (d && d > PREVIEW_CAP * 2 && player.getCurrentTime() > PREVIEW_CAP) {
            player.seekTo(0, true);
          }
        } catch (e) {}
      }, 1000);

      /* pause the muted preview when it scrolls well away, resume on approach -
         parity with the native players, and kind to phone batteries */
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (ents) {
          ents.forEach(function (en) {
            try {
              if (en.isIntersecting) { if (!engaged) player.playVideo(); }
              else if (!engaged) { player.pauseVideo(); }
            } catch (e) {}
          });
        }, { threshold: 0, rootMargin: '100% 0px 100% 0px' });
        io.observe(em);
      }

      /* restart from 0 WITH sound. One tap in normal browsers: the parent
         gesture is delegated to the iframe via its allow="autoplay". Some
         embedded/in-app browsers refuse that delegation and PAUSE on unmute,
         so 600ms later we VERIFY the player really is playing; if not, the
         shield shows a fire "Tap to play" chip and that tap re-issues the
         same restart-with-sound. Where the first tap works, the chip never
         appears. */
      var lastEngage = 0;
      var blockedTries = 0;
      /* two parent-side refusals -> open the shield's center hole (see the
         .ytshield.is-direct CSS) so the NEXT tap lands inside the player and
         carries native activation no browser can refuse */
      function showChip() {
        if (!shield) return;
        shield.classList.add('is-need-tap');
        if (++blockedTries >= 2) shield.classList.add('is-direct');
      }
      function claimYt() {
        window.__soloPlay && window.__soloPlay('yt:' + id, function () {
          soloPausedAt = Date.now();
          try { player.pauseVideo(); } catch (err) {}
        });
      }
      function engageNow() {
        lastEngage = Date.now();
        claimYt();   // starting THIS video silences the previous one immediately
        try {
          player.seekTo(0, true);
          player.unMute();
          player.setVolume(100);
          player.playVideo();
        } catch (e) {}
        /* the block can land AFTER a phantom PLAYING tick, so check twice; the
           PAUSED branch in onStateChange is the third net */
        [700, 1600, 3000].forEach(function (ms) {
          setTimeout(function () {
            /* any failure to CONFIRM playing counts as blocked, including the
               API throwing because the player never finished booting */
            try {
              if (player.getPlayerState() !== YT.PlayerState.PLAYING) showChip();
            } catch (e) { showChip(); }
          }, ms);
        });
      }

      if (btn) btn.addEventListener('click', function () {
        engaged = true;
        em.classList.add('is-engaged');   // reveals the seek bar (non-VSL)
        engageNow();
        /* the hero's pill is the engagement moment the funnel keys off:
           starts the offer timer and (variant B) the reveal countdown */
        if (isVsl) {
          if (window.__raPlay) window.__raPlay();
          if (window.__raVslStarted) window.__raVslStarted();
        }
        btn.classList.add('is-off');
        setTimeout(function () { btn.style.display = 'none'; }, 500);
      });

      /* after engagement the shield stands in for the controls we hide:
         normally tap-to-pause/resume; in the blocked-unmute case above, its
         first tap re-runs the restart-with-sound instead */
      if (shield) shield.addEventListener('click', function () {
        if (!engaged) return;   // pre-engage, the pill owns the first tap
        if (shield.classList.contains('is-need-tap')) {
          shield.classList.remove('is-need-tap');
          engageNow();
          return;
        }
        try {
          if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
          else { claimYt(); player.playVideo(); }
        } catch (e) {}
      });

      /* SEEK BAR - every player EXCEPT the VSL. YouTube's own bar sits in the
         cropped letterbox band, so this fire bar along the bottom is the seek
         surface: tap or drag to rewind/forward. Shown only after Click For
         Sound (.is-engaged); z-index above the shield so it works in every
         shield state. The VSL deliberately never gets one. */
      if (!isVsl) {
        var scrub = document.createElement('div');
        scrub.className = 'ytscrub';
        var fill = document.createElement('i');
        fill.className = 'ytscrub__fill';
        scrub.appendChild(fill);
        em.appendChild(scrub);
        setInterval(function () {
          try {
            if (!engaged) return;
            var d = player.getDuration ? player.getDuration() : 0;
            if (d) fill.style.width = Math.min(100, player.getCurrentTime() / d * 100) + '%';
          } catch (e) {}
        }, 500);
        var seekAt = function (clientX) {
          try {
            var r = scrub.getBoundingClientRect();
            var frac = Math.min(1, Math.max(0, (clientX - (r.left + 10)) / (r.width - 20)));
            var d = player.getDuration();
            if (d) { player.seekTo(frac * d, true); fill.style.width = (frac * 100) + '%'; }
          } catch (e) {}
        };
        var dragging = false;
        scrub.addEventListener('pointerdown', function (e) {
          dragging = true;
          if (scrub.setPointerCapture) { try { scrub.setPointerCapture(e.pointerId); } catch (err) {} }
          seekAt(e.clientX);
          e.stopPropagation();
        });
        scrub.addEventListener('pointermove', function (e) { if (dragging) seekAt(e.clientX); });
        ['pointerup', 'pointercancel'].forEach(function (ev) {
          scrub.addEventListener(ev, function () { dragging = false; });
        });
        scrub.addEventListener('click', function (e) { e.stopPropagation(); });
      }
    }
  } catch (e) {}
})();

/* ============================================================
   FULLSCREEN - every video player on the funnel gets a corner ⛶.
   Chromeless YouTube players can't use YouTube's fullscreen button
   (their chrome is hidden by design), so the CONTAINER goes
   fullscreen instead: native requestFullscreen where the browser
   has it, plus a fixed full-viewport overlay (.is-fs) as the
   fallback (iPhone Safari has no element fullscreen). Either way
   our own shield/pill/seek controls ride along, so the no-YouTube,
   no-seek-on-the-VSL rules hold in fullscreen too. The native
   testimonial <video> gets the browser's own fullscreen button
   back instead (controlslist edit in index.html).
   Standalone IIFE: main wrapper helpers are out of scope. */
(function () {
  try {
    var ENTER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM4 15h2v3h3v2H4v-5zm14 0h2v5h-5v-2h3v-3z"/></svg>';
    var EXIT  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4V7h3V4h2zm11 3v2h-5V4h2v3h3zM4 15h5v5H7v-3H4v-2zm13 0h3v2h-3v3h-2v-5h2z"/></svg>';

    function exitAll() {
      [].forEach.call(document.querySelectorAll('.is-fs'), function (el) {
        el.classList.remove('is-fs');
        var b = el.querySelector('.vfs');
        if (b) { b.innerHTML = ENTER; b.setAttribute('aria-label', 'Fullscreen'); }
      });
      document.body.classList.remove('fs-lock');
    }
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
      document.addEventListener(ev, function () {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) exitAll();
      });
    });

    function addFs(el) {
      if (!el || el.querySelector('.vfs')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vfs';
      btn.setAttribute('aria-label', 'Fullscreen');
      btn.innerHTML = ENTER;
      el.appendChild(btn);
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var on = !el.classList.contains('is-fs');
        if (on) {
          el.classList.add('is-fs');
          document.body.classList.add('fs-lock');
          btn.innerHTML = EXIT; btn.setAttribute('aria-label', 'Exit fullscreen');
          var rf = el.requestFullscreen || el.webkitRequestFullscreen;
          if (rf) { try { var p = rf.call(el); if (p && p.catch) p.catch(function () {}); } catch (err) {} }
        } else {
          if (document.fullscreenElement || document.webkitFullscreenElement) {
            var xf = document.exitFullscreen || document.webkitExitFullscreen;
            if (xf) { try { var q = xf.call(document); if (q && q.catch) q.catch(function () {}); } catch (err) {} }
          }
          exitAll();
        }
      });
    }
    window.__addFs = addFs;   // the film cards build their stages later and call this

    [].forEach.call(document.querySelectorAll('.vembed--yt'), addFs);
  } catch (e) {}
})();

/* ============================================================
   SHORT FILMS (click-to-play) - the "Three Short Films About Stephen"
   cards on the thank-you page. Unlike every other player on the site
   these do NOT autoplay: the card shows its still poster until tapped,
   then a CHROMELESS YouTube player is built in place and plays WITH
   sound from data-start (the timestamp on the link Steven supplied).
   Same no-YouTube-chrome treatment as the FAQ answers (transparent
   shield swallows clicks, iframe cropped 150% so the logo/title bands
   fall outside, rel=0 keeps any end wall on Stephen's own channel and
   the shield makes it unclickable anyway). Starting one film pauses
   whatever else is playing through the shared window.__soloPlay bus;
   a paused film resumes with a tap. Long films, so a fire seek bar
   (same .ytscrub as the FAQ) rides the bottom once playing.
   Standalone IIFE: the main wrapper helpers are out of scope here. */
(function () {
  try {
    var cards = [].slice.call(document.querySelectorAll('.docu__card--film'));
    if (!cards.length) return;

    /* the chromeless block above already pulls in the IFrame API when the page
       has embeds; append it defensively in case a film card ever ships alone */
    function ensureAPI() {
      if (window.YT && window.YT.Player) return;
      if (!document.querySelector('script[src*="iframe_api"]')) {
        var t = document.createElement('script');
        t.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(t);
      }
    }
    function whenYT(cb) {
      if (window.YT && window.YT.Player) return cb();
      var iv = setInterval(function () {
        if (window.YT && window.YT.Player) { clearInterval(iv); cb(); }
      }, 100);
      setTimeout(function () { clearInterval(iv); }, 15000);
    }

    cards.forEach(function (card) {
      var id = card.getAttribute('data-yt');
      var start = parseInt(card.getAttribute('data-start') || '0', 10) || 0;
      if (!id) return;
      var built = false, player = null, shield = null;

      function claim() {
        if (!window.__soloPlay) return;
        window.__soloPlay('film:' + id, function () {
          try { player && player.pauseVideo(); } catch (e) {}
        });
      }

      function start_() {
        if (built) return;   // post-build, the shield owns pause/resume
        built = true;
        card.classList.add('is-playing');

        var stage = document.createElement('div');
        stage.className = 'docu__stage vembed vembed--frame vembed--yt';
        var mount = document.createElement('div');
        mount.className = 'ytv';
        stage.appendChild(mount);
        shield = document.createElement('div');
        shield.className = 'ytshield';
        shield.setAttribute('aria-hidden', 'true');
        shield.innerHTML = '<i class="ytshield__blk ytshield__blk--top"></i><i class="ytshield__blk ytshield__blk--bot"></i>';
        stage.appendChild(shield);
        card.appendChild(stage);

        ensureAPI();
        whenYT(function () {
          player = new YT.Player(mount, {
            host: 'https://www.youtube-nocookie.com',
            videoId: id,
            playerVars: {
              autoplay: 1, mute: 0, controls: 0, rel: 0, playsinline: 1,
              disablekb: 1, fs: 0, iv_load_policy: 3, start: start, origin: location.origin
            },
            events: {
              onReady: function (e) {
                try { claim(); e.target.unMute(); e.target.setVolume(100); e.target.playVideo(); } catch (err) {}
              },
              onStateChange: function (e) {
                /* paused -> is-vidpaused swaps the raw YouTube pause screen
                   (title band + More Videos tray) for the film's own poster */
                if (e.data === YT.PlayerState.PLAYING) {
                  shield.classList.remove('is-paused');
                  card.classList.remove('is-vidpaused');
                  claim();
                } else if (e.data === YT.PlayerState.PAUSED) {
                  shield.classList.add('is-paused');
                  card.classList.add('is-vidpaused');
                } else if (e.data === YT.PlayerState.ENDED) {
                  try { player.seekTo(start, true); player.pauseVideo(); } catch (err) {}
                  shield.classList.add('is-paused');
                  card.classList.add('is-vidpaused');
                }
              }
            }
          });
        });

        /* tap the shield = pause/resume (no YouTube control ever shows) */
        shield.addEventListener('click', function (e) {
          e.stopPropagation();
          try {
            if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
            else { claim(); player.playVideo(); }
          } catch (err) {}
        });

        /* fire seek bar - films are long, so rewind/forward is wanted. Same
           .ytscrub as the FAQ answers; revealed by .is-engaged on the stage. */
        stage.classList.add('is-engaged');
        var scrub = document.createElement('div');
        scrub.className = 'ytscrub';
        var fill = document.createElement('i');
        fill.className = 'ytscrub__fill';
        scrub.appendChild(fill);
        stage.appendChild(scrub);
        setInterval(function () {
          try {
            if (!player || !player.getDuration) return;
            var d = player.getDuration();
            if (d) fill.style.width = Math.min(100, player.getCurrentTime() / d * 100) + '%';
          } catch (err) {}
        }, 500);
        var seekAt = function (clientX) {
          try {
            var r = scrub.getBoundingClientRect();
            var frac = Math.min(1, Math.max(0, (clientX - (r.left + 10)) / (r.width - 20)));
            var d = player.getDuration();
            if (d) { player.seekTo(frac * d, true); fill.style.width = (frac * 100) + '%'; }
          } catch (err) {}
        };
        var dragging = false;
        scrub.addEventListener('pointerdown', function (e) {
          dragging = true;
          if (scrub.setPointerCapture) { try { scrub.setPointerCapture(e.pointerId); } catch (err) {} }
          seekAt(e.clientX); e.stopPropagation();
        });
        scrub.addEventListener('pointermove', function (e) { if (dragging) seekAt(e.clientX); });
        ['pointerup', 'pointercancel'].forEach(function (ev) {
          scrub.addEventListener(ev, function () { dragging = false; });
        });
        scrub.addEventListener('click', function (e) { e.stopPropagation(); });

        if (window.__addFs) window.__addFs(stage);   // corner fullscreen button
      }

      card.addEventListener('click', function () { start_(); });
    });
  } catch (e) {}
})();
