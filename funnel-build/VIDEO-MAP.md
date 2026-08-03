# Video Map: every slot, every asset (7/30)

Source scrapes: YouTube channel youtube.com/@stephenridleytv (30 videos inventoried, full list below) and Dropbox (session expired at scrape time; see Dropbox section). Embeds use the click-to-play pattern in shared.js: any element with `data-yt="<videoId>"` renders its poster + play button, and the first click swaps in a youtube-nocookie player and fires `rdly_video_play`. No YouTube JS loads before the click.

**Two player modes (added 7/31):**

- `data-yt` alone = content video. Native YouTube controls, viewer navigates freely. Correct for the interviews (some are 50+ minutes), the brand films, and the tripwire clip.
- `data-yt` + `data-vsl` = the sales video, LOCKED so it cannot be skipped forward. YouTube's control bar is off (`controls=0`), keyboard seeking is off (`disablekb=1`), fullscreen is off (`fs=0`), and our own bar carries play/pause and mute only. The progress bar shows position but has `pointer-events:none`, so there is no seek affordance at all. Mirrors the locked player on the live vsl-a LP. Milestones fire `rdly_vsl_progress` at 25/50/75/95%, which is how VSL retention gets read per page in GTM.

**The VSL is SELF-HOSTED, not on YouTube (decided 7/31).** We first tried to hide YouTube's chrome on the sales video and got most of the way there, but YouTube draws its title bar ("RAVSL v8") and channel name for the first seconds of playback, and no parameter suppresses it (`modestbranding` is deprecated). Rather than fight it, the VSL now plays from our own file: `videos/vsl-main.mp4`, transcoded from `~/Desktop/Ridley-Academy/VSL/RAVSL_v8 -.mp4` (4K, 15:30, 4.1GB) down to 720p for web (final: 1280x720, 15:30, 126MB at ~1.1 Mbps, faststart enabled, poster frame at `videos/vsl-main-poster.jpg`). With no YouTube in the page there is no title, no logo, no "Watch on YouTube", and no related-video grid to hide. The player is locked the same way: native controls off, our own play/pause + mute, display-only progress bar, plus a seek-guard that snaps playback back if the position ever jumps ahead.

**Hosting for production (decision needed before ad spend).** Serving a ~100MB+ MP4 from Vercel works for review but is the wrong shape for paid traffic: no adaptive bitrate (a weak connection buffers instead of dropping quality), no retention analytics, and bandwidth cost scales with clicks. The three sane options, cheapest first: Cloudflare Stream (~$5/mo per 1,000 min stored, $1 per 1,000 min delivered, adaptive, gives retention data), Bunny Stream (similar, cheaper delivery), or Vidalytics (what WarriorBabe uses: built for VSLs, per-variant retention, no-skip built in). Whichever we pick, the player code does not change much: it is a plain `<video>` element, so it swaps to an HLS source with a few lines. Flagged for Chris.

**What we did before self-hosting (kept for the content videos, and for the record):** YouTube deprecated `modestbranding`, so parameters alone cannot remove its chrome. Verified in-browser and solved in three layers:

1. **Shield** (`.vsl-shield`), a transparent layer over the whole player. YouTube's title overlay, channel avatar, Share / Watch later, "Watch on YouTube" and end-screen cards are never hoverable or clickable, and the right-click "Copy video URL" menu is suppressed. Hit-tested: every corner of the frame returns `vsl-shield`, never the iframe.
2. **Veil** (`.vsl-veil`), an opaque scrim. Blocking clicks was not enough: YouTube still DRAWS its title bar ("RAVSL v8 / Stephen Ridley") and logo on every paused state and on start-up. The veil covers the frame whenever the player is paused or starting, showing our own play button instead. Screenshot-verified: paused state shows zero YouTube branding.
3. **End card** (`.vsl-end`), shown on ENDED so YouTube's related-video grid never appears. Carries the page's booking CTA (`data-vsl-cta`) plus a replay button, so the video ends on the funnel's ask instead of a competitor's thumbnail.

