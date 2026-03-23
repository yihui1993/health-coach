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

**Source:** `/Users/yihuima/NanoClaw/groups/telegram_health/health/health.db`
**Target:** `/Users/yihuima/health-coach/data/health.db`

Migration is copy-only. Original files in `telegram_health` must not be modified or deleted.

### Tables to migrate

| Table | Source rows | Notes |
|-------|-------------|-------|
| `meals` | 62 | Direct copy |
| `sleep_log` | 14 | `hrv_ms` will be NULL (column doesn't exist in source) |
| `workouts` | 5 | Add `total_volume_lbs` to target schema first |
| `body_metrics` | 5 | Direct copy |
| `body_status` | existing rows | Direct copy |

### Tables to skip

- `blood_markers` — not needed
- `snack_inventory` — not needed

### File migrations

| Source | Target |
|--------|--------|
| `telegram_health/meal-shortcuts.json` | Merge into `health-coach/data/nutrition-lookup.json` — deduplicate by key, keep target values where both exist |
| `telegram_health/health/current-status.md` | Copy to `health-coach/data/current-status.md` |
| `telegram_health/goals/body_recomposition_2026.md` | Copy to `health-coach/data/goals.md` |

## Section 2: Schema Change

Add one column to `workouts`:

```sql
ALTER TABLE workouts ADD COLUMN total_volume_lbs INTEGER;
```

This allows Claude to compute and store total session volume (sum of sets × reps × weight in lbs) for progressive overload comparison across sessions.

No other schema changes.

## Section 3: Skill Upgrades

### `/log-exercise`

**Current behavior:** Logs workout, replies with summary + next muscle group suggestion.

**Upgraded behavior:** After logging, query the last session that trained the same muscle groups and show a per-exercise comparison:
- Last date, sets/reps/weight for each overlapping exercise
- Arrow indicating direction (↑ up, = same, ↓ down)
- Flag if total volume dropped without a logged recovery reason (low sleep or body_status pain)
- Compute and store `total_volume_lbs` for the logged session

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
- Add a 7-day protein trend: avg protein per day over the past week vs. the 95–105g target
- If it's before 6pm and projected end-of-day protein (based on current pace) is below target, flag it with a suggestion (e.g. "on track for ~75g today — add a protein source at dinner")
- Flag if today's calories are already > 1,600 kcal (Phase 1 ceiling)

## Section 4: New `/weekly-summary` Skill

On-demand skill. Queries the past 7 days across all tables and reports:

| Section | Content |
|---------|---------|
| Training | Workouts logged (N/4 goal), muscle groups covered, any gap > 5 days |
| Nutrition | Avg daily kcal and protein, days on/off target, protein hit rate |
| Sleep | Avg duration, avg HR and HRV if available, worst night |
| Body | Weight change if body_metrics logged in window (vs previous scan) |
| Verdict | 1–2 sentences: what's working, what needs attention |

All numbers compared against Phase 1 targets from `data/goals.md`.

## What Is Not Changing

- Web dashboard (`dashboard/`) — no changes
- `data/health.db` schema beyond the one `total_volume_lbs` addition
- `/log-sleep`, `/sync-bodyspec`, `/add-food-lookup`, `/launch-dashboard`, `/setup` skills
- Telegram integration is fully removed (no longer needed)

## Implementation Order

1. Add `total_volume_lbs` column to workouts schema
2. Migrate database data (meals, sleep_log, workouts, body_metrics, body_status)
3. Merge nutrition-lookup.json
4. Copy current-status.md and goals.md
5. Upgrade `/log-exercise` skill
6. Upgrade `/suggest-exercise` skill
7. Upgrade `/log-meal` skill
8. Create `/weekly-summary` skill
