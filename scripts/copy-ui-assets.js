import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'dist', 'ui'), { recursive: true });
for (const file of ['shell.html', 'review.css']) {
  copyFileSync(join(root, 'src', 'ui', file), join(root, 'dist', 'ui', file));
  console.log(`copied src/ui/${file} -> dist/ui/${file}`);
}
