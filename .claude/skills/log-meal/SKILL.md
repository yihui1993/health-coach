---
name: log-meal
description: Log a meal to the health database. Use when the user wants to record food, log breakfast/lunch/dinner/snack, track calories, or mentions eating anything.
allowed-tools: Bash, Read
---

Log a meal entry to the health database.

## Steps

1. If the user hasn't described their meal, ask what they ate.

2. Check nutrition-lookup.json for any named shortcuts:
```bash
cat /Users/yihuima/health-coach/data/nutrition-lookup.json
```
Use exact macro values from the lookup — never estimate when a shortcut exists. For portions (e.g. "1/2 beef bulgogi"), scale proportionally.

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

4. Infer meal_type from current time if not stated:
   - breakfast: 6:00–10:59am
   - lunch: 11:00am–2:59pm
   - dinner: 5:00–9:59pm
   - snack: all other times

5. Log immediately using current PDT timestamp:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
INSERT INTO meals (timestamp, meal_type, description, estimated_calories, estimated_protein_g, estimated_carbs_g, estimated_fat_g)
VALUES ('$(date -u -v-7H "+%Y-%m-%d %H:%M:%S")', '[meal_type]', '[description]', [cal], [protein], [carbs], [fat]);
"
```

6. Query today's totals and 7-day protein trend in one pass:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
-- Today's totals
SELECT
  'today' as period,
  COALESCE(SUM(estimated_calories), 0) as kcal,
  COALESCE(SUM(estimated_protein_g), 0) as protein,
  COALESCE(SUM(estimated_carbs_g), 0) as carbs,
  COALESCE(SUM(estimated_fat_g), 0) as fat
FROM meals
WHERE date(timestamp, '-6 hours') = date('now', '-13 hours')

UNION ALL

-- 7-day avg protein (excluding today)
SELECT
  '7d_avg' as period,
  ROUND(AVG(day_kcal), 0),
  ROUND(AVG(day_protein), 1),
  NULL, NULL
FROM (
  SELECT
    date(timestamp, '-6 hours') as day,
    SUM(estimated_calories) as day_kcal,
    SUM(estimated_protein_g) as day_protein
  FROM meals
  WHERE date(timestamp, '-6 hours') >= date('now', '-13 hours', '-7 days')
    AND date(timestamp, '-6 hours') < date('now', '-13 hours')
  GROUP BY day
);
"
```

7. Gather cross-cutting context:
```bash
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
```
Replace [PROTEIN_TARGET] with the protein target from current-status.md (e.g. 95).

8. Read `data/current-status.md` for daily calorie ceiling and protein target.

9. **Protein projection** (only if current PDT hour < 18, i.e., before 6pm):
   - Query the user's typical protein distribution by meal_type:
   ```bash
   sqlite3 /Users/yihuima/health-coach/data/health.db "
   SELECT meal_type, ROUND(AVG(estimated_protein_g), 1) as avg_protein, COUNT(*) as n
   FROM meals
   WHERE date(timestamp, '-6 hours') >= date('now', '-13 hours', '-14 days')
   GROUP BY meal_type
   ORDER BY CASE meal_type WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'dinner' THEN 3 WHEN 'snack' THEN 4 END;
   "
   ```
   - Identify which meal_types have NOT yet been logged today
   - Project remaining protein = sum of avg_protein for unlogged meal_types
   - projected_total = protein_so_far + projected_remaining
   - If projected_total < protein_target: flag "Based on your usual meals, you're on pace for ~[projected]g protein today — [gap]g short of target. Consider a high-protein option for [next_meal_type]."

10. **Calorie ceiling check:**
    - If today's kcal > daily ceiling from current-status.md: flag "Today's calories ([kcal]) exceed the [ceiling] ceiling."

11. Reply:

```
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
```

## Notes
- Always use PDT (UTC-7) for timestamps
- If a photo is provided: identify all food items and estimate portions before logging
- Never estimate when a lookup entry exists — exact values only
- Keep the confirmation reply concise — no walls of text
- After logging, check if a similar meal (same key ingredients) has been logged 2+ times in the last 30 days:
  ```bash
  sqlite3 /Users/yihuima/health-coach/data/health.db "
  SELECT description, estimated_calories, estimated_protein_g, estimated_carbs_g, estimated_fat_g
  FROM meals
  WHERE description LIKE '%[key_ingredient]%'
    AND date(timestamp, '-6 hours') >= date('now', '-13 hours', '-30 days')
  ORDER BY timestamp DESC LIMIT 5;
  "
  ```
  If 2+ matches with similar macros (within 15%): suggest "This looks like a regular meal — want me to save it as a shortcut in nutrition-lookup.json?"
- Support portion multipliers for lookup entries: "2x standard breakfast" = double all macro values. "1/2 beef bulgogi" = halve all values. Apply the multiplier before logging.
