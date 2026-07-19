# Lead-Dev Prompting: How to Ship Real Products With AI Agents

*A practical methodology for turning AI coding agents into a sequenced lead developer—not a chaotic feature factory.*

---

Most people prompt AI like this: *“Build me a website that makes money.”*  
What they get is a generic stack, a half-finished dashboard, and a week of cleanup.

What works better is the opposite: treat the agent like a **lead developer** with a constitution, a priority order, and a definition of done. That is the methodology behind shipping **Needle** (an iOS App Store app) and the reusable template now driving **Mangrove Tools** (mangrovetools.com)—a static collection of free, niche utilities monetized with affiliate CTAs.

This article explains the method, the template, and how to reuse it on your next repo.

---

## The core idea

AI agents are excellent executors and mediocre CEOs.

If you give them unbounded ambition, they invent frameworks, blogs, auth systems, and “platforms.” If you give them:

1. a **locked product contract**,  
2. a **strict work order**, and  
3. a **standing rules file** (`AGENTS.md`),  

…they will stabilize what exists, raise quality, then grow the product on purpose.

That is lead-dev prompting.

---

## What “good” looked like on Needle

Needle succeeded as an agent-built product because the brief was narrow and enforceable:

- One primary user journey (choose platform → guided flow → build → copy/open).  
- Explicit non-goals (no AI search engine, no history vault, no analytics SDK soup).  
- Architecture constraints (SwiftUI patterns already in the repo—don’t invent a second stack).  
- Monetization rules (free allowance → StoreKit subscription).  
- A real Definition of Done (build, tests, privacy claims stay honest).

The durable artifact was not a chat transcript. It was an **`AGENTS.md`**—a short constitution every future agent session had to obey.

That pattern transfers.

---

## The four-phase lead-dev order

For Mangrove Tools (and any living product repo), the lead agent works in this order—and does not skip ahead:

### Phase 1 — Optimize what already exists
Fix the product you have before dreaming about the product you want.

- Broken links, calc edge cases, mobile bugs  
- Config correctness (affiliate URLs, canonicals, sitemap drift)  
- Dead weight and confusing paths  

**Goal:** the current site/app is reliable.

### Phase 2 — Professional, modern, easy to use
Raise the quality bar for humans.

- Clear information hierarchy  
- Calm, credible UI (branded—not “AI purple template”)  
- Forms and results that feel obvious on a phone  

**Goal:** a stranger trusts it in five seconds.

### Phase 3 — Top-tier SEO (or discovery)
Make the good product findable.

- Intent-matched titles, H1s, meta descriptions  
- Canonicals, Open Graph, honest structured data  
- Internal links, sitemap, crawlable static HTML  
- No spun doorway pages  

**Goal:** high-intent searches can discover the real tool.

### Phase 4 — Expand with lead-chosen niche work
Only then does the lead developer propose and implement growth.

For Mangrove, that means **new niche tools**—not a blog network or social platform. The agent decides what is niche enough, useful enough, and monetizable enough, writes a short decision note, then ships **one** tool end-to-end in the established folder pattern.

**Goal:** compound a library of tools that earn their keep.

---

## The template (two files)

### 1) `AGENTS.md` — the constitution
Always-on rules for every session:

- Product and business model (what you are—and are not)  
- Priority order  
- Stack and architecture boundaries  
- Design system  
- SEO / monetization / privacy rules  
- Validation commands  
- Definition of Done  
- “Do not modify without approval” list  

This file prevents regression. New chats inherit discipline.

### 2) `LEAD_DEV_BUILD_PROMPT.md` — the session brief
A paste-ready prompt that assigns the agent the lead-dev role and forces the phase order. Optional one-line overrides exist for special cases (“Phase 1–3 only,” “skip to tool proposals,” etc.), but the default is sequenced leadership.

Together they replace vibe-based prompting with an operating system.

---

## Business-model clarity beats “make money” prompts

A common failure mode is pasting a list of “profitable website types” (ecommerce, blogs, social networks, streaming, job boards…) and asking an agent to somehow become all of them.

Lead-dev prompting picks **one** durable model and locks it.

Mangrove’s lock:

> Niche affiliate + free utility collection.  
> Rank for tool intent → deliver usefulness → soft CTA.  
> Not a blog farm, social network, or storefront.

Needle’s lock:

> Guided search-query builder for iPhone.  
> Copy/open results. Subscription after a free allowance.  
> Not an AI search engine.

Constraints create shippable products. Ambition without constraints creates demos.

---

## How to run a session

1. Open the real repo (not a blank folder if the product already exists).  
2. Paste the lead-dev prompt.  
3. Let the agent audit Phases 1–3 and implement fixes.  
4. Review Phase 4 proposals before it builds a pile of mediocre tools.  
5. Deploy only when Definition of Done is honest.  
6. Keep `AGENTS.md` updated when the product contract actually changes—not when a chat gets excited.

---

## What this methodology is *not*

- Not “one prompt builds a unicorn.”  
- Not an excuse to skip product taste—you still approve niche direction and brand.  
- Not anti-ambition. Ambition moves to Phase 4, after the foundation stops leaking.  
- Not framework cosplay. Prefer the boring stack that matches the product (static Netlify tools; SwiftUI iOS utility; etc.).

---

## A reusable checklist for your next repo

Copy this skeleton:

1. **Write the product contract** in one screen: journey, non-goals, monetization.  
2. **Write `AGENTS.md`** with stack, architecture, DoD, approval gates.  
3. **Write a lead-dev prompt** with a strict phase order appropriate to the domain:  
   - Existing product: optimize → UX polish → discovery/SEO → expand  
   - Greenfield: spike vertical slice → harden → polish → expand  
4. **Name the business model** and ban the tempting pivots.  
5. **Run short sessions** with clear phase outcomes, not infinite “keep going” loops.

---

## Why it works

Agents fail when success is undefined and scope is infinite.  
They succeed when success is a checklist and scope is a corridor.

Lead-dev prompting turns AI from a brainstorming partner into something closer to what you actually need: a disciplined builder that stabilizes the product, makes it professional, makes it discoverable, and only then grows it—by choosing work that is niche enough to matter.

That is the methodology.  
That is the template.  
Ship the foundation first. Earn the right to expand.

---

### Template locations (Mangrove Tools)

- Standing rules: `AGENTS.md`  
- Paste-ready session prompt: `docs/LEAD_DEV_BUILD_PROMPT.md`  
- Live product: [mangrovetools.com](https://mangrovetools.com/)
