# Ridley funnel-build: deploy map

For Ange and Chris. This folder replicates the WarriorBabe nurture and booking funnel (teardown in ~/riddley/warriorbabe-hack/) in Ridley's brand. All copy is sourced from FACTS.md; anything unverified is a bracketed placeholder.

**Nothing here ships until Chris reviews the final copy on every page and gives an explicit go. Building and staging is fine; publishing is gated.**

## File map: what replicates what

| funnel-build file | WarriorBabe original | Purpose |
|---|---|---|
| index.html | warriorbabe.com homepage | Brand-site homepage: split hero, press strip, belief flip, 4-phase method band, three-doors offer ladder (quiz / $27 4MC / Breakthrough Session), proof marquee, Stephen section, FAQ, footer. Nav + sitefoot defined here are the canon for all site pages. |
| how-it-works.html | /how-it-works (they noindex it; so do we) | Offer/program page: method deep dive, what coaching includes (verified items only), 12-month roadmap, comparison table, price anchor card, FAQ. |
| success.html | /success | Reviews hub: featured student cards, interview video slots, 18-screenshot masonry review wall, two-door CTA. Indexed. |
| about.html | /company/about-us | Stephen's story from verified facts only; [BIO-FACT-PLACEHOLDER] comments where facts are missing. Indexed. |
| mentors.html | /company/coaches | Mentorship-model page: how mentorship works, one-method approach, why we are selective, CTA. Roster section REMOVED 7/31 per Chris (was placeholder "coming soon" cards). Indexed. |
| learn-piano-after-50.html | their footer SEO landers | First implemented keyword lander from seo/lander-template.md, targeting "learn piano after 50". Indexed. |
| online-piano-lessons-adults.html | their footer SEO landers | Keyword lander 2 of 5: "online piano lessons for adults." Quiz CTA (cold keyword). Indexed. |
| online-piano-course.html | their footer SEO landers | Keyword lander 3 of 5: "best online piano course." Quiz CTA. Indexed. |
| piano-teacher-cost.html | their footer SEO landers | Keyword lander 4 of 5: "piano teacher cost." Cost-intent, so CTA is apply/Breakthrough Session; stat cards carry the $50 to $100 per lesson and two-year math. Indexed. |
| learn-piano-without-sheet-music.html | their footer SEO landers | Keyword lander 5 of 5: "play piano without reading music." Quiz CTA. Indexed. |
| how-much-does-ridley-academy-cost.html | /read/how-much-does-warriorbabe-cost | seo/cost-article.md built as a page: owns the "Ridley Academy cost" SERP, answers everything but the coaching price, price cards, routes to apply. Article + FAQ schema. Indexed. |
| best-ways-to-learn-piano.html | /read/best-online-strength-training-programs | seo/best-listicle.md built as a page: ranked cards, Ridley #1 with an explicit written-by-us transparency note, fair competitor treatment, quiz + apply CTAs. Indexed. |
| ridley-academy-review.html | their self-owned "review" SERP play | NEW copy (no .md draft existed): owns "Ridley Academy review" honestly; first-party disclosure box, named verifiable testimonials, real pros AND cons, cost summary, FAQ schema. Indexed. |
| custom-time.html | /custom-time-request | Calendar-friction fallback linked from both booking pages: light form card (name, email, phone, timezone, day windows, notes), carries el/utm params, rdly_customtime_view/submit events. Noindex. Submit handler needs the AC/n8n webhook wired (NOTE for Ange inside). |
| support.html | ridleyacademy.com/pages/support | Support/contact page cloned into our design system: quick-fix pointer, support@ridleyacademy.org + instructor@ridleyacademy.team cards, identify-with-purchase note. Indexed. |
| privacy.html | ridleyacademy.com/pages/privacy-policy | Privacy policy, legal text ported VERBATIM (fetched 7/30); layout only, no wording edits without legal sign-off. Kajabi-provider clause flagged in a comment. |
| terms.html | ridleyacademy.com/pages/terms | Terms of enrollment, legal text ported VERBATIM (fetched 7/30). FLAG: source includes "OPTIONAL: MANDATORY ARBITRATION (if enabled)" left in from a template; legal must resolve before ship. |
| tripwire.html | ridley-funnel-a.pages.dev/tripwire | 4MC sales page cloned into our design system. Two deliberate changes: broken "0 students" counter replaced with verified proof; checkout is an explicit ThriveCart product-1168 placeholder (receipt must point at tripwire-confirmed.html, order bumps before traffic). Noindex. |
| ../quiz-funnel/index.html | /quiz + /quiz-7 | Front-door quiz (RDLY-quiz-v1): belief-priming questions, age-keyed redirect map into the BOOKING FLOW (apply.html -> booking.html) carrying el/quiz/age/tried params (changed 7/31 from the dead external /vsl-a), rdly_quiz_* events. Built with verified numbers (40,000+ students, ages 5 to 96, David Clarke quote). Redirect map's 45+/55+ rows should point at a second-presenter page when one exists. |
| seo/cost-article.md | /read/how-much-does-warriorbabe-cost | Copy draft, now BUILT as how-much-does-ridley-academy-cost.html (edit the page, keep the .md as source history). |
| seo/best-listicle.md | /read/best-online-strength-training-programs | Copy draft, now BUILT as best-ways-to-learn-piano.html (edit the page, keep the .md as source history). |
| seo/lander-template.md | the 7 footer SEO landers | Template + slugs for 5 keyword landers. All 5 now BUILT (after-50, adults, course, teacher-cost, no-sheet-music). |
| ads/ad-copy-deck.md | 01-ADS.md winners | Their proven Meta hooks ported to Ridley across 5 lanes (quiz control, founder evergreen, app-quitter wedge, content-style, advertorial tripwire), compliance-checked. |
| apply.html | /schedule-apply + JotForm v5 | 11-step booking flow (REFRAMED 7/31 per Chris: it reads as booking a call, not submitting a lead form). H1 "Book your free 30-minute Breakthrough Session", every step points at the calendar, submit screen says "Opening your calendar". Hard DQ (Q1/Q2 = No) routes to the $27 tripwire; soft DQ routes to booking-b.html; qualified routes to booking.html. The two open-text steps (permission-to-vent, magic-wand) were REMOVED 7/31 per Chris, so the flow is all taps plus contact details; data-q numbering skips 8 and 9 on purpose. Routing rules live in comments inside the file. |
| booking.html | /schedule-booking | Qualified booking page with Calendly embed for the Breakthrough Session. |
| booking-b.html | /schedule-booking-dq | Soft-DQ twin of booking.html: identical visible copy, different Calendly event so DQ'd applicants land on a separate calendar. |
| booked.html | /scheduled-success | Post-booking confirmation page. |
| offramp.html | join.warriorbabe.com/glp1-vip | Offramp VSL page for non-bookers; pitches the path back into the call funnel. |
| tripwire-confirmed.html | macro-method-confirmed | $27 4 Magic Chords purchase confirmation; its real job is booking the call (post-purchase survey plus Calendly). |
| nurture-1.html | /nurture-1 | Education: why adults learn faster than kids. Stephen video slot, stats, link to nurture-2. |
| nurture-2.html | /nurture-2 | Education: the sheet-music myth (theory lands after you can play). Link to nurture-3. |
| nurture-3.html | /nurture-3 | Student story: Glenwood Clark, 68, one year to both hands plus reading music. Review screenshots. Link to nurture-4. |
| nurture-4.html | /nurture-4 | Student story with specifics: David Clarke (eight prior teachers) and Carlos Rodriguez (goal in under 6 months). Link to nurture-5. |
| nurture-5.html | /nurture-5 | The pitch, no video: guided coaching is the difference between "someday" and playing. Single CTA to apply.html?el=nurture5. Loops back to nurture-1. |

