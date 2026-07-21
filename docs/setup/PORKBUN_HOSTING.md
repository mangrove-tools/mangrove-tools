# Porkbun Static Hosting (owner)

**Status (2026-07-20):** `mangrovetools.com` is on **Porkbun Static Hosting** (Starter trial) with **GitHub Connect** → `kylito3/mangrove-tools` @ `main`. Domain stays at Porkbun (lock ON is fine — that only blocks registrar transfers).

Site size is ~**1 MB** (under the **40 MB** Static Hosting limit).

---

## Current setup (keep it this way)

| Setting | Value |
| --- | --- |
| Product | **Static Hosting** only (not WordPress / cPanel / Easy PHP) |
| Deploy | GitHub Connect → `kylito3/mangrove-tools` → branch **`main`** |
| SSL | Porkbun certificate on the hosting panel |
| `www` path | Site root (`/` or blank) — not a placeholder path |
| Rewrite URL | Leave **empty** (not a SPA) |
| Domain lock | ON (safe; leave on) |

After any DNS mess: hosting panel → **Fix DNS Records**.  
If Fix DNS says another hosting product is attached, cancel the **other** product first — keep Static Hosting.

---

## Smoke-check after deploys

- `https://mangrovetools.com/`
- `https://mangrovetools.com/letterroi/`
- `https://mangrovetools.com/sponsorquote/`
- `https://mangrovetools.com/lead-dev/`
- `https://mangrovetools.com/fonts/fraunces.woff2`
- Stripe deliver paths (`/deliver/kit/`, `/deliver/cohort/`) if used

Bare slugs without a trailing slash (e.g. `/letterroi`) may 404 — Porkbun likely ignores `_redirects`. Add Porkbun **URL Forwarding** for important bare → slash routes if needed.

---

## Limits vs Netlify / Cloudflare Pages

| Feature | Porkbun Static Hosting | Cloudflare Pages (optional) |
| --- | --- | --- |
| GitHub auto-deploy | Yes | Yes |
| `_redirects` / trailing-slash 301s | Likely ignored | Supported |
| `_headers` / CSP | Likely ignored | Supported |
| Force `/docs` → 404 | Weaker (files may be fetchable) | Supported |

Repo still ships `_redirects` + `_headers` for Cloudflare Pages / Netlify backup. On Porkbun they are harmless no-ops if ignored.

Optional stronger edge: keep Porkbun as registrar/DNS and host on Pages — `docs/setup/CLOUDFLARE_PAGES.md`.

---

## Pause Netlify

1. Netlify → disable auto-publish or remove the custom domain.  
2. Keep the Netlify project a few days for rollback, then delete to stop credit burn.

---

## Troubleshooting (cutover leftovers)

### “Could not add domain on remote server”

Usually leftover Netlify / parking DNS. In DNS, delete `@` / `www` records pointing at Netlify (`apex-loadbalancer.netlify.com`, `*.netlify.app`) or `pixie.porkbun.com` / `uixie.porkbun.com`. Keep MX + needed TXT. Then retry or **Fix DNS**.

If DNS is already clean and it still fails → Porkbun backend: cancel half-created plans, retry, or email `support@porkbun.com`.

### “Please cancel the existing hosting product first”

Two hosting products on one domain. Cancel the one that is **not** Static Hosting, turn off conflicting **URL Forwarding** for `@`/`www`, then Fix DNS.

### Domain lock

**Not** the cause of hosting errors. Leave **Domain Lock ON**.

---

## What not to buy

- WordPress / cPanel / Easy PHP — wrong stack  
- Auth/EPP codes — domain is already at Porkbun; not needed for hosting
