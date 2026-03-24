# Skill Intelligence Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve macro estimation accuracy, cross-domain context awareness, and recommendation depth across all health-coach skills.

**Architecture:** All changes are prompt-level edits to existing `.claude/skills/*/SKILL.md` files. No schema changes, no new files, no new dependencies. Each skill gets a standardized cross-cutting context query block and domain-specific intelligence upgrades.

**Tech Stack:** Markdown skill files, SQLite queries, bash

**Spec:** `docs/superpowers/specs/2026-03-24-skill-intelligence-upgrades-design.md`

---

### Task 1: Fix stale `goals.md` references in all skills

Three skills reference `data/goals.md` which was deleted and merged into `data/current-status.md`. Fix all references before making other changes.

**Files:**
- Modify: `.claude/skills/log-meal/SKILL.md:74,82`
- Modify: `.claude/skills/suggest-exercise/SKILL.md:39,73,87`
- Modify: `.claude/skills/weekly-summary/SKILL.md:1,11,71,118`

- [ ] **Step 1: Fix log-meal references**

In `.claude/skills/log-meal/SKILL.md`, replace:
- Line 74: `Read \`data/goals.md\`` → `Read \`data/current-status.md\``
- Line 82: `daily ceiling from goals.md` → `daily ceiling from current-status.md`

- [ ] **Step 2: Fix suggest-exercise references**

In `.claude/skills/suggest-exercise/SKILL.md`, replace:
- Line 39: `Read \`data/goals.md\`` → `Read \`data/current-status.md\``
- Line 73: `(use goals.md phase to guide)` → `(use current-status.md phase to guide)`
- Line 87: `Read goals.md to confirm` → `Read current-status.md to confirm`

- [ ] **Step 3: Fix weekly-summary references**

In `.claude/skills/weekly-summary/SKILL.md`, replace:
- Line 11: `Read \`data/goals.md\`` → `Read \`data/current-status.md\``
- Line 71: `weekly_frequency_target from goals.md` → `weekly_frequency_target from current-status.md`
- Line 118: `Source all targets from goals.md` → `Source all targets from current-status.md`

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/log-meal/SKILL.md .claude/skills/suggest-exercise/SKILL.md .claude/skills/weekly-summary/SKILL.md
git commit -m "fix: update stale goals.md references to current-status.md in all skills"
```

---

### Task 2: Upgrade log-meal with photo estimation protocol

The biggest single change. Replace the vague "estimate using USDA values" instruction with a structured 6-step photo estimation framework, add cross-cutting context queries, upgrade protein projection, and add meal-specific feedback and auto-lookup suggestion.

**Files:**
- Modify: `.claude/skills/log-meal/SKILL.md`

- [ ] **Step 1: Replace step 3 (estimation) with the photo estimation protocol**

Replace the current step 3:
```
3. For items NOT in the lookup, estimate nutrition using standard USDA values. Show a breakdown table:

