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

4. Query trailing nutrition context:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
-- 7-day protein stats
SELECT
  ROUND(AVG(day_protein), 1) as avg_protein,
  SUM(CASE WHEN day_protein >= [PROTEIN_TARGET] THEN 1 ELSE 0 END) as protein_hit_days,
  COUNT(*) as logged_days,
  ROUND(AVG(day_kcal), 0) as avg_kcal
FROM (
  SELECT date(timestamp, '-6 hours') as day,
    SUM(estimated_protein_g) as day_protein,
    SUM(estimated_calories) as day_kcal
  FROM meals
  WHERE date(timestamp, '-6 hours') >= date('now', '-13 hours', '-7 days')
    AND date(timestamp, '-6 hours') < date('now', '-13 hours')
  GROUP BY day
);
"
```
Replace [PROTEIN_TARGET] with the protein target from current-status.md.

5. Read `data/current-status.md` for current phase, training protocol, target frequency, and compound lift priorities.

6. **Muscle group selection:**
   - Parse muscle_groups from the 7 recent workouts
   - Eliminate any group trained within the last 48 hours
   - Cross-check with today's body_status — exclude or modify for pain areas
   - If 5+ days without any resistance session, prioritize getting back in regardless of rotation

7. **Intensity calibration (synthesize sleep + nutrition + body status):**

   Start by assessing overall readiness:
   - Count the negative factors: sleep < 6.5h, protein hit rate < 4/7 days, fatigue_level ≥ 4, HRV < 40ms
   - 0 negatives → full intensity, encourage progressive overload
   - 1 negative → normal training, note the factor
   - 2+ negatives → reduce load by 10–15%, maintain volume, explain why

   Specific rules:
   - Sleep < 6.5h → reduce load by 10–15%, maintain volume
   - Sleep ≥ 7.5h → full intensity, good day to push
   - HRV < 40ms (if logged) → suggest deload or accessory-only session
   - fatigue_level ≥ 4 → reduce volume, not intensity
   - Protein hit rate < 4/7 days → note "Protein has been below target most of the past week — recovery fuel is limited. Consider holding weights rather than pushing overload today."
   - If 2+ negatives: frame as "Today is a maintenance day — focus on form and consistency rather than PRs. Here's why: [list factors]."
   - If 0 negatives + sleep ≥ 7.5h: frame as "Great recovery signals — this is a good day to push. Here's why: [list factors]."

8. **For each candidate muscle group, query the last 3 sessions to assess overload trajectory:**
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

9. **Build the specific workout recommendation:**
   - Lead with 1–2 compound lifts (squat, deadlift, bench, row, OHP, hip hinge, pull-up)
   - Add 2–3 accessory exercises targeting the same group
   - For each compound lift: state the exact target weight and rep scheme based on last session + trajectory
   - Rep ranges: 6–8 for strength, 8–12 for hypertrophy, 12–15 for endurance (use current-status.md phase to guide)

10. Output:
   - **Readiness summary** (1 sentence): synthesize sleep + nutrition + body status into an overall readiness assessment. Example: "Good recovery: 7.5h sleep, protein on target 6/7 days, no fatigue reported → full intensity today." Or: "Mixed signals: 5.8h sleep + protein below target 5/7 days → moderate session, hold weights."
   - Muscle group(s) to train and why (rotation logic, days since last trained)
   - Per-exercise recommendation:
     `• [Exercise] — [sets]×[reps] @ [weight]kg (last: [prev_kg]kg [↑/=/↓])`
   - Intensity note if recovery is suboptimal (explain the cause-effect connection so the user learns why)
   - **Estimated duration:** [X] minutes — based on [N] exercises × ~3 sets × [rest] rest between sets. Use 90s rest for compound lifts, 60s for accessories.

## Notes
- Always explain the rotation reasoning
- If body pain overlaps with recommended muscle group, swap the exercise (e.g. shoulder pain → replace overhead press with landmine press or lateral raises)
- Compound lifts always before accessories
- If no workout history exists, suggest a full-body beginner session
- Read current-status.md to confirm compound lift priority for the current phase