Self-hosted + locked (`data-src`): index.html, how-it-works.html, offramp.html. YouTube content videos (`data-yt`, native controls, free navigation): the nurture pages, success interviews, and the tripwire clip. Those keep YouTube deliberately: they are proof and content, some run 50+ minutes, and hosting them ourselves would cost bandwidth for no funnel gain.

Not built (WarriorBabe does it, we deliberately have not): gating the booking CTA behind N minutes of watch time with a visible unlock countdown. The hooks are here if Chris wants it: the milestone events already fire, so the CTA could reveal at 50% or 75%.

## Slot map (what plays where)

| Page | Slot | Video | Why |
|---|---|---|---|
| index.html | Hero VSL | XO74o7ehyx8 (masterclass VSL, same video as the live vsl-a LP; unlisted, not on the channel) | The main sales video, identical to what paid traffic sees. |
| how-it-works.html | Method explainer | XO74o7ehyx8 | Stand-in until a dedicated method cut exists (comment in file). |
| offramp.html | Hero VSL | XO74o7ehyx8 | Stand-in until a dedicated offramp cut is recorded. |
| nurture-1.html | Stephen intro | 0Vw32h4jiJM "This is Ridley" (1:41) | Short brand film; meets the "meet Stephen" job on page 1. |
| nurture-2.html | Story slot | wPVc1NRcIxI "From Giving Up Music to Building a Music School" (4:24) | His path to the method: playing and understanding before theory, the page's argument in story form. |
| nurture-3.html | Student story | V1dcFoADYdg "Ridley Academy Reviews: Real Piano Students tell ALL" (8:02, 15K views) | No Glenwood interview exists; labeled honestly as multi-student reviews, NOT as Glenwood. |
| nurture-4.html | Student story | qFRbozAsb3k Matt's interview (57:13) | Matt: "struggled to learn piano for over 40 years, tried teachers, courses, books" (video's own description). Same shape as the David Clarke story; labeled as Matt. |
| success.html | Interview grid 1 | V1dcFoADYdg (8:02) | Students in their own words. |
| success.html | Interview grid 2 | qFRbozAsb3k Matt (57:13) | Long-form, on-avatar (40 years of false starts). |
| success.html | Interview grid 3 | NzriW3UpmjM Rich (53:48) | Inside the mentorship, unfiltered. |
| tripwire.html | "This is what it feels like" | DtamYEYmx60 "Crazy Pianist SHUTS DOWN Hollywood Boulevard" | The live tripwire has this slot; performance energy sells the feeling. |

Alternate on the bench: hujfXa9ji1I Tijn-Pieter interview (29:41, age 19, Netherlands). Real and good, but off the 45+ avatar; use if a younger-audience page appears.

## FAQ + welcome videos (found on this machine 7/30, RESOLVED)

Source: `~/Desktop/Ridley-Academy/video ads july 2026/faws/` (finished 1080p horizontal cuts). Transcoded to 720p web copies in `videos/` (11 to 34MB each, poster frames extracted), served as native HTML5 players with preload=none.

| Page | Slot | File (videos/) | Source cut | Length |
|---|---|---|---|---|
| booked.html | FAQ 1 | faq-what-is-the-masterclass.mp4 | "What is the Piano Masterclass.mp4" | 1:06 |
| booked.html | FAQ 2 | faq-is-this-for-adults.mp4 | "Is this program for adults.mp4" | 3:10 |
| booked.html | FAQ 3 | faq-how-long-does-it-take.mp4 | "How long does it take.mp4" | 1:58 |
| tripwire-confirmed.html | Welcome | welcome-stephen.mp4 | "Welcome, thank you. Option one.mp4" | 0:56 |

On the bench, same folder: "How much does it cost.mp4" (2:04) and "Different programs we offer.mp4" (1:00), plus "FAQ 6 - I've Already Tried Learning. How Is This Different.mp4" (12s, 720p, in ~/Desktop/Ridley-Academy/VSL/) and the 2GB raw "FAQ uncut, no captions.m4v". The cost cut could replace an FAQ slot if Chris prefers cost-objection handling pre-call; Chris should confirm the three chosen cuts' content fits their labels (mapped by title, not watched).

## Slots still open

