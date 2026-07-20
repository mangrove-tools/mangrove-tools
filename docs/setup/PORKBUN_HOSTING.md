# Leave Netlify → host on Porkbun (owner)

**Goal:** Serve `mangrovetools.com` from Porkbun Static Hosting instead of Netlify.

**Good news:** The domain is already at Porkbun. You do **not** need an auth/EPP code. This is a **hosting** cutover, not a domain transfer.

Site size is ~**1 MB** (under Porkbun’s **40 MB** Static Hosting limit).

Agents cannot click Porkbun/Netlify dashboards for you. Follow this checklist in your accounts.

---

## Cutover checklist (all Porkbun)

### 0) Clear Netlify DNS first (do this before Static Hosting)

Porkbun Static Hosting fails with **"Could not add domain on remote server"** when `@` / `www` still have Netlify (or parking) records. Clear those **before** attaching hosting.

As of the last check, public DNS still showed Netlify-style apex IPs (`75.2.60.5`, `99.83.231.61`) and `*.netlify.app` — that conflicts with Porkbun provisioning.

1. Porkbun → **Domain Management** → `mangrovetools.com` → **DNS**.
2. Delete records that point the site at Netlify or Porkbun parking, for example:
   - `A` / `AAAA` / `ALIAS` / `CNAME` for `@` or `www` → Netlify IPs or `*.netlify.app`
   - Anything → `pixie.porkbun.com` (parking page)
3. **Keep** email/verification records you still need (`MX`, most `TXT` like SPF/DKIM, Google/Stripe verify, etc.).
4. Save. It’s OK if the site goes offline briefly — Netlify was already failing (credits / 404).

Then continue with step 1. If hosting was already purchased and still errors, open the hosting panel → **Fix DNS** ([KB](https://kb.porkbun.com/article/198-how-to-fix-your-porkbun-hosting-dns)), or cancel/retry Static Hosting after the DNS cleanup.

Related: [CNAME/ALIAS already exists](https://kb.porkbun.com/article/239-cname-alias-record-with-that-host-already-exists-error).

### 1) Turn on Porkbun Static Hosting

1. Log in at [porkbun.com](https://porkbun.com) → **Account** → **Domain Management**.
2. Find `mangrovetools.com` → click the **house** icon under **Website**.
3. Under **Static Hosting** → **Select A Plan** (or **Start Trial** for 15 days).
4. Finish billing/trial so the Static Hosting panel opens.

KB: [How to set up Static Hosting](https://kb.porkbun.com/article/137-how-to-set-up-static-hosting)

### 2) Connect GitHub (auto-deploy from `main`)

1. On the Static Hosting page for the domain → **GitHub Connect**.
2. Install/authorize on the `kylito3/mangrove-tools` repo.
3. Choose branch **`main`** (publish the repo root — no build step).
4. Wait for the first sync to finish.

KB: [Connect Static Hosting to GitHub](https://kb.porkbun.com/article/145-how-to-connect-static-hosting-to-github)

### 3) Point the domain at Porkbun hosting

Porkbun usually wires DNS when Static Hosting is attached to that domain. Still verify:

1. Domain Management → **DNS** for `mangrovetools.com`.
2. Remove leftover **Netlify** records (typical leftovers):
   - `A` / `AAAA` / `CNAME` / `ALIAS` / `ANAME` pointing at Netlify (`*.netlify.app`, Netlify load-balancer IPs, etc.)
3. Keep whatever records Porkbun Static Hosting shows as required for `@` and `www`.
4. Leave unrelated records alone (email MX, TXT verification, etc.) unless you know they were Netlify-only.

SSL: wait until Porkbun shows HTTPS ready (can take a short while after DNS settles).

### 4) Smoke-check live

Open these after DNS/SSL look green:

- `https://mangrovetools.com/`
- `https://mangrovetools.com/letterroi/`
- `https://mangrovetools.com/sponsorquote/`
- `https://mangrovetools.com/lead-dev/`
- `https://mangrovetools.com/fonts/fraunces.woff2` (fonts load)
- Stripe deliver paths if you use them (`/deliver/kit/`, `/deliver/cohort/`)

Also try bare slugs without a trailing slash (e.g. `/letterroi`). If they 404, add Porkbun **URL Forwarding** from bare slug → slash URL for important routes.

### 5) Pause / detach Netlify (after smoke-check passes)

1. Netlify → project for mangrovetools → disable auto-publish or delete the custom domain.
2. Do **not** delete the Netlify project on day one if you want a fast rollback (re-add old DNS).
3. After a week of stable Porkbun hosting, you can delete the Netlify site to stop credit burn.

### 6) Confirm Stripe / affiliate still use the domain

Checkout and deliver URLs should stay on `https://mangrovetools.com/...` — no change needed if the hostname never changed. Only re-check if you temporarily used a `*.netlify.app` URL anywhere in Stripe or email copy.

---

## What you give up vs Netlify

| Feature | Netlify / Cloudflare Pages | Porkbun Static Hosting |
| --- | --- | --- |
| GitHub auto-deploy | Yes | Yes (GitHub Connect) |
| Free forever tier | Often yes | Paid (cheap; 15-day trial) |
| `_redirects` trailing-slash 301s | Yes | Likely ignored — use URL Forwarding if needed |
| `_headers` / CSP | Yes | Likely ignored |
| Force `/docs` → 404 | Yes | Weaker — files on disk may be fetchable |

If CSP + clean redirects matter more than “one vendor,” use **Porkbun DNS + Cloudflare Pages** instead — see `docs/setup/CLOUDFLARE_PAGES.md`. Same registrar, stronger host.

---

## What not to buy at Porkbun for this site

- WordPress / cPanel / Easy PHP — wrong stack (this site is static HTML).
- Domain **transfer** tools / auth codes — not needed; domain is already here.

---

## Rollback

1. Re-add Netlify DNS for `@` / `www` (from the Netlify domain panel).
2. Or point DNS at Cloudflare Pages if that project was already created.
3. Turn off Porkbun Static Hosting only after the other host answers correctly.
