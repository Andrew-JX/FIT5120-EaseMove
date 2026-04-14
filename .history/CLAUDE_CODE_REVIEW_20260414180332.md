# CLAUDE_CODE_REVIEW.md

# EaseMove Melbourne — Claude Code Review Specification

# FIT5120 TP12 vme50 · Iteration 1

## 如何使用这份文档

在VSCode中打开Claude Code后，发送以下指令开始review：

"Review this codebase against CLAUDE_CODE_REVIEW.md.
Start with [指定文件或功能模块].
For each issue found, state: file name, line number, which AC it violates, and what the fix should be."

---

## Review Checklist — 按AC逐条检查

### AC 1 — Comfort map loads (12 precincts, colour-coded)

- [ ] All 12 precinct IDs present in backend/config/precincts.json: flemington, kensington, north-melbourne, carlton, fitzroy, west-melbourne, cbd, east-melbourne, docklands, south-wharf, southbank, south-yarra
- [ ] Leaflet map renders on load — no blank map
- [ ] Each precinct has a DivIcon marker with colour matching comfort_label
- [ ] Colour mapping: Comfortable → #22c55e, Caution → #eab308, High Risk → #ef4444, stale → #9ca3af
- [ ] Text label visible on/below each marker (not colour-only)
- [ ] Score thresholds: ≥70 = Comfortable, 40–69 = Caution, <40 = High Risk
- [ ] Comfort score formula: (temp_score × 0.60) + (humid_score × 0.30) + (activity_score × 0.10)
- [ ] Normalisation: temp = (40-T)/40×100, humid = (100-H)/100×100, activity = (500-A)/500×100, all clamped 0–100

### AC 2 — Score card on tap

- [ ] Tapping a marker triggers selectPrecinct() in Pinia store
- [ ] PrecinctCard renders with: comfort label, temperature °C, humidity %, activity level, wind speed, last updated timestamp
- [ ] Activity level thresholds: Low <100, Medium 100–300, High >300 counts/hr
- [ ] No fields are undefined or showing "null"

### AC 3 — Stale data warning

- [ ] isStale() checks if reading timestamp is >30 minutes old
- [ ] When stale: PrecinctCard shows "Data may be outdated" banner
- [ ] When stale: comfort label badge has opacity 0.5 (dimmed)
- [ ] When stale: marker colour is #9ca3af regardless of score
- [ ] Stale data does NOT remove the precinct from the map

### AC 4 — Mobile readable

- [ ] No fixed-width containers wider than viewport at 375px
- [ ] PrecinctCard is a bottom sheet on mobile (≤768px) — slides up from bottom
- [ ] Bottom sheet uses CSS transform translateY, not position fixed without proper containment
- [ ] Min font-size 14px on all card body text
- [ ] Marker tap target ≥36×36px

### AC 5 — Colour has text label

- [ ] Every marker has a text label alongside the colour dot (not colour-only)
- [ ] PrecinctCard comfort label shows full text ("Comfortable" / "Caution" / "High Risk"), not just colour
- [ ] CompareView columns show text label per area, not just colour

### AC 6 — Street furniture overlay

- [ ] Toggle button exists in MapView
- [ ] On toggle: fetches /api/furniture endpoint
- [ ] GeoJSON layer renders on map with distinct icons for drinking_fountain vs bicycle_rail
- [ ] On toggle off: layer is removed cleanly
- [ ] If fetch fails: toast message shown, no crash

### AC 7 — Side-by-side comparison

- [ ] addToCompare() in Pinia store: max 2 precincts, replaces oldest if already 2
- [ ] CompareView renders two columns with: name, comfort label, temperature, humidity, activity level, last updated
- [ ] CompareView visible when isComparing === true
- [ ] On mobile: columns stack vertically without overflow

### AC 8 — Better area highlighted

- [ ] betterPrecinct getter returns precinct with higher comfort_score
- [ ] betterPrecinct returns null when scores are tied
- [ ] "Better right now" badge appears on the winning column
- [ ] If tied: "Conditions are similar in both areas right now." text shown

### AC 9 — Red vs green recommendation

- [ ] If one precinct is High Risk and other is not: sentence recommendation appears
- [ ] If both High Risk: "Both areas are currently high risk..." text shown
- [ ] Recommendation text is visible in CompareView, not hidden

### AC 10 — Time-slot recommendation

- [ ] /api/precincts/:id/today endpoint exists and returns recommendation string
- [ ] Recommendation shown in PrecinctCard
- [ ] If temperature >36: recommendation is the high-heat-risk message
- [ ] If no today data: shows "Recommendation based on current conditions only."

