# Ridley Facts Sheet (single source of truth for funnel-build pages)

Every number, name, and claim on these pages must come from this sheet. Anything not here gets a clearly marked [PLACEHOLDER].

## Proof numbers (verified from live LP, lp-rewrite/index.html)
- 40,000+ students
- 60+ countries
- Ages 5 to 96
- 1,300+ five-star reviews (Trustpilot + Sitejabber)
- Most students are over 50 (LP: "students are over 50"; phrase as "most of our students are over 50")
- ~700 students enrolled in coached programs (internal; ok as "hundreds of adults in our coached programs")
- 10+ years Stephen teaching/performing

## Press / trust logos (assets in lp-rewrite/images/press/)
GQ, Vogue, L'Officiel, Omega, Google, YouTube, Instagram, Trustpilot, Sitejabber.
Use as "As Featured & Trusted Across" strip. Copy logo files into funnel-build/images/press/.

## Named real testimonials (from live LP alt text, safe to quote/paraphrase)
- David Clarke: "has had eight piano teachers and learned more from the Ridley Academy than all the others combined"
- Glenwood Clark: 68 years old, in one year learned to play with both hands and read music
- Carlos Rodriguez: achieved his goal to play piano in less than 6 months, "worth it"
- Alice Saddler: professional musician with a music education degree, calls the method "streamlined, effective and exciting"
- Review screenshots live in lp-rewrite/images/reviews/ (mq-*.png)

## Offer facts (from RIDLEY-SALES-MASTER-DOC.md)
- Free call: **The Breakthrough Session** (30 min). Frame: "A conversation, not a checkout." You never have to play a note.
- Coaching ladder (sold ONLY through the Breakthrough Session): Ridley Mentorship $14,000 (flagship) / **Ridley Accelerator $9,997, $5,997 enrollment discount (the target offer)** / Lite as the catch. NEVER print these prices on funnel pages; price is discussed on the call. Anchor allowed on pages: "two years of weekly private lessons runs $5,200 to $10,400."
- Tripwire: **4 Magic Chords Mini Course, $27**, includes the 100+ Song Workbook free. 30-day money-back guarantee; they keep the workbook. Checkout: ThriveCart (product-1168), page path /tripwire.
- Self-study: Complete Piano Masterclass (pricing in flux; do not print).

## Method / mechanism language
- Stephen Ridley: rockstar pianist; started on a beat-up street piano; toured/performed worldwide. Teaching method: real songs first, theory through music, not before it.
- Approved framing: "the Ridley Method" (4 phases OK to describe as: First Song → Real Repertoire → Musical Fluency → Your Sound). No trademark symbol.
- Enemy: traditional lessons (years of scales, sheet-music-first, childhood method books) and gamified apps (falling-note games that never make you a player).
- Belief flip (the one message): "It's not you. It's the method. You don't need years of scales before real music; you need a path that starts with the music."

## Voice rules (Chris's house style, applies to ALL page copy)
- NEVER use em dashes or en dashes. Use periods, commas, colons, parentheses.
- No hype superlatives ("amazing", "game-changing"), no exclamation-point pileups (one per page max, prefer zero).
- Plain, concrete, warm. Short sentences. Contractions fine.
- No fabricated numbers, counters, fake-live badges, fake countdowns, or invented expert endorsements. Honest scarcity only (if real capacity limits exist, mark as [CAPACITY-PLACEHOLDER] for Chris to confirm).

## Technical conventions
- Every page: `<link rel="stylesheet" href="shared.css">`, `<meta name="robots" content="noindex">` (funnel pages), GTM placeholder comment `<!-- GTM CONTAINER HERE -->`, dataLayer events named `rdly_*`.
- CTA destinations: application = apply.html; booking = booking.html (qualified) / booking-b.html (DQ twin); confirmation = booked.html. Calendly embeds: use `[CALENDLY-EVENT-QUALIFIED]` and `[CALENDLY-EVENT-DQ]` placeholder URLs.
- Video embeds: placeholder div `.vslot` with a comment naming which asset goes there (e.g. VSL-A main video, Stephen welcome video).
- Source params: carry `?el=` and quiz params through links where present (document in comments).
