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

3. For items NOT in the lookup, estimate nutrition using standard USDA values. Show a breakdown table:

| Item | Kcal | P (g) | C (g) | F (g) |
|------|------|-------|-------|-------|
| ...  | ...  | ...   | ...   | ...   |
| **Total** | **X** | **X** | **X** | **X** |

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

7. Read `data/goals.md` for daily calorie ceiling and protein target.

8. **Protein projection** (only if current PDT hour < 18, i.e., before 6pm):
   - hours_elapsed = current PDT hour - 6 (hours since 6am)
   - If hours_elapsed > 0: projected_protein = (protein_so_far / hours_elapsed) × 16
   - If projected_protein < protein_target: flag "On pace for ~[projected]g protein today — [gap]g short of target. Add a protein source at [next meal]."

9. **Calorie ceiling check:**
   - If today's kcal > daily ceiling from goals.md: flag "Today's calories ([kcal]) exceed the [ceiling] ceiling."

10. Reply:

```
Logged: [description] — [cal] kcal, [protein]g protein

Today ([kcal] / [ceiling] kcal · [protein]g / [target]g protein):
• Carbs: [carbs]g  Fat: [fat]g

7-day avg protein: [avg]g/day  (target: [target]g)
[protein projection flag if applicable]
[calorie ceiling flag if applicable]
```

## Notes
- Always use PDT (UTC-7) for timestamps
- If a photo is provided: identify all food items and estimate portions before logging
- Never estimate when a lookup entry exists — exact values only
- Keep the confirmation reply concise — no walls of text
