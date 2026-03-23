# Health Coach: Migration & Intelligence Improvements

**Date:** 2026-03-22
**Status:** Approved

## Context

The user's previous health tracking setup lived in `NanoClaw/groups/telegram_health`, a Telegram-connected agent. This project (`health-coach`) is the migration target. Telegram is no longer needed — all interaction happens in the terminal via Claude Code.

The current `health-coach` project has the right structure (database schema, dashboard, skills) but an empty database and skills that lack depth. The `telegram_health` project has real data and a proven workflow but no dashboard and no smarter analysis.

## Goals

1. Migrate all historical data from `telegram_health` into `health-coach` (copy-only, do not delete originals)
2. Add `total_volume_lbs` to the workouts schema for progressive overload tracking
3. Upgrade `/log-exercise`, `/suggest-exercise`, and `/log-meal` skills with richer context
4. Add a new `/weekly-summary` skill for on-demand trend analysis

## Section 1: Data Migration

**Source DB:** `/Users/yihuima/NanoClaw/groups/telegram_health/health/health.db`
**Target DB:** `/Users/yihuima/health-coach/data/health.db`

Migration is copy-only. Original files in `telegram_health` must not be modified or deleted.

### Implementation order

File migrations (step 1) must happen before any skill is tested, because CLAUDE.md requires `data/current-status.md` and `data/goals.md` to exist before making any recommendation.

1. Copy `data/current-status.md` and `data/goals.md` (see File Migrations below)
2. Apply the schema change to the target DB (see Section 2)
3. Migrate database tables
4. Merge `nutrition-lookup.json`

### Tables to migrate

All INSERTs must use explicit named column lists — never INSERT ... SELECT * — to avoid silent mismatches between source and target column order.

| Table | Source rows | Notes |
|-------|-------------|-------|
| `meals` | 62 | Copy all columns by name |
| `sleep_log` | 14 | Map `avg_bpm` explicitly; set `hrv_ms = NULL` (column not in source) |
| `workouts` | 5 | Copy all columns by name; `total_volume_lbs` = NULL for migrated rows |
| `body_metrics` | 5 | Copy all columns by name |
| `body_status` | ~1 | Copy all columns by name |

### Tables to skip

- `blood_markers` — not needed
- `snack_inventory` — not needed
- `goals` — not migrated from source (source has no goals table); goals data lives in `data/goals.md`

### File migrations

All paths are absolute.

| Source | Target | Rule |
|--------|--------|------|
| `/Users/yihuima/NanoClaw/groups/telegram_health/meal-shortcuts.json` | `/Users/yihuima/health-coach/data/nutrition-lookup.json` | Merge: add all source-only keys; for keys in both, keep target value |
| `/Users/yihuima/NanoClaw/groups/telegram_health/health/current-status.md` | `/Users/yihuima/health-coach/data/current-status.md` | Copy (overwrite if exists) |
| `/Users/yihuima/NanoClaw/groups/telegram_health/goals/body_recomposition_2026.md` | `/Users/yihuima/health-coach/data/goals.md` | Copy (overwrite if exists) |

## Section 2: Schema Change

Apply to the **target DB only** (`health-coach/data/health.db`). The source DB already has this column; do not modify the source.

```sql
ALTER TABLE workouts ADD COLUMN total_volume_lbs REAL;
```

Type is `REAL` (not INTEGER) to preserve fractional weights (e.g. 47.5 lbs). Total volume = sum of (sets × reps × weight_lbs) across all exercises in a session.

No other schema changes.

## Section 3: Skill Upgrades

### `/log-exercise`

**Current behavior:** Logs workout, replies with summary + next muscle group suggestion.

**Upgraded behavior:** After logging, query the last session that trained the same muscle groups and show a per-exercise comparison:
- Last date, sets/reps/weight for each overlapping exercise
- Arrow indicating direction (↑ up, = same, ↓ down)
- Flag if total volume dropped without a logged recovery reason (low sleep or body_status pain)
- Compute and store `total_volume_lbs` for the logged session (sum of sets × reps × weight_lbs across all exercises)

**Example response addition:**
```
Progressive overload vs last chest session (Mar 15):
• Bench press: 3×8 @ 45kg → 3×8 @ 47.5kg ↑
• Cable fly: 3×12 @ 20kg → 3×10 @ 22kg ↑
```

### `/suggest-exercise`

**Current behavior:** 48h muscle rotation, simple sleep/body_status check.

**Upgraded behavior:**
1. Query last 7 workouts with full exercise JSON
2. For each candidate muscle group (not trained in 48h), pull the last 3 sessions and assess overload trajectory — are weights trending up, flat, or declining?
3. Factor in last night's sleep duration and HRV (if logged) — reduce intensity recommendation if sleep < 6.5h or HRV is notably low
4. Factor in today's `body_status` — adjust or exclude muscle groups with logged pain
5. Output: recommended muscle group(s), top 3–4 compound lifts with specific weight targets based on last logged session, suggested sets/reps, intensity note if recovery is suboptimal

### `/log-meal`

**Current behavior:** Logs meal, shows today's running totals vs. targets.

**Upgraded behavior:**
- Show today's totals as before
- Add a 7-day protein trend: avg protein per day over the past 7 days vs. the target range from `data/goals.md`
- Protein projection: if it is before 6pm PDT and protein logged so far is below the daily target, compute the projected end-of-day total as: `(protein_so_far ÷ hours_elapsed_since_6am) × 16`, where 16 represents the practical eating window (6am–10pm). If projected total is below target, flag with a specific suggestion
- Flag if today's calories already exceed the daily ceiling from `data/goals.md`

## Section 4: New `/weekly-summary` Skill

On-demand skill. Read `data/goals.md` first to get the active phase targets. Then query the past 7 days across all tables:

| Section | Content |
|---------|---------|
| Training | Workouts logged vs. weekly frequency target in `data/goals.md`, muscle groups covered, any gap > 5 days |
| Nutrition | Avg daily kcal and protein, days on/off target, protein hit rate (N/7 days ≥ target) |
| Sleep | Avg duration, avg HR and HRV if available, worst night flagged |
| Body | Weight change if body_metrics logged in window (vs. previous scan) |
| Verdict | 1–2 sentences: what's working, what needs attention this week |

All thresholds sourced from `data/goals.md`, not hardcoded.

## What Is Not Changing

- Web dashboard (`dashboard/`) — no changes
- `/log-sleep`, `/sync-bodyspec`, `/add-food-lookup`, `/launch-dashboard`, `/setup` skills
- Telegram integration is fully removed (no longer needed)

## Implementation Order

1. Copy `data/current-status.md` and `data/goals.md` from source
2. Apply `ALTER TABLE workouts ADD COLUMN total_volume_lbs REAL` to `/Users/yihuima/health-coach/data/health.db`
3. Migrate database tables (meals, sleep_log, workouts, body_metrics, body_status) using explicit named column INSERTs
4. Merge `nutrition-lookup.json`
5. Upgrade `/log-exercise` skill
6. Upgrade `/suggest-exercise` skill
7. Upgrade `/log-meal` skill
8. Create `/weekly-summary` skill
