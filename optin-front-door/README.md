# vsl-b front door: free video opt-in

> **Naming, 7/31.** This is **not** a masterclass. "The Complete Piano Masterclass"
> is the paid flagship program, named as such in the page's own FAQ, so calling the
> free VSL a masterclass promises the paid product for free. The free asset is
> described, never named: **"the free 15-minute video."** The build also rewrites the
> two places the base page called the VSL a masterclass. The FAQ entry and the
> customer quote about the paid program are correct usage and are left alone.

Built 7/31. A contact-capture door in front of the VSL on `vsl-b.ridleyacademy.team`, so the B arm of the page test becomes an opt-in funnel instead of an ungated VSL. Track A of `FUNNEL-V2-ACTION-PLAN.md`, moved onto the landing page rather than a separate `/optin` page.

**Nothing here has shipped.** The deploy pack for Ange is `../ship-vsl-b/`
(`index.html` + `functions/api/optin.js` + `DEPLOY.md`), pending Chris's go.

Fixed during the 7/31 QA pass, all verified in-browser against the shipped file:

- **Calendly auto-init crash.** The base page's empty
  `<div class="calendly-inline-widget" id="calInline">` has no `data-url`, so
  Calendly's `widget.js` threw on load and never assigned `window.Calendly`,
  which kills every calendar on the page including the original booking widget.
  Live check: `undefined` on vsl-b, present on vsl-a, from an async load-order
  race. The build renames the class; `main.js` never read it.
- **Mobile CTA below the fold.** The gate's submit button measured y=938 on a
  390x844 phone. Tightened to y=788, fully visible.
- **Duplicate capture.** The gate now shows on every visit, so opt-in POST and
  `CompleteRegistration` are fired once per email.
- **`is-opted` never set on the opt-in visit**, so the choice block only
  appeared on a later visit.

---

## What it does

A visitor landing on vsl-b sees the door before anything else: headline, the free 15-minute video offer, and a three-field form. On submit the door lifts and the VSL restarts from zero with sound. That video is the whole offer. It is not split into parts and nothing is promised that the next frame does not deliver.

The booking form underneath arrives pre-filled from what they just typed, and its qualifying questions are already open, so a booking is three taps rather than a re-type.

| | |
|---|---|
| Fields | First name, email, phone. All required. |
| SMS consent | Real checkbox, unticked, optional. Fixes the passive consent line flagged in the v2 plan. |
| Capture | `POST /api/optin` on submit, fire and forget |
| Meta event | `CompleteRegistration` |
| GTM | `dataLayer` push `rdly_optin` |
| Reveal | door lifts, `#vslSound` clicked, VSL plays from 0 with sound |

## The merged flow (7/31)

One page, three states, no page loads between them.

```
GATE            name, email, phone  →  [Show Me How It Works ›]
  ↓             CompleteRegistration · POST /api/optin
VIDEO           RAVSL v8 restarts from 0 with sound
  ↓
CHOICE          "Ready to start playing?"
                Our programs start at $3,000...
                [Book My Free Call ›]      → Calendly, prefilled · fires Lead
                I'm not ready yet →        → /tripwire ($27 4 Magic Chords)
```

The page's own hero CTA ("Book My Free Piano Consultation") is tagged
`.gate-cta` by the build and hidden for anyone carrying `html.is-opted`, with
the choice block taking its place. The old form, its country-code picker and
the two qualifying questions are all still in the page and still serve the
un-gated `?v=plain` path; an opted-in visitor simply never reaches them.

**One tap from video to calendar.** Name, email and phone ride to Calendly as
query prefill (`name`, `email`, `a1`), so nothing is re-typed.

### Why qualification moved into the copy

Adding steps to buy call quality is the wrong trade when the funnel's problem
is too few bookings. So the filter is the investment line above the button, not
a form: anyone who cannot or will not invest self-selects out before tapping,
which costs zero conversion among the people who can.

That line is `<p class="choice__invest">`. Delete it to remove the filter.
The zero-click place to *capture* the signal is a required custom question on
the Calendly event itself, since that step is already being taken.

### Event ladder

`CompleteRegistration` (gate) → `Lead` (Book My Free Call) → `Schedule` (Calendly).

`Lead` moved onto the choice button because the choice replaces the booking
form for opted-in visitors. Without it the B arm would stop reporting the event
its ad sets bid on.

## What it deliberately does not do

**It does not fire `Lead`.** `Lead` stays on the booking form submit, exactly as on vsl-a. This is blocker 3 in `VSL-B-RETEST-BUILD.md`: the ad sets bid `LEAD`, so if the door fired `Lead` the B arm would optimise toward opt-ins while the A arm optimised toward bookings, and the page comparison would be void. With `CompleteRegistration` on the door, both arms still chase bookings and the read holds.

The full ladder after this change: `CompleteRegistration` (door) → `Lead` (booking form) → `Schedule` (/thank-you).

## Fail-safes

- **`?v=plain`** on the URL skips the door entirely. Rollback and QA switch, no redeploy needed. `?door=off` does the same.
- **A visitor who has already opted in never sees it again**, on any later visit, because the bootstrap checks `ridley_lead_v1` in localStorage before adding the class.
- **If JS fails or is blocked, the door never appears** and the page renders exactly as it does today. It fails open, never closed.
- **The reveal never waits on the network.** If `/api/optin` is slow or dead the visitor still gets straight through; only the ActiveCampaign write is lost.

## Files

