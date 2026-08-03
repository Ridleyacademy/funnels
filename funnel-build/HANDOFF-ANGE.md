# Ridley Funnel: Deploy Handoff

For Ange. Everything in this package is static HTML, CSS, and vanilla JS. No build step, no framework, no dependencies to install. Drop it on Cloudflare Pages and it runs.

**Nothing goes live to real traffic until Chris has reviewed the final pages and said go.** Staging is fine; publishing is his call.

---

## 1. What's in here

```
funnel-build/          the site and the funnel
  index.html           homepage (VSL + proof + CTA)
  how-it-works.html    method/offer page
  success.html         reviews hub + student interviews
  about.html           Stephen's story
  mentors.html         mentorship model
  support.html         contact page
  privacy.html         legal, ported verbatim from the live site
  terms.html           legal, ported verbatim from the live site

  apply.html           11-step booking flow, routes to the calendar
  booking.html         qualified booking page (Calendly)
  booking-b.html       soft-DQ twin: same copy, different Calendly event
  booked.html          post-booking confirmation + show-up videos
  custom-time.html     "none of these times work" fallback form
  tripwire.html        $27 4 Magic Chords sales page
  tripwire-confirmed.html  post-purchase: survey + booking
  offramp.html         app-quitter VSL page
  nurture-1..5.html    nurture chain (email click destinations)

  learn-piano-after-50.html, online-piano-lessons-adults.html,
  online-piano-course.html, piano-teacher-cost.html,
  learn-piano-without-sheet-music.html          5 SEO keyword landers
  how-much-does-ridley-academy-cost.html,
  best-ways-to-learn-piano.html,
  ridley-academy-review.html                    3 SEO articles

  shared.css / shared.js   the design system and all page behaviour
  images/                  photography, press logos, review screenshots
  videos/                  FAQ + welcome videos (see section 3)
quiz-funnel/index.html     the 60-second quiz (front door)
```

The quiz sits in a sibling folder because every page links to it with `../quiz-funnel/`. **Keep the two folders as siblings** or those links break.

---

## 2. Deploy to Cloudflare Pages

Static site, no build command.

```
Build command:        (leave empty)
Build output dir:     /            (the folder containing funnel-build/ and quiz-funnel/)
```

Via Wrangler:
```bash
npx wrangler pages deploy . --project-name=ridley-funnel
```

Two settings to get right:

1. **Keep the funnel pages out of Google.** These pages already carry `<meta name="robots" content="noindex">`: apply, booking, booking-b, booked, custom-time, tripwire, tripwire-confirmed, offramp, nurture-1..5. The site pages, the 5 landers, and the 3 articles are meant to be indexed. If you want belt-and-braces during staging, add a `_headers` file with `X-Robots-Tag: noindex` for everything, then remove it at launch.
2. **Self-host the fonts.** Every page currently pulls Oswald and Caveat from Google Fonts and Switzer from Fontshare via `<link>`. Please self-host all three with `font-display: swap` before launch.

---

## 3. Video: moving the VSL to Cloudflare Stream

The sales video is deliberately NOT on YouTube. YouTube draws its own title bar and channel name over the first seconds of playback and there is no parameter that suppresses it (`modestbranding` is deprecated), which is exactly the branding we need gone on a sales video.

The player in `shared.js` handles both plain MP4 and HLS, so switching to Stream is one attribute per page.

**Steps:**
1. Upload the VSL to Cloudflare Stream. Source file: `RAVSL_v8` (4K master). A 720p web copy (1280x720, 15:30, 126MB) is at `videos/vsl-main.mp4` if you'd rather upload the smaller one; its poster frame is `videos/vsl-main-poster.jpg`.
2. Copy the HLS manifest URL from Stream. It looks like:
   `https://customer-<CODE>.cloudflarestream.com/<UID>/manifest/video.m3u8`