Escalation arc across the nurture chain mirrors WarriorBabe's: educate, educate, story, story, pitch, then loop.

## Placeholder inventory: resolve before deploy

Verified against the built pages on 7/28. Files still marked "spec'd" below may add placeholders when they land; re-run a grep for `[` brackets before deploy.

| Placeholder | Where | What's needed |
|---|---|---|
| Qualified Calendly event | booking.html, tripwire-confirmed.html | RESOLVED 7/31: live event `dv25-nhh-w9v`, mounted by shared.js from `data-cal="qualified"`. Prefills name/email/phone, carries utm/el, fires `Schedule` on confirmation and redirects to booked.html. |
| Soft-DQ Calendly event | booking-b.html | STILL OPEN: the second event type has not been created. Paste its URL into `CAL.dq` in shared.js to switch the page on. Until then it shows the request-a-time fallback rather than misrouting soft-DQ applicants into the qualified calendar. |
| Form capture | apply.html, custom-time.html | RESOLVED 7/31: both POST to `/api/optin` with distinct `source` values, the same contract the vsl-b front door uses. Gated on the Pages Function being deployed (returns 405 today). |
| [CAPACITY-PLACEHOLDER] | booking.html, booking-b.html | Only if a real capacity limit exists; Chris confirms the true number or the line comes out. No invented scarcity. |
| [STAT-PLACEHOLDER] | offramp.html | Optional verified stat on app-learner outcomes. Stays observational until sourced. |
| [REAL-QUOTE-PLACEHOLDER] | offramp.html | A real quote with name or handle plus source. |
| [TIMELINE-PLACEHOLDER] | offramp.html | Confirm exact "first song in week one / repertoire by month three" framing with Chris before ad spend. |
| Student video slots | nurture-3.html, nurture-4.html | RESOLVED 7/30 with honest substitutes from the channel scrape (see VIDEO-MAP.md): nurture-3 = V1dcFoADYdg students-tell-all, nurture-4 = Matt's interview qFRbozAsb3k, both labeled as who they actually are. Swap in Glenwood/David interviews if ever recorded. |
| Stephen video slots | nurture-1.html, nurture-2.html, offramp.html, index.html, how-it-works.html, tripwire.html | RESOLVED 7/30: all wired as click-to-play youtube-nocookie embeds via shared.js data-yt pattern (full mapping in VIDEO-MAP.md). VSL slots use XO74o7ehyx8, the live LP masterclass video. |
| `<!-- GTM CONTAINER HERE -->` | every page | Replace with the real GTM container snippet (head plus noscript body tag). |
| Footer support/legal links | site footer (all site pages) | RESOLVED 7/30 v2: Contact Us -> support.html, Privacy -> privacy.html, Terms -> terms.html, 4MC -> tripwire.html (all cloned into this site per Chris; no more external Kajabi/pages.dev links in footers). |
| Mentor roster | mentors.html | CLOSED 7/31: section removed per Chris rather than shipping placeholder cards. Rebuild only if real names, photos, and bios arrive. |
| Student interview grid | success.html | RESOLVED 7/30: three real channel interviews embedded (students-tell-all, Matt, Rich; see VIDEO-MAP.md). booked.html's 3 FAQ slots and tripwire-confirmed's welcome video RESOLVED 7/30 from finished cuts found in ~/Desktop/Ridley-Academy (transcoded into videos/; see VIDEO-MAP.md). |
| [BIO-FACT-PLACEHOLDER] comments | about.html | Founding year and other bio facts to confirm before publishing. |
| Hidden tracking fields | apply.html | Application payload (answers plus hidden source fields) needs wiring to the backend or webhook; see the NOTE for Ange in apply.html's script. |

