# Health Coach Migration & Intelligence Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all historical health data from `telegram_health` into the `health-coach` project and upgrade skills to provide richer, context-aware responses.

**Architecture:** Copy-only data migration via SQLite ATTACH + named-column INSERTs. Skills are markdown prompt files in `.claude/skills/`; upgrades replace the SKILL.md content entirely. No new code dependencies.

**Tech Stack:** SQLite (via `sqlite3` CLI), Bash, Python 3 (for JSON merge), Markdown skill files.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `data/current-status.md` | Create (copy) | Body composition snapshot, required by CLAUDE.md |
| `data/goals.md` | Create (copy) | Active phase targets, required by CLAUDE.md |
| `data/health.db` | Modify | Add `total_volume_lbs` column, receive migrated data |
| `data/nutrition-lookup.json` | Modify | Merge source meal shortcuts |
| `scripts/init-db.sh` | Modify | Add `total_volume_lbs REAL` to workouts CREATE TABLE |
| `.claude/skills/log-exercise/SKILL.md` | Modify | Add progressive overload comparison + volume tracking |
| `.claude/skills/suggest-exercise/SKILL.md` | Modify | Add per-muscle trajectory analysis + specific weight targets |
| `.claude/skills/log-meal/SKILL.md` | Modify | Add 7-day protein trend + end-of-day projection |
| `.claude/skills/weekly-summary/SKILL.md` | Create | New on-demand weekly analysis skill |

---

## Task 1: Copy reference files

**Files:**
- Create: `/Users/yihuima/health-coach/data/current-status.md`
- Create: `/Users/yihuima/health-coach/data/goals.md`

These must exist before any skill is tested (CLAUDE.md reads them before every recommendation).

- [ ] **Step 1: Copy current-status.md**

```bash
cp /Users/yihuima/NanoClaw/groups/telegram_health/health/current-status.md \
   /Users/yihuima/health-coach/data/current-status.md
```

- [ ] **Step 2: Verify both files exist and have content**

```bash
wc -l /Users/yihuima/health-coach/data/current-status.md \
       /Users/yihuima/health-coach/data/goals.md
```

Expected: both show line counts > 20.

- [ ] **Step 4: Commit**

```bash
cd /Users/yihuima/health-coach
git add data/current-status.md data/goals.md
git commit -m "feat: copy current-status and goals from telegram_health"
```

---

## Task 2: Schema change + update init-db.sh

**Files:**
- Modify: `/Users/yihuima/health-coach/data/health.db`
- Modify: `/Users/yihuima/health-coach/scripts/init-db.sh`

- [ ] **Step 1: Add total_volume_lbs column to live DB**

```bash
sqlite3 /Users/yihuima/health-coach/data/health.db \
  "ALTER TABLE workouts ADD COLUMN total_volume_lbs REAL;"
```

- [ ] **Step 2: Verify the column exists**

```bash
sqlite3 /Users/yihuima/health-coach/data/health.db ".schema workouts"
```

Expected output contains: `total_volume_lbs REAL`

- [ ] **Step 3: Update init-db.sh to include the column for fresh installs**

In `/Users/yihuima/health-coach/scripts/init-db.sh`, find the `workouts` CREATE TABLE block and add `total_volume_lbs REAL` after `calories_burned INTEGER`:

```sql
CREATE TABLE IF NOT EXISTS workouts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  date            TEXT NOT NULL,
  photo_path      TEXT,
  duration_mins   INTEGER,
  exercises       TEXT,
  muscle_groups   TEXT,
  calories_burned INTEGER,
  total_volume_lbs REAL,
  notes           TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);
```

- [ ] **Step 4: Commit**

```bash
git add scripts/init-db.sh
git commit -m "feat: add total_volume_lbs column to workouts schema"
```

---

## Task 3: Data migration

**Files:**
- Modify: `/Users/yihuima/health-coach/data/health.db`

Source: `/Users/yihuima/NanoClaw/groups/telegram_health/health/health.db`

All INSERTs use explicit named column lists. The source DB is attached read-only and never modified.

- [ ] **Step 1: Verify source DB is accessible and row counts match expectations**

```bash
sqlite3 /Users/yihuima/NanoClaw/groups/telegram_health/health/health.db \
  "SELECT 'meals:', COUNT(*) FROM meals
   UNION ALL SELECT 'sleep_log:', COUNT(*) FROM sleep_log
   UNION ALL SELECT 'workouts:', COUNT(*) FROM workouts
   UNION ALL SELECT 'body_metrics:', COUNT(*) FROM body_metrics
   UNION ALL SELECT 'body_status:', COUNT(*) FROM body_status;"
```