3. In these three files, change `data-src` on the `.vframe` element:
   - `index.html`
   - `how-it-works.html`
   - `offramp.html`

   ```html
   <!-- from -->
   <div class="vframe rv" data-vsl data-src="videos/vsl-main.mp4" ...>
   <!-- to -->
   <div class="vframe rv" data-vsl data-src="https://customer-CODE.cloudflarestream.com/UID/manifest/video.m3u8" ...>
   ```
4. Optionally point `data-poster` at a Stream thumbnail:
   `https://customer-<CODE>.cloudflarestream.com/<UID>/thumbnails/thumbnail.jpg?time=2s`

That's it. Safari and iOS play HLS natively; other browsers get hls.js lazy-loaded from jsDelivr on first play, so nothing extra downloads for people who never click play. If you'd rather not depend on jsDelivr, self-host `hls.js` and change the URL in `shared.js` (search for `jsdelivr`).

**The VSL player is intentionally locked** (this is the WarriorBabe pattern, and Chris asked for it): no native controls, our own play/pause and mute, a progress bar that displays position but cannot be dragged, and a seek-guard that snaps playback back if the position jumps ahead. Do not "fix" this by enabling native controls.

**The other videos:**
- `videos/faq-*.mp4` (3 files) play on `booked.html` as pre-call objection handling.
- `videos/welcome-stephen.mp4` plays on `tripwire-confirmed.html`.
- These are plain self-hosted MP4s with native controls, which is correct: people should be able to scrub them. Move them to Stream too if you prefer; same one-line swap, but they'd need the `data-src` treatment or a plain `<source>` update.
- The student interviews and brand films on the nurture/success/tripwire pages stay on YouTube on purpose. They're content and proof, some run 50+ minutes, and hosting them ourselves would cost bandwidth for no gain.

---

## 4. What still needs wiring (the punch list)

These are the placeholders. Search for square brackets to find them all: `grep -rn "\[" *.html | grep PLACEHOLDER`

| What | Where | Needs |
|---|---|---|
| Qualified Calendly event | booking.html, tripwire-confirmed.html | **RESOLVED 7/31.** Live event `calendly.com/d/dv25-nhh-w9v/free-piano-consultation`, wired via `data-cal="qualified"`. The URL lives in one place, `CAL` at the bottom of shared.js. Nothing to do. |
| Soft-DQ Calendly event | booking-b.html | **Still needed: the second event does not exist yet.** Create it, then paste the URL into `CAL.dq` in shared.js. That is the only change. Until then booking-b.html deliberately shows the request-a-time fallback rather than dropping soft-DQ applicants into the qualified calendar, which would corrupt both the call tiering and the booking read. |
| Application payload | apply.html | **RESOLVED 7/31.** Posts to `/api/optin` with `source: "application"`, the full answer set, the routing decision, and utm/el attribution, at the moment the application completes rather than at booking. Fires `Lead`. |
| Custom-time payload | custom-time.html | **RESOLVED 7/31.** Posts to `/api/optin` with `source: "custom-time"`. Still needs a human: someone has to own that inbox and reply within one business day. |
| `/api/optin` itself | Cloudflare Pages | **This is the blocker.** Every form above posts to it, and it returns 405 in production because the Pages Function was never deployed. Deploy `functions/` via the wrangler CLI (dashboard drag-and-drop silently drops it) and set `AC_URL`, `AC_KEY`, `CALENDLY_SIGNING_KEY`. Until then all three forms still work for the visitor and the writes are silently lost. |
| ThriveCart | tripwire.html | Embed product-1168 checkout in the `#checkout` placeholder, and set its receipt/success URL to `tripwire-confirmed.html` so every buyer lands in the booking flow. Julian Cepeda holds ThriveCart access. |
| `<!-- GTM CONTAINER HERE -->` | every page | Replace with the real GTM container (head snippet + noscript body tag). |
| `[CAPACITY-PLACEHOLDER]` | booking.html, booking-b.html | Only if a real weekly capacity limit exists. Chris confirms the true number or the line comes out. No invented scarcity. |
| `[MENTOR-ROSTER-PLACEHOLDER]` | mentors.html | Real mentor names, photos, bios. Cards read "coming soon" until then, which is honest but not ideal. |
| `[BIO-FACT-PLACEHOLDER]` | about.html | Founding year and a couple of bio facts to confirm. |
| `[STAT-PLACEHOLDER]`, `[REAL-QUOTE-PLACEHOLDER]`, `[TIMELINE-PLACEHOLDER]` | offramp.html | Optional verified stat, a real sourced quote, and confirmation of the timeline framing before ad spend. |

