#!/bin/bash
# Initialize the health-coach SQLite database

DB=/Users/yihuima/health-coach/data/health.db

mkdir -p "$(dirname "$DB")"

sqlite3 "$DB" <<'SQL'

CREATE TABLE IF NOT EXISTS body_metrics (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  date                TEXT NOT NULL,
  source              TEXT NOT NULL,
  weight_kg           REAL,
  body_fat_pct        REAL,
  muscle_mass_kg      REAL,
  bone_mass_kg        REAL,
  visceral_fat_level  REAL,
  bmr_kcal            INTEGER,
  scan_json           TEXT,
  notes               TEXT,
  created_at          TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meals (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp             TEXT NOT NULL,
  meal_type             TEXT,
  description           TEXT,
  photo_path            TEXT,
  estimated_calories    INTEGER,
  estimated_protein_g   REAL,
  estimated_carbs_g     REAL,
  estimated_fat_g       REAL,
  notes                 TEXT,
  created_at            TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sleep_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  date            TEXT NOT NULL UNIQUE,
  bedtime         TEXT NOT NULL,
  wake_time       TEXT NOT NULL,
  duration_hours  REAL,
  avg_bpm         INTEGER,
  hrv_ms          INTEGER,
  body_notes      TEXT,
  energy_level    INTEGER,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workouts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  date            TEXT NOT NULL,
  photo_path      TEXT,
  duration_mins   INTEGER,
  exercises       TEXT,
  muscle_groups   TEXT,
  calories_burned INTEGER,
  total_volume_lbs REAL,
  notes           TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS body_status (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  date          TEXT NOT NULL UNIQUE,
  muscle_pain   TEXT,
  headache      INTEGER DEFAULT 0,
  fatigue_level INTEGER,
  mood          INTEGER,
  notes         TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS goals (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at          TEXT DEFAULT (datetime('now')),
  target_weight_kg    REAL,
  target_body_fat_pct REAL,
  target_date         TEXT,
  phase               TEXT,
  daily_calories      INTEGER,
  daily_protein_g     INTEGER,
  daily_carbs_g       INTEGER,
  daily_fat_g         INTEGER,
  notes               TEXT
);

SQL

echo "Health database initialized at $DB"