Expected: meals 62, sleep_log 14, workouts 5, body_metrics 5, body_status ~1.

- [ ] **Step 2: Run the migration**

```bash
sqlite3 /Users/yihuima/health-coach/data/health.db <<'SQL'
ATTACH '/Users/yihuima/NanoClaw/groups/telegram_health/health/health.db' AS src;

-- meals
INSERT INTO main.meals
  (timestamp, meal_type, photo_path, description,
   estimated_calories, estimated_protein_g, estimated_carbs_g, estimated_fat_g,
   notes, created_at)
SELECT
  timestamp, meal_type, photo_path, description,
  estimated_calories, estimated_protein_g, estimated_carbs_g, estimated_fat_g,
  notes, created_at
FROM src.meals;

-- sleep_log (map avg_bpm explicitly; hrv_ms = NULL since source lacks it)
INSERT INTO main.sleep_log
  (date, bedtime, wake_time, duration_hours, avg_bpm, hrv_ms,
   body_notes, energy_level, created_at)
SELECT
  date, bedtime, wake_time, duration_hours, avg_bpm, NULL,
  body_notes, energy_level, created_at
FROM src.sleep_log;

-- workouts (total_volume_lbs = NULL for migrated rows; computed going forward)
INSERT INTO main.workouts
  (date, photo_path, duration_mins, exercises, muscle_groups,
   calories_burned, total_volume_lbs, notes, created_at)
SELECT
  date, photo_path, duration_mins, exercises, muscle_groups,
  calories_burned, NULL, notes, created_at
FROM src.workouts;

-- body_metrics (file_path column in source is omitted — not in target schema)
INSERT INTO main.body_metrics
  (date, source, weight_kg, body_fat_pct, muscle_mass_kg, bone_mass_kg,
   visceral_fat_level, bmr_kcal, scan_json, notes, created_at)
SELECT
  date, source, weight_kg, body_fat_pct, muscle_mass_kg, bone_mass_kg,
  visceral_fat_level, bmr_kcal, scan_json, notes, created_at
FROM src.body_metrics;

-- body_status
INSERT INTO main.body_status
  (date, muscle_pain, headache, fatigue_level, mood, notes, created_at)
SELECT
  date, muscle_pain, headache, fatigue_level, mood, notes, created_at
FROM src.body_status;

DETACH src;
SQL
```

- [ ] **Step 3: Verify row counts in target**

```bash
sqlite3 /Users/yihuima/health-coach/data/health.db \
  "SELECT 'meals:', COUNT(*) FROM meals
   UNION ALL SELECT 'sleep_log:', COUNT(*) FROM sleep_log
   UNION ALL SELECT 'workouts:', COUNT(*) FROM workouts
   UNION ALL SELECT 'body_metrics:', COUNT(*) FROM body_metrics
   UNION ALL SELECT 'body_status:', COUNT(*) FROM body_status;"
```

Expected: matches source counts from Step 1.

- [ ] **Step 4: Spot-check a few rows**

```bash
sqlite3 /Users/yihuima/health-coach/data/health.db \
  "SELECT date, meal_type, estimated_calories, estimated_protein_g FROM meals LIMIT 3;
   SELECT date, duration_hours, avg_bpm FROM sleep_log LIMIT 3;
   SELECT date, weight_kg, body_fat_pct FROM body_metrics;"
```

Expected: real dates and non-null values in key columns.

- [ ] **Step 5: Verify source DB is unchanged**

```bash
sqlite3 /Users/yihuima/NanoClaw/groups/telegram_health/health/health.db \
  "SELECT COUNT(*) FROM meals;"
```

Expected: 62 (unchanged).

- [ ] **Step 6: Commit**

```bash
cd /Users/yihuima/health-coach
git add data/health.db
git commit -m "feat: migrate historical data from telegram_health"
```

---

## Task 4: Merge nutrition-lookup.json

**Files:**
- Modify: `/Users/yihuima/health-coach/data/nutrition-lookup.json`

Rule: add all keys from source that don't exist in target; keep target values where both exist.

- [ ] **Step 1: Check how many keys are in each file**

```bash
python3 -c "
import json
with open('/Users/yihuima/NanoClaw/groups/telegram_health/meal-shortcuts.json') as f:
    src = json.load(f)
with open('/Users/yihuima/health-coach/data/nutrition-lookup.json') as f:
    tgt = json.load(f)
print('source keys:', len(src))
print('target keys:', len(tgt))
print('source-only keys:', [k for k in src if k not in tgt])
"
```

