# Mangrove Tools — Cursor Agent Development Workflow

**Adopted:** 2026-07-20  
**Branch convention:** `cursor/<descriptive-name>-f444` (or owner `mangrovetools-development`)  
**Base:** `main`  
**Live:** https://mangrovetools.com/

## Golden rule

```text
Inspect → Plan → Approve → Implement → Test → Review → Commit
```

Never skip inspection, planning, validation, or review.  
Never ask agents to “make the site cutting edge” or “redesign everything.”  
Ask for one backlog item, one route, or one foundation layer at a time.

## Stack constraint (non-negotiable)

This is a **static** Vercel site: HTML / CSS / vanilla JS. No React, Next, Vue, bundler, or package.json unless the owner explicitly approves.

Cutting-edge UI here means distinctive brand craft, clear hierarchy, purposeful motion, accessibility, and performance — **not** installing a UI framework.

## Stage map

| Stage | Name | Status (2026-07-20) | Artifact |
| --- | --- | --- | --- |
| 1 | Protect project | Done this pass | Feature branch; `.gitignore` / `.cursorignore` |
| 2 | Repository & product audit | Done this pass | `SITE_AUDIT.md` |
| 3 | Product / version definition | Done this pass | `SITE_STRATEGY_V1.md` (V1.0 shipped; V1.1 scoped) |
| 4 | Visual & interaction direction | Done this pass | `DESIGN_DIRECTION.md` |
| 5 | AGENTS.md | Exists; reconciled this pass | `AGENTS.md` |
| 6 | Engineering & design backlog | Done this pass | `BACKLOG.md` |
| 7 | UI foundation plan | Done this pass (plan only) | `UI_FOUNDATION_PLAN.md` |
| 8+ | Implement one backlog item | **Awaiting owner approval** | Pick an ID from `BACKLOG.md` |

## Operating roles (when needed)

Use dedicated prompts for Product Architect, UI Systems, Interaction, Implementation, Responsive QA, A11y QA, Performance, QA, Code Review, UX Review — each scoped to one backlog item. Prefer sequential work on shared tokens (`site.css`), nav, and global layout.

## Safe parallel work

- Isolated route copy / SEO metadata (non-overlapping files)
- Docs under `docs/ops/` and `docs/setup/`
- Link-checker / content audits
- Image optimization of non-shared assets

## Unsafe parallel work

- `site.css` tokens, typography, atmosphere
- Shared nav / footer markup patterns
- `studio.css` shared wizard chrome
- `vercel.json` headers / rewrites
- Calculator shell unification (touches three tool CSS trees)

## Approval gates (unchanged)

Pause for owner before: live payments changes, deploy/DNS/Vercel identity, affiliate ID changes, invented testimonials/legal, pricing outside source bands, destructive git, rebrand, secrets, external form submits.

## Validation (this stack)

```bash
python3 -m http.server 5173
python3 scripts/check-links.py
# Manual: key routes at ~390 / 768 / 1440; keyboard focus; tool empty/extreme inputs
```

There is no `npm run lint|test|build`. Do not invent those results.