## Design system v3: WarriorBabe layout fidelity (7/28 late night)

Chris flagged that the pages didn't mirror WarriorBabe's actual rendered layouts. We captured their real pages (full-page screenshots in ../warriorbabe-hack/layout-captures/: home, glp1, how-it-works, apply, scheduled-success, success, wb4-method, quiz) and rebuilt to match their layout grammar in Ridley's brand:
- Their near-black + hot pink became our deep ink (#170406) + cherry/gold. `body class="theme-dark"` on all 16 funnel-build pages; the quiz stays light, matching WarriorBabe's own light quiz.
- New components (shared.css THEME-DARK block): .hl/.hl-gold accent-italic phrases, .proofline, .vframe+.vpill (video with caption pill), .stat-trio, .statcards, .bigstat, .bleed full-width photo bands, .icon-grid, .tl vertical timeline with gold win-node, .quote-xl pull-quotes, .laurel cards, .sticky-split+.cat-card feature stack, .jtabs/.jgrid/.jcard tabbed journeys, .founder block.
- Forms/calendars stay LIGHT paper cards popping on black, exactly like their white JotForm on black.
- Quiz got their numbered progress rail ending in a Results pill.
- All copy, routing JS, aria/focus management, placeholders, and el= params preserved; apply and tripwire flows re-tested end to end after the port; booking twins re-diffed.

## Design system (v2 taste pass, 7/28 evening)

- shared.css v2 + shared.js: brand type scale (Oswald display, Switzer body, Caveat hand accents), asymmetric split heroes, real photography (images/perf-*.jpg from the live LP, masterclass-poster.jpg), boxless stat displays, scroll reveals via IntersectionObserver (honors prefers-reduced-motion), one review-screenshot marquee max per page, upgraded buttons/forms/FAQ.
- Fonts load from Google (Oswald, Caveat) and Fontshare (Switzer) via <link>. Self-host all three at deploy with font-display: swap.
- Mobile: verified fluid to 500px via headless Chrome; Chrome CLI cannot emulate below ~500, so run one real-device (or DevTools) pass at 390px before launch. CSS below 500 is single-column and fluid by design.
- offramp.html is the reference implementation of the system.

## Deploy notes

- Funnel pages (apply, booking, booked, offramp, tripwire-confirmed, nurture-1..5, custom-time) carry `<meta name="robots" content="noindex">`. Keep it that way; they are funnel destinations, not SEO pages. The site pages, 5 keyword landers, and 3 articles are the indexed exception, per seo/lander-template.md.
- Site-page footers now carry a "Guides" block (5 landers + 3 articles) under the Academy column on: index, how-it-works, success, about, mentors, and all 8 new indexed pages. This is the WarriorBabe footer-lander internal-linking play.
- The VSL is a LOCKED player (7/31 per Chris): `data-vsl` on the .vframe turns off YouTube's controls, keyboard seeking, and fullscreen, and swaps in our own play/pause + mute bar with a display-only progress line, so the sales video cannot be skipped forward. Content videos (interviews, brand films, tripwire clip) keep native controls on purpose. Full detail in VIDEO-MAP.md.
- dataLayer events are already pushed on-page, all prefixed `rdly_` (rdly_nurture_view with page number, rdly_apply_start/step/complete/dq, rdly_booking_view, rdly_booked_view, rdly_offramp_view/cta_click, rdly_tw_confirm_view, rdly_tw_survey_start/step/complete). Wire these into GTM triggers once the container is in.
- Carry `el=` and any utm/quiz params through every link. apply.html and offramp.html already do this in script; nurture email links should append `?el=nurture1` through `?el=nurture5`, and nurture-5's CTA hardcodes `apply.html?el=nurture5`.
- DQ routing rules (hard DQ to /tripwire, soft DQ to booking-b.html) live in comments at the top of apply.html and in its submit handler. Change them there, nowhere else.
- Footer/apply "4 Magic Chords" links point at tripwire.html (the in-site clone). Tripwire checkout is ThriveCart product-1168 (Julian Cepeda holds ThriveCart access). The /tripwire sales page already exists live (see ~/riddley/ridley-tripwire-full.jpeg; its checkout is a front-end mock until NMI + ThriveCart are connected). The WarriorBabe-teardown upgrades for that step are (a) 2 to 3 order bumps at $22 to $25 in the ThriveCart checkout and (b) pointing its receipt/confirmation at tripwire-confirmed.html so every $27 buyer flows into a booked Breakthrough Session.
- Prices for the coaching ladder are never printed on these pages; the only allowed anchor is the private-lesson cost range, per FACTS.md.

## Review gate

Nothing on this list gets published, shared externally, or pointed at live traffic until Chris has seen the final version of each page and explicitly said to ship it. Approval of the approach is not approval to deploy.
