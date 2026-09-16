import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const REPO_ROOT = process.cwd();
const LEVER = join(REPO_ROOT, '.agents', 'skills', 'verify-visual-intent-layer', 'bin', 'lever.mjs');

type LeverResult = { status: number | null; stdout: string; stderr: string; json: Record<string, unknown> | undefined };

function lever(args: string[]): LeverResult {
  const result = spawnSync(process.execPath, [LEVER, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 180000
  });
  const line = result.stdout
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith('{'))
    .pop();
  let json: Record<string, unknown> | undefined;
  try {
    json = line ? (JSON.parse(line) as Record<string, unknown>) : undefined;
  } catch {
    json = undefined;
  }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, json };
}

describe('Lever contract: usage and preconditions at the process boundary', () => {
  it('answers its own help and lists its command groups', () => {
    const result = lever(['help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('health');
    expect(result.stdout).toContain('--dry-run');
  });

  it('classifies a usage error with exit code 2', () => {
    const result = lever(['not-a-command']);
    expect(result.status).toBe(2);
    expect(result.json?.error).toMatchObject({ class: 'usage' });
  });

  it('classifies an unmet precondition with exit code 3', () => {
    const result = lever(['health', '--run', 'no-such-run-anywhere']);
    expect(result.status).toBe(3);
    expect(result.json?.error).toMatchObject({ class: 'precondition' });
  });
});

describe('Lever contract: launch, health, evidence and cleanup', () => {
  const name = `contract-${process.pid}-${Date.now()}`;
  let runDir: string;
  let launch: Record<string, unknown>;
  let cleaned = false;

  beforeAll(() => {
    const result = lever(['launch', '--html', 'fixtures/gallery.html', '--name', name, '--no-build']);
    expect(result.status, result.stderr).toBe(0);
    expect(result.json?.ok).toBe(true);
    launch = result.json as Record<string, unknown>;
    runDir = join(REPO_ROOT, String(launch.runDir));
  }, 180000);

  afterAll(() => {
    if (!cleaned) {
      lever(['cleanup', '--run', name]);
    }
  });

  it('a dry-run launch reports that it would rebuild the product', () => {
    const dry = lever(['launch', '--html', 'fixtures/gallery.html', '--name', 'dry-plan', '--dry-run']);
    expect(dry.status).toBe(0);
    expect(dry.json).toMatchObject({ dryRun: true, would: { build: true, suppressProductBrowser: true } });
  });

  it('reports session identity, base URL and review URL as structured data', () => {
    expect(String(launch.baseUrl)).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(String(launch.reviewUrl)).toContain(`/review/${String(launch.sessionId)}`);
    expect(launch.artifact).toMatchObject({ kind: 'saved-html', displayName: 'gallery.html' });
    expect(String((launch.artifact as Record<string, unknown>).revision)).toMatch(/^blake3:/);
    expect(statSync(join(runDir, 'state.json')).isFile()).toBe(true);
  });

  it('reports an operating-system-chosen ephemeral port and a disposable lifecycle directory', () => {
    expect(Number(launch.baseUrl && new URL(String(launch.baseUrl)).port)).toBeGreaterThan(0);
    expect(String(launch.dataDir)).toBe(join(runDir, 'data'));
    expect(String(launch.dataDir)).not.toContain('.visual-intent-layer/data');
  });

  it('health is read-only and reports liveness, ownership, build freshness and capability', () => {
    const before = lever(['state', '--run', name]);
    const health = lever(['health', '--run', name]);
    const after = lever(['state', '--run', name]);
    expect(health.status).toBe(0);
    expect(health.json).toMatchObject({
      ok: true,
      alive: true,
      owned: true,
      capabilityAuthorised: true,
      stale: false,
      buildFreshness: true
    });
    expect(after.json?.annotations).toEqual(before.json?.annotations);
  });

  it('captures a screenshot of the resulting state as evidence', () => {
    const shot = lever(['screenshot', '--run', name, '--name', 'contract-opened']);
    expect(shot.status).toBe(0);
    const path = String(shot.json?.path);
    expect(existsSync(path)).toBe(true);
    expect(statSync(path).size).toBeGreaterThan(1000);
  });

  it('a dry-run performs no side effect', () => {
    const dry = lever(['cleanup', '--run', name, '--dry-run']);
    expect(dry.status).toBe(0);
    expect(dry.json).toMatchObject({ dryRun: true });
    expect(lever(['health', '--run', name]).json?.ok).toBe(true);
  });

  it('refuses a second run against a lifecycle data directory a live run owns', () => {
    const second = lever(['launch', '--html', 'fixtures/gallery.html', '--data-dir', String(launch.dataDir), '--no-build']);
    expect(second.status).toBe(3);
    expect(String(second.json?.error && (second.json.error as Record<string, unknown>).message)).toContain(
      String(launch.productPid)
    );
  });

  it('classifies an unreachable path with exit code 4 and records it', () => {
    const result = lever(['select', '--run', name, '--tool', 'element', '--target', '.not-in-the-artifact']);
    expect(result.status).toBe(4);
    const record = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as {
      unreachable: Array<{ command: string; precondition: string }>;
    };
    expect(record.unreachable.some((entry) => entry.command.includes('click'))).toBe(true);
  });

  it('never writes the per-session capability into evidence or the run record', () => {
    const capability = new URL(String(launch.reviewUrl)).searchParams.get('cap');
    expect(capability).toBeTruthy();
    const record = readFileSync(join(runDir, 'run.json'), 'utf8');
    const report = readFileSync(join(runDir, 'report.md'), 'utf8');
    expect(record).not.toContain(String(capability));
    expect(report).not.toContain(String(capability));
    for (const entry of readdirSync(join(runDir, 'evidence'))) {
      const path = join(runDir, 'evidence', entry);
      if (!statSync(path).isFile() || !/\.(txt|json|md)$/.test(entry)) continue;
      expect(readFileSync(path, 'utf8')).not.toContain(String(capability));
    }
  });

  it('cleanup removes the instance and data directory and leaves the evidence intact', () => {
    const cleanup = lever(['cleanup', '--run', name]);
    expect(cleanup.status).toBe(0);
    expect(cleanup.json).toMatchObject({ evidenceIntact: true });
    cleaned = true;
    expect(existsSync(join(runDir, 'data'))).toBe(false);
    expect(existsSync(join(runDir, 'evidence', 'contract-opened.png'))).toBe(true);
    const record = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')) as { evidenceIntact: boolean; status: string };
    expect(record.evidenceIntact).toBe(true);
    expect(record.status).toBe('stopped');
  });
});
describe('Lever contract: a first-tier drive', () => {
  const name = `drive-${process.pid}-${Date.now()}`;
  let runDir: string;

  beforeAll(() => {
    const result = lever(['launch', '--html', 'fixtures/gallery.html', '--name', name, '--no-build']);
    expect(result.status, result.stderr).toBe(0);
    runDir = join(REPO_ROOT, String((result.json as Record<string, unknown>).runDir));
  }, 180000);

  afterAll(() => {
    lever(['cleanup', '--run', name]);
  });

  function state(): Record<string, unknown> {
    return lever(['state', '--run', name]).json as Record<string, unknown>;
  }

  function annotations(): Array<Record<string, unknown>> {
    return (state().annotations as Array<Record<string, unknown>>) ?? [];
  }

  function snapshotContains(text: string): boolean {
    const result = lever(['snapshot', '--run', name, '--name', `survival-${Date.now()}`]);
    expect(result.status).toBe(0);
    return readFileSync(String(result.json?.path), 'utf8').includes(text);
  }

  it('drives selection, annotation, queueing, sending, re-resolution and a verdict', () => {
    expect(lever(['select', '--run', name, '--tool', 'element', '--target', '.checkout-submit']).status).toBe(0);
    expect(lever(['annotate', '--run', name, '--note', 'Make it impossible to miss.']).status).toBe(0);
    expect(lever(['queue', '--run', name]).status).toBe(0);
    expect(lever(['send', '--run', name, '--intent', 'next-pass']).status).toBe(0);
    expect(lever(['reload', '--run', name]).status).toBe(0);
    expect(lever(['verify', '--run', name]).status).toBe(0);

    const delivered = annotations()[0]!;
    expect(['delivered', 'resolved']).toContain(delivered.state);
    expect((delivered.resolutions as unknown[]).length).toBeGreaterThan(0);

    const decided = lever(['decide', '--run', name, '--verdict', 'approve']);
    expect(decided.status, decided.stderr).toBe(0);
    const verified = annotations()[0]!;
    expect(verified.state).toBe('verified');
    expect((verified.verification as Record<string, unknown>).verdict).toBe('approve');
  }, 120000);

  it('selects an exact text range through the Text tool', () => {
    expect(lever(['review', '--run', name]).status).toBe(0);
    const selected = lever(['select', '--run', name, '--tool', 'text', '--target', '.gallery-note']);
    expect(selected.status, selected.stderr).toBe(0);
    const textTarget = annotations().some((annotation) =>
      ((annotation.targets as Array<Record<string, unknown>>) ?? []).some((target) => target.kind === 'text-range')
    );
    expect(textTarget).toBe(true);
    expect(lever(['press', '--run', name, '--key', 'Escape']).status).toBe(0);
  }, 60000);

  it('a send dry-run performs no delivery', () => {
    expect(lever(['select', '--run', name, '--tool', 'element', '--target', '.shipping-note']).status).toBe(0);
    expect(lever(['annotate', '--run', name, '--note', 'dry-run only']).status).toBe(0);
    expect(lever(['queue', '--run', name]).status).toBe(0);
    const before = annotations().map((annotation) => annotation.state);
    const dry = lever(['send', '--run', name, '--dry-run']);
    expect(dry.status).toBe(0);
    expect(dry.json).toMatchObject({ dryRun: true });
    const after = annotations();
    expect(after.map((annotation) => annotation.state)).toEqual(before);
    expect(after.every((annotation) => !['delivered', 'resolved'].includes(String(annotation.state)))).toBe(true);
  }, 60000);

  it('sends with each supported delivery timing', () => {
    for (const intent of ['next-pass', 'steering', 'draft']) {
      expect(lever(['select', '--run', name, '--tool', 'element', '--target', '.shipping-note']).status).toBe(0);
      expect(lever(['annotate', '--run', name, '--note', `delivery ${intent}`]).status).toBe(0);
      expect(lever(['queue', '--run', name]).status).toBe(0);
      const sent = lever(['send', '--run', name, '--intent', intent]);
      expect(sent.status, sent.stderr).toBe(0);
      expect(sent.json?.intent).toBe(intent);
      expect(
        annotations().some(
          (annotation) => annotation.note === `delivery ${intent}` && ['delivered', 'resolved'].includes(String(annotation.state))
        )
      ).toBe(true);
    }
  }, 90000);

  it('expresses a relation by direct manipulation and reads it back from stored state', () => {
    const result = lever(['relate', '--run', name, '--operator', 'after', '--from', '.checkout-submit', '--to', '.gallery-note']);
    expect(result.status, result.stderr).toBe(0);
    expect(result.json?.relation).toBeTruthy();
    const withRelation = annotations().find((annotation) => ((annotation.relationships as unknown[]) ?? []).length > 0);
    expect(withRelation).toBeTruthy();
  }, 90000);

  it('never discards writing across a reload, a service restart and a browser restart', () => {
    const note = 'Draft that must survive';
    expect(lever(['select', '--run', name, '--tool', 'element', '--target', '.gallery-note']).status).toBe(0);
    expect(lever(['annotate', '--run', name, '--note', note]).status).toBe(0);
    expect(annotations().some((annotation) => annotation.note === note)).toBe(true);

    expect(lever(['press', '--run', name, '--key', 'Escape']).status).toBe(0);
    expect(annotations().some((annotation) => annotation.note === note)).toBe(true);

    expect(lever(['reload-surface', '--run', name]).status).toBe(0);
    expect(annotations().some((annotation) => annotation.note === note)).toBe(true);
    expect(snapshotContains(note)).toBe(true);

    expect(lever(['restart-service', '--run', name]).status).toBe(0);
    expect(annotations().some((annotation) => annotation.note === note)).toBe(true);

    expect(lever(['restart-browser', '--run', name]).status).toBe(0);
    expect(annotations().some((annotation) => annotation.note === note)).toBe(true);
    expect(snapshotContains(note)).toBe(true);
    expect(existsSync(runDir)).toBe(true);
  }, 150000);
});

describe('Lever contract: every verdict path', () => {
  const name = `verdicts-${process.pid}-${Date.now()}`;

  beforeAll(() => {
    const result = lever(['launch', '--html', 'fixtures/gallery.html', '--name', name, '--no-build']);
    expect(result.status, result.stderr).toBe(0);
  }, 180000);

  afterAll(() => {
    lever(['cleanup', '--run', name]);
  });

  it('drives approve, reject, another-pass, supersede and obsolete and reads each back', () => {
    const targets = ['.checkout-submit', '.gallery-note', 'h1', '.shipping-note', '.gallery'];
    for (const target of targets) {
      expect(lever(['select', '--run', name, '--tool', 'element', '--target', target]).status).toBe(0);
      expect(lever(['annotate', '--run', name, '--note', `verdict path for ${target}`]).status).toBe(0);
      expect(lever(['queue', '--run', name]).status).toBe(0);
    }
    expect(lever(['reorder', '--run', name, '--from', '4', '--direction', 'up']).status).toBe(0);
    expect(lever(['send', '--run', name, '--intent', 'next-pass']).status).toBe(0);
    expect(lever(['verify', '--run', name]).status).toBe(0);

    const verdicts = ['approve', 'reject', 'another-pass', 'supersede', 'obsolete'];
    for (let row = 0; row < verdicts.length; row += 1) {
      const decided = lever(['decide', '--run', name, '--verdict', verdicts[row]!, '--row', String(row)]);
      expect(decided.status, decided.stderr).toBe(0);
    }

    const state = lever(['state', '--run', name]).json as { annotations: Array<Record<string, unknown>> };
    const states = state.annotations.map((annotation) => annotation.state);
    expect(states).toEqual(expect.arrayContaining(['verified', 'rejected', 'another-pass', 'superseded', 'obsolete']));
    const approved = state.annotations.find((annotation) => annotation.state === 'verified')!;
    expect((approved.verification as Record<string, unknown>).verdict).toBe('approve');
  }, 180000);
});
