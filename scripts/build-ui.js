import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist', 'ui');
mkdirSync(outDir, { recursive: true });

const bundles = [
  { entry: join(root, 'src', 'ui', 'app.ts'), out: join(outDir, 'shell.js'), format: 'esm' },
  { entry: join(root, 'src', 'ui', 'artifact', 'layer.ts'), out: join(outDir, 'artifact-layer.js'), format: 'iife' },
  { entry: join(root, 'src', 'ui', 'gallery.ts'), out: join(outDir, 'gallery.js'), format: 'esm' }
];

for (const bundle of bundles) {
  await build({
    entryPoints: [bundle.entry],
    outfile: bundle.out,
    bundle: true,
    format: bundle.format,
    platform: 'browser',
    target: 'es2022',
    legalComments: 'none',
    logLevel: 'warning'
  });
  console.log(`bundled ${bundle.entry.replace(root + '/', '')} -> ${bundle.out.replace(root + '/', '')}`);
}

const css = [
  '/* tokens */\n' + readFileSync(join(root, 'src', 'ui', 'styles', 'tokens.css'), 'utf8'),
  '/* shell */\n' + readFileSync(join(root, 'src', 'ui', 'styles', 'shell.css'), 'utf8')
].join('\n');
writeFileSync(join(outDir, 'shell.css'), css, 'utf8');
console.log('bundled design tokens and shell styles -> dist/ui/shell.css');

for (const file of ['shell.html', 'gallery.html']) {
  copyFileSync(join(root, 'src', 'ui', file), join(outDir, file));
  console.log(`copied src/ui/${file} -> dist/ui/${file}`);
}