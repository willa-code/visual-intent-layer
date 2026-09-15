import { compile } from 'json-schema-to-typescript';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = join(root, 'schema', 'envelope-v0.1.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const ts = await compile(schema, 'VisualIntentEnvelope', {
  bannerComment: '/* Generated from schema/envelope-v0.1.schema.json. Do not edit by hand. */',
  unknownAny: false
});

const outDir = join(root, 'src', 'envelope', 'generated');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'envelope-v0.1.ts'), ts + '\n');
console.log('wrote src/envelope/generated/envelope-v0.1.ts');