### AC 11 — Recommendation basis visible

- [ ] recommendation_basis (temp, humidity, activity) shown below recommendation text in PrecinctCard
- [ ] Not hidden behind a tap or expand button

### AC 12 — Preparation advice

- [ ] getPreparationAdvice() returns array, not single string
- [ ] Temperature >30: water bottle tip shown, includes "Based on current temperature: X°C"
- [ ] PM2.5 >25: mask tip shown, includes "Based on PM2.5: X µg/m³"
- [ ] Both green (temp<28, pm25≤25): positive prompt shown
- [ ] Multiple tips show simultaneously when multiple thresholds triggered

### AC 13 — Weight slider real-time update

- [ ] WeightSlider exists and is accessible from UI
- [ ] Three sliders, one per factor
- [ ] Dragging one slider adjusts others proportionally to maintain sum of 100
- [ ] Map markers update after weight change (either re-fetch or local recalculation)
- [ ] No page reload required

### AC 14 — Weights persisted in localStorage

- [ ] On save: writes to localStorage key 'easemove_weights'
- [ ] On app init: loadFromStorage() called, reads and validates localStorage
- [ ] If stored value invalid (bad keys, doesn't sum to 100): ignored, defaults applied
- [ ] Privacy note visible: "Your preferences are saved on this device only..."

### AC 15 — Default weights and reset

- [ ] Default weights: { temperature: 60, humidity: 30, activity: 10 }
- [ ] "Reset to defaults" button present in WeightSlider
- [ ] Reset updates Pinia store, localStorage, and sliders
- [ ] Map updates after reset

---

## Code Quality Checks (run on every PR)

### Security

- [ ] No API keys hardcoded anywhere in frontend or backend source files
- [ ] All CoM API calls in try/catch blocks
- [ ] express-rate-limit applied to /api/\* routes
- [ ] CORS configured with process.env.CORS_ORIGIN (not wildcard \*)
- [ ] All SQL uses parameterised queries — no string concatenation with user input
- [ ] .env file not committed (check .gitignore)

### Error handling

- [ ] Frontend Pinia stores have loading, error, and success states for all API calls
- [ ] No silent failures — errors logged at minimum
- [ ] Backend returns { error, code, timestamp } shape for all error responses
- [ ] Null/missing sensor values handled — no NaN displayed to user

### Naming conventions

- [ ] Vue component files: PascalCase (.vue)
- [ ] JS variables/functions: camelCase
- [ ] DB tables/columns: snake_case (in SQL files)
- [ ] Constants: UPPER_SNAKE_CASE

### Comments

- [ ] All functions >10 lines have JSDoc comment
- [ ] All API route handlers have inline comment describing request/response shape
- [ ] Comfort score formula and normalisation have algorithm comments
- [ ] Stale threshold constant has comment explaining the 30-minute rationale

### Mobile

- [ ] No hardcoded px widths that exceed 375px
- [ ] All interactive elements ≥36×36px tap target
- [ ] No horizontal scroll at 375px viewport (test with browser dev tools)
- [ ] Min font-size: 14px on all body text

---

## How to Run a Full Review Session in Claude Code

Paste this into Claude Code:

```
You are reviewing the EaseMove Melbourne codebase (FIT5120 TP12 vme50, Iteration 1).
Reference document: CLAUDE_CODE_REVIEW.md in the project root.

Please do the following in order:

1. Read CLAUDE_CODE_REVIEW.md fully.
2. List every file in the project.
3. For each AC in the checklist (AC 1 through AC 15):
   a. Find the relevant code
   b. Check each bullet point
   c. Report PASS, FAIL, or NOT FOUND for each bullet
   d. For any FAIL or NOT FOUND: state the file, line number, and the specific fix needed
4. Run the code quality checks section.
5. Produce a summary table: AC number | Status | Issues found | Files affected

Be specific. Do not say "looks good" without checking the code.
If a file is missing that should exist, report it as NOT FOUND.
```

---

## Review Priority Order

If time is limited, review in this order (highest risk first):

1. AC 3 (stale data) — easy to break, mentors will test this
2. AC 1 (comfort score formula) — core logic, must be mathematically correct
3. AC 13/14/15 (weight slider) — new feature, not tested before
4. AC 4 (mobile 375px) — mentors test on mobile in studio
5. AC 5 (text labels) — accessibility, mentors check this explicitly
6. Security checks — no API keys, parameterised queries
7. Remaining ACs