| Item | Kcal | P (g) | C (g) | F (g) |
|------|------|-------|-------|-------|
| ...  | ...  | ...   | ...   | ...   |
| **Total** | **X** | **X** | **X** | **X** |
```

With:
```
3. For items NOT in the lookup, use the structured estimation protocol:

   **a) Identify components** — List every distinct food item. Name each one specifically (e.g., "grilled chicken thigh" not just "chicken"). If a photo is provided, identify all visible items.

   **b) Estimate portions using visual anchors** — For each component, estimate weight in grams using:
   - Plate diameter (standard dinner plate = 26cm, standard bowl = 15cm)
   - Thickness/depth of food on the plate
   - Proportion of plate surface covered
   - Known reference objects if visible (utensils, cups, hands)
   - Serving heuristics: palm-sized meat ≈ 100–120g, fist of rice ≈ 150g cooked, thumb of cheese ≈ 30g

   **c) USDA lookup per component** — Apply USDA values per 100g to estimated weight. Always use the COOKED version (not raw) since photos and descriptions refer to prepared food.

   **d) Cooking method adjustment** — Apply fat modifiers:
   - Pan-fried: +5–8% fat from oil absorption
   - Deep-fried: +10–15% fat
   - Stir-fried: +3–5% fat
   - Steamed/boiled/grilled: no adjustment
   - Estimate visible oil/sauce separately (1 tbsp oil ≈ 120 kcal, 14g fat)

   **e) Confidence rating** — Rate the overall estimate:
   - HIGH — packaged food, simple meal, clear photo
   - MEDIUM — home-cooked, multiple components, standard portions
   - LOW — restaurant meal, heavy sauce/oil, unclear portions or sizes
   If LOW: ask ONE targeted clarifying question (e.g., "roughly how many cups of rice?" or "was this a regular or large bowl?"). Do not ask multiple questions.

   **f) Show the breakdown table:**

   | Item | Est. grams | Kcal | P (g) | C (g) | F (g) | Notes |
   |------|-----------|------|-------|-------|-------|-------|
   | ...  | ...       | ...  | ...   | ...   | ...   | cooking adj, etc. |
   | **Total** | | **X** | **X** | **X** | **X** | Confidence: [HIGH/MEDIUM/LOW] |
```

- [ ] **Step 2: Add cross-cutting context queries after the existing step 6 (today's totals query)**

Insert a new step 7 (renumber subsequent steps) after the current step 6:
```
7. Gather cross-cutting context:
\```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
-- Last sleep
SELECT 'sleep' as ctx, duration_hours, avg_bpm, hrv_ms FROM sleep_log ORDER BY date DESC LIMIT 1;

-- Today's body status
SELECT 'status' as ctx, muscle_pain, fatigue_level, mood, NULL FROM body_status WHERE date(date, '-6 hours') = date('now', '-13 hours');

-- 7-day protein hit rate (days >= target)
SELECT 'protein_hits' as ctx,
  SUM(CASE WHEN day_protein >= [PROTEIN_TARGET] THEN 1 ELSE 0 END) as hit_days,
  COUNT(*) as total_days,
  NULL
FROM (
  SELECT date(timestamp, '-6 hours') as day, SUM(estimated_protein_g) as day_protein
  FROM meals
  WHERE date(timestamp, '-6 hours') >= date('now', '-13 hours', '-7 days')
    AND date(timestamp, '-6 hours') < date('now', '-13 hours')
  GROUP BY day
);

-- Days since last workout
SELECT 'last_workout' as ctx,
  CAST(julianday(date('now', '-13 hours')) - julianday(MAX(date)) AS INTEGER) as days_ago,
  NULL, NULL
FROM workouts;
"
\```
Replace [PROTEIN_TARGET] with the protein target from current-status.md (e.g. 95).
```

- [ ] **Step 3: Upgrade protein projection (renumbered step 9)**

Replace the current protein projection step:
```
8. **Protein projection** (only if current PDT hour < 18, i.e., before 6pm):
   - hours_elapsed = current PDT hour - 6 (hours since 6am)
   - If hours_elapsed > 0: projected_protein = (protein_so_far / hours_elapsed) × 16  — where 16 = hours in eating window (6am–10pm)
   - If projected_protein < protein_target: flag "On pace for ~[projected]g protein today — [gap]g short of target. Add a protein source at [next meal]."
```

With:
```
9. **Protein projection** (only if current PDT hour < 18, i.e., before 6pm):
   - Query the user's typical protein distribution by meal_type:
   \```bash
   sqlite3 /Users/yihuima/health-coach/data/health.db "
   SELECT meal_type, ROUND(AVG(estimated_protein_g), 1) as avg_protein, COUNT(*) as n
   FROM meals
   WHERE date(timestamp, '-6 hours') >= date('now', '-13 hours', '-14 days')
   GROUP BY meal_type
   ORDER BY CASE meal_type WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'dinner' THEN 3 WHEN 'snack' THEN 4 END;
   "
   \```
   - Identify which meal_types have NOT yet been logged today
   - Project remaining protein = sum of avg_protein for unlogged meal_types
   - projected_total = protein_so_far + projected_remaining
   - If projected_total < protein_target: flag "Based on your usual meals, you're on pace for ~[projected]g protein today — [gap]g short of target. Consider a high-protein option for [next_meal_type]."
```

