import { compile } from 'json-schema-to-typescript';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const versions = [{ version: '0.4', typeName: 'VisualIntentEnvelope' }];

for (const { version, typeName } of versions) {
  const schemaPath = join(root, 'schema', `envelope-v${version}.schema.json`);
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const ts = await compile(schema, typeName, {
    bannerComment: `/* Generated from schema/envelope-v${version}.schema.json. Do not edit by hand. */`,
    unknownAny: false
  });
  const outDir = join(root, 'src', 'envelope', 'generated');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `envelope-v${version}.ts`), ts + '\n');
  console.log(`wrote src/envelope/generated/envelope-v${version}.ts`);
}