---

## 5. Tracking: the dataLayer events to build GTM triggers on

All prefixed `rdly_`. They already fire; GTM just needs the triggers.

| Event | Fires when | Useful payload |
|---|---|---|
| `rdly_site_view` | any site page loads | `page` |
| `rdly_quiz_start` / `rdly_quiz_step` / `rdly_quiz_complete` | quiz progress | `quiz_id`, `step`, `answers` |
| `rdly_apply_start` / `rdly_apply_step` | booking flow progress | `step` |
| `rdly_apply_complete` | flow finished, redirecting to calendar | `route` = `qualified` or `dq` |
| `rdly_apply_dq` | disqualified | `dq_type` = `hard` or `soft` |
| `rdly_booking_view` | booking page loads | `page_variant` = `qualified` or `dq` |
| `rdly_booked_view` | confirmation page loads | |
| `rdly_customtime_view` / `rdly_customtime_submit` | calendar-friction fallback | `ct_payload` |
| `rdly_video_play` | any video started | `video_src` or `video_id`, `video_type` |
| `rdly_vsl_progress` | VSL retention milestones | `percent` = 25/50/75/95/100 |
| `rdly_tw_view` / `rdly_tw_cta_click` | tripwire page + CTA | `cta` |
| `rdly_tw_confirm_view` / `rdly_tw_survey_*` | post-purchase flow | |
| `rdly_offramp_view` / `rdly_offramp_cta_click` | app-quitter page | |
| `rdly_nurture_view` | nurture pages | page number |

`rdly_vsl_progress` is the one that matters most for the funnel: it gives per-page VSL retention, which is how VSL variants get judged.

**Source params:** `el=` and any `utm_*` carry through the funnel automatically (quiz → apply → booking). Don't strip them. Calendly forwards `utm_*` into the event payload, which is how bookings get attributed back to ads.

---

## 6. The routing rules in apply.html (don't change these by accident)

They live in a comment at the top of the file and in the `finish()` function.

- **Hard DQ** (question 1 or 2 answered "No") → in-page screen offering the $27 mini course. No booking page.
- **Soft DQ** (invested under $500 AND commitment 5/10, or "no" on attending) → `booking-b.html`, the DQ calendar.
- **Qualified** (everyone else) → `booking.html`.

Question numbering skips 8 and 9 on purpose: those two open-text steps were removed, and the remaining keys (q10, q11, q13) still match the routing logic and the CRM payload.

---

## 7. Before launch

- [ ] Fonts self-hosted with `font-display: swap`
- [ ] GTM container in place, triggers built on the events above
- [ ] Calendly events wired (both of them) and a test booking completed end to end
- [ ] Application POST live, verified a test submission lands in AC
- [ ] ThriveCart embedded, receipt pointing at tripwire-confirmed.html, test purchase completed
- [ ] VSL playing from Cloudflare Stream on all three pages
- [ ] Real-device pass at 390px (the CSS is fluid and verified to 500px in headless Chrome, but Chrome CLI can't emulate below ~500)
- [ ] noindex confirmed on funnel pages, removed from the pages meant to rank
- [ ] No square-bracket placeholders left: `grep -rn "PLACEHOLDER" *.html`

Questions on any of this, ask Chris and he'll loop me in.