- [ ] **Step 4: Add meal-specific feedback and cross-cutting nudges to the reply template**

Replace the current reply template (step 10) with (renumbered step 11):
```
11. Reply:

\```
Logged: [description] — [cal] kcal, [protein]g protein  [Confidence: HIGH/MEDIUM/LOW — only show for estimated meals, not lookup matches]

[Meal-specific feedback — pick ONE:
  - If protein ≥ 20g: "Strong protein contribution toward your [target]g target."
  - If protein < 10g and carbs > 30g: "Carb-heavy meal — you'll need protein-focused meals for the rest of the day."
  - Otherwise: omit]

Today ([kcal] / [ceiling] kcal · [protein]g / [target]g protein):
• Carbs: [carbs]g  Fat: [fat]g

7-day avg protein: [avg]g/day  (target: [target]g)
[protein projection flag if applicable]
[calorie ceiling flag if applicable]

[Cross-cutting nudges — include if relevant:
  - If 7-day protein hit rate < 4/7: "Protein has been below target [X] of the last 7 days — prioritize high-protein options."
  - If last sleep < 6.5h: "Short sleep last night — recovery nutrition matters more today. Prioritize protein and hydration."
  - If days since last workout ≥ 5: "No workout logged in [X] days — consider getting a session in today."]
\```
```

- [ ] **Step 5: Add auto-lookup suggestion and portion multiplier support**

Add to the Notes section at the bottom of the skill:
```
- After logging, check if a similar meal (same key ingredients) has been logged 2+ times in the last 30 days:
  \```bash
  sqlite3 /Users/yihuima/health-coach/data/health.db "
  SELECT description, estimated_calories, estimated_protein_g, estimated_carbs_g, estimated_fat_g
  FROM meals
  WHERE description LIKE '%[key_ingredient]%'
    AND date(timestamp, '-6 hours') >= date('now', '-13 hours', '-30 days')
  ORDER BY timestamp DESC LIMIT 5;
  "
  \```
  If 2+ matches with similar macros (within 15%): suggest "This looks like a regular meal — want me to save it as a shortcut in nutrition-lookup.json?"
- Support portion multipliers for lookup entries: "2x standard breakfast" = double all macro values. "1/2 beef bulgogi" = halve all values. Apply the multiplier before logging.
```

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/log-meal/SKILL.md
git commit -m "feat: upgrade log-meal with photo estimation protocol, cross-cutting context, and smarter projections"
```

---

### Task 3: Upgrade log-exercise with cross-cutting context and 3-session trajectory

Add the cross-cutting context block, expand overload comparison from 1 session to 3, and add recovery-linked explanations for volume declines.

**Files:**
- Modify: `.claude/skills/log-exercise/SKILL.md`

- [ ] **Step 1: Add cross-cutting context query block**

Insert a new step after the current step 6 (INSERT into workouts). Add as step 7 (renumber subsequent steps):
```
7. Gather cross-cutting context:
\```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
-- 7-day avg protein
SELECT 'nutrition' as ctx,
  ROUND(AVG(day_protein), 1) as avg_protein,
  SUM(CASE WHEN day_protein >= [PROTEIN_TARGET] THEN 1 ELSE 0 END) as hit_days,
  COUNT(*) as total_days
FROM (
  SELECT date(timestamp, '-6 hours') as day, SUM(estimated_protein_g) as day_protein
  FROM meals
  WHERE date(timestamp, '-6 hours') >= date('now', '-13 hours', '-7 days')
    AND date(timestamp, '-6 hours') < date('now', '-13 hours')
  GROUP BY day
);

-- Today's body status
SELECT 'status' as ctx, muscle_pain, fatigue_level, mood FROM body_status WHERE date(date, '-6 hours') = date('now', '-13 hours');
"
\```
Replace [PROTEIN_TARGET] with the protein target from current-status.md.
```

