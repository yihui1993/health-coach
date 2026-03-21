---
name: suggest-exercise
description: Suggest a workout for today based on training history, recovery data, sleep quality, and active goals. Use when the user asks what to do at the gym, needs a workout plan, or asks for exercise recommendations.
allowed-tools: Bash, Read
---

Suggest today's workout based on the user's data.

## Steps

1. Query recent workout history (last 7 days):
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT date, muscle_groups, duration_mins, notes
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

4. Query recent workout weights for progressive overload context:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT date, exercises FROM workouts ORDER BY date DESC LIMIT 10;
"
```

5. Read `data/goals.md` for current phase, training protocol, and priorities.

6. Reason through the recommendation:

   **Muscle group selection:**
   - Parse muscle_groups from recent workouts
   - Eliminate any group trained within the last 48 hours
   - If 5+ days without any resistance session, prioritize getting back regardless of rotation
   - Cross-check with body_status — skip or modify for pain areas

   **Intensity calibration:**
   - Sleep < 6.5h → reduce load by 10–15%, maintain volume
   - Sleep 6.5–7.5h → normal training
   - Sleep ≥ 7.5h → full intensity
   - HRV < 40ms (if available) → suggest deload or accessory-only session
   - fatigue_level ≥ 4 → reduce volume, not intensity

   **Exercise selection:**
   - Lead with 1–2 compound lifts (squat, deadlift, bench, row, OHP, hip hinge, pull-up)
   - Add 2–3 accessory exercises targeting the same group
   - Rep ranges: 6–8 for strength focus, 8–12 for hypertrophy, 12–15 for endurance
   - Suggest weights based on recent history: add 2.5–5 kg if last session was completed with good form

7. Output a specific recommendation:
   - Muscle group(s) to train and why (rotation logic)
   - 4–6 specific exercises with rep ranges and suggested weights
   - Intensity/volume adjustment based on recovery (explain if adjusting)
   - Estimated duration

## Notes
- Always explain the reasoning behind muscle group choice
- If body pain overlaps with recommended muscle group, modify exercises (e.g. shoulder pain → sub overhead press with landmine press)
- Compound lifts always before accessories
- If no workout history exists, suggest a full-body beginner session with compound movements
