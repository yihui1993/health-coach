/**
 * Syncs BodySpec DEXA scan data into health-coach's SQLite database.
 * Called by Claude Code after fetching data via the Bodyspec MCP tool.
 *
 *   npx tsx scripts/sync-bodyspec.ts '<json_from_mcp>'
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const HEALTH_DB = path.join(PROJECT_ROOT, 'data', 'health.db');

interface ScanSet {
  reps: number;
  weight_kg?: number;
}

interface Exercise {
  name: string;
  sets: ScanSet[];
}

interface BodySpecScan {
  result_id?: string;
  scan_date: string;
  location?: string;
  composition: {
    total: {
      total_mass: { kg: number };
      region_fat_pct: number;
      lean_mass: { kg: number };
      bone_mass: { kg: number };
    };
  };
  visceral_fat?: { vat_mass?: { kg: number } };
  bone_density?: unknown;
  percentiles?: unknown;
  bmr?: { kcal?: number };
}

function syncScans(scans: BodySpecScan[]) {
  if (!fs.existsSync(HEALTH_DB)) {
    console.error(`DB not found at ${HEALTH_DB}. Run scripts/init-db.sh first.`);
    process.exit(1);
  }

  const db = new Database(HEALTH_DB);

  const del = db.prepare(`DELETE FROM body_metrics WHERE date = ? AND source = 'BodySpec'`);
  const insert = db.prepare(`
    INSERT INTO body_metrics (date, source, weight_kg, body_fat_pct, muscle_mass_kg, bone_mass_kg, visceral_fat_level, bmr_kcal, notes, scan_json)
    VALUES (@date, @source, @weight_kg, @body_fat_pct, @muscle_mass_kg, @bone_mass_kg, @visceral_fat_level, @bmr_kcal, @notes, @scan_json)
  `);

  let count = 0;
  for (const scan of scans) {
    const c = scan.composition.total;
    del.run(scan.scan_date);
    insert.run({
      date: scan.scan_date,
      source: 'BodySpec',
      weight_kg: c.total_mass.kg,
      body_fat_pct: c.region_fat_pct,
      muscle_mass_kg: c.lean_mass.kg,
      bone_mass_kg: c.bone_mass.kg,
      visceral_fat_level: scan.visceral_fat?.vat_mass?.kg ?? null,
      bmr_kcal: scan.bmr?.kcal ?? null,
      notes: scan.location ?? null,
      scan_json: JSON.stringify({
        composition: scan.composition,
        bone_density: scan.bone_density,
        visceral_fat: scan.visceral_fat,
        percentiles: scan.percentiles,
      }),
    });
    console.log(`  Synced ${scan.scan_date}${scan.location ? ` (${scan.location})` : ''}`);
    count++;
  }

  db.close();
  console.log(`\nDone — ${count} scan(s) synced to ${HEALTH_DB}`);
}

const raw = process.argv[2] ?? fs.readFileSync('/dev/stdin', 'utf-8');
const data = JSON.parse(raw);
const scans: BodySpecScan[] = Array.isArray(data) ? data : (data.scans ?? data.results ?? []);
syncScans(scans);