- [ ] **Step 2: Upgrade overload comparison from 1 session to 3 sessions**

Replace the current step 7 (query last session for comparison):
```
7. Query the last session that trained any of the same muscle groups (for comparison):
\```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT id, date, exercises, muscle_groups, total_volume_lbs
FROM workouts
WHERE date < date('now', '-13 hours')
  AND muscle_groups LIKE '%[first_muscle_group]%'
ORDER BY date DESC LIMIT 1;
"
\```
```

With (renumbered as step 8):
```
8. Query the last 3 sessions that trained any of the same muscle groups (for trajectory):
\```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT id, date, exercises, muscle_groups, total_volume_lbs
FROM workouts
WHERE date < date('now', '-13 hours')
  AND muscle_groups LIKE '%[first_muscle_group]%'
ORDER BY date DESC LIMIT 3;
"
\```
Replace [first_muscle_group] with the first item in today's muscle_groups array (e.g. 'quads').
```

- [ ] **Step 3: Upgrade the progressive overload comparison section**

Replace the current step 8 (progressive overload comparison) with (renumbered as step 9):
```
9. Build the progressive overload trajectory:
   - Parse today's exercises JSON and the previous sessions' exercises JSON (up to 3 prior sessions)
   - For each exercise that appears in today's AND at least one prior session:
     - Show the weight trajectory across all available sessions:
       `• [Name]: [s1_kg]kg → [s2_kg]kg → [s3_kg]kg → [today_kg]kg [trajectory]`
     - Trajectory labels:
       - 3+ sessions trending up → "steady progression"
       - 2+ sessions at same weight, today up → "breakthrough"
       - 2+ sessions at same weight → "plateau — time to push"
       - 2+ sessions trending down → "declining — check recovery"
   - If today's total_volume_lbs < most recent prior session's total_volume_lbs:
     - Check the cross-cutting context gathered in step 7:
       - If last sleep < 6.5h: note "Volume dip likely related to last night's [X]h sleep"
       - If 7-day protein avg < target: note "Protein has averaged [X]g over the past week vs [target]g target — may be affecting recovery"
       - If fatigue_level logged and ≥ 3: note "You reported fatigue today — volume dip is consistent"
       - If none of the above apply: flag "Volume dropped vs last session — intentional deload or form issue?"
```

- [ ] **Step 4: Update the reply template**

Replace the current step 10 (reply) with (renumbered as step 11):
```
11. Reply with:
    - Session summary: muscles trained, key exercises, duration if known, calories if tracked
    - Progressive overload trajectory (step 9) — skip section if no previous session exists
    - Total volume: [today] lbs vs [previous] lbs (or just today's if first session)
    - [If 7-day protein hit rate < 4/7: "Nutrition note: protein has been below target [X] of the last 7 days — recovery may be compromised. Prioritize protein today."]
    - [If body_status has pain or fatigue: "Recovery note: [pain/fatigue details from body_status] — factor this into tomorrow's session."]
    - What to train next based on 48h rotation rule
```

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/log-exercise/SKILL.md
git commit -m "feat: upgrade log-exercise with 3-session trajectory and cross-cutting context"
```

---

### Task 4: Upgrade suggest-exercise with synthesis-driven recommendations

Add cross-cutting nutrition context, synthesis-driven recommendation framing, estimated session duration, and explicit deload reasoning.

**Files:**
- Modify: `.claude/skills/suggest-exercise/SKILL.md`

- [ ] **Step 1: Add nutrition context query**

Insert a new step 4 after the current step 3 (query last sleep). Renumber subsequent steps:
```
4. Query trailing nutrition context:
\```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
-- 7-day protein stats
SELECT
  ROUND(AVG(day_protein), 1) as avg_protein,
  SUM(CASE WHEN day_protein >= [PROTEIN_TARGET] THEN 1 ELSE 0 END) as protein_hit_days,
  COUNT(*) as logged_days,
  ROUND(AVG(day_kcal), 0) as avg_kcal
FROM (
  SELECT date(timestamp, '-6 hours') as day,
    SUM(estimated_protein_g) as day_protein,
    SUM(estimated_calories) as day_kcal
  FROM meals
  WHERE date(timestamp, '-6 hours') >= date('now', '-13 hours', '-7 days')
    AND date(timestamp, '-6 hours') < date('now', '-13 hours')
  GROUP BY day
);
"
\```
Replace [PROTEIN_TARGET] with the protein target from current-status.md.
```

