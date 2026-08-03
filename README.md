# Ridley Academy Funnels

Three deployable funnels. Each one is a static site folder that deploys as its own Cloudflare Pages project from this repo.

**Deploy branch: `production`.**

## Cloudflare Pages settings

Create one Pages project per funnel. In every project:

- Production branch: `production`
- Framework preset: None
- Build command: (leave empty)
- Root directory: `/` (default)
- Build output directory: see table

| Pages project | Build output directory | What it is |
|---|---|---|
| Front gate funnel | `/optin-front-door/site` | Standalone vsl-b opt-in gate with full tripwire and upsell chain |
| Cloned funnel site | `/funnel-build` | 28-page funnel: VSL pages, booking, nurture, SEO and legal pages |
| vsl-a rewrite | `/lp-rewrite` | Rewritten vsl-a landing page with tripwire chain |

## /api/optin (required for forms)

All three funnels post opt-ins to `/api/optin`. The Pages Function at `functions/api/optin.js` handles it and pushes contacts and tags into ActiveCampaign. It ships automatically with every project deployed from this repo.

Set these environment variables in each Pages project (Settings, then Environment variables):

- `AC_URL` = `https://creatorsecretsads.api-us1.com`
- `AC_KEY` = ActiveCampaign Settings, then Developer, then API key
- `SMS_CONSENT_FIELD_ID` = AC custom-field id for SMS consent (optional; used by the SMS gate)

Without these, form posts return errors and no leads reach ActiveCampaign.

## Videos

`funnel-build/videos/` is not in this repo (files exceed GitHub and Cloudflare size limits). Pages reference the hosted copies at `ridley-funnel-test.vercel.app` by absolute URL. Note: the main VSL file (`vsl-main.mp4`, 126MB) is not hosted anywhere yet and needs a proper video host (Cloudflare Stream or R2). `VIDEO-MAP.md` in funnel-build documents every slot.

## Contact

Chris Cook (GitHub: TopherAllenCook)
