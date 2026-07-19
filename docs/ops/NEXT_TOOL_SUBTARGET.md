# Phase 4 decision — SubTarget

1. **Name / slug:** SubTarget — `/subtarget/`
2. **Intent:** how many paid newsletter subscribers do I need
3. **Unique:** Inverse of LetterROI paid stream — goal + price → subscriber count (not forward revenue or sponsor CPM)
4. **Math:** `subs = ceil(target / (price × (1 − fee%)))` with optional annual mix + churn replacements; ±15% band
5. **Monetization:** Soft beehiiv CTA after value; same `via=letterroi` in config; UTMs `utm_source=subtarget&utm_medium=affiliate&utm_campaign=paid_sub_goal`
6. **Out of scope:** Full multi-stream ROI, sponsor pricing, platform comparison, conversion funnels, LTV, backends
7. **Size:** S  
8. **Autonomous:** Yes — static HTML/CSS/JS mirror of existing tools
