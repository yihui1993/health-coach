---
name: setup
description: First-time health-coach setup. Creates the database, installs deps, configures Telegram and BodySpec, records initial body data and goals, and shows available skills.
allowed-tools: Bash, Read, Write
---

# Health Coach First-Run Setup

Work autonomously through each step. Only pause at genuine human actions (bot token input, etc.). Use AskUserQuestion for all interactive questions.

## Step 1 — Initialize database

Check if the database already exists:
```bash
test -f /Users/yihuima/health-coach/data/health.db && echo "EXISTS" || echo "MISSING"
```

If MISSING, initialize it:
```bash
bash /Users/yihuima/health-coach/scripts/init-db.sh
```

## Step 2 — Install dependencies

```bash
cd /Users/yihuima/health-coach && npm install
```

## Step 3 — Set up Telegram (optional)

Ask the user: "Do you want to set up Telegram so you can log health data by sending messages to your bot? (yes/no)"

If yes → invoke `/add-telegram` and wait for it to complete.
If no → continue to Step 4.

## Step 4 — Set up BodySpec MCP (optional)

Ask: "Do you have a BodySpec account for DEXA body composition scans? (yes/no)"

If yes → invoke `/add-bodyspec` and wait for it to complete.
If no → continue to Step 5.

## Step 5 — Import body composition data

If BodySpec MCP was just configured or was already available, invoke `/sync-bodyspec` to pull all existing scans.

If BodySpec is not available, ask for current measurements:
- Current weight (kg or lbs — either is fine)
- Body fat % if known from any scan or measurement
- Lean/muscle mass (kg) if known

Convert lbs to kg if needed (divide by 2.205). Log any provided data:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
INSERT INTO body_metrics (date, source, weight_kg, body_fat_pct, muscle_mass_kg, notes)
VALUES ('$(date -u -v-7H +%Y-%m-%d)', 'manual', [weight_kg], [fat_pct or NULL], [muscle_kg or NULL], 'Initial setup entry');
"
```

## Step 6 — Set goals

Ask the user:
1. What is your target weight? (kg or lbs)
2. What is your target body fat %?
3. By when do you want to reach your goal? (month + year is fine)
4. What phase are you in? (cut / bulk / maintenance / recomp)
5. Do you know your daily calorie target? (or should I estimate it?)
6. Daily protein target in grams? (or should I estimate?)

**Estimating targets if user doesn't know:**
- Cut: ~1g protein/lb bodyweight, 400–500 kcal deficit below TDEE (~1,500–1,700 kcal for most women)
- Bulk: slight surplus (+200–300 kcal), protein 0.8–1g/lb
- Recomp: maintenance calories, protein 1–1.2g/lb
- Fat: remaining calories after protein and carbs (~25–30% of total kcal)
- Carbs: fill remaining kcal (1g = 4 kcal, protein 1g = 4 kcal, fat 1g = 9 kcal)

Log the goal:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
INSERT INTO goals (target_weight_kg, target_body_fat_pct, target_date, phase, daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g, notes)
VALUES ([weight_kg], [fat_pct], '[YYYY-MM-DD]', '[phase]', [cals], [protein], [carbs], [fat], '[notes]');
"
```

## Step 7 — Write data/current-status.md

Create a body composition snapshot from the data collected or synced:
```
# Current Body Status

Last updated: [today's date]

## Latest Body Composition ([date], [source])
| Metric | Value |
|--------|-------|
| Weight | [x] kg |
| Body Fat % | [x]% |
| Lean Mass | [x] kg |
| BMR | [x] kcal (if known) |

## Key Flags
[Any concerns based on data — e.g. lean mass trend, protein target risk]
```

## Step 8 — Write data/goals.md

Create a plain-language summary of the active goal:
```
# Active Goals

Last updated: [today's date]

## Current Phase: [phase]
Focus: [cut / bulk / maintenance / recomp]

## Daily Nutrition Targets
- Calories: [x] kcal/day
- Protein: [x] g/day (minimum — flag if below this)
- Carbs: [x] g/day
- Fat: [x] g/day

## Milestone Target
- Weight: [x] kg by [date]
- Body Fat: [x]% by [date]

## Rules
- Minimum protein: [x] g/day
- Calorie range: [low]–[high] kcal/day
- Max loss rate: 0.5 kg/week
- Resistance training: 3–4x/week
```

## Step 9 — Show skill summary

Print:

```
Health Coach is ready!

Available skills:
• /log-meal — log food and track calories vs your daily goal
• /add-food-lookup — save a named shortcut to nutrition-lookup.json
• /log-sleep — log sleep duration, heart rate, and HRV
• /log-exercise — log a workout from screenshot or text
• /suggest-exercise — get a personalized workout recommendation
• /launch-dashboard — open the web dashboard at localhost:3001
• /sync-bodyspec — refresh BodySpec DEXA scan data
• /add-telegram — set up Telegram bot messaging
• /add-bodyspec — connect BodySpec DEXA scan data

Example Telegram messages:
  "had standard breakfast"
  "slept 11pm to 7am, avg HR 58, HRV 45ms"
  "finished gym — [attach workout screenshot]"
  "what should I do at the gym today?"
  "feeling sore in my shoulders"
```

## Step 10 — Verify

Run a final check:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "SELECT COUNT(*) as body_entries FROM body_metrics; SELECT COUNT(*) as goals FROM goals;"
```

Report the counts. Setup is complete.