```
src/vsl-b.live.html   snapshot of the live page, pulled 7/31 (the build input)
src/door.head.html    inline <style> + the pre-paint bootstrap
src/door.body.html    the door markup and all the copy
src/door.foot.html    the submit handler
build.sh              injects the three blocks, writes dist/index.html
dist/index.html       >>> the drop-in file <<<
shots/                desktop + mobile renders
```

Rebuild after editing anything in `src/`:

```bash
./build.sh            # build from the snapshot
./build.sh --fetch    # re-pull the live page first, then build
```

The build refuses to run twice against an already-patched snapshot, and asserts each of its three insertion anchors appears exactly once, so it cannot silently half-apply.

## Deploy

**One file.** `dist/index.html` replaces `index.html` on the vsl-b deploy. No new files, no new requests, no changes to `main.js`, `funnel.js`, `styles.css` or `funnel.css`. The door's CSS and JS are inline so it paints on the first frame instead of waiting on a stylesheet.

Do not put this on vsl-a. The door is the B arm's variable, and the two pages have to differ only in ways the test is measuring.

## Design

Built on the page's own components rather than lookalikes, so the door and the page read as one surface: `.btn .btn--fire .btn--block` for the CTA (real pill, real `--grad-fire`, real idle motion), `.eyebrow` for the kicker, `.fire-text` for accent words, `var(--hand)` Caveat for the single handwritten annotation. Only layout scaffolding is `.door__*`.

Follows `DESIGN.md`: the 7/5 asymmetric split rather than a 50/50 that reads as undesigned, 18px card / 26px large media / 12px input radii, pill buttons, warm cream field with cherry as the committed accent. Spacing runs off a scoped 4pt scale (`--d-1` through `--d-8`) so the rhythm is deliberate, tight inside groups and generous between them, instead of one uniform gap everywhere.

Proof uses the big-display-stat pattern the live page already runs in its hero, with the verified numbers from `PRODUCT.md` only: 40,000+ students, 60+ countries, ages 5 to 96, 1,300+ reviews. Stars sit with the label, never stacked above the numeral, so all four figures share a baseline.

Imagery is all already on the deploy, so this adds no new assets: the VSL's own opening frame in the card, and a band of `perf-stance`, `perf-streetpiano` and `perf-lights` weighted 1.6/1/1 with per-photo `object-position`, so it reads as a composition rather than three identical tiles.

The poster is a real `<button>`. Clicking it sends focus to the first field still to fill, rather than presenting a play affordance that does nothing.

On mobile the bullets and all proof move below the form. The fields have to be reachable without a scroll, since that is where the paid traffic lands. On desktop the same block sits directly under the copy in the wide column, so the composition is unchanged.

## Gates before it can earn anything

The door works today, but the lead it captures goes nowhere until the capture API is live.

1. **`POST /api/optin` returns 405 in production** on both domains. The Pages Function `handoff/new/functions/api/optin.js` is written but not deployed, so every opt-in currently writes to localStorage and vanishes. This is the same blocker in `DRAFT-MESSAGE-ANGE-20260730.md` and it is the one thing that makes the door pointless without it.
2. Env vars on the Cloudflare project: `AC_URL`, `AC_KEY`, and `SMS_CONSENT_FIELD_ID` if the consent checkbox is to be stored as a TCPA record.
3. The `VSL Opt-in` tag has to exist in ActiveCampaign or `optin.js` throws on lookup.

## Verification once deployed

- `POST /api/optin` returns something other than 405.
- A test opt-in lands in AC as a contact carrying the `VSL Opt-in` tag.
- Events Manager Test Events: the door fires `CompleteRegistration`, the booking form fires `Lead`. They must be distinct.
- `?v=plain` shows the old page unchanged.
- Second visit in a fresh session does not show the door again.
- The VSL is playing with sound within a second of submit.

## Tested 7/31

Chrome, against the live assets, at 1440x900 and 390x844.

- door paints before the page, no flash of the VSL behind it
- submit: door lifts, `ridley_lead_v1` written, booking form pre-filled, qualifying questions open, VSL confirmed playing (6.6s elapsed on check)
- SMS consent survives. `main.js` writes its own `ridley_lead_v1` in response to the prefill and its object has no consent field, so it landed as `false`; the handler now merges the real value back on top. The booking form has no consent checkbox of its own, so the door is the only place this is ever collected.
- return visit suppressed, `?v=plain` rollback confirmed
- the one console error on the page (`parseOptions` in Calendly's `widget.js`) is pre-existing and also present on the live page

## Open for Chris

- **The founder's name.** Per your note it is Steven, so `build.sh` renames all 14 instances on the page. Worth knowing before this ships: the live vsl-a and vsl-b pages, and ridleyacademy.com (23 instances), all currently spell it **Stephen**, as does the YouTube channel `@stephenridleytv`. If Steven is right, this page will be the only one on the estate that says so until the rest is changed. To ship with the site's current spelling instead, delete the two rename lines at the bottom of `build.sh` and rebuild.
- **"Days, Not Years"** is the headline claim, taken from your brief and defensible against the brand's own "10X faster than traditional methods". It is deliberately not "master the piano in days", which is not supportable and invites Meta scrutiny.
- Phone is required. It is friction on a free-video offer, and it is what Charlie and Danny need. Easy to drop if the opt-in rate disappoints.
- The follow-up email for opt-ins who do not book is not built. The `VSL Opt-in` tag is the trigger to hang it on.
