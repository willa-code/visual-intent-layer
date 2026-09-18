import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateEnvelope } from './validate.js';
import { representativeEnvelope } from './fixtures.js';

describe('Visual Intent Envelope schema conformance (v0.4)', () => {
  it('accepts the representative envelope fixture', () => {
    const result = validateEnvelope(representativeEnvelope);
    expect(result.ok).toBe(true);
  });

  it('rejects an envelope missing required revision identity', () => {
    const broken = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    delete (broken['artifact'] as Record<string, unknown>)['revision'];
    expect(validateEnvelope(broken).ok).toBe(false);
  });

  it('rejects an envelope with no annotations', () => {
    const broken = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    broken['annotations'] = [];
    expect(validateEnvelope(broken).ok).toBe(false);
  });

  it('rejects a batch that carries the retired envelope-level targets array', () => {
    const broken = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    broken['targets'] = [];
    expect(validateEnvelope(broken).ok).toBe(false);
  });

  it('rejects unknown delivery intent', () => {
    const broken = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    (broken['delivery'] as Record<string, unknown>)['intent'] = 'teleport';
    expect(validateEnvelope(broken).ok).toBe(false);
  });

  it('rejects the retired resolution words on provenance confidence', () => {
    const broken = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    const annotation = (broken['annotations'] as Array<Record<string, unknown>>)[0]!;
    (annotation['targets'] as Array<Record<string, unknown>>)[0]!['provenanceConfidence'] = 'ambiguous';
    expect(validateEnvelope(broken).ok).toBe(false);
  });

  it('rejects the retired relation operators', () => {
    const broken = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    const annotation = (broken['annotations'] as Array<Record<string, unknown>>)[1]!;
    (annotation['relationships'] as Array<Record<string, unknown>>)[0]!['operator'] = 'preserved-rhythm';
    expect(validateEnvelope(broken).ok).toBe(false);
  });

  it('rejects a target that claims exact provenance without source evidence', () => {
    const broken = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    const annotation = (broken['annotations'] as Array<Record<string, unknown>>)[0]!;
    const target = (annotation['targets'] as Array<Record<string, unknown>>)[0]!;
    target['provenanceConfidence'] = 'exact';
    expect(validateEnvelope(broken).ok).toBe(false);
  });

  it('accepts a content-addressed attachment reference', () => {
    const withAttachment = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    const annotation = (withAttachment['annotations'] as Array<Record<string, unknown>>)[0]!;
    annotation['attachments'] = [
      { attachmentId: 'att-1', mediaType: 'image/png', byteLength: 1024, sha256: 'a'.repeat(64), name: 'reference.png' }
    ];
    expect(validateEnvelope(withAttachment).ok).toBe(true);
  });

  it('round-trips the fixture through JSON without loss', () => {
    const parsed: unknown = JSON.parse(JSON.stringify(representativeEnvelope));
    const result = validateEnvelope(parsed);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(representativeEnvelope);
    }
  });

  it('keeps a 0.2 envelope without Runtime State Evidence readable', () => {
    const legacy = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    legacy['schemaVersion'] = '0.2';
    const result = validateEnvelope(legacy);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.schemaVersion).toBe('0.4');
    }
  });

  it('reads Runtime State Evidence on an element, text-range and region target', () => {
    const withState = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    const annotation = (withState['annotations'] as Array<Record<string, unknown>>)[0]!;
    const target = (annotation['targets'] as Array<Record<string, unknown>>)[0]!;
    target['runtimeState'] = { address: 'checkout.html#delivery' };
    const result = validateEnvelope(withState);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const read = result.value.annotations[0]!.targets[0]!;
      expect(read.runtimeState?.address).toBe('checkout.html#delivery');
    }
  });

  it('reads the ordered chain of documents a frame Target was reached through', () => {
    const withChain = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    const annotation = (withChain['annotations'] as Array<Record<string, unknown>>)[0]!;
    const target = (annotation['targets'] as Array<Record<string, unknown>>)[0]!;
    target['runtimeState'] = {
      address: 'checkout.html',
      documents: [{ path: 'iframe#widget', address: 'widget', scroll: { x: 0, y: 120 } }]
    };
    const result = validateEnvelope(withChain);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.annotations[0]!.targets[0]!.runtimeState?.documents?.[0]).toEqual({
        path: 'iframe#widget',
        address: 'widget',
        scroll: { x: 0, y: 120 }
      });
    }
  });

  it('rejects a documents chain entry without a frame path', () => {
    const broken = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    const annotation = (broken['annotations'] as Array<Record<string, unknown>>)[0]!;
    const target = (annotation['targets'] as Array<Record<string, unknown>>)[0]!;
    target['runtimeState'] = { documents: [{ scroll: { x: 0, y: 0 } }] };
    expect(validateEnvelope(broken).ok).toBe(false);
  });

  it('keeps a 0.3 envelope without a documents chain readable', () => {
    const legacy = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    legacy['schemaVersion'] = '0.3';
    const annotation = (legacy['annotations'] as Array<Record<string, unknown>>)[0]!;
    const target = (annotation['targets'] as Array<Record<string, unknown>>)[0]!;
    target['runtimeState'] = { address: 'checkout.html' };
    const result = validateEnvelope(legacy);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.schemaVersion).toBe('0.4');
      expect(result.value.annotations[0]!.targets[0]!.runtimeState?.address).toBe('checkout.html');
      expect(result.value.annotations[0]!.targets[0]!.runtimeState?.documents).toBeUndefined();
    }
  });

  it('rejects an address that is not a string', () => {
    const broken = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    const annotation = (broken['annotations'] as Array<Record<string, unknown>>)[0]!;
    const target = (annotation['targets'] as Array<Record<string, unknown>>)[0]!;
    target['runtimeState'] = { address: '' };
    expect(validateEnvelope(broken).ok).toBe(false);
  });

  it('ships the 0.2 schema file as the versioned contract', () => {
    const schema = JSON.parse(readFileSync('schema/envelope-v0.2.schema.json', 'utf8')) as {
      $id?: string;
      'x-version'?: string;
    };
    expect(schema.$id).toContain('visual-intent-envelope');
    expect(schema['x-version']).toBe('0.2.0');
  });

  it('ships 0.4 as the contract and rebuilds its generated types from the schema', () => {
    const schema = JSON.parse(readFileSync('schema/envelope-v0.4.schema.json', 'utf8')) as {
      $id?: string;
      'x-version'?: string;
      $defs?: { target?: { properties?: Record<string, unknown> } };
    };
    expect(schema.$id).toContain('visual-intent-envelope-0.4');
    expect(schema['x-version']).toBe('0.4.0');
    expect(schema.$defs?.target?.properties?.['runtimeState']).toBeDefined();
    const generated = readFileSync('src/envelope/generated/envelope-v0.4.ts', 'utf8');
    expect(generated).toContain('schemaVersion: "0.4"');
    expect(generated).toContain('runtimeState');
  });

  it('keeps the published wire name supersedes on the envelope schema', () => {
    const published = JSON.parse(readFileSync('schema/envelope-v0.1.schema.json', 'utf8')) as {
      properties?: Record<string, unknown>;
    };
    expect(Object.keys(published.properties ?? {})).toContain('supersedes');
  });
});