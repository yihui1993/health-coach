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

7. Query the last session that trained any of the same muscle groups (for comparison):
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT id, date, exercises, muscle_groups, total_volume_lbs
FROM workouts
WHERE date < date('now', '-13 hours')
  AND muscle_groups LIKE '%[first_muscle_group]%'
ORDER BY date DESC LIMIT 1;
"
```
Replace [first_muscle_group] with the first item in today's muscle_groups array (e.g. 'quads').

8. Build the progressive overload comparison:
   - Parse today's exercises JSON and the previous session's exercises JSON
   - For each exercise that appears in BOTH sessions:
     - Show: `• [Name]: [prev_sets]×[prev_reps] @ [prev_kg]kg → [today_sets]×[today_reps] @ [today_kg]kg [↑/=/↓]`
     - Direction: ↑ if today's avg weight > previous, ↓ if lower, = if same
   - If today's total_volume_lbs < previous session's total_volume_lbs:
     - Query last sleep and today's body_status to check for recovery reason:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT duration_hours FROM sleep_log ORDER BY date DESC LIMIT 1;
SELECT muscle_pain, fatigue_level FROM body_status WHERE date(date, '-6 hours') = date('now', '-13 hours');
"
```
     - If sleep < 6.5h OR muscle_pain logged: note "Volume dip consistent with recovery"
     - Otherwise: flag "Volume dropped vs last session — intentional deload or form issue?"

9. Query last 7 workouts for rotation context:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT date, muscle_groups FROM workouts ORDER BY date DESC LIMIT 7;
"
```

10. Reply with:
    - Session summary: muscles trained, key exercises, duration if known, calories if tracked
    - Progressive overload table (step 8) — skip section if no previous session exists
    - Total volume: [today] lbs vs [previous] lbs (or just today's if first session)
    - What to train next based on 48h rotation rule

## Notes
- Always use today's PDT date for the `date` field
- Single quotes in JSON must be escaped: replace `'` with `''` in SQLite string literals
- Identify at least one muscle group — never log with empty muscle_groups
- total_volume_lbs should always be computed and stored — never NULL for new sessions
