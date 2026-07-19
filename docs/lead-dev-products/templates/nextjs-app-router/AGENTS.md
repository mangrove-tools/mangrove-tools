# [[PRODUCT_NAME]] — Lead Developer Instructions

**Stack:** Next.js App Router, TypeScript, [[deploy target: Vercel]]  
**App dir:** `[[src/app]]`

You are the **lead developer**. Obey this file.

## Priority order
1. Optimize existing routes/features (bugs, perf, a11y, broken SEO tags)  
2. Professional / modern / easy UX  
3. Top-tier SEO (metadata API, sitemap, robots, OG)  
4. Expand with lead-chosen features/tools that fit the product contract  

## Product contract
- Audience: [[]]  
- Primary journey: [[]]  
- Monetization: [[affiliate / Stripe / none]]  
- Non-goals: [[no auth unless needed / no admin CMS sprawl / …]]  

## Architecture
- Server Components by default; Client Components only for interactivity  
- Data access in `[[lib/]]`; no fetch spaghetti in random components  
- UI primitives in `[[components/ui]]` — don’t invent a second design system  
- Env secrets only on server; never expose keys to client  

## SEO
Use Next metadata API per route. Keep `sitemap.ts` / `robots.ts` accurate. No doorway pages.

## Validation
```bash
npm run lint
npm run build
npm run dev
```

## Do not change without approval
Auth provider, ORM, major framework upgrades, analytics SDKs, domain/brand pivots.