- [ ] **Step 2: Upgrade intensity calibration to include nutrition**

Replace the current step 6 (intensity calibration) with (renumbered as step 7):
```
7. **Intensity calibration (synthesize sleep + nutrition + body status):**

   Start by assessing overall readiness:
   - Count the negative factors: sleep < 6.5h, protein hit rate < 4/7 days, fatigue_level ≥ 4, HRV < 40ms
   - 0 negatives → full intensity, encourage progressive overload
   - 1 negative → normal training, note the factor
   - 2+ negatives → reduce load by 10–15%, maintain volume, explain why

   Specific rules:
   - Sleep < 6.5h → reduce load by 10–15%, maintain volume
   - Sleep ≥ 7.5h → full intensity, good day to push
   - HRV < 40ms (if logged) → suggest deload or accessory-only session
   - fatigue_level ≥ 4 → reduce volume, not intensity
   - Protein hit rate < 4/7 days → note "Protein has been below target most of the past week — recovery fuel is limited. Consider holding weights rather than pushing overload today."
   - If 2+ negatives: frame as "Today is a maintenance day — focus on form and consistency rather than PRs. Here's why: [list factors]."
   - If 0 negatives + sleep ≥ 7.5h: frame as "Great recovery signals — this is a good day to push. Here's why: [list factors]."
```

- [ ] **Step 3: Add estimated session duration to the output**

Replace the current step 9 (output) with (renumbered as step 10):
```
10. Output:
   - **Readiness summary** (1 sentence): synthesize sleep + nutrition + body status into an overall readiness assessment. Example: "Good recovery: 7.5h sleep, protein on target 6/7 days, no fatigue reported → full intensity today." Or: "Mixed signals: 5.8h sleep + protein below target 5/7 days → moderate session, hold weights."
   - Muscle group(s) to train and why (rotation logic, days since last trained)
   - Per-exercise recommendation:
     `• [Exercise] — [sets]×[reps] @ [weight]kg (last: [prev_kg]kg [↑/=/↓])`
   - Intensity note if recovery is suboptimal (explain the cause-effect connection so the user learns why)
   - **Estimated duration:** [X] minutes — based on [N] exercises × ~3 sets × [rest] rest between sets. Use 90s rest for compound lifts, 60s for accessories.
```

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/suggest-exercise/SKILL.md
git commit -m "feat: upgrade suggest-exercise with nutrition context and synthesis-driven recommendations"
```

---

### Task 5: Upgrade weekly-summary with cross-domain synthesis

Add a cross-domain "connections" paragraph to the verdict and 2–3 specific action items for next week.

**Files:**
- Modify: `.claude/skills/weekly-summary/SKILL.md`

- [ ] **Step 1: Upgrade the verdict section**

Replace the current step 7 (verdict):
```
7. Write the summary verdict (1–2 sentences):
   - Start with what's on track (met targets)
   - End with the most important thing to fix this week
```

With:
```
7. Write the summary verdict as a synthesis paragraph (3–5 sentences):
   - Start with what's on track (met targets)
   - Then connect patterns across domains — look for:
     - Sleep quality on days before/after workouts (did poor sleep precede weak sessions?)
     - Protein consistency vs training volume trends (is low protein correlating with volume plateaus?)
     - Workout frequency vs nutrition logging gaps (are training days also well-logged nutrition days?)
     - Body status patterns (recurring fatigue or pain that aligns with other trends)
   - End with 2–3 specific, actionable items for next week. These must reference actual data, not generic advice. Examples:
     - "Prioritize 7+ hours of sleep before leg days — both short nights this week preceded your weakest sessions."
     - "Aim for 100g protein on training days — you averaged 82g on workout days vs 95g on rest days."
     - "Add one more resistance session — you hit 2/3 target and the gap was after Thursday's poor sleep."
