/* Ridley funnel pages: scroll-reveal layer.
   IntersectionObserver only (no scroll listeners). Honors prefers-reduced-motion
   via the CSS gate; if motion is reduced, .rv elements are visible by default. */
(function(){
  if(!('IntersectionObserver' in window)) return;
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}
    });
  },{threshold:.18,rootMargin:'0px 0px -6% 0px'});
  document.querySelectorAll('.rv,.rv-l,.rv-r').forEach(function(el){io.observe(el);});
})();

/* Click-to-play video layer.
   [data-src]            = SELF-HOSTED sales video. No YouTube, so there is no title bar,
                           channel name, logo, "Watch on YouTube", or related-video grid to
                           hide in the first place. Native controls are off and we supply
                           play/pause + mute only; the progress bar is display-only
                           (pointer-events:none), so the video cannot be skipped forward.
   [data-yt]             = content video on YouTube, native controls, free navigation.
                           Correct for the long student interviews and brand films.
   Milestones fire rdly_vsl_progress at 25/50/75/95% for per-page retention in GTM. */
(function(){
  function clock(t){
    t=Math.max(0,Math.floor(t||0));
    return Math.floor(t/60)+':'+('0'+(t%60)).slice(-2);
  }
  function push(ev,extra){
    if(!window.dataLayer) return;
    var o={event:ev,page_path:location.pathname};
    for(var k in (extra||{})) o[k]=extra[k];
    dataLayer.push(o);
  }

  /* Source attachment. Plain .mp4 is set directly. An .m3u8 (Cloudflare Stream HLS) plays
     natively in Safari/iOS; every other browser gets hls.js lazy-loaded on first play, so
     nothing extra downloads for visitors who never click. Switching this site to Cloudflare
     Stream is therefore a one-line change per page: point data-src at
     https://customer-<CODE>.cloudflarestream.com/<UID>/manifest/video.m3u8 */
  var hlsLoading=false, hlsQueue=[];
  function withHls(cb){
    if(window.Hls) return cb();
    hlsQueue.push(cb);
    if(hlsLoading) return;
    hlsLoading=true;
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';
    s.onload=function(){ hlsQueue.forEach(function(f){f();}); hlsQueue=[]; };
    document.head.appendChild(s);
  }
  function attachSource(vid,src){
    if(!/\.m3u8(\?|$)/i.test(src)){ vid.src=src; return; }
    if(vid.canPlayType('application/vnd.apple.mpegurl')){ vid.src=src; return; }
    withHls(function(){
      if(window.Hls && window.Hls.isSupported()){
        var h=new window.Hls({capLevelToPlayerSize:true});
        h.loadSource(src); h.attachMedia(vid);
        h.on(window.Hls.Events.MANIFEST_PARSED,function(){ vid.play(); });
      } else { vid.src=src; }
    });
  }

  /* self-hosted, locked sales player */
  function mountSelfHosted(v){
    var src=v.getAttribute('data-src');
    var ctaHref=v.getAttribute('data-vsl-cta')||'apply.html';
    var ctaText=v.getAttribute('data-vsl-cta-text')||'Book my free Breakthrough Session';
    var posterImg=v.querySelector('img');
    var poster=v.getAttribute('data-poster')||(posterImg?posterImg.getAttribute('src'):'');
    v.classList.add('is-playing','is-started');
    v.innerHTML='<video class="vsl-video" playsinline preload="metadata"'+
        (poster?' poster="'+poster+'"':'')+'></video>'+
      /* shield: no native UI to reach, and it blocks the download context menu */
      '<div class="vsl-shield" aria-hidden="true"></div>'+
      '<div class="vsl-veil"><button type="button" class="vsl-bigplay" aria-label="Play video"></button></div>'+
      '<div class="vsl-bar">'+
        '<button type="button" class="vsl-btn" data-act="play">Pause</button>'+
        '<button type="button" class="vsl-btn" data-act="mute">Mute</button>'+
        '<div class="vsl-prog" aria-hidden="true"><i></i></div>'+
        '<span class="vsl-time">0:00</span>'+
      '</div>'+
      '<div class="vsl-end"><p class="vsl-end-h">That\'s the method.</p>'+
        '<a class="btn btn--gold" href="'+ctaHref+'">'+ctaText+'</a>'+
        '<button type="button" class="vsl-btn vsl-replay">Replay the video</button></div>';

    var vid=v.querySelector('.vsl-video');
    var fill=v.querySelector('.vsl-prog i');
    var timeEl=v.querySelector('.vsl-time');
    var playBtn=v.querySelector('[data-act=play]');
    var muteBtn=v.querySelector('[data-act=mute]');
    var shield=v.querySelector('.vsl-shield');

    function toggle(){ if(vid.paused) vid.play(); else vid.pause(); }
    playBtn.addEventListener('click',toggle);
    shield.addEventListener('click',toggle);
    shield.addEventListener('contextmenu',function(e){e.preventDefault();});
    vid.addEventListener('contextmenu',function(e){e.preventDefault();}); // no "Save video as"
    v.querySelector('.vsl-veil').addEventListener('click',function(){ vid.play(); });
    v.querySelector('.vsl-replay').addEventListener('click',function(){
      v.classList.remove('is-ended'); vid.currentTime=0; vid.play();
    });
    muteBtn.addEventListener('click',function(){
      vid.muted=!vid.muted;
      muteBtn.textContent=vid.muted?'Unmute':'Mute';
    });

    vid.addEventListener('play',function(){
      v.classList.remove('is-paused','is-ended'); playBtn.textContent='Pause';
    });
    vid.addEventListener('pause',function(){
      if(!v.classList.contains('is-ended')) v.classList.add('is-paused');
      playBtn.textContent='Play';
    });
    vid.addEventListener('ended',function(){
      v.classList.remove('is-paused'); v.classList.add('is-ended');
      push('rdly_vsl_progress',{video_src:src,percent:100});
    });
    /* belt and braces: if anything ever tries to jump ahead, snap it back */
    var furthest=0;
    var hit={};
    vid.addEventListener('timeupdate',function(){
      var d=vid.duration||0, t=vid.currentTime||0;
      if(t>furthest+1.5 && t>furthest){ vid.currentTime=furthest; return; }
      if(t>furthest) furthest=t;
      if(!d) return;
      var pct=Math.min(100,(t/d)*100);
      fill.style.width=pct+'%';
      timeEl.textContent=clock(t);
      [25,50,75,95].forEach(function(m){
        if(!hit[m] && pct>=m){ hit[m]=1; push('rdly_vsl_progress',{video_src:src,percent:m}); }
      });
    });

    attachSource(vid,src);
    vid.play();
    push('rdly_video_play',{video_src:src,video_type:'vsl'});
  }

  /* ordinary content video on YouTube: native controls, free navigation */
  function mountYouTube(v,id){
    var f=document.createElement('iframe');
    f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&playsinline=1';
    f.allow='autoplay; encrypted-media; picture-in-picture';
    f.allowFullscreen=true;
    f.title=v.getAttribute('data-yt-title')||'Video';
    f.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;';
    v.innerHTML='';
    v.appendChild(f);
    push('rdly_video_play',{video_id:id,video_type:'content'});
  }

  document.querySelectorAll('[data-yt],[data-src]').forEach(function(v){
    v.setAttribute('role','button');
    v.setAttribute('tabindex','0');
    v.style.cursor='pointer';
    v.style.position='relative';
    function play(){
      if(v.getAttribute('data-src')) mountSelfHosted(v);
      else mountYouTube(v,v.getAttribute('data-yt'));
    }
    v.addEventListener('click',play,{once:true});
    v.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){e.preventDefault();play();}
    },{once:true});
  });
})();

