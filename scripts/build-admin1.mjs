/**
 * One-off: split Natural Earth admin-1 into client/public/admin1/{ISO2}.json (TopoJSON).
 * Run by hand, never during the build:  node scripts/build-admin1.mjs [local-source.geojson]
 * Runs mapshaper through npx so it is not a project dependency.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SOURCE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';
const OUT = path.resolve(import.meta.dirname, '..', 'client', 'public', 'admin1');
const MAX_BYTES = 300 * 1024;
const MAPSHAPER = 'mapshaper@0.6.102';

async function loadSource() {
  if (process.argv[2]) return JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const response = await fetch(SOURCE);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  return response.json();
}

const groups = new Map();
for (const f of (await loadSource()).features) {
  const p = f.properties;
  const iso2 = String(p.iso_a2 ?? '').toUpperCase();
  // validated because it becomes a file name
  if (!/^[A-Z]{2}$/.test(iso2) || !f.geometry) continue;
  if (!groups.has(iso2)) groups.set(iso2, []);
  groups.get(iso2).push({
    type: 'Feature',
    geometry: f.geometry,
    properties: { name: p.name, name_alt: p.name_alt, name_en: p.name_en },
  });
}

mkdirSync(OUT, { recursive: true });
const work = mkdtempSync(path.join(tmpdir(), 'admin1-'));
const tooBig = [];
try {
  for (const [iso2, features] of groups) {
    const input = path.join(work, `${iso2}.geojson`);
    const output = path.join(OUT, `${iso2}.json`);
    writeFileSync(input, JSON.stringify({ type: 'FeatureCollection', features }));

    let fits = false;
    for (const percent of [20, 10, 5, 2, 1, 0.5]) {
      const args = [
        '-y', MAPSHAPER, input,
        '-simplify', `${percent}%`, 'keep-shapes',
        '-o', output, 'format=topojson', 'precision=0.001', 'force',
      ];
      // npx is a .cmd file on Windows, which needs a shell; quote paths for it
      const windows = process.platform === 'win32';
      execFileSync('npx', windows ? args.map(a => `"${a}"`) : args, { stdio: 'inherit', shell: windows });
      if (statSync(output).size <= MAX_BYTES) {
        fits = true;
        break;
      }
    }
    if (!fits) tooBig.push(iso2);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(`Wrote ${groups.size} files to ${OUT}`);
if (tooBig.length) {
  console.error(`Still over 300 KB: ${tooBig.join(', ')}`);
  process.exitCode = 1;
}
