# Purposeful Motion Design

**Date:** 2026-07-28
**Status:** Approved for implementation
**Scope:** Homepage analytical story and successful Budget Advisor / Revenue
Forecaster result states

## Objective

Use restrained motion to clarify analytical sequence and state change. Motion
should help a visitor understand that evidence is checked before a bounded
decision, and help an operator see when a tool has produced a fresh result.

This is not a decorative animation pass. No element should move merely to make
the site feel busier.

## Experience

### Homepage story progression

The existing evidence → checks → boundary story remains complete, readable
semantic HTML without JavaScript.

When JavaScript, `IntersectionObserver`, and motion preferences permit:

- the story receives a single, short entrance when it reaches the viewport;
- the three stages settle in sequence, preserving their evidence → checks →
  boundary order;
- a quiet progress rule reinforces that the stages are connected;
- the effect runs once and never takes over scrolling.

If JavaScript or `IntersectionObserver` is unavailable, the story stays fully
visible. No content begins hidden by default.

### Analytics result-state feedback

After Budget Advisor or Revenue Forecaster completes a valid calculation:

- the results surface receives a brief accent-line state change;
- the summary, explanation, chart, table, and next-step regions settle into
  their ready state;
- repeated calculations can replay the state change so the operator can
  distinguish a fresh result from the previous one.

Invalid calculations reset the ready state and preserve the existing guardrail
behavior. No numbers count up and no result content is delayed from assistive
technology.

## Reduced motion

`prefers-reduced-motion: reduce` is a hard behavioral branch:

- no observer-driven entrance is scheduled;
- result surfaces become ready synchronously;
- CSS animations and transitions remain disabled by the existing global
  reduced-motion rule;
- all content is visible and usable.

The JavaScript helper must also work when `matchMedia`,
`IntersectionObserver`, or `requestAnimationFrame` is absent.

## Accessibility and progressive enhancement

- Motion does not change reading order, focus order, names, roles, or values.
- Do not add live-region announcements solely for visual motion.
- Do not use color as the only indicator; opacity/position changes are
  supplemental to the existing content and headings.
- No scroll-jacking, autoplay loop, parallax, flashing, or continuously moving
  content.
- Static markup remains the source of truth.

## Architecture

- Add one dependency-free shared vanilla-JavaScript helper.
- Load it only on the homepage and the two analytics tools.
- Integrate analytics tools with small render-state calls after existing
  success/failure branches; do not alter calculation, validation, tracking,
  chart, or storage behavior.
- Add scoped styles to existing site/tool stylesheets.

## Boundaries

- No analytics model, result value, confidence language, sample data, or event
  payload changes.
- No backend, storage, API, route, redirect, dependency, framework, or build
  changes.
- No affiliate identifier, `AFFILIATE_URL`, Google Analytics identity, Vercel,
  DNS, domain, payment, secret, or production-wiring changes.
- No raw calculator input storage or transmission.

## Acceptance criteria

- Homepage motion communicates the three-stage analytical order and runs once.
- Both analytics tools visibly distinguish a fresh successful result.
- Invalid states clear the result-ready treatment.
- Repeated valid calculations can replay the result treatment.
- Reduced-motion mode schedules no observer or animation frame and leaves all
  content visible.
- Failure of the helper leaves every page functional and readable.
- Desktop and 390px screenshots show polished stable states.
- Browser verification covers normal and reduced-motion behavior, successful
  sample-data runs in both tools, console/runtime errors, and horizontal
  overflow.
- Repository validator, validator unit tests, and focused motion tests pass.
- Exact HEAD receives an independent review before the PR opens.
