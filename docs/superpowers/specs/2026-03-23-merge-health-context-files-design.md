# Design: Merge current-status.md and goals.md into single health context file

Date: 2026-03-23

## Problem

`current-status.md` and `goals.md` overlap in two places:
- Goal targets (Phase 1 milestone, final target) appear in both files
- Phase 1 nutrition macros appear in both files, with two discrepancies:
  - Calories: 1,700–1,800 kcal in current-status.md vs 1,500 kcal in goals.md
  - Carbs: 150–180 g/day in current-status.md vs 120 g/day in goals.md
  - `goals.md` is authoritative for both; current-status.md values are stale

CLAUDE.md instructs Claude to read both files before every recommendation, adding overhead for what is effectively one context.

## Decision

Merge both files into `current-status.md`. Delete `goals.md`. Update CLAUDE.md to reference only `current-status.md`.

## New Structure of `current-status.md`

```
# Current Body Status
Last updated: <date of last scan or manual update>

## Personal Info

## Latest Body Composition (DEXA)
  (measurements table with trend column)

## Scan History

## Regional Assessment

## Muscle Balance

## Key Health Flags
  (includes the "Key DEXA Observations" content from goals.md merged in here,
   and the "Top priority: reverse lean mass loss" clinical note)

## Current vs. Goal
  (the 6-metric summary table from goals.md: current / goal / delta)

## [ACTIVE] Phase 1: Recomposition Foundation (Mar–Jun 2026)
  Nutrition: 1,500 kcal, 95–105g protein, 120g carbs, 50–60g fat
  Training: resistance 3–4x/week, cardio 2–3x/week, steps, rest
  Milestones table

## Phase 2: Muscle Build / Lean Bulk (Jul–Oct 2026)
  Nutrition, Training, Milestones

## Phase 3: Final Cut + Consolidation (Nov 2026–Mar 2027)
  Nutrition, Training, Milestones

## DEXA Scan Schedule

## Bone Density (Watch & Improve)

## Expected Rate of Change

## Blood Markers
```

## Phase Lifecycle

The active phase is marked `[ACTIVE]` in its heading.

**Transitioning phases:** When a new phase begins, delete the completed phase section entirely (its milestone data is preserved in Scan History and git history). Add `[ACTIVE]` to the new phase heading.

**Rationale for deletion over retention:** Keeping completed phases in the file would grow the context over time and risk Claude applying stale nutrition/training targets. Git history serves as the rollback and audit trail.

**Phase transition trigger:** Phase transitions are manual and owner-initiated — typically prompted by a DEXA scan result confirming the phase milestone was reached. Claude does not automatically transition phases.

## Changes Required

### `current-status.md`
- Remove "Goals & Active Plan" section (lines 57–62) — content absorbed into phase blocks and "Current vs. Goal" table
- Remove "Nutrition Targets — Phase 1" section (lines 63–70) — absorbed into Phase 1 section with corrected values
- Fix Phase 1 calorie target to 1,500 kcal
- Fix Phase 1 carbs target to 120 g/day
- Merge "Key DEXA Observations" from goals.md into "Key Health Flags" section (deduplicate where overlapping)
- Add "Current vs. Goal" summary table (from goals.md lines 6–14) after "Key Health Flags"
- Append Phase 1, Phase 2, Phase 3 sections from goals.md, with `[ACTIVE]` on Phase 1 heading
- Append DEXA Scan Schedule, Bone Density, Expected Rate of Change sections from goals.md
- Keep Blood Markers section at the end (already present)
- Update `Last updated` header to reflect the date of last meaningful data change (keep 2026-02-28, the last scan date)

### `goals.md`
- Delete the file — but only after verifying the merged `current-status.md` is complete and correct. Git history is the rollback.

### `CLAUDE.md`
- Key Files table: remove `goals.md` row
- "Always Read Before Responding" section: remove `goals.md` reference, keep only `current-status.md`
- Exercise Suggestions section, step 7: update `data/goals.md` reference to `data/current-status.md`
- Meals section, step 5: update `data/goals.md` reference to `data/current-status.md`

## Out of Scope

- No changes to the dashboard, database, or any skills
- No changes to nutrition-lookup.json
