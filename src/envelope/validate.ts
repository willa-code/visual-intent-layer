import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VisualIntentEnvelope } from './generated/envelope-v0.2.js';

export type Envelope = VisualIntentEnvelope;

export type ValidationSuccess = { ok: true; value: VisualIntentEnvelope };
export type ValidationFailure = { ok: false; errors: string[] };
export type ValidationResult = ValidationSuccess | ValidationFailure;

type CompiledValidator = ((data: unknown) => boolean) & {
  errors?: Array<{ instancePath: string; message?: string }>;
};
type AjvInstance = {
  compile(schema: unknown): CompiledValidator;
};
type Ajv2020Constructor = new (options: Record<string, unknown>) => AjvInstance;
type AddFormats = (ajv: unknown) => void;

const require = createRequire(import.meta.url);
const Ajv2020 = require('ajv/dist/2020') as Ajv2020Constructor;
const addFormats = require('ajv-formats') as AddFormats;

const ajv: AjvInstance = new Ajv2020({ allErrors: true, strict: true, strictSchema: false });
addFormats(ajv);

function schemaPath(version: string): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, '..', '..', 'schema', `envelope-v${version}.schema.json`),
    join(process.cwd(), 'schema', `envelope-v${version}.schema.json`)
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return candidates[1]!;
}

const compiled = new Map<string, CompiledValidator>();

function validator(version: string): CompiledValidator {
  const existing = compiled.get(version);
  if (existing) {
    return existing;
  }
  const schema: unknown = JSON.parse(readFileSync(schemaPath(version), 'utf8'));
  const next = ajv.compile(schema);
  compiled.set(version, next);
  return next;
}

function errorsOf(validate: CompiledValidator): string[] {
  return (validate.errors ?? []).map((error) => {
    const path = error.instancePath || '(root)';
    return `${path} ${error.message ?? 'invalid'}`;
  });
}

export function validateEnvelope(input: unknown): ValidationResult {
  const validate = validator('0.2');
  if (validate(input)) {
    return { ok: true, value: input as VisualIntentEnvelope };
  }
  return { ok: false, errors: errorsOf(validate) };
}

export function parseEnvelopeJson(json: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, errors: ['(root) invalid JSON'] };
  }
  return validateEnvelope(parsed);
}