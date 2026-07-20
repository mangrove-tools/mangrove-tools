# Hosting with Porkbun (owner)

Porkbun can be part of the solution in **two** ways. Pick one.

Site size today is ~**1 MB** (under Porkbun Static Hosting’s **40 MB** limit).

---

## Option A — Recommended: Porkbun = registrar/DNS, Cloudflare Pages = host

Keep `mangrovetools.com` at Porkbun. Serve files from **Cloudflare Pages** (free, supports our `_redirects` + `_headers` / CSP).

### Why this combo

| Need | Porkbun Static Hosting alone | Porkbun DNS + Cloudflare Pages |
| --- | --- | --- |
| GitHub auto-deploy | Yes (GitHub Connect) | Yes |
| Free tier | Paid (cheap; trial exists) | Free Pages |
| `_redirects` / trailing-slash 301s | Not documented / unreliable | Yes (`_redirects`) |
| CSP / security `_headers` | Not documented | Yes (`_headers`) |
| Force `/docs` → 404 | Hard without host support | Yes |
| Domain already at Porkbun | Native attach | CNAME / NS at Porkbun |

Mangrove relies on trailing-slash redirects, CSP, and forced 404s for `/docs/*` — that maps cleanly to **Pages**, not to bare static FTP hosts.

### Steps

1. Merge/deploy the repo files `_redirects` + `_headers` (this PR).  
2. Create a Cloudflare Pages project → connect GitHub → output = repo root, no build.  
3. Confirm the `*.pages.dev` URL looks right.  
4. In Pages → **Custom domains** → add `mangrovetools.com`.  
5. At **Porkbun DNS** (Domain Management → DNS):
   - Remove old Netlify A/CNAME records for `@` / `www` when Cloudflare shows what to use  
   - Or switch nameservers to Cloudflare if you prefer CF-managed DNS (optional)  
6. Wait for SSL. Smoke-check live.  
7. Leave Netlify project paused until you’re happy (rollback = restore old DNS).

Full Pages checklist: `docs/setup/CLOUDFLARE_PAGES.md`.

---

## Option B — All-in on Porkbun Static Hosting

Use if you want **one vendor** (domain + host) and accept weaker edge config.

### Steps ([KB](https://kb.porkbun.com/article/137-how-to-set-up-static-hosting))

1. Porkbun → Domain Management → house icon (Website) for `mangrovetools.com`.  
2. Select **Static Hosting** (15-day trial available).  
3. On the Static Hosting page → **GitHub Connect** → install on the `mangrove-tools` repo → branch `main`  
   ([GitHub Connect KB](https://kb.porkbun.com/article/145-how-to-connect-static-hosting-to-github)).  
4. Wait for sync. Open `https://mangrovetools.com/`.  
5. Manually verify:
   - `/letterroi/` loads  
   - `/letterroi` (no slash) — if it 404s, add Porkbun **URL forwards** for bare slugs → slash URLs  
   - `/docs/` — may still be crawlable unless you add forwards to a 404 page  
   - Fonts: `/fonts/fraunces.woff2`  
   - Stripe deliver paths  

### Gaps to expect on Option B

- `_headers` / CSP from this repo likely **ignored** — browser still works; security headers weaker.  
- `_redirects` likely **ignored** — use Porkbun URL Forwarding for important bare slugs if needed.  
- No Netlify-style force-404 for markdown/docs files that exist on disk (those files may be publicly fetchable).

If those gaps matter (SEO / security), use **Option A**.

---

## What not to use at Porkbun for this site

- Cloud WordPress / cPanel / Easy PHP — wrong stack (we’re static HTML).  
- Link-in-bio hosting — not this product.

---

## Decision guide

| Situation | Choose |
| --- | --- |
| Want free + keep CSP/redirects | **A** (Porkbun DNS + Cloudflare Pages) |
| Want simplest “all Porkbun” UI and can live without CSP file | **B** (Porkbun Static Hosting) |
| Netlify credits return later | Either; keep `netlify.toml` as backup |

DNS / hosting cutover still needs your click in the Porkbun (and Cloudflare) dashboards — agents will not change production DNS without approval.
