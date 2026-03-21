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

2. Ask (only if not already mentioned): "Did your app track calories burned? You can also input it manually if you know it."
   - If provided: use it. If not: leave NULL. Do not estimate.

3. Build the exercises JSON array:
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

5. Log to the database (escape single quotes in JSON using $'...' or a temp file):
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
INSERT INTO workouts (date, photo_path, duration_mins, exercises, muscle_groups, calories_burned, notes)
VALUES (
  '$(date -u -v-7H +%Y-%m-%d)',
  NULL,
  [duration or NULL],
  '[exercises JSON escaped]',
  '[muscle_groups JSON escaped]',
  [cals or NULL],
  NULL
);
"
```

6. Query last 7 workouts for rotation context:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT date, muscle_groups FROM workouts ORDER BY date DESC LIMIT 7;
"
```

7. Reply with:
   - Session summary: muscles trained, key exercises, duration if known, calories if tracked
   - Progressive overload note if the same exercise appears in recent history (compare weights)
   - What to train next based on 48h rotation rule

## Notes
- Always use today's PDT date for the `date` field
- Single quotes in JSON must be escaped: replace `'` with `''` in SQLite string literals
- For complex JSON with apostrophes, write to a temp file and use `.import` or pass via stdin
- Identify at least one muscle group — never log with empty muscle_groups
