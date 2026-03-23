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

8. Reply in this format (no markdown headers, use bullet points):

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
