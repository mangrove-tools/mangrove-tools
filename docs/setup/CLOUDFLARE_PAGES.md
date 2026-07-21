# Hosting alternative — Cloudflare Pages (owner)

**Why:** Netlify deploy credits exhausted. Mangrove Tools is a pure static root publish — Cloudflare Pages free tier is the closest drop-in with redirects, headers, HTTPS, and Git deploys.

**Verdict:** Prefer **Cloudflare Pages** over GitHub Pages (weaker headers/CSP) or Vercel (fine, but CF is usually the better free static fit).

**Production today:** the site is on **Porkbun Static Hosting** (`docs/setup/PORKBUN_HOSTING.md`). Use this Cloudflare Pages guide only if you want a free host with `_redirects` / `_headers` while keeping the domain DNS at Porkbun.

DNS / domain cutover still requires **you** — agents must not change registrar DNS without approval.

---

## What this repo already includes

| File | Purpose |
| --- | --- |
| `_redirects` | Trailing-slash 301s + forced 404 for `/docs/*`, `AGENTS.md`, `README.md` |
| `_headers` | CSP, security headers, cache (parity with `netlify.toml`) |
| `404.html` | Custom not-found page |
| `netlify.toml` | Kept for optional Netlify return; Pages uses `_redirects` / `_headers` |

Publish **repo root** (not a subfolder). No build command.

---

## One-time setup (Cloudflare)

1. Create a free Cloudflare account (if needed): https://dash.cloudflare.com/sign-up  
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**  
3. Select the `mangrove-tools` GitHub repo  
4. Build settings:
   - **Framework preset:** None  
   - **Build command:** *(leave empty)*  
   - **Build output directory:** `/` (repo root) — if the UI requires a non-empty value, use `.`  
   - **Root directory:** `/` (default)  
5. Deploy. Note the `*.pages.dev` preview URL.  
6. Smoke-check on `*.pages.dev` before touching DNS:
   - `/` home + vignette  
   - `/letterroi/` (fonts load from `/fonts/*.woff2`)  
   - bare `/letterroi` → 301 to slash  
   - `/docs/` → 404  
   - `/lead-dev/` Stripe CTAs  
   - Response headers include `Content-Security-Policy`

---

## Point mangrovetools.com at Pages (when ready)

1. In the Pages project → **Custom domains** → add `mangrovetools.com` (+ `www` if you use it)  
2. Cloudflare will show DNS records:
   - If the domain is **already on Cloudflare DNS**: accept the CNAME/proxied records it proposes  
   - If the domain is **elsewhere**: either  
     - move DNS to Cloudflare (nameservers), **or**  
     - add the CNAME/A records Cloudflare shows at your current DNS host  
3. Wait for HTTPS (usually automatic)  
4. Keep **www → apex** redirect if you already use it (Pages custom domain UI or a `_redirects` line once you confirm the host pattern)

### Stripe after-payment URLs

No change needed if the public URL stays `https://mangrovetools.com/deliver/...`.  
If you temporarily use only `*.pages.dev`, update Stripe Payment Link redirects to that host until the custom domain is live.

---

## GitHub Actions alternative (optional)

If you prefer not to use the Cloudflare Git UI, you can deploy via Wrangler + a GitHub Action later. Not required for V1.

---

## What not to do

- Do not enable Cloudflare “email obfuscation” or Rocket Loader — they can break contact `mailto:` / inline scripts  
- Do not turn on Auto Minify HTML in a way that breaks the site (test first)  
- Do not delete Netlify until Pages + custom domain are verified  
- Do not change Beehiiv/Stripe URLs except after-payment host if needed  

---

## Rollback

1. Point DNS back to Netlify (or previous host)  
2. Or pause the Pages project and restore the prior CNAME/A records  

Keep `netlify.toml` in the repo so Netlify remains a backup when credits reset.
