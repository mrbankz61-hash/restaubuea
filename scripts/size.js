// Bundle budget check: total JavaScript must stay under 350 KB gzipped.
// Runs after `vite build` (npm run build) and fails the build if the budget is blown.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 350;
const dir = 'dist/assets';

let files;
try {
  files = readdirSync(dir).filter((f) => f.endsWith('.js') || f.endsWith('.css'));
} catch {
  console.error(`No ${dir} folder. Run "npm run build" first.`);
  process.exit(1);
}

const rows = files.map((file) => {
  const buf = readFileSync(join(dir, file));
  return { file, raw: statSync(join(dir, file)).size / 1024, gzip: gzipSync(buf, { level: 9 }).length / 1024 };
});
const js = rows.filter((r) => r.file.endsWith('.js'));
const totalJs = js.reduce((sum, r) => sum + r.gzip, 0);
const initial = js.filter((r) => r.file.startsWith('index-')).reduce((sum, r) => sum + r.gzip, 0);

console.log('\nBundle sizes (gzip):');
for (const r of rows.sort((a, b) => b.gzip - a.gzip)) {
  console.log(`  ${r.file.padEnd(32)} ${r.gzip.toFixed(1).padStart(7)} KB   (${r.raw.toFixed(1)} KB raw)`);
}
console.log(`\n  Initial JS (blocks first paint): ${initial.toFixed(1)} KB`);
console.log(`  Total JS: ${totalJs.toFixed(1)} KB of ${BUDGET_KB} KB budget\n`);

if (totalJs > BUDGET_KB) {
  console.error(`JS budget exceeded by ${(totalJs - BUDGET_KB).toFixed(1)} KB.`);
  process.exit(1);
}
