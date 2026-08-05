/* Ridley home page: VSL watch-gate.  Added 8/4.

   The page stays locked to the hero until the sales video reaches its unlock mark
   (data-gate-at on the video frame, 558s = 9:18). Locked means two things: every
   booking CTA is hidden, and everything below the video is clipped behind a
   gradient, so there is no page under the fold to scroll to in the first place.
   A live countdown in the gradient says when it opens, so the fade reads as
   "more is coming" rather than a broken page.

   Clipping the container is deliberate. Blocking scroll with event handlers
   fights the browser, breaks on iOS, and traps anyone whose viewport is shorter
   than the video. Making the document short instead needs no handlers at all.

   The video autoplays MUTED, which is the only autoplay any current browser
   allows. A tap-for-sound scrim over the frame unmutes and restarts from zero so
   nobody hears the VSL from the middle. Muted time before that tap does not
   count toward the unlock.

   Fail open, always. The .rdly-gated class is set by an inline script in the page
   head, so JS off means an ungated page. If the YouTube API never loads (blocked
   network, ad blocker), a watchdog unlocks the page rather than leaving a visitor
   staring at a fade they can never clear.

   The unlock is remembered per browser, so someone who watched it and came back
   to book is not made to sit through it twice. */
(function () {
  var frame = document.querySelector('[data-gate-video]');
  if (!frame) return;

  var root = document.documentElement;
  var lock = document.getElementById('gate-lock');
  var countEl = document.getElementById('gate-count');
  var gateFill = document.getElementById('gate-fill');

  var KEY = 'rdly_home_vsl_unlocked';
  var GATE_AT = parseInt(frame.getAttribute('data-gate-at'), 10) || 558;
  var videoId = frame.getAttribute('data-vsl-yt');
  var poster = frame.getAttribute('data-poster') || '';
  var ctaHref = frame.getAttribute('data-vsl-cta') || 'apply.html';
  var ctaText = frame.getAttribute('data-vsl-cta-text') || 'Book my free Breakthrough Session';

  var unlocked = !root.classList.contains('rdly-gated');
  var player = null;
  var furthest = 0;      // watched high-water mark, so pausing never costs progress
  var started = false;
  var hit = {};          // 25/50/75/95 milestones, same events the other pages fire
  var ticker = null;

  function clock(t) {
    t = Math.max(0, Math.floor(t || 0));
    return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2);
  }
  function push(ev, extra) {
    if (!window.dataLayer) return;
    var o = { event: ev, page_path: location.pathname };
    for (var k in (extra || {})) o[k] = extra[k];
    dataLayer.push(o);
  }

  /* Nothing inside the clipped region should be reachable by keyboard while it is
     hidden: tabbing into it would scroll the clipped box and strand the visitor. */
  if (!unlocked && lock) lock.setAttribute('inert', '');
  if (!unlocked) push('rdly_vsl_gate_shown', { video_id: videoId, gate_at: GATE_AT });

  function unlock(reason) {
    if (unlocked) return;
    unlocked = true;
    if (reason === 'watched') { try { localStorage.setItem(KEY, '1'); } catch (e) {} }
    root.classList.remove('rdly-gated');
    if (lock) lock.removeAttribute('inert');
    push('rdly_vsl_unlock', { video_id: videoId, reason: reason });
  }

  /* Watchdog: if the player never reports ready, the gate has no way to open, so
     open it. Cleared the moment the API hands us a player. */
  var watchdog = setTimeout(function () { unlock('player-unavailable'); }, 12000);

  /* ---------- player chrome: same locked shell as the self-hosted VSL ---------- */
  frame.classList.add('is-playing');
  frame.innerHTML =
    (poster ? '<img class="vsl-poster" src="' + poster + '" alt="">' : '') +
    '<div class="vsl-stage"><div id="rdly-yt-vsl"></div></div>' +
    /* shield: YouTube's own UI is never hoverable or clickable, and the frame
       carries our play/pause instead */
    '<div class="vsl-shield" aria-hidden="true"></div>' +
    '<div class="vsl-veil"><button type="button" class="vsl-bigplay" aria-label="Play video"></button></div>' +
    '<div class="vsl-bar">' +
      '<button type="button" class="vsl-btn" data-act="play">Pause</button>' +
      '<button type="button" class="vsl-btn" data-act="mute">Unmute</button>' +
      '<div class="vsl-prog" aria-hidden="true"><i></i></div>' +
      '<span class="vsl-time">0:00</span>' +
    '</div>' +
    '<div class="vsl-sound">' +
      '<button type="button" class="btn btn--gold vsl-sound-btn">Tap for sound</button>' +
      '<p class="vsl-sound-note">Playing on mute. Tap to hear it from the start.</p>' +
    '</div>' +
    '<div class="vsl-end"><p class="vsl-end-h">That\'s the method.</p>' +
      '<a class="btn btn--gold" href="' + ctaHref + '">' + ctaText + '</a>' +
      '<button type="button" class="vsl-btn vsl-replay">Replay the video</button></div>';

  var shield = frame.querySelector('.vsl-shield');
  var veil = frame.querySelector('.vsl-veil');
  var playBtn = frame.querySelector('[data-act=play]');
  var muteBtn = frame.querySelector('[data-act=mute]');
  var fill = frame.querySelector('.vsl-prog i');
  var timeEl = frame.querySelector('.vsl-time');
  var soundBtn = frame.querySelector('.vsl-sound-btn');
  var soundLayer = frame.querySelector('.vsl-sound');

  function toggle() {
    if (!player) return;
    var s = player.getPlayerState();
    if (s === 1) player.pauseVideo(); else player.playVideo();
  }
  playBtn.addEventListener('click', toggle);
  shield.addEventListener('click', toggle);
  shield.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  veil.addEventListener('click', function () { if (player) player.playVideo(); });
  frame.querySelector('.vsl-replay').addEventListener('click', function () {
    frame.classList.remove('is-ended');
    if (player) { player.seekTo(0, true); player.playVideo(); }
  });

  /* Sound on. Anyone who taps in the first half-minute gets the video from the
     top, because a VSL opening is the part that does the work. Later than that,
     just unmute and let them keep their place. */
  function soundOn() {
    frame.classList.add('has-sound');
    if (!player) return;
    player.unMute();
    player.setVolume(100);
    if (furthest < 30) { furthest = 0; player.seekTo(0, true); }
    player.playVideo();
    muteBtn.textContent = 'Mute';
    push('rdly_vsl_unmute', { video_id: videoId });
  }
  soundLayer.addEventListener('click', soundOn);
  soundBtn.addEventListener('click', function (e) { e.stopPropagation(); soundOn(); });

  muteBtn.addEventListener('click', function () {
    if (!player) return;
    if (player.isMuted()) { player.unMute(); muteBtn.textContent = 'Mute'; frame.classList.add('has-sound'); }
    else { player.mute(); muteBtn.textContent = 'Unmute'; }
  });

  /* ---------- YouTube IFrame API ---------- */
  function boot() {
    player = new YT.Player('rdly-yt-vsl', {
      host: 'https://www.youtube-nocookie.com',
      videoId: videoId,
      playerVars: {
        autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0,
        rel: 0, playsinline: 1, modestbranding: 1, iv_load_policy: 3,
        origin: location.origin
      },
      events: { onReady: onReady, onStateChange: onState }
    });
  }

  function onReady(e) {
    clearTimeout(watchdog);
    e.target.mute();          // belt and braces: muted autoplay is the only kind that plays
    e.target.playVideo();
    ticker = setInterval(tick, 250);
    push('rdly_video_play', { video_id: videoId, video_type: 'vsl', autoplay: true });
  }

  function onState(e) {
    if (e.data === 1) {                                   // PLAYING
      started = true;
      frame.classList.add('is-started');
      frame.classList.remove('is-paused', 'is-ended');
      playBtn.textContent = 'Pause';
    } else if (e.data === 2) {                            // PAUSED
      if (!frame.classList.contains('is-ended')) frame.classList.add('is-paused');
      playBtn.textContent = 'Play';
    } else if (e.data === 0) {                            // ENDED
      frame.classList.remove('is-paused');
      frame.classList.add('is-ended');
      push('rdly_vsl_progress', { video_id: videoId, percent: 100 });
      unlock('watched');
    }
  }

  /* If the video is ever shorter than the unlock mark the gate could never open,
     so hold the mark just inside the end of whatever is actually loaded. */
  function gateAt() {
    var d = (player && player.getDuration && player.getDuration()) || 0;
    return d ? Math.min(GATE_AT, Math.max(5, d - 5)) : GATE_AT;
  }

  function tick() {
    if (!player || !player.getCurrentTime) return;
    var t = player.getCurrentTime() || 0;
    var d = player.getDuration() || 0;

    /* belt and braces: there is no seek affordance, but if anything ever jumps
       the position ahead, snap it back */
    if (t > furthest + 1.5 && t > furthest) { player.seekTo(furthest, true); return; }
    if (t > furthest) furthest = t;

    if (d) {
      var pct = Math.min(100, (t / d) * 100);
      fill.style.width = pct + '%';
      timeEl.textContent = clock(t);
      [25, 50, 75, 95].forEach(function (m) {
        if (!hit[m] && pct >= m) { hit[m] = 1; push('rdly_vsl_progress', { video_id: videoId, percent: m }); }
      });
    }

    if (unlocked) return;
    var mark = gateAt();
    var left = Math.max(0, mark - furthest);
    if (gateFill) gateFill.style.width = Math.min(100, (furthest / mark) * 100) + '%';
    if (countEl) countEl.textContent = started
      ? (left > 0 ? 'Unlocks in ' + clock(left) : 'Unlocking now')
      : 'Starting the video';
    if (left <= 0) unlock('watched');
  }

  if (window.YT && window.YT.Player) boot();
  else {
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (prev) prev(); boot(); };
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
})();