| Page | Slot | What's needed |
|---|---|---|
| success.html masonry + featured cards | No change | Already screenshot-based, no video needed. |

## Dropbox status

The saved browser session is logged out (dropbox.com/home redirects to login), so no fresh Dropbox scrape was possible. The standing Dropbox inventory from prior work: `All Marketing Assets/Ad Library/April 2026 VSL ads/` was fully processed on 7/17 (29 raw VSL takes, transcribed and scored in ~/riddley/VIDEO-AD-REVIEW.md; source .MOVs deleted after processing per the disk rule). Those are ad source footage, not site embeds. If there are student-interview or B-roll folders beyond that, Chris needs to re-auth Dropbox and say the word; the Glenwood/David/Carlos interview slots and the booked.html verticals are the first things to hunt for there.

## Full channel inventory (30 videos, scraped 7/30)

| ID | Title |
|---|---|
| V1dcFoADYdg | Ridley Academy Reviews - Real Piano Students tell ALL! (8:02, 15,544 views) |
| kuk6Muln0vQ | They Said I Was "Too Much"... So I Doubled Down |
| wPVc1NRcIxI | From Giving Up Music... to Building a Music School (4:24) |
| bkO97SWNVNs | Why Success Attracts the Most Toxic People |
| 3GyFhYyYFLo | The Ugly Truth About Online Hate (And Why It Didn't Break Me) |
| lKkJpAoMzZw | I Risked It All and Bet EVERYTHING on a Piano |
| hujfXa9ji1I | Piano Lessons That Actually Work? Real Student Talks (Tijn-Pieter, 29:41) |
| NzriW3UpmjM | A Student Speaks Out: What Ridley Academy Was Really Like (Rich, 53:48) |
| qFRbozAsb3k | The Truth behind Ridley Academy - Failure turns to triumph (Matt, 57:13) |
| 0Vw32h4jiJM | This is Ridley (1:41 brand film) |
| SoQl3JWYFRI | Grandma Collab (short) |
| s7QYq5pEY7Q | Make Money Doing What You Love |
| 23QQB36yKCk | Folsom Prison Piano and Johnny Cash (True Story!) |
| 9Meyj8lMxP0 | BEAUTIFUL MOMENT: Couple dance to Hallelujah at Live Online Concert |
| wb7-KnXDH7c | 'YOUR SONG' PIANO IN EMPTY STREETS (Elton John) |
| MO97wSZmBmg | 'IMAGINE' EMPTY METRO STATION PIANO PERFORMANCE, LONDON |
| 5H-1iFgsShE | ONE DAY IN PRAGUE: A Day In My Life |
| MYQuW22qGtI | Being a deaf musician... |
| bSPBGGmy4ug | The Life Of An Artist |
| DtamYEYmx60 | Crazy Pianist SHUTS DOWN Hollywood Boulevard |
| BAPGtxJTfOU | A Single Guy on Love... |
| bzgKnvMEOqc | The Kooks - Seaside (4k) Piano Version |
| DKguzLCV2NE | I PUT A SPELL ON YOU |
| LxorALULNq0 | HIT THE ROAD JACK (Sweet Dreams) |
| ZEB7AHl-gWI | FEVER |
| eVkqml_btX0 | I'M ONLY ALIVE WITH YOU |
| rCHYoJz7vG4 | WHY DO I DO THIS? |
| _UHIR9_N_48 | Hallelujah (Piano Cover Version) |
| wmvypRRFa0c | WOULD YOU MIND? |
| OMzjWNvyYlo | THE SHOWREEL |

Raw scrape JSON: scratchpad yt-inventory.json (session-local). Poster images hotlink from i.ytimg.com (maxresdefault where available, hqdefault for 0Vw32h4jiJM and qFRbozAsb3k which lack maxres).

## Notes

- The lp-rewrite page also references `videos/real-results.mp4` (a local social-proof loop on the live LP). That's an LP asset, not a funnel-build slot; nothing here depends on it.
- Honesty rule applied throughout: no video is labeled with a name that isn't the person in it. Glenwood, David, and Carlos have written stories on the pages with correctly-labeled real interviews beside them.
