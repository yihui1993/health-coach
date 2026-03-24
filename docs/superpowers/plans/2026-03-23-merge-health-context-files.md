# Merge Health Context Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `data/goals.md` into `data/current-status.md` to eliminate duplication and reduce CLAUDE.md's read burden to one file.

**Architecture:** Rewrite `current-status.md` in-place to absorb all content from `goals.md` (fixing two macro discrepancies along the way), delete `goals.md`, then update the four stale `goals.md` references in `CLAUDE.md`.

**Tech Stack:** Markdown files, git. No code changes.

**Spec:** `docs/superpowers/specs/2026-03-23-merge-health-context-files-design.md`

---

### Task 1: Rewrite `current-status.md`

**Files:**
- Modify: `data/current-status.md`

The new file keeps everything currently in `current-status.md` through "Key Health Flags", then adds the "Current vs. Goal" table and all three phase sections from `goals.md`, then the remaining `goals.md` sections (DEXA schedule, bone density, rate of change). Two stale macro values are corrected. The file ends with the existing Blood Markers section.

- [ ] **Step 1: Verify source content before editing**

Read both source files to confirm line counts and section headings match expectations before making any changes.

```bash
grep -n "^##" data/current-status.md
grep -n "^##" data/goals.md
```

Expected: current-status.md has sections including "Goals & Active Plan" and "Nutrition Targets — Phase 1". goals.md has Phase 1/2/3 sections plus DEXA Schedule, Bone Density, Expected Rate of Change.

- [ ] **Step 2: Write the new `current-status.md`**

Replace the file entirely with the merged content below. Preserve all measured data from the original; apply corrected macro values (1,500 kcal, 120g carbs for Phase 1); merge "Key DEXA Observations" from goals.md into "Key Health Flags"; add the "Current vs. Goal" table; mark Phase 1 as `[ACTIVE]`.