```

- [ ] **Step 2: Update the reply template**

Replace the verdict section in the reply template (step 8):
```
*Verdict*
[1–2 sentences: what's working + top priority for next week]
```

With:
```
*Verdict*
[3–5 sentence synthesis: what's working, cross-domain connections, then 2–3 specific action items for next week]
```

- [ ] **Step 3: Update the Notes section**

Replace:
```
- Keep the verdict actionable and specific to the data, not generic advice
```

With:
```
- The verdict must connect patterns across training, nutrition, and sleep — never assess each domain in isolation
- Every action item must reference specific numbers from this week's data
- Generic advice like "eat more protein" or "sleep better" is not acceptable — use "aim for 100g protein on Mon/Wed/Fri (your training days)" instead
```

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/weekly-summary/SKILL.md
git commit -m "feat: upgrade weekly-summary with cross-domain synthesis and specific action items"
```

---

### Task 6: Add minor cross-cutting context to log-sleep

Add a note about how last night's sleep relates to upcoming training based on recent workout patterns.

**Files:**
- Modify: `.claude/skills/log-sleep/SKILL.md`

- [ ] **Step 1: Add workout context query**

Insert a new step after the current step 5 (INSERT OR REPLACE). Add as step 6 (renumber current step 6 to step 7):
```
6. Check recent training context:
\```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
-- Days since last workout
SELECT CAST(julianday(date('now', '-13 hours')) - julianday(MAX(date)) AS INTEGER) as days_since
FROM workouts;
"
\```
```

- [ ] **Step 2: Enhance the confirmation reply**

Replace the current step 6 (confirm) with (renumbered as step 7):
```
7. Confirm with a brief response:
   - Sleep duration
   - Avg HR if logged
   - HRV if logged
   - Recovery observation:
     - < 6.5h → "Short night — expect some fatigue. Consider lower intensity training."
     - 6.5–7.4h → neutral
     - ≥ 7.5h → "Good recovery window for muscle repair."
   - If HRV is notably low (< 40ms) → flag: "Low HRV suggests incomplete recovery — consider a deload or rest day."
   - Training context (if relevant):
     - If days_since_last_workout ≤ 1: "You trained [yesterday/today] — this sleep duration [supports/may limit] recovery."
     - If days_since_last_workout ≥ 5: "No workout in [X] days — a session today would be well-rested."
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/log-sleep/SKILL.md
git commit -m "feat: add training context to log-sleep recovery feedback"
```

---

### Task 7: Final verification

Read all modified skill files to confirm consistency and correctness.

**Files:**
- Read: `.claude/skills/log-meal/SKILL.md`
- Read: `.claude/skills/log-exercise/SKILL.md`
- Read: `.claude/skills/suggest-exercise/SKILL.md`
- Read: `.claude/skills/weekly-summary/SKILL.md`
- Read: `.claude/skills/log-sleep/SKILL.md`

- [ ] **Step 1: Read all 5 skill files and verify:**
  - No remaining references to `goals.md`
  - All cross-cutting context queries use correct PDT timezone patterns from CLAUDE.md
  - Step numbers are sequential with no gaps or duplicates
  - All SQLite queries use the correct day boundary pattern: `date(timestamp, '-6 hours') = date('now', '-13 hours')`
  - No hardcoded macro targets — all reference `current-status.md`

- [ ] **Step 2: Verify with grep**

```bash
grep -r "goals.md" .claude/skills/
```
Expected: no results.

```bash
grep -rn "current-status.md" .claude/skills/
```
Expected: references in log-meal, suggest-exercise, and weekly-summary.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
# Only if step 1 or 2 found issues
git add .claude/skills/
git commit -m "fix: correct any issues found during final verification"
```