/* ============================================================================
   RDLY: capture + Calendly.  Wired 7/31.

   One contract for every form on this site. apply.html, custom-time.html and
   the booking pages all POST the same shape to the same endpoint the vsl-b
   front door uses, so both funnel tests land in one place and compare cleanly:

       POST /api/optin  {name,email,phone,consent,source,...}

   `source` is the only thing that differs, so a lead can always be traced back
   to the page that produced it.

   NOTE: /api/optin returns 405 in production today because the Cloudflare Pages
   Function is not deployed yet. Every call below is fire-and-forget, so nothing
   on the page waits on it or breaks because of it. The moment the function
   ships, these forms start writing to ActiveCampaign with no further changes.
   ========================================================================= */
(function(){
  /* The only two URLs that need editing when the calendars change. */
  var CAL={
    /* Live qualified event, confirmed by Chris 7/31. Same event the vsl-b door books. */
    qualified:'https://calendly.com/d/dv25-nhh-w9v/free-piano-consultation',
    /* Soft-DQ event does not exist yet. Left empty ON PURPOSE: an unset value keeps
       booking-b.html on its request-a-time fallback rather than quietly dropping
       soft-DQ applicants into the qualified calendar, which would corrupt both the
       call tiering and the booking read. Paste the second event URL here to switch
       it on. Nothing else needs to change. */
    dq:''
  };

  var LEAD_KEY='ridley_lead_v1';

  function qp(){ try{ return new URLSearchParams(location.search); }catch(e){ return new URLSearchParams(''); } }

  function attribution(){
    var p=qp(), o={}, keys=['el','utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
    keys.forEach(function(k){ var v=p.get(k); if(v) o[k]=v; });
    return o;
  }

  /* What the visitor already told us, wherever they told us. The front door writes
     this key on vsl-b; apply.html writes it here. Either way the booking page can
     prefill instead of asking twice. */
  function known(){
    try{ return JSON.parse(localStorage.getItem(LEAD_KEY)||'{}')||{}; }catch(e){ return {}; }
  }
  function remember(lead){
    try{
      var cur=known();
      for(var k in lead) if(lead[k]!=null && lead[k]!=='') cur[k]=lead[k];
      localStorage.setItem(LEAD_KEY,JSON.stringify(cur));
    }catch(e){}
  }

  function track(fbEvent,dlEvent,data){
    data=data||{};
    if(fbEvent){ try{ if(window.fbq) window.fbq('track',fbEvent,data); }catch(e){} }
    if(dlEvent){
      try{
        window.dataLayer=window.dataLayer||[];
        var o={event:dlEvent,page_path:location.pathname};
        for(var k in data) o[k]=data[k];
        dataLayer.push(o);
      }catch(e){}
    }
  }

  /* Fire and forget, deduped per source per email. A visitor who reloads the
     application or requests two times should not write ActiveCampaign twice or
     inflate the pixel's optimisation signal. */
  function capture(payload){
    payload=payload||{};
    var src=payload.source||'unknown';
    var email=(payload.email||'').trim().toLowerCase();
    if(!email) return false;

    var body={};
    var att=attribution();
    for(var k in att) body[k]=att[k];
    for(var j in payload) body[j]=payload[j];
    body.page_path=location.pathname;

    remember({name:payload.name,email:payload.email,phone:payload.phone});
    /* Hand the address to enhanced conversions the moment we have it, so a
       page that captures and books in one visit (the thank-you pages) has the
       hash ready rather than waiting for the next page load to read it back
       out of localStorage. */
    if(window.RA_ADS && window.RA_ADS.identify) window.RA_ADS.identify(payload.email);

    var dedupe='rdly_sent_'+src;
    var already=false;
    try{ already=localStorage.getItem(dedupe)===email; }catch(e){}
    if(already){ track(null,'rdly_capture_repeat',{capture_source:src}); return false; }
    try{ localStorage.setItem(dedupe,email); }catch(e){}

    try{
      fetch('/api/optin',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(body),
        keepalive:true
      }).catch(function(){});
    }catch(e){}
    return true;
  }

  /* ---- Calendly ---------------------------------------------------------
     Any element carrying data-cal="qualified" or data-cal="dq" becomes a live
     inline embed. Everything we already hold rides across as prefill, so the
     visitor re-types nothing, and the utm parameters and el are appended so
     Calendly forwards attribution into the event payload.

     On confirmation the pixel gets Schedule, which is the event the campaigns
     should ultimately bid on, and the visitor goes to booked.html carrying the
     same params. */
  var widgetLoading=false;
  function loadWidget(cb){
    if(window.Calendly) return cb();
    var existing=document.getElementById('calendly-widget-js');
    if(!existing){
      var s=document.createElement('script');
      s.id='calendly-widget-js';
      s.src='https://assets.calendly.com/assets/external/widget.js';
      s.async=true;
      s.onload=cb;
      document.head.appendChild(s);
      var css=document.createElement('link');
      css.rel='stylesheet';
      css.href='https://assets.calendly.com/assets/external/widget.css';
      document.head.appendChild(css);
      widgetLoading=true;
    } else if(widgetLoading){
      existing.addEventListener('load',cb);
    } else cb();
  }

  function calUrl(base){
    var lead=known(), p=qp();
    var u=base+(base.indexOf('?')>-1?'&':'?')+'hide_gdpr_banner=1';
    var name=lead.name||p.get('name')||'';
    /* Trimmed because whatever we prefill is what ends up on the booking record,
       and that record is what a later offline conversion upload is matched on.
       A stray space is enough to make the same person look like two. */
    var email=(lead.email||p.get('email')||'').replace(/^\s+|\s+$/g,'');
    var phone=lead.phone||p.get('phone')||'';
    if(name)  u+='&name='+encodeURIComponent(name);
    if(email) u+='&email='+encodeURIComponent(email);
    /* a1 is the first custom question on the event, which is where the phone
       number lands. Same mapping the vsl-b front door uses. */
    if(phone) u+='&a1='+encodeURIComponent(phone);
    var att=attribution();
    for(var k in att) u+='&'+k+'='+encodeURIComponent(att[k]);
    /* The Google Ads click ID, as salesforce_uuid. This is what makes the
       offline upload possible later: it puts gclid on the booking record, so
       when we learn which calls actually showed up and bought we can hand that
       back to Google and let bidding chase buyers instead of bookers. Empty
       string when there is no click ID, so organic bookings are unaffected. */
    if(window.RA_ADS && window.RA_ADS.calendlyParams) u+=window.RA_ADS.calendlyParams();
    return u;
  }

  function mountCal(host){
    var key=host.getAttribute('data-cal');
    var base=CAL[key];
    if(!base){
      /* Unconfigured on purpose. Leave the fallback copy in place and say so
         loudly enough that it cannot ship unnoticed. */
      track(null,'rdly_cal_unconfigured',{cal_key:key});
      if(window.console&&console.warn) console.warn('[rdly] Calendly event "'+key+'" is not configured. Falling back to the request-a-time path.');
      host.setAttribute('data-cal-state','unconfigured');
      return;
    }
    loadWidget(function(){
      var box=document.createElement('div');
      box.className='calendly-inline-widget';
      box.setAttribute('data-url',calUrl(base));
      /* NO INNER SCROLLBAR. Calendly's embed only scrolls inside itself when the
         box is shorter than the view it is rendering, so the box has to track the
         content. data-resize + resize:true turn on Calendly's own page_height
         listener, which sets this element's height on every view change (month
         grid, day-with-times, confirm form). The two are the same switch on the
         two mount paths: the attribute covers widget.js auto-init, the option
         covers our explicit initInlineWidget call below. */
      box.setAttribute('data-resize','true');
      box.style.minWidth='320px';
      /* Only the height before Calendly's first page_height message lands. Tall
         enough that the calendar has never scrolled even in that first beat; the
         old 700px is what produced the scrollbar. */
      box.style.height='1100px';
      var slot=host.querySelector('.calendly-slot,.cal-slot');
      if(slot) slot.parentNode.replaceChild(box,slot);
      else { host.innerHTML=''; host.appendChild(box); }
      host.setAttribute('data-cal-state','live');
      if(window.Calendly&&window.Calendly.initInlineWidget){
        window.Calendly.initInlineWidget({url:calUrl(base),parentElement:box,resize:true});
      }
      track(null,'rdly_cal_view',{cal_key:key});
    });
  }

  var booked=false;
  window.addEventListener('message',function(e){
    /* Only Calendly gets to fire a booking. Without this, any page that can
       postMessage to us could trip the Schedule pixel and bounce the visitor to
       booked.html. Kept deliberately loose (substring, not equality) because
       Calendly serves embeds from more than one calendly.com host. */
    if(typeof e.origin!=='string'||e.origin.indexOf('calendly.com')===-1) return;
    if(!e.data||typeof e.data!=='object') return;
    if(e.data.event!=='calendly.event_scheduled') return;
    if(booked) return;
    booked=true;
    track('Schedule','rdly_booking_confirmed',{content_name:'Breakthrough Session'});
    /* Give the pixel a beat to flush before the navigation. */
    setTimeout(function(){ location.href='booked.html'+location.search; },400);
  });

  function init(){
    var hosts=document.querySelectorAll('[data-cal]');
    for(var i=0;i<hosts.length;i++) mountCal(hosts[i]);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

  window.RDLY={CAL:CAL,capture:capture,track:track,known:known,remember:remember,attribution:attribution};
})();
