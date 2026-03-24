---
name: log-sleep
description: Log a sleep entry. Use when the user reports bedtime, wake time, sleep duration, heart rate, HRV, or mentions going to bed or waking up.
allowed-tools: Bash
---

Log a sleep entry to the health database.

## Steps

1. If bedtime and wake time are not already provided, ask for them.

2. Parse natural language times — infer dates from context:
   - Bedtime is usually yesterday's date (or "last night")
   - Wake time is today's date
   - Handle midnight correctly (e.g. "went to bed at midnight" = 2026-MM-DD 00:00:00 of wake date)

3. Calculate duration in hours (round to 1 decimal).
   Example: bedtime 11:30pm, wake 7:00am = 7.5h

4. Extract from the same message (do NOT ask for these if not mentioned):
   - `body_notes`: any soreness, pain, headache, stiffness mentioned
   - `avg_bpm`: if heart rate mentioned ("avg HR 58", "resting HR 62 bpm")
   - `hrv_ms`: if HRV mentioned ("HRV 45ms", "HRV was 52", "heart rate variability 40")
   - `energy_level`: 1–5 if fatigue or energy level is mentioned

5. Log with INSERT OR REPLACE (wake date as the unique key):
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
INSERT OR REPLACE INTO sleep_log (date, bedtime, wake_time, duration_hours, avg_bpm, hrv_ms, body_notes, energy_level)
VALUES (
  '[YYYY-MM-DD wake date in PDT]',
  '[YYYY-MM-DD HH:MM:00 bedtime in PDT]',
  '[YYYY-MM-DD HH:MM:00 wake time in PDT]',
  [hours],
  [bpm or NULL],
  [hrv or NULL],
  '[notes or NULL]',
  [1-5 or NULL]
);
"
```

6. Check recent training context:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
-- Days since last workout
SELECT CAST(julianday(date('now', '-13 hours')) - julianday(MAX(date)) AS INTEGER) as days_since
FROM workouts;
"
```

7. Confirm with a brief response:
   - Sleep duration
   - Avg HR if logged
   - HRV if logged
   - Recovery observation:
     - < 6.5h → "Short night — expect some fatigue. Consider lower intensity training."
     - 6.5–7.4h → neutral
     - ≥ 7.5h → "Good recovery window for muscle repair."
   - If HRV is notably low (< 40ms) → flag: "Low HRV suggests incomplete recovery — consider a deload or rest day."
   - Training context (if relevant):
     - If days_since_last_workout ≤ 1: "You trained [yesterday/today] — this sleep duration [supports/may limit] recovery."
     - If days_since_last_workout ≥ 5: "No workout in [X] days — a session today would be well-rested."

## Notes
- Always use PDT (UTC-7) for all timestamps
- The `date` field is the wake-up date (morning you woke up), not the bedtime date
- avg_bpm and hrv_ms are optional — only log if mentioned, never ask for them
- HRV in milliseconds — if user says "HRV 45" without unit, assume ms
