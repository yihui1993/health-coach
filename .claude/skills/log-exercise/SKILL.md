---
name: log-exercise
description: Log a workout. Use when the user shares a workout screenshot, describes their gym session, reports finishing exercise, or mentions any physical activity.
allowed-tools: Bash, Read
---

Log a workout entry to the health database.

## Steps

1. **If a photo is provided** (workout app screenshot):
   - Read the photo and extract: all exercises, sets, reps, weights
   - Note the weight unit (kg or lbs) — convert lbs to kg if needed (divide by 2.205)
   - Identify muscle groups trained from the exercise list

   **If text only:**
   - Parse exercises from the description
   - If duration not mentioned, ask for it (or leave NULL)

2. Ask (only if not already mentioned): "Did your app track calories burned?"
   - If provided: use it. If not: leave NULL. Do not estimate.

3. Build the exercises JSON array (always store weights in kg):
```json
[
  {"name": "Squat", "sets": [{"reps": 8, "weight_kg": 60}, {"reps": 8, "weight_kg": 62.5}]},
  {"name": "Romanian Deadlift", "sets": [{"reps": 10, "weight_kg": 50}]}
]
```

4. Identify muscle groups as a JSON array — be specific:
```json
["quads", "glutes", "hamstrings", "core"]
```

5. Compute total_volume_lbs:
   - For each exercise, for each set: volume = reps × weight_kg × 2.205
   - Sum across all sets and all exercises
   - Round to 1 decimal

6. Log to the database (escape single quotes in JSON using $'...' or write JSON to a temp file):
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
INSERT INTO workouts (date, photo_path, duration_mins, exercises, muscle_groups, calories_burned, total_volume_lbs, notes)
VALUES (
  '$(date -u -v-7H +%Y-%m-%d)',
  NULL,
  [duration or NULL],
  '[exercises JSON with '' escaped]',
  '[muscle_groups JSON]',
  [cals or NULL],
  [total_volume_lbs],
  NULL
);
"
```

7. Gather cross-cutting context:
```bash
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
```
Replace [PROTEIN_TARGET] with the protein target from current-status.md.

8. Query the last 3 sessions that trained any of the same muscle groups (for trajectory):
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT id, date, exercises, muscle_groups, total_volume_lbs
FROM workouts
WHERE date < date('now', '-13 hours')
  AND muscle_groups LIKE '%[first_muscle_group]%'
ORDER BY date DESC LIMIT 3;
"
```
Replace [first_muscle_group] with the first item in today's muscle_groups array (e.g. 'quads').

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

10. Query last 7 workouts for rotation context:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT date, muscle_groups FROM workouts ORDER BY date DESC LIMIT 7;
"
```

11. Reply with:
    - Session summary: muscles trained, key exercises, duration if known, calories if tracked
    - Progressive overload trajectory (step 9) — skip section if no previous session exists
    - Total volume: [today] lbs vs [previous] lbs (or just today's if first session)
    - [If 7-day protein hit rate < 4/7: "Nutrition note: protein has been below target [X] of the last 7 days — recovery may be compromised. Prioritize protein today."]
    - [If body_status has pain or fatigue: "Recovery note: [pain/fatigue details from body_status] — factor this into tomorrow's session."]
    - What to train next based on 48h rotation rule

## Notes
- Always use today's PDT date for the `date` field
- Single quotes in JSON must be escaped: replace `'` with `''` in SQLite string literals
- Identify at least one muscle group — never log with empty muscle_groups
- total_volume_lbs should always be computed and stored — never NULL for new sessions
