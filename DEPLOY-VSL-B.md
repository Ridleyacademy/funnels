# vsl-b front door: rebuild for the restarted test

Rebuilt 2026-08-06 so vsl-b can run again as its own arm. This supersedes the
7/31 pack in `../ship-vsl-b/`, which should not be deployed: its
`functions/api/optin.js` writes ActiveCampaign as the system of record, which
was correct then and has been wrong since the 8/4 AXL cutover.

Ship bundle is `dist/`. Two files.

---

## What changed in this rebuild

**1. Built against the current live page.** The 7/31 build used an 8/2 snapshot.
Live has since dropped the q4 investment question from `#book`, so the snapshot
no longer matched. `./build.sh --fetch` re-pulled and every anchor still
resolved exactly once. The dropped question sits inside the orphaned hidden
booking widget and has no bearing on the door.

**2. The capture handler is now the AXL one.** `dist/functions/api/optin.js` is
a byte-for-byte copy of the handler live on funnels since 8/5, plus a header
comment explaining that it is a copy. Registration goes to AXL through the
accel-proxy worker; AC gets a mirrored contact and tag only, so automation 599
still has something to trigger on. Keeping the two arms identical means a fix on
either is a straight copy and they cannot quietly diverge.

The apply.html paths in it (the q1..q13 quiz, the budget gate, cohort tags) are
inert here — the door posts none of those keys. They were kept rather than
stripped so this stays a copy rather than a fork.

**3. The door now posts attribution.** It used to send only
`{name, email, phone, consent}`. The handler reads `source` and `utm_source` and
joins them into the AXL registration's `comment`, which is the only attribution
field on the worker's whitelist. Without them a door lead is indistinguishable
in AXL from a funnels lead, which would have made this arm unreadable — the one
thing the test exists to measure. It now sends `source: 'vsl-b-door'` plus
`utm_source` from the query string when present.

These ride alongside the stored lead rather than inside it, because
`ridley_lead_v1` is also what `main.js` reads back out of localStorage.

**4. Founder's name.** Two remaining "Steven" strings in the door copy were
corrected to Stephen, reversing the 7/31 spelling per Chris on 8/4. One was
visible body copy ("How Steven plays without reading a note"), sitting three
lines under a paragraph that already said Stephen.

---

## Files, and exactly where they go

- `dist/index.html` → **project root**, replacing the current `index.html`
- `dist/functions/api/optin.js` → **`functions/api/optin.js`**, exact path

Pages maps `functions/api/optin.js` to `/api/optin` automatically. The path is
the routing, so it cannot be renamed or flattened. If the project is
Git-connected, `functions/` goes at the repo root next to `index.html`; if it is
direct upload, `functions/` must be inside the uploaded folder or Pages will not
see it.

`dist/preview.html` is a stale 8/3 QA artifact, not part of the bundle. Do not
upload it.

No other file changes. No new images, no stylesheet or `main.js` edits, no
`nodejs_compat` flag, no build command. Every `.door*` rule is inlined in the
page so it paints on the first frame.

**Do not put this `index.html` on vsl-a.** The door is the B arm's variable.

---

## Environment variables

vsl-b Pages project → Settings → Environment variables → Production.

| Variable | Required | Value |
|---|---|---|
| `ACCEL_PROXY_KEY` | **yes** | the accel-proxy key |
| `AC_URL` | optional | `https://creatorsecretsads.api-us1.com` |
| `AC_KEY` | optional | ActiveCampaign API key |

`ACCEL_PROXY_KEY` is the only one that matters for registration. Without it the
handler answers and writes nothing — it will say `axl:no_proxy_key` in the
response body rather than failing silently, which is how the original vsl-b
opt-ins were lost unnoticed.

Paste the name carefully. This exact handler sat dead for an evening on funnels
because the secret was saved as `" ACCEL_PROXY_KEY"` with a leading space. The
handler now trims env names to survive that, but the diagnostic is worth
knowing: with no key it returns the list of visible env names.

`AC_URL`/`AC_KEY` only drive the mirror write. Skipped, the lead still registers
in AXL and the response says `ac:skipped_no_config`; what you lose is the
`VSL Opt-in` tag (id 634) that triggers automation 599, Front Gate Nurture.

---

## Verify after deploy

The failure mode here is silent, so this is the part that matters. The endpoint
always answers `200` — the beacon must never retry — and states what happened in
the body.

```bash
curl -X POST https://vsl-b.ridleyacademy.team/api/optin -H 'Content-Type: application/json' -d '{"email":"deploycheck+vslb@example.com","name":"Deploy Check","phone":"+14155550123","source":"vsl-b-door"}'
```

Read the body:

- `axl:ok ac:634:ok` — both halves worked.
- `axl:ok ac:skipped_no_config` — registration fine, AC vars not set.
- `axl:no_proxy_key visible_env=[...]` — the key is not reaching the runtime.
  The list names the variables the project actually has.
- `axl:FAIL axl 401 …` — key mismatch. `404` = wrong proxy URL.
  `scenario_not_allowed` = scenario id not whitelisted in the worker.

A bare `405` means the Function did not deploy at all — that is what vsl-b has
been returning since July, and it is the state this replaces.

Then delete the check contact from AXL.

---

## Still open before this arm can produce data

1. **Traffic.** Since the 8/6 repoint every editable Meta ad points at funnels
   root. vsl-b receives nothing. New ad sets pointed at
   `vsl-b.ridleyacademy.team` are required or the page will sit at zero.
2. **Which event the arm bids on.** The door fires `CompleteRegistration`, not
   `Lead`, deliberately — Lead stays on the booking path so both arms optimise
   toward the same event. If the new ad sets bid on `CompleteRegistration`
   instead, vsl-a and vsl-b are no longer comparable.

---

## Verified locally, 2026-08-06

Served the built page with assets proxied from live, at desktop and narrow
widths:

- door renders and paints before the page; all four images load
- submit → POST body was exactly
  `{"name":"Chris","email":"…","phone":"+14155550123","consent":true,"source":"vsl-b-door","utm_source":"meta_test"}`
- door lifts, VSL restarts from zero and plays with the sound prompt
- post-video choice block replaces the hero CTA; `is-opted` set on `<html>`
- `rdly_optin` fired once, `page_variant: vsl-b`
- SMS consent survived main.js's own localStorage write (`consent:true` after
  the merge, with main.js's `cc`/`ccIso`/`q1`/`q2` added around it)
- re-submitting the same email fired **no** second POST and no second pixel
  event
