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

4. Read `data/current-status.md` for current phase, training protocol, target frequency, and compound lift priorities.

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
   - Rep ranges: 6–8 for strength, 8–12 for hypertrophy, 12–15 for endurance (use current-status.md phase to guide)

9. Output:
   - Muscle group(s) to train and why (rotation logic, days since last trained)
   - Per-exercise recommendation:
     `• [Exercise] — [sets]×[reps] @ [weight]kg (last: [prev_kg]kg [↑/=/↓])`
   - Intensity note if recovery is suboptimal (explain the adjustment)
   - Estimated duration based on exercise count and rest periods

## Notes
- Always explain the rotation reasoning
- If body pain overlaps with recommended muscle group, swap the exercise (e.g. shoulder pain → replace overhead press with landmine press or lateral raises)
- Compound lifts always before accessories
- If no workout history exists, suggest a full-body beginner session
- Read current-status.md to confirm compound lift priority for the current phase