- [ ] **Step 2: Run the merge**

```bash
python3 -c "
import json

with open('/Users/yihuima/NanoClaw/groups/telegram_health/meal-shortcuts.json') as f:
    source = json.load(f)
with open('/Users/yihuima/health-coach/data/nutrition-lookup.json') as f:
    target = json.load(f)

added = []
for key, value in source.items():
    if key not in target:
        target[key] = value
        added.append(key)

with open('/Users/yihuima/health-coach/data/nutrition-lookup.json', 'w') as f:
    json.dump(target, f, indent=2)

print(f'Added {len(added)} new entries: {added}')
"
```

- [ ] **Step 3: Verify the file is valid JSON and has more keys than before**

```bash
python3 -c "
import json
with open('/Users/yihuima/health-coach/data/nutrition-lookup.json') as f:
    data = json.load(f)
print('Total keys after merge:', len(data))
print('Keys:', list(data.keys()))
"
```

Expected: total keys ≥ original target count.

- [ ] **Step 4: Commit**

```bash
cd /Users/yihuima/health-coach
git add data/nutrition-lookup.json
git commit -m "feat: merge meal shortcuts from telegram_health into nutrition-lookup"
```

---

## Task 5: Upgrade /log-exercise skill

**Files:**
- Modify: `/Users/yihuima/health-coach/.claude/skills/log-exercise/SKILL.md`

New behavior: compute and store `total_volume_lbs`, show per-exercise progressive overload comparison vs last same-muscle session, flag unexpected volume drops.

- [ ] **Step 1: Write the upgraded skill**

Replace the entire content of `/Users/yihuima/health-coach/.claude/skills/log-exercise/SKILL.md` with:

```markdown
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
```

- [ ] **Step 2: Verify the file was written correctly**

```bash
head -5 /Users/yihuima/health-coach/.claude/skills/log-exercise/SKILL.md
wc -l /Users/yihuima/health-coach/.claude/skills/log-exercise/SKILL.md
```

Expected: starts with `---` frontmatter, has 80+ lines.

- [ ] **Step 3: Commit**

```bash
cd /Users/yihuima/health-coach
git add .claude/skills/log-exercise/SKILL.md
git commit -m "feat: upgrade log-exercise skill with progressive overload comparison"
```

---

## Task 6: Upgrade /suggest-exercise skill

**Files:**
- Modify: `/Users/yihuima/health-coach/.claude/skills/suggest-exercise/SKILL.md`

New behavior: query last 3 sessions per candidate muscle group to assess overload trajectory; give specific weight targets.

- [ ] **Step 1: Write the upgraded skill**

Replace the entire content of `/Users/yihuima/health-coach/.claude/skills/suggest-exercise/SKILL.md` with:

```markdown
---
name: suggest-exercise
description: Suggest a workout for today based on training history, recovery data, sleep quality, and active goals. Use when the user asks what to do at the gym, needs a workout plan, or asks for exercise recommendations.
allowed-tools: Bash, Read
---

Suggest today's workout based on the user's data.

## Steps

1. Query last 7 workouts with full exercise data:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT date, exercises, muscle_groups, total_volume_lbs, duration_mins
FROM workouts
WHERE date >= date('now', '-13 hours', '-7 days')
ORDER BY date DESC;
"
```

2. Query today's body status:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT muscle_pain, headache, fatigue_level, mood, notes
FROM body_status
WHERE date(date, '-6 hours') = date('now', '-13 hours');
"
```

3. Query last sleep entry:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT date, duration_hours, avg_bpm, hrv_ms, energy_level
FROM sleep_log
ORDER BY date DESC LIMIT 1;
"
```

4. Read `data/goals.md` for current phase, training protocol, target frequency, and compound lift priorities.

5. **Muscle group selection:**
   - Parse muscle_groups from the 7 recent workouts
   - Eliminate any group trained within the last 48 hours
   - Cross-check with today's body_status — exclude or modify for pain areas
   - If 5+ days without any resistance session, prioritize getting back in regardless of rotation

6. **Intensity calibration:**
   - Sleep < 6.5h → reduce load by 10–15%, maintain volume
   - Sleep 6.5–7.5h → normal training
   - Sleep ≥ 7.5h → full intensity
   - HRV < 40ms (if logged) → suggest deload or accessory-only session
   - fatigue_level ≥ 4 → reduce volume, not intensity

