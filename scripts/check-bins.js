import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
let failed = false;
for (const [name, target] of Object.entries(pkg.bin)) {
  const first = readFileSync(new URL(`../${target}`, import.meta.url), 'utf8').split('\n')[0];
  if (first !== '#!/usr/bin/env node') {
    console.error(`bin ${name} (${target}) is missing its shebang`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`bins OK: ${Object.keys(pkg.bin).join(', ')}`);
