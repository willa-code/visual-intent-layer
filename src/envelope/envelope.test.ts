import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateEnvelope } from './validate.js';
import { representativeEnvelope } from './fixtures.js';

describe('Visual Intent Envelope schema conformance', () => {
  it('accepts the representative envelope fixture', () => {
    const result = validateEnvelope(representativeEnvelope);
    expect(result.ok).toBe(true);
  });

  it('rejects an envelope missing required revision identity', () => {
    const broken = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    const artifact = broken['artifact'] as Record<string, unknown>;
    delete artifact['revision'];
    const result = validateEnvelope(broken);
    expect(result.ok).toBe(false);
  });

  it('rejects an envelope with no targets', () => {
    const broken = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    broken['targets'] = [];
    const result = validateEnvelope(broken);
    expect(result.ok).toBe(false);
  });

  it('rejects unknown delivery intent', () => {
    const broken = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    const delivery = broken['delivery'] as Record<string, unknown>;
    delivery['intent'] = 'teleport';
    const result = validateEnvelope(broken);
    expect(result.ok).toBe(false);
  });

  it('preserves optional canvas, host, browser, and framework extensions without requiring them', () => {
    const withExtensions = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    withExtensions['extensions'] = {
      canvas: { engine: 'custom-overlay', overlayVersion: '0.1.0' },
      host: { name: 'pi', adapter: 'pi-mcp-adapter' },
      browser: { userAgent: 'test-agent' },
      framework: { name: 'react', version: '19.0.0' }
    };
    const result = validateEnvelope(withExtensions);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.extensions).toMatchObject({
        canvas: { engine: 'custom-overlay' },
        framework: { name: 'react' }
      });
    }
  });

  it('rejects a target that claims exact provenance without source evidence', () => {
    const broken = structuredClone(representativeEnvelope) as unknown as Record<string, unknown>;
    const targets = broken['targets'] as Array<Record<string, unknown>>;
    delete targets[0]!['sourceProvenance'];
    targets[0]!['provenanceConfidence'] = 'exact';
    const result = validateEnvelope(broken);
    expect(result.ok).toBe(false);
  });

  it('round-trips the fixture through JSON without loss', () => {
    const json = JSON.stringify(representativeEnvelope);
    const parsed: unknown = JSON.parse(json);
    const result = validateEnvelope(parsed);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(representativeEnvelope);
    }
  });

  it('schema file exists on disk as the versioned contract', () => {
    const raw = readFileSync('schema/envelope-v0.1.schema.json', 'utf8');
    const schema = JSON.parse(raw) as { $id?: string; 'x-version'?: string };
    expect(schema.$id).toContain('visual-intent-envelope');
    expect(schema['x-version'] ?? schema.$id).toContain('0.1');
  });
});