```markdown
# Current Body Status

Last updated: 2026-02-28 (BodySpec scan)

## Personal Info

- Name: Yihui Ma
- Sex: Female
- DOB: 1993-06-07 (Age: 32)
- Height: 65.0 in (165 cm)

## Latest Body Composition (2026-02-28 BodySpec DXA)

| Metric | Value | Trend |
|--------|-------|-------|
| Weight | 128.1 lbs (58.1 kg) | ↓ from 132.6 (Jan) |
| Body Fat % | 33.7% | ↑ rising (best was 30.3% Nov 2024) |
| Fat Tissue | 43.2 lbs | ↓ slightly from 44.2 (Jan) |
| Lean Tissue | 79.9 lbs | ↓ LOST 3.5 lbs lean in 6 weeks |
| Bone Mineral Content | 5.0 lbs | stable |
| RMR | 1,171 cal/day | low — be cautious with deficit |
| Visceral Fat (VAT) | 0.42 lbs | ↓ improving, healthy |
| A/G Ratio | 0.92 | healthy (< 1.0 ✓) |

## Scan History

| Date | Body Fat % | Weight (lbs) | Fat (lbs) | Lean (lbs) |
|------|-----------|-------------|-----------|------------|
| 2024-09-17 | 31.5% | 127.8 | 40.3 | 82.5 |
| 2024-11-22 | 30.3% | 125.3 | 37.9 | 82.4 |
| 2026-01-11 | 33.3% | 132.6 | 44.2 | 83.4 |
| 2026-02-28 | 33.7% | 128.1 | 43.2 | 79.9 |

## Regional Assessment (2026-02-28)

| Region | Fat % | Total (lbs) | Fat (lbs) | Lean (lbs) |
|--------|-------|-------------|-----------|------------|
| Arms | 36.5% | 13.8 | 5.0 | 8.2 |
| Legs | 35.9% | 41.7 | 15.0 | 25.2 |
| Trunk | 34.1% | 62.4 | 21.3 | 39.5 |
| Android | 36.2% | 9.5 | 3.4 | 6.0 |
| Gynoid | 39.3% | 21.9 | 8.5 | 13.0 |

## Muscle Balance

- Arms: Right 4.2 lbs lean / Left 4.0 lbs lean — balanced ✓
- Legs: Right 12.6 lbs lean / Left 12.6 lbs lean — balanced ✓

## Key Health Flags

- **PRIORITY**: Lost 3.5 lbs lean mass in 6 weeks (Jan→Feb 2026) — muscle loss is occurring
- **PRIORITY**: Reverse lean mass loss — lost 1.6 kg Jan–Feb 2026
- Body fat 33.7% = 60–80th percentile for women 30–39 (goal: <29%)
- Limb LMI at 3rd–9th percentile — building limb muscle is #1 priority
- Fat distribution is gynoid (hips/thighs) — healthier pattern, not abdominal
- Android fat % (35.7%) higher than gynoid (38.6%) — monitor abdominal fat
- VAT low and improving (0.2 kg / 201 cm³) — metabolic health is good
- RMR 1,171 cal/day — aggressive caloric deficit will accelerate muscle loss
- Lean mass has plateaued (36.3–37.8 kg range historically)
- Bone density 1.18 g/cm² at 32nd percentile — needs improvement

## Current vs. Goal

Source: Yihui_Body_Recomposition_Plan_2026.pdf (BodySpec DEXA data)

| Metric | Current | Goal | Change |
|--------|---------|------|--------|
| Total Weight | 58.1 kg | 56.0 kg | −2.1 kg |
| Body Fat % | 33.7% | 25.0% | −8.7% |
| Fat Mass | 19.6 kg | 14.0 kg | −5.6 kg |
| Lean Mass | 36.3 kg | 42.0 kg | +5.7 kg |
| Bone Mass | 2.2 kg | 2.2 kg | Maintain |

---

## [ACTIVE] Phase 1: Recomposition Foundation (Mar–Jun 2026, ~16 weeks)

**Target:** 57.0 kg / 31% BF
**Focus:** Moderate calorie deficit + heavy lifting. Lose fat, hold muscle.

### Nutrition
- Calories: ~1,500 kcal/day
- Protein: 95–105 g/day (1.6–1.8 g/kg)
- Carbs: 120 g/day (timed around workouts)
- Fat: 50–60 g/day
- Whole foods: lean protein, vegetables, legumes, whole grains
- Limit ultra-processed foods, alcohol, sugary drinks
- Estimated TDEE: ~1,900–2,100 kcal/day (RMR 1,171 × ~1.6 activity factor)
- If losing > 0.5 kg/week: increase by 100 kcal — fast scale drop = muscle loss risk

### Training
- Resistance: 3–4x/week full body or upper/lower split, compound lifts (squat, deadlift, row, press, hip hinge)
- Sets/reps: 3–4 sets × 6–12 reps, progressive overload
- Cardio: 2–3x/week moderate (30–45 min walk/bike/elliptical)
- Steps: 8,000–10,000/day
- Rest: 1–2 full rest days/week, 7–9 hours sleep

### Milestones
| Checkpoint | Week | Expected Weight | Expected BF% |
|------------|------|-----------------|--------------|
| Start | Week 0 (Mar 2026) | 58.1 kg | 33.7% |
| Mid-check | Week 8 (May 2026) | ~57.5 kg | ~32% |
| Phase 1 End | Week 16 (Jun 2026) | ~57.0 kg | ~31% |

**DEXA Scan 6 due: June 2026**

---

## Phase 2: Muscle Build / Lean Bulk (Jul–Oct 2026, ~16 weeks)

**Target:** 57.5 kg / 28% BF
**Focus:** Small calorie surplus + hypertrophy training. Build limb muscle.

### Nutrition
- Calories: ~2,000–2,100 kcal/day (~200 kcal surplus)
- Protein: 103–115 g/day (1.8–2.0 g/kg)
- Carbs: 200–230 g/day (prioritize around workouts)
- Fat: 60–70 g/day
- Creatine monohydrate: 3–5 g/day
- Whole food sources: oats, rice, sweet potato, eggs, salmon, nuts, Greek yogurt

### Training
- Resistance: 4x/week, hypertrophy focus (PPL or upper/lower)
- Sets/reps: 3–5 sets × 8–15 reps, controlled tempo
- Progressive overload is #1 priority — track every session
- Cardio: reduce to 1–2x/week light (walks, cycling)
- Sleep: aim 8 hours (growth hormone)
- Focus on arms and legs (low limb LMI)

### Milestones
| Checkpoint | Week | Expected Weight | Expected BF% |
|------------|------|-----------------|--------------|
| Phase 2 Start | Week 0 (Jul 2026) | ~57.0 kg | ~31% |
| Mid-check | Week 8 (Sep 2026) | ~57.3 kg | ~29% |
| Phase 2 End | Week 16 (Oct 2026) | ~57.5 kg | ~28% |

**DEXA Scan 7 due: October 2026**

---

## Phase 3: Final Cut + Consolidation (Nov 2026–Mar 2027, ~18 weeks)

**Target:** 56.0 kg / 25% BF
**Focus:** Disciplined cut + strength maintenance. Reach final goal.

### Nutrition
- Calories: ~1,600–1,750 kcal/day (deficit ~250–350 kcal)
- Protein: 100–125 g/day (1.8–2.2 g/kg) — higher during cut protects muscle
- Carbs: 130–160 g/day (maintain around workouts)
- Increase vegetable volume for satiety
- Maintain creatine throughout
- No crash dieting — max 0.5 kg/week loss

### Training
- Resistance: 3–4x/week — do NOT reduce volume during cut
- Cardio: reintroduce 2–3x/week moderate sessions
- HIIT: 1x/week, 20–25 min
- De-load: every 6 weeks, reduce volume ~40% for 1 week

### Milestones
| Checkpoint | Week | Expected Weight | Expected BF% |
|------------|------|-----------------|--------------|
| Phase 3 Start | Week 0 (Nov 2026) | ~57.5 kg | ~28% |
| Mid-check | Week 9 (Jan 2027) | ~56.8 kg | ~26.5% |
| GOAL | Week 18 (Mar 2027) | 56.0 kg | 25.0% |

**DEXA Scan 8 due: March 2027 (final goal assessment)**

---

## DEXA Scan Schedule

| Scan # | Timing | Purpose | Key Metric |
|--------|--------|---------|------------|
| Scan 6 | June 2026 | Phase 1 check-in | Fat mass reduction, lean mass held |
| Scan 7 | October 2026 | Phase 2 check-in | Lean mass gain, limb LMI improvement |
| Scan 8 | March 2027 | Final goal assessment | 56 kg / 25% BF confirmed |

BodySpec location: Santa Clara

---

## Bone Density (Watch & Improve)

- Current: 1.18 g/cm² at 32nd percentile
- Calcium: 1,000 mg/day (food or supplement)
- Vitamin D: 1,000–2,000 IU/day
- Weight-bearing exercise: squats, deadlifts, lunges
- Re-evaluate at each DEXA scan

## Expected Rate of Change

| Metric | Monthly Rate | 12-Month Total |
|--------|-------------|----------------|
| Fat loss | 0.3–0.5 kg/month | ~5–6 kg |
| Lean mass gain | 0.4–0.6 kg/month | ~5–7 kg |
| Scale weight | Minimal/slight drop | ~−2 kg net |

*Trust the DEXA data, not the scale.*

## Blood Markers

Not yet uploaded. Upload annual body check results to update this section.

---

*Update this file whenever a new BodySpec scan or blood test is uploaded and parsed.*
*Phase transitions: delete the completed phase section and mark the new phase as [ACTIVE].*
```

