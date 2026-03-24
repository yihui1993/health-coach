# Design: Merge current-status.md and goals.md into single health context file

Date: 2026-03-23

## Problem

`current-status.md` and `goals.md` overlap in two places:
- Goal targets (Phase 1 milestone, final target) appear in both files
- Phase 1 nutrition macros appear in both files, with a discrepancy (1,700–1,800 kcal in current-status.md vs 1,500 kcal in goals.md)

CLAUDE.md instructs Claude to read both files before every recommendation, adding unnecessary overhead for what is effectively one context.

## Decision

Merge both files into `current-status.md`. Delete `goals.md`. Update CLAUDE.md to reference only `current-status.md`.

## New Structure of `current-status.md`

```
# Current Body Status

Personal Info
Latest Body Composition (DEXA, with trend)
Scan History table
Regional Assessment table
Muscle Balance
Key Health Flags

## [ACTIVE] Phase 1: Recomposition Foundation (Mar–Jun 2026)
  Nutrition: 1,500 kcal, 95–105g protein, 120g carbs, 50–60g fat
  Training: resistance 3–4x/week, cardio 2–3x/week, steps, rest
  Milestones table

## Phase 2: Muscle Build / Lean Bulk (Jul–Oct 2026)
  Nutrition, Training, Milestones

## Phase 3: Final Cut + Consolidation (Nov 2026–Mar 2027)
  Nutrition, Training, Milestones

DEXA Scan Schedule
Bone Density (Watch & Improve)
Expected Rate of Change
Blood Markers
```

The active phase is marked `[ACTIVE]` in its heading. When transitioning to a new phase, remove the `[ACTIVE]` marker from the completed phase (or delete it) and add it to the new phase heading.

## Changes Required

### `current-status.md`
- Remove "Goals & Active Plan" section (brief duplicate of targets)
- Remove "Nutrition Targets — Phase 1" section (duplicate of Phase 1 nutrition)
- Append full Phase 1, Phase 2, Phase 3 content from goals.md, with `[ACTIVE]` on Phase 1 heading
- Fix Phase 1 calorie target to 1,500 kcal (goals.md is authoritative; current-status.md had 1,700–1,800 which was stale)
- Append DEXA Scan Schedule, Bone Density, Expected Rate of Change sections from goals.md

### `goals.md`
- Delete the file entirely

### `CLAUDE.md`
- Key Files table: remove `goals.md` row
- "Always Read Before Responding" section: remove `goals.md` reference, keep only `current-status.md`

## Phase Lifecycle

| Transition | Action |
|------------|--------|
| New phase begins | Remove `[ACTIVE]` from old phase heading (or delete the section), add `[ACTIVE]` to new phase heading |
| New DEXA scan | Update "Latest Body Composition" and "Scan History" sections; update current-status notes |

## Out of Scope

- No changes to the dashboard, database, or any skills
- No changes to nutrition-lookup.json