7. **For each candidate muscle group, query the last 3 sessions to assess overload trajectory:**
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT date, exercises, total_volume_lbs
FROM workouts
WHERE muscle_groups LIKE '%[muscle_group]%'
ORDER BY date DESC LIMIT 3;
"
```
   - Parse the exercises JSON from each session
   - For each key compound lift in that muscle group: is weight trending up, flat, or declining across the 3 sessions?
   - Trajectory up → suggest +2.5 to 5kg vs last session
   - Trajectory flat (2+ sessions same weight) → suggest +2.5kg, note "time to push"
   - Trajectory declining → hold weight, focus on form and volume

8. **Build the specific workout recommendation:**
   - Lead with 1–2 compound lifts (squat, deadlift, bench, row, OHP, hip hinge, pull-up)
   - Add 2–3 accessory exercises targeting the same group
   - For each compound lift: state the exact target weight and rep scheme based on last session + trajectory
   - Rep ranges: 6–8 for strength, 8–12 for hypertrophy, 12–15 for endurance (use goals.md phase to guide)

9. Output:
   - Muscle group(s) to train and why (rotation logic, days since last trained)
   - Per-exercise recommendation:
     `• [Exercise] — [sets]×[reps] @ [weight]kg (last: [prev_kg]kg [↑/=/↓])`
   - Intensity note if recovery is suboptimal (explain the adjustment)
   - Estimated duration based on exercise count and rest periods

## Notes
- Always explain the rotation reasoning
- If body pain overlaps with recommended muscle group, swap the exercise (e.g. shoulder pain → replace overhead press with landline press or lateral raises)
- Compound lifts always before accessories
- If no workout history exists, suggest a full-body beginner session
- Read goals.md to confirm compound lift priority for the current phase
```

- [ ] **Step 2: Verify the file was written correctly**

```bash
head -5 /Users/yihuima/health-coach/.claude/skills/suggest-exercise/SKILL.md
wc -l /Users/yihuima/health-coach/.claude/skills/suggest-exercise/SKILL.md
```

Expected: starts with `---` frontmatter, has 80+ lines.

- [ ] **Step 3: Commit**

```bash
cd /Users/yihuima/health-coach
git add .claude/skills/suggest-exercise/SKILL.md
git commit -m "feat: upgrade suggest-exercise with per-muscle trajectory analysis"
```

---

## Task 7: Upgrade /log-meal skill

**Files:**
- Modify: `/Users/yihuima/health-coach/.claude/skills/log-meal/SKILL.md`

New behavior: show 7-day protein trend, project end-of-day protein if before 6pm, flag calorie ceiling breach.

- [ ] **Step 1: Write the upgraded skill**

Replace the entire content of `/Users/yihuima/health-coach/.claude/skills/log-meal/SKILL.md` with:

```markdown
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
```

- [ ] **Step 2: Verify the file was written correctly**

```bash
head -5 /Users/yihuima/health-coach/.claude/skills/log-meal/SKILL.md
wc -l /Users/yihuima/health-coach/.claude/skills/log-meal/SKILL.md
```

Expected: starts with `---` frontmatter, has 80+ lines.

- [ ] **Step 3: Commit**

```bash
cd /Users/yihuima/health-coach
git add .claude/skills/log-meal/SKILL.md
git commit -m "feat: upgrade log-meal with protein trend and projection"
```

---

## Task 8: Create /weekly-summary skill

**Files:**
- Create: `/Users/yihuima/health-coach/.claude/skills/weekly-summary/SKILL.md`

- [ ] **Step 1: Create the skill directory and file**

```bash
mkdir -p /Users/yihuima/health-coach/.claude/skills/weekly-summary
```

Write `/Users/yihuima/health-coach/.claude/skills/weekly-summary/SKILL.md`:

```markdown
---
name: weekly-summary
description: Summarize the past 7 days of health data against active goals. Use when the user asks for a weekly review, wants to see trends, or asks "how was my week".
allowed-tools: Bash, Read
---

Generate a weekly summary of health data against active phase targets.

## Steps

1. Read `data/goals.md` to extract:
   - Active phase name and dates
   - Daily calorie target (ceiling)
   - Daily protein target
   - Weekly workout frequency target
   - Key compound lifts for current phase

2. Query workouts from the past 7 days:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT date, muscle_groups, duration_mins, total_volume_lbs
FROM workouts
WHERE date >= date('now', '-13 hours', '-7 days')
ORDER BY date ASC;
"
```

