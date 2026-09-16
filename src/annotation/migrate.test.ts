import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AnnotationStore } from './store.js';
import { migrateLegacyRecords, type LegacyRecord } from './migrate.js';

function legacyRecord(overrides: Partial<LegacyRecord> = {}): LegacyRecord {
  return {
    envelopeId: 'env-legacy-1',
    idempotencyKey: 'idem-legacy-1',
    status: 'host-accepted',
    envelope: {
      envelopeId: 'env-legacy-1',
      artifact: { id: 'artifact-legacy', kind: 'saved-html', revision: 'blake3:legacy', displayName: 'page.html' },
      targets: [
        {
          targetId: 't-1',
          kind: 'element',
          renderedGrounding: {
            selectors: ['main > button.buy'],
            boundingBox: { x: 1, y: 2, width: 3, height: 4 }
          },
          provenanceConfidence: 'unavailable'
        },
        {
          targetId: 't-2',
          kind: 'element',
          renderedGrounding: {
            selectors: ['main > button.cancel'],
            boundingBox: { x: 5, y: 6, width: 7, height: 8 }
          },
          provenanceConfidence: 'unavailable'
        }
      ],
      direction: 'Make both buttons easier to hit.',
      createdAt: '2026-01-01T00:00:00.000Z',
      delivery: { idempotencyKey: 'idem-legacy-1', intent: 'next-pass' }
    },
    deliveryHistory: [
      { type: 'saved-draft', at: '2026-01-01T00:00:00.000Z' },
      { type: 'delivered', at: '2026-01-01T00:01:00.000Z', host: 'pi' }
    ],
    updatedAt: '2026-01-01T00:01:00.000Z',
    ...overrides
  };
}

describe('legacy migration', () => {
  it('reads one envelope as one Annotation per target, each carrying the shared direction', () => {
    const result = migrateLegacyRecords([legacyRecord()]);
    expect(result.report.skipped).toHaveLength(0);
    expect(result.annotations).toHaveLength(2);
    expect(result.annotations.map((annotation) => annotation.note)).toEqual([
      'Make both buttons easier to hit.',
      'Make both buttons easier to hit.'
    ]);
    expect(result.annotations.map((annotation) => annotation.targets).flat().map((target) => target.targetId)).toEqual(['t-1', 't-2']);
    expect(result.annotations.every((annotation) => annotation.state === 'delivered')).toBe(true);
  });

  it('leaves a record with spanning relationships unmodified and reports it', () => {
    const withRelations = legacyRecord();
    withRelations.envelope.relationships = [{ relationshipId: 'r-1', type: 'alignment', operator: 'align-left', targetIds: ['t-1', 't-2'] }];
    const result = migrateLegacyRecords([withRelations]);
    expect(result.annotations).toHaveLength(0);
    expect(result.report.skipped[0]?.reason).toMatch(/ambiguous/i);
  });

  it('leaves a record with no shared direction unmodified and reports it', () => {
    const noDirection = legacyRecord();
    noDirection.envelope.direction = '';
    const result = migrateLegacyRecords([noDirection]);
    expect(result.annotations).toHaveLength(0);
    expect(result.report.skipped[0]?.reason).toMatch(/direction/i);
  });

  it('maps a legacy superseded status onto Replaced', () => {
    const result = migrateLegacyRecords([legacyRecord({ status: 'superseded' })]);
    expect(result.annotations.every((annotation) => annotation.state === 'replaced')).toBe(true);
  });

  it('maps a legacy another-pass verdict onto Not Fixed', () => {
    const record = legacyRecord({
      status: 'verified',
      deliveryHistory: [
        { type: 'saved-draft', at: '2026-01-01T00:00:00.000Z' },
        { type: 'verified', at: '2026-01-01T00:02:00.000Z', verdict: 'another-pass' }
      ]
    });
    const result = migrateLegacyRecords([record]);
    expect(result.annotations.every((annotation) => annotation.verification?.verdict === 'not-fixed')).toBe(true);
  });

  it('reads a stored Annotation that still carries the old replaced names', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vil-migrate-replaced-'));
    writeFileSync(
      join(dir, 'annotations.json'),
      JSON.stringify({
        version: 2,
        annotations: {
          'ann-old': {
            annotationId: 'ann-old',
            artifactId: 'a',
            writtenRevision: 'rev-1',
            revisionRelation: 'current',
            state: 'superseded',
            order: 0,
            note: 'first wording',
            targets: [],
            relationships: [],
            references: [],
            attachments: [],
            resolutions: [],
            supersededBy: 'ann-new',
            history: [],
            createdAt: '',
            updatedAt: ''
          },
          'ann-new': {
            annotationId: 'ann-new',
            artifactId: 'a',
            writtenRevision: 'rev-1',
            revisionRelation: 'current',
            state: 'delivered',
            order: 1,
            note: 'clearer wording',
            targets: [],
            relationships: [],
            references: [],
            attachments: [],
            resolutions: [],
            supersedes: 'ann-old',
            history: [],
            createdAt: '',
            updatedAt: ''
          }
        },
        passes: {},
        byIdempotencyKey: {},
        migration: { at: '', migrated: [], skipped: [], unreadable: [] }
      }),
      'utf8'
    );
    const store = new AnnotationStore(dir);
    const original = store.get('ann-old')!;
    const replacement = store.get('ann-new')!;
    expect(original.state).toBe('replaced');
    expect(original.replacedBy).toBe('ann-new');
    expect(replacement.replaces).toBe('ann-old');
  });

  it('migrates an existing lifecycle.json on first store open while leaving the original untouched', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vil-migrate-'));
    const lifecycle = join(dir, 'lifecycle.json');
    writeFileSync(lifecycle, JSON.stringify([legacyRecord()]), 'utf8');
    const before = readFileSync(lifecycle, 'utf8');

    const store = new AnnotationStore(dir);
    expect(store.list()).toHaveLength(2);
    expect(store.migrationReport().migrated).toHaveLength(1);
    expect(readFileSync(lifecycle, 'utf8')).toBe(before);
    expect(existsSync(join(dir, 'annotations.json'))).toBe(true);
  });

  it('reports unreadable legacy state visibly while preserving the original bytes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vil-migrate-bad-'));
    const lifecycle = join(dir, 'lifecycle.json');
    writeFileSync(lifecycle, '{ definitely not json', 'utf8');
    const before = readFileSync(lifecycle, 'utf8');
    const store = new AnnotationStore(dir);
    expect(store.migrationReport().unreadable).toHaveLength(1);
    expect(readFileSync(lifecycle, 'utf8')).toBe(before);
  });

  it('refuses a corrupt annotation store instead of discarding it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vil-annotations-bad-'));
    writeFileSync(join(dir, 'annotations.json'), '{"version":999,"annotations":{}}', 'utf8');
    expect(() => new AnnotationStore(dir)).toThrow(/refusing to start/);
  });
});