- [ ] **Step 3: Verify the merged file looks correct**

```bash
grep -n "^##" data/current-status.md
wc -l data/current-status.md
```

Expected: headings include Personal Info, Latest Body Composition, Scan History, Regional Assessment, Muscle Balance, Key Health Flags, Current vs. Goal, `[ACTIVE] Phase 1`, Phase 2, Phase 3, DEXA Scan Schedule, Bone Density, Expected Rate of Change, Blood Markers. Line count should be ~170+.

Also spot-check the corrected values and key merged content:

```bash
grep "1,500 kcal" data/current-status.md
grep "120 g/day" data/current-status.md
grep "\[ACTIVE\]" data/current-status.md
grep "Lean mass has plateaued\|Bone Density\|Rate of Change\|Current vs. Goal\|gynoid" data/current-status.md
```

Expected: first three greps each return exactly one match. The last grep returns at least four matches, confirming goals.md content was absorbed.

- [ ] **Step 4: Commit**

```bash
git add data/current-status.md
git commit -m "feat: merge goals.md into current-status.md, fix macro discrepancies"
```

---

### Task 2: Delete `goals.md`

**Files:**
- Delete: `data/goals.md`

Only do this after Task 1 is committed and verified.

- [ ] **Step 1: Confirm current-status.md commit is clean**

```bash
git log --oneline -3
```

Expected: the Task 1 commit appears at the top.

- [ ] **Step 2: Delete the file**

```bash
git rm data/goals.md
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: delete goals.md (content merged into current-status.md)"
```

---

### Task 3: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

Four references to `data/goals.md` must be updated. Change each to point to `data/current-status.md` or remove it entirely where the reference was to a now-deleted file.

- [ ] **Step 1: Locate all four references**

```bash
grep -n "goals.md" CLAUDE.md
```

Expected output (four lines):
```
16:| `data/goals.md` | Active goals and daily macro targets — always read before making recommendations |
32:Before any health recommendation, read `data/current-status.md` and `data/goals.md`. Every suggestion must be grounded in the user's actual data — never give generic advice.
78:5. Show today's running totals vs active goal targets from `data/goals.md`
115:7. Read active phase targets and training protocol from `data/goals.md`
```

- [ ] **Step 2: Apply all four changes**

**Change 1** — Key Files table: remove the `goals.md` row entirely.

Old:
```
| `data/current-status.md` | Latest body composition snapshot — always read before making recommendations |
| `data/goals.md` | Active goals and daily macro targets — always read before making recommendations |
```

New:
```
| `data/current-status.md` | Body composition, active phase targets, and full recomposition plan — always read before making recommendations |
```

**Change 2** — "Always Read Before Responding" section: remove `and data/goals.md`.

Old:
```
Before any health recommendation, read `data/current-status.md` and `data/goals.md`. Every suggestion must be grounded in the user's actual data — never give generic advice.
```

New:
```
Before any health recommendation, read `data/current-status.md`. Every suggestion must be grounded in the user's actual data — never give generic advice.
```

**Change 3** — Meals section, step 5: update file reference.

Old:
```
5. Show today's running totals vs active goal targets from `data/goals.md`
```

New:
```
5. Show today's running totals vs active goal targets from `data/current-status.md`
```

**Change 4** — Exercise Suggestions section, step 7: update file reference.

Old:
```
7. Read active phase targets and training protocol from `data/goals.md`
```

New:
```
7. Read active phase targets and training protocol from `data/current-status.md`
```

- [ ] **Step 3: Verify no remaining goals.md references**

```bash
grep "goals.md" CLAUDE.md
```

Expected: no output (zero matches).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "chore: update CLAUDE.md references from goals.md to current-status.md"
```