3. Query daily nutrition for the past 7 days:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT
  date(timestamp, '-6 hours') as day,
  ROUND(SUM(estimated_calories), 0) as kcal,
  ROUND(SUM(estimated_protein_g), 1) as protein,
  ROUND(SUM(estimated_carbs_g), 1) as carbs,
  ROUND(SUM(estimated_fat_g), 1) as fat,
  COUNT(*) as meals
FROM meals
WHERE date(timestamp, '-6 hours') >= date('now', '-13 hours', '-7 days')
GROUP BY day
ORDER BY day ASC;
"
```

4. Query sleep for the past 7 days:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT date, duration_hours, avg_bpm, hrv_ms, energy_level
FROM sleep_log
WHERE date >= date('now', '-13 hours', '-7 days')
ORDER BY date ASC;
"
```

5. Query the two most recent body_metrics entries (to detect weight change):
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT date, weight_kg, body_fat_pct, muscle_mass_kg
FROM body_metrics
ORDER BY date DESC LIMIT 2;
"
```

6. Compute the summary metrics:

   **Training:**
   - workout_count = number of rows from step 2
   - muscle_groups_covered = union of all muscle_groups across sessions
   - max_gap = largest gap in days between consecutive sessions (or from last session to today)
   - training_hit = workout_count ≥ weekly_frequency_target from goals.md

   **Nutrition (only count days with ≥ 1 meal logged):**
   - avg_kcal = average daily kcal across logged days
   - avg_protein = average daily protein across logged days
   - protein_hit_days = count of days where protein ≥ target
   - calorie_over_days = count of days where kcal > ceiling

   **Sleep:**
   - avg_sleep = average duration_hours
   - avg_hr = average avg_bpm (exclude NULLs)
   - avg_hrv = average hrv_ms (exclude NULLs, note if no data)
   - worst_night = date with lowest duration_hours

   **Body:**
   - If two body_metrics entries exist within the last 30 days: show weight delta and direction
   - If no recent entries: note "No body scan in past 30 days"

7. Write the summary verdict (1–2 sentences):
   - Start with what's on track (met targets)
   - End with the most important thing to fix this week

8. Reply in this format (no markdown, use bullet points):

```
*Week of [start_date] – [end_date]*

*Training* ([workout_count]/[target]x this week)
• Muscle groups: [list]
• [Gap warning if max_gap > 5 days]

*Nutrition* (avg [avg_kcal] kcal · [avg_protein]g protein/day)
• Protein target hit: [protein_hit_days]/7 days
• [Calorie warning if calorie_over_days > 0]

*Sleep* (avg [avg_sleep]h)
• Avg HR: [avg_hr] bpm  HRV: [avg_hrv] ms (or "no HRV data")
• Worst night: [worst_night] — [duration]h

*Body*
• [Weight delta or "No scan in past 30 days"]

*Verdict*
[1–2 sentences: what's working + top priority for next week]
```

## Notes
- Source all targets from goals.md — never hardcode numbers
- Only count days with logged meals in nutrition averages (don't penalize for days with no data)
- Keep the verdict actionable and specific to the data, not generic advice
```

- [ ] **Step 2: Verify the skill file exists and has content**

```bash
wc -l /Users/yihuima/health-coach/.claude/skills/weekly-summary/SKILL.md
head -5 /Users/yihuima/health-coach/.claude/skills/weekly-summary/SKILL.md
```

Expected: 90+ lines, starts with `---`.

- [ ] **Step 3: Commit**

```bash
cd /Users/yihuima/health-coach
git add .claude/skills/weekly-summary/
git commit -m "feat: add weekly-summary skill for on-demand trend analysis"
```

---

## Verification Checklist

After all tasks complete, verify the full setup:

- [ ] `data/current-status.md` exists and shows Feb 2026 BodySpec data
- [ ] `data/goals.md` exists and shows Phase 1 targets (1,700–1,800 kcal, 95–105g protein)
- [ ] `sqlite3 data/health.db "SELECT COUNT(*) FROM meals;"` returns 62
- [ ] `sqlite3 data/health.db ".schema workouts"` shows `total_volume_lbs REAL`
- [ ] `python3 -c "import json; d=json.load(open('data/nutrition-lookup.json')); print(len(d))"` returns > original count
- [ ] All 4 skills have updated SKILL.md files
- [ ] `/weekly-summary` skill directory exists at `.claude/skills/weekly-summary/SKILL.md`
