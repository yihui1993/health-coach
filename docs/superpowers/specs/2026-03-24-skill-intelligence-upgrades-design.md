# Skill Intelligence Upgrades — Design Spec

**Date:** 2026-03-24
**Goal:** Improve data quality, estimation accuracy, and recommendation depth across all health-coach skills without architectural changes.

## Problem

The current skills are shallow in three ways:

1. **Photo-based meal estimation is unstructured** — `log-meal` says "estimate using USDA values" but provides no method for translating a photo into gram-level portion estimates. This is the primary data entry path and the biggest accuracy gap.
2. **Skills are siloed** — each skill only queries its own domain. `log-meal` doesn't know about sleep. `suggest-exercise` doesn't know about nutrition trends. Cross-domain connections that a good coach would make are missed.
3. **Recommendations are surface-level** — skills report data but don't synthesize it into actionable, personalized advice that connects cause and effect.

## Scope

- Prompt-level upgrades to 5 existing skill files
- Expansion guidance for `nutrition-lookup.json`
- Fix 2 stale file references
- No schema changes, no new tables, no new skills, no architectural changes

## Design

### 1. Photo Estimation Protocol (log-meal)

Replace the current vague "estimate remaining items with USDA values" instruction with a structured multi-step framework:

**Step 1 — Component identification.** List every distinct food item visible in the photo. Name each one specifically (e.g., "grilled chicken thigh" not just "chicken").

**Step 2 — Portion estimation using visual anchors.** For each component, estimate weight in grams using:
- Plate diameter (standard dinner plate = 26cm, standard bowl = 15cm)
- Thickness/depth of food on the plate
- Proportion of plate surface covered
- Known reference objects if visible (utensils, cups, hands)
- Common serving heuristics (palm-sized meat ≈ 100–120g, fist of rice ≈ 150g cooked)

**Step 3 — Per-component USDA lookup.** Apply USDA values per 100g to the estimated weight. Use the cooked version of the food (not raw) since photos show prepared food.

**Step 4 — Cooking method adjustment.** Apply modifiers:
- Pan-fried: +5–8% fat from oil absorption
- Deep-fried: +10–15% fat
- Stir-fried: +3–5% fat
- Steamed/boiled/grilled: no adjustment
- Estimate visible oil/sauce separately

**Step 5 — Confidence flag.** Rate overall confidence:
- HIGH — packaged food, simple meal, clear photo
- MEDIUM — home-cooked, multiple components, standard portions
- LOW — restaurant meal, heavy sauce, unclear portions

If LOW, ask one targeted clarifying question (e.g., "roughly how big was the portion?" or "was this a regular or large bowl?").

**Step 6 — Auto-lookup expansion.** After logging, if the meal description closely matches something logged 2+ times before with similar macros (within 15% range), suggest adding it to `nutrition-lookup.json` as a shortcut. Compute average macros across prior entries to smooth estimation errors.

### 2. Cross-Cutting Context Layer

Add a standardized "context gather" query block that every skill runs at the start. Each skill uses what's relevant from the results.

**Queries in the context block:**

| Data Point | Query | Used By |
|---|---|---|
| Last sleep (duration, HRV, avg_bpm) | Most recent `sleep_log` entry | all skills |
| Today's body status (pain, fatigue, mood) | Today's `body_status` | all skills |
| Trailing 7-day nutrition averages (cal, protein, carbs, fat) | `meals` last 7 logical days | all skills |
| Trailing 7-day protein hit rate | Days where protein ≥ phase target | all skills |
| Last 3 workouts (date, muscle_groups, volume) | Recent `workouts` | all skills |
| Days since last workout | Computed from above | suggest, meal |

**How each skill uses the context:**

- **log-meal** — If 7-day protein average is below target, add a specific nudge with numbers. If last sleep was poor (<6.5h), note that recovery nutrition matters more today.
- **log-exercise** — If 7-day protein average is low, flag it as a recovery concern. If today's body status has fatigue or pain, acknowledge it.
- **suggest-exercise** — If protein has been consistently low (4+ days below target in last 7), recommend a lighter session. Factor in days since last workout explicitly.
- **weekly-summary** — Add a cross-domain "connections" paragraph to the verdict that links patterns across nutrition, sleep, and training.

### 3. Recommendation Depth Upgrades

**suggest-exercise:**
- Synthesize cross-cutting context into a holistic recommendation. Example: "Protein 15% below target for 4 days + 5.8h sleep → moderate full-body session, hold weights at last session's level."
- When conditions are good, explicitly encourage pushing: "Protein on target 6/7 days, 7.5h sleep, HRV 55ms, chest untrained 5 days → push chest, try +2.5kg bench."
- Add estimated session duration based on exercise count and rest periods.
- When suggesting deload, explain the reasoning so the user learns the cause-effect connection.

**log-exercise:**
- Compare against last 3 sessions of the same muscle group (not just 1) to show trajectory: "Bench: 40→42.5→42.5→45kg — steady progression" or "Squat: 60→57.5→55→52.5kg — declining, check recovery."
- When volume declines, automatically check last sleep and 7-day protein average and include a likely explanation.

**log-meal:**
- Make protein projection aware of the user's historical meal distribution. Instead of linear projection (protein_so_far / hours_elapsed × 16h), query the user's typical protein distribution across meal types and project based on remaining expected meals.
- Add meal-specific feedback: "This meal is 45g protein — strong contribution toward your 95g target" or "This meal is mostly carbs (65g) with 8g protein — you'll need protein-heavy meals for the rest of the day."

**weekly-summary:**
- The verdict becomes a synthesis paragraph connecting patterns across domains, plus 2–3 specific action items for next week.
- Example: "Training volume trending up on upper body but flat on legs — your 2 short sleep nights both preceded leg days, likely capping intensity. Next week: prioritize 7+ hours before leg days and aim for 100g protein on training days."

### 4. Nutrition Lookup Expansion

- **Proactive shortcut suggestions** — After logging, check if a similar meal (same key ingredients, within 15% macro range) has been logged 2+ times in last 30 days. Suggest adding it as a named shortcut with averaged macros.
- **Portion multipliers** — Allow entries to be referenced with multipliers (e.g., "2x standard breakfast"). The skill multiplies the stored macros. This is a prompt convention, not a schema change.
- **Restaurant/store entries** — Encourage building out entries for regular restaurants and store-bought meals, since these have the most consistent portions.

### 5. Stale Reference Fixes

- **suggest-exercise** — reads `data/goals.md` which was deleted. Update to `data/current-status.md`.
- **weekly-summary** — reads `data/goals.md` which was deleted. Update to `data/current-status.md`.

## Files Modified

| File | Change |
|---|---|
| `.claude/skills/log-meal/SKILL.md` | Photo estimation protocol, cross-cutting context, meal-specific feedback, projection upgrade, auto-lookup suggestion |
| `.claude/skills/log-exercise/SKILL.md` | Cross-cutting context, 3-session trajectory comparison, recovery-linked volume decline explanation |
| `.claude/skills/suggest-exercise/SKILL.md` | Cross-cutting context, synthesis-driven recommendations, session duration estimate, fix goals.md → current-status.md |
| `.claude/skills/weekly-summary/SKILL.md` | Cross-cutting synthesis verdict, action items, fix goals.md → current-status.md |
| `.claude/skills/log-sleep/SKILL.md` | Cross-cutting context (minor — note how last night's sleep relates to today's planned training if workout is recent) |

## Out of Scope

- Schema changes (no new columns or tables)
- New skills (no morning briefing, no adaptive targets)
- Feedback/correction loop (possible future follow-up)
- Architecture changes (skills remain standalone markdown files)
