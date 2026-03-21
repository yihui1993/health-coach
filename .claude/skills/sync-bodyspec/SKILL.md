---
name: sync-bodyspec
description: Sync BodySpec DEXA scan results into the health database. Use when the user wants to pull latest scans, refresh body composition data, or sync new scan results.
allowed-tools: mcp__claude_ai_Bodyspec__list_scan_results, Bash, Write
---

Sync all BodySpec DEXA scan results into the health database.

## Steps

1. Call `mcp__claude_ai_Bodyspec__list_scan_results` with `page_size: 100` to fetch all scans.

   If the tool is not available, tell the user: "BodySpec MCP is not connected. Run `/add-bodyspec` to set it up first."

2. Pass the full JSON response to the sync script:
```bash
npx tsx /Users/yihuima/health-coach/scripts/sync-bodyspec.ts '<json_from_mcp>'
```

3. Query what was synced:
```bash
sqlite3 /Users/yihuima/health-coach/data/health.db "
SELECT date, source, weight_kg, body_fat_pct, muscle_mass_kg, bone_mass_kg
FROM body_metrics
ORDER BY date DESC LIMIT 5;
"
```

4. Update `data/current-status.md` with the latest scan data. Read the current file first, then update the body composition section and scan history table. Include:
   - Date and source of latest scan
   - Weight, body fat %, lean mass, bone mass, visceral fat if available
   - Delta vs previous scan for each metric (↑/↓ with value)
   - Keep the goals section intact

5. Report:
   - How many scans synced and the date range
   - Key changes in the latest scan vs previous (highlight significant changes)
   - Any flags (e.g. lean mass loss, body fat increase)

## Notes
- The sync script uses INSERT OR REPLACE keyed on (date, source='BodySpec') — safe to run repeatedly
- Run after every new DEXA scan to keep data current
