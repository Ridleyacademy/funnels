# DRAFT deploy note for Ange (Chris to review and send; do not send as-is)

Hi Ange,

One file for the funnel pages when you have a window: a copy update to index.html. No rush if today is full.

Short version: copy and markup only. No JS or CSS changes, no tracking changes, nothing touched in main.js or funnel.js.

1. File: `index.html` (in this folder). It was built from the live page as served on 7/28, so it already includes the GTM and pixel head code and the YouTube player markup.
2. Deploy it to BOTH funnel deployments (vsl-a.ridleyacademy.team and vsl-b.ridleyacademy.team), same as the tracking fix files. One file serves both variants; the gate bootstrap is unchanged.
3. Order doesn't matter relative to the tracking fix, but one thing to watch: this file references `main.js?v=102` and `funnel.js?v=7`, the versions live on 7/28. If you bump those version strings when you ship the tracking fix, please update the two script tags at the bottom of this index.html to match.
4. Deploy per the usual path: `npx wrangler pages deploy <folder> --project-name ridley-funnel-a` (CLI, not dashboard drag-and-drop, so `functions/` stays intact).

What changed, for reference:
1. Title tag and meta description rewritten.
2. Hero subhead rewritten (now tells visitors to watch the video).
3. First CTA note now reads "No Credit Card Required. No pressure on the call."
4. New two-paragraph block in the booking form column ("What happens on the call" / "Worth knowing now: programs start at $3,000").
5. Second qualifier question reworded (answer buttons and values unchanged).
6. Ages unified to "5 to 96" (hero stat and FAQ).
7. Stat counters now have real initial values in the markup instead of "0", so they never paint as "0+" before the animation runs.

Happy to walk through any of it. Thanks, Chris
