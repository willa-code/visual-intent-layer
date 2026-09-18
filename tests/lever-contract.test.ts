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
    expect(result.stdout).toContain('amend');
    expect(result.stdout).toContain('stop');
    expect(result.stdout).toContain('--tool point');
    expect(result.stdout).toContain('--add');
    expect(result.stdout).toContain('relate');
    expect(result.stdout).toContain('drag --from');
    expect(result.stdout).not.toContain('--tool element');
    expect(result.stdout).not.toContain('Arrange');
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

  it('persists every state read-back as evidence', () => {
    const before = readdirSync(join(runDir, 'evidence')).filter((entry) => entry.startsWith('state-'));
    const result = lever(['state', '--run', name, '--name', 'contract-readback']);
    expect(result.status, result.stderr).toBe(0);
    const path = String(result.json?.evidence);
    expect(path).toContain(join('evidence', 'state-contract-readback-'));
    expect(existsSync(path)).toBe(true);
    expect(JSON.parse(readFileSync(path, 'utf8'))).toMatchObject({
      ok: true,
      command: 'state',
      sessionId: launch.sessionId
    });
    const after = readdirSync(join(runDir, 'evidence')).filter((entry) => entry.startsWith('state-'));
    expect(after.length).toBe(before.length + 1);
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
    const result = lever(['select', '--run', name, '--tool', 'point', '--target', '.not-in-the-artifact']);
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

  it('drives pointing, annotation, queueing, sending, re-resolution and a verdict in place', () => {
    expect(lever(['select', '--run', name, '--tool', 'point', '--target', '.checkout-submit']).status).toBe(0);
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
  }, 180000);

  it('drives pointing at an exact text range, and returning to operating', () => {
    expect(lever(['mode', '--run', name, '--to', 'operate']).status).toBe(0);
    const selected = lever(['select', '--run', name, '--tool', 'point', '--text', '.gallery-note']);
    expect(selected.status, selected.stderr).toBe(0);
    const textTarget = annotations().some((annotation) =>
      ((annotation.targets as Array<Record<string, unknown>>) ?? []).some((target) => target.kind === 'text-range')
    );
    expect(textTarget).toBe(true);
    expect(lever(['press', '--run', name, '--key', 'Escape']).status).toBe(0);
  }, 90000);

  it('boxes an area and records what it encloses', () => {
    const selected = lever(['select', '--run', name, '--tool', 'box', '--from', 'h1', '--to', '.shipping-note']);
    expect(selected.status, selected.stderr).toBe(0);
    const area = annotations().find((annotation) =>
      ((annotation.targets as Array<Record<string, unknown>>) ?? []).some((target) => target.kind === 'region')
    );
    expect(area).toBeTruthy();
    const region = ((area!.targets as Array<Record<string, unknown>>) ?? []).find((target) => target.kind === 'region')!;
    expect(String(region.label)).toMatch(/Area enclosing/);
    expect(lever(['press', '--run', name, '--key', 'Escape']).status).toBe(0);
  }, 90000);

  it('a send dry-run performs no delivery', () => {
    expect(lever(['select', '--run', name, '--tool', 'point', '--target', '.shipping-note']).status).toBe(0);
    expect(lever(['annotate', '--run', name, '--note', 'dry-run only']).status).toBe(0);
    expect(lever(['queue', '--run', name]).status).toBe(0);
    const before = annotations().map((annotation) => annotation.state);
    const dry = lever(['send', '--run', name, '--dry-run']);
    expect(dry.status).toBe(0);
    expect(dry.json).toMatchObject({ dryRun: true });
    const after = annotations();
    expect(after.map((annotation) => annotation.state)).toEqual(before);
    expect(after.every((annotation) => !['delivered', 'resolved'].includes(String(annotation.state)))).toBe(true);
  }, 90000);

  it('rejects a draft intent and any intent the product cannot deliver', () => {
    const draft = lever(['send', '--run', name, '--intent', 'draft']);
    expect(draft.status).toBe(2);
    const steering = lever(['send', '--run', name, '--intent', 'steering']);
    expect(steering.status).toBe(2);
    expect(String(steering.json?.error && (steering.json.error as Record<string, unknown>).message)).toMatch(/different act/);
    expect(String(steering.json?.error && (steering.json.error as Record<string, unknown>).next)).toMatch(/amend/);
  }, 60000);

  it('replaces a sent Annotation with a Replacement delivered as Steering Intent', () => {
    expect(lever(['select', '--run', name, '--tool', 'point', '--target', '.shipping-note']).status).toBe(0);
    expect(lever(['annotate', '--run', name, '--note', 'first wording']).status).toBe(0);
    expect(lever(['queue', '--run', name]).status).toBe(0);
    expect(lever(['send', '--run', name, '--intent', 'next-pass']).status).toBe(0);

    const amended = lever(['amend', '--run', name, '--note', 'clearer wording', '--match', 'first wording']);
    expect(amended.status, amended.stderr).toBe(0);
    expect(amended.json).toMatchObject({ replaced: true, steering: true });

    const original = annotations().find((annotation) => annotation.note === 'first wording');
    const successor = annotations().find((annotation) => annotation.note === 'clearer wording');
    expect(original?.state).toBe('replaced');
    expect(original?.replacedBy).toBe(successor?.annotationId);
    expect(successor?.replaces).toBe(original?.annotationId);
  }, 150000);

  it('asks an agent to stop, and the request is recorded session-scoped', () => {
    const stopped = lever(['stop', '--run', name]);
    expect(stopped.status, stopped.stderr).toBe(0);
    expect(stopped.json).toMatchObject({ requested: true });
    const agent = lever(['state', '--run', name]).json?.agent as Record<string, unknown>;
    expect(agent.pendingInterruption).toBe(true);
    expect(agent.sentence).toMatch(/not waiting|acknowledged|working/);
  }, 90000);

  it('toggles closed rows behind one control', () => {
    const toggled = lever(['closed-rows', '--run', name]);
    expect(toggled.status, toggled.stderr).toBe(0);
    expect(Number(toggled.json?.before)).toBeLessThan(Number(toggled.json?.after));
  }, 90000);

  it('compares a single row\u2019s revisions, and reports the unmet precondition honestly when there is nothing to compare', () => {
    const compared = lever(['compare', '--run', name, '--mode', 'before', '--row', '0']);
    expect([0, 4]).toContain(compared.status);
    if (compared.status === 4) {
      expect(compared.json?.error).toMatchObject({ class: 'unreachable' });
    }
  }, 90000);

  it('never discards writing across a reload, a service restart and a browser restart', () => {
    const note = 'Draft that must survive';
    expect(lever(['select', '--run', name, '--tool', 'point', '--target', '.gallery-note']).status).toBe(0);
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
  }, 180000);
});

describe('Lever contract: every verdict path that remains a row control', () => {
  const name = `verdicts-${process.pid}-${Date.now()}`;

  beforeAll(() => {
    const result = lever(['launch', '--html', 'fixtures/gallery.html', '--name', name, '--no-build']);
    expect(result.status, result.stderr).toBe(0);
  }, 180000);

  afterAll(() => {
    lever(['cleanup', '--run', name]);
  });

  it('drives approve, not-fixed and obsolete, and changes a decision in one act', () => {
    const targets = ['.checkout-submit', '.gallery-note', 'h1'];
    for (const target of targets) {
      expect(lever(['select', '--run', name, '--tool', 'point', '--target', target]).status).toBe(0);
      expect(lever(['annotate', '--run', name, '--note', `verdict path for ${target}`]).status).toBe(0);
      expect(lever(['queue', '--run', name]).status).toBe(0);
    }
    expect(lever(['reorder', '--run', name, '--from', '2', '--direction', 'up']).status).toBe(0);
    expect(lever(['send', '--run', name, '--intent', 'next-pass']).status).toBe(0);
    expect(lever(['verify', '--run', name]).status).toBe(0);

    const verdicts = ['approve', 'not-fixed', 'obsolete'];
    for (let row = 0; row < verdicts.length; row += 1) {
      const decided = lever([
        'decide',
        '--run',
        name,
        '--verdict',
        verdicts[row]!,
        '--match',
        `verdict path for ${targets[row]!}`
      ]);
      expect(decided.status, decided.stderr).toBe(0);
    }

    const changed = lever(['decide', '--run', name, '--verdict', 'not-fixed', '--match', `verdict path for ${targets[0]!}`]);
    expect(changed.status, changed.stderr).toBe(0);

    const state = lever(['state', '--run', name]).json as { annotations: Array<Record<string, unknown>> };
    const byNote = (target: string): Record<string, unknown> =>
      state.annotations.find((annotation) => String(annotation.note).includes(`verdict path for ${target}`))!;
    expect(byNote(targets[1]!).state).toBe('not-fixed');
    expect(byNote(targets[2]!).state).toBe('obsolete');
    expect(byNote(targets[0]!).state).toBe('not-fixed');
    expect((byNote(targets[0]!).verification as Record<string, unknown>).verdict).toBe('not-fixed');

    const amended = lever(['amend', '--run', name, '--note', 'and make it bolder', '--match', `verdict path for ${targets[0]!}`]);
    expect(amended.status, amended.stderr).toBe(0);
    const afterAmend = lever(['state', '--run', name]).json as { annotations: Array<Record<string, unknown>> };
    const replaced = afterAmend.annotations.find(
      (annotation) => String(annotation.note).includes(`verdict path for ${targets[0]!}`) && annotation.state === 'replaced'
    )!;
    expect((replaced.replacedBy as string).length).toBeGreaterThan(0);
  }, 240000);
});

describe('Lever contract: the relation drive', () => {
  const name = `relate-${process.pid}-${Date.now()}`;

  beforeAll(() => {
    const result = lever(['launch', '--html', 'fixtures/relations.html', '--name', name, '--no-build']);
    expect(result.status, result.stderr).toBe(0);
  }, 180000);

  afterAll(() => {
    lever(['cleanup', '--run', name]);
  });

  function relationships(): Array<Record<string, unknown>> {
    const state = lever(['state', '--run', name]).json as { annotations: Array<Record<string, unknown>> };
    return (state.annotations[0]?.relationships as Array<Record<string, unknown>>) ?? [];
  }

  it('builds a set with select --add and records an inferred relation with relate', () => {
    expect(lever(['select', '--run', name, '--tool', 'point', '--target', '.a']).status).toBe(0);
    expect(lever(['select', '--run', name, '--tool', 'point', '--target', '.b', '--add']).status).toBe(0);

    const related = lever(['relate', '--run', name, '--from', '.a', '--to', '.b', '--expect', 'align-left']);
    expect(related.status, related.stderr).toBe(0);
    const recorded = relationships();
    expect(recorded.some((relation) => relation.operator === 'align-left')).toBe(true);
    expect(JSON.stringify(recorded)).not.toMatch(/"(x|y|width|height|left|top|dx|dy|px)"/);
  }, 180000);

  it('records equal spacing across three targets with Alt held', () => {
    expect(lever(['select', '--run', name, '--tool', 'point', '--target', '.a']).status).toBe(0);
    expect(lever(['select', '--run', name, '--tool', 'point', '--target', '.b', '--add']).status).toBe(0);
    expect(lever(['select', '--run', name, '--tool', 'point', '--target', '.c', '--add']).status).toBe(0);

    const related = lever([
      'relate',
      '--run',
      name,
      '--to',
      '.b',
      '--modifier',
      'Alt',
      '--dy',
      '30',
      '--expect',
      'equal-gap'
    ]);
    expect(related.status, related.stderr).toBe(0);
    const spaced = relationships().find((relation) => relation.operator === 'equal-gap');
    expect(spaced).toBeDefined();
    expect((spaced?.targetIds as string[]).length).toBe(3);
  }, 180000);

  it('records an ordering relation by dragging a selected target past another', () => {
    const related = lever(['relate', '--run', name, '--from', '.d', '--to', '.e', '--dx', '30', '--expect', 'after']);
    expect(related.status, related.stderr).toBe(0);
    const recorded = relationships();
    expect(recorded.some((relation) => relation.type === 'ordering' && relation.operator === 'after')).toBe(true);
    expect(JSON.stringify(recorded)).not.toMatch(/"(x|y|width|height|left|top|dx|dy|px)"/);
  }, 180000);

  it('records containment by dropping a selected target inside another', () => {
    const related = lever(['relate', '--run', name, '--from', '.a', '--to', '.b', '--dy', '-50', '--expect', 'member-of']);
    expect(related.status, related.stderr).toBe(0);
    expect(relationships().some((relation) => relation.operator === 'member-of')).toBe(true);
  }, 180000);

  it('records comparative size with Shift held', () => {
    expect(lever(['select', '--run', name, '--tool', 'point', '--target', '.a']).status).toBe(0);
    expect(lever(['select', '--run', name, '--tool', 'point', '--target', '.b', '--add']).status).toBe(0);
    const related = lever([
      'relate',
      '--run',
      name,
      '--to',
      '.b',
      '--modifier',
      'Shift',
      '--dx',
      '30',
      '--expect',
      'same-width'
    ]);
    expect(related.status, related.stderr).toBe(0);
    const recorded = relationships();
    expect(recorded.some((relation) => relation.type === 'comparative-size' && relation.operator === 'same-width')).toBe(
      true
    );
    expect(JSON.stringify(recorded)).not.toMatch(/"(x|y|width|height|left|top|dx|dy|px)"/);
  }, 180000);

  it('records a shared property with Ctrl held', () => {
    expect(lever(['select', '--run', name, '--tool', 'point', '--target', '.a']).status).toBe(0);
    expect(lever(['select', '--run', name, '--tool', 'point', '--target', '.b', '--add']).status).toBe(0);
    const related = lever([
      'relate',
      '--run',
      name,
      '--to',
      '.b',
      '--modifier',
      'Control',
      '--expect',
      'shared-property'
    ]);
    expect(related.status, related.stderr).toBe(0);
    expect(
      relationships().some((relation) => relation.type === 'equivalence' && relation.operator === 'shared-property')
    ).toBe(true);
  }, 180000);

  it('refuses a drag that infers no relation with exit code 4', () => {
    const related = lever(['relate', '--run', name, '--from', '.a', '--to', '.b', '--dx', '240', '--dy', '240']);
    expect(related.status).toBe(4);
    expect(related.json?.error).toMatchObject({ class: 'unreachable' });
  }, 180000);
});

describe('Lever contract: a raw drag, for threshold behaviour', () => {
  const name = `contract-drag-${process.pid}-${Date.now()}`;
  let runDir: string;
  let cleaned = false;

  beforeAll(() => {
    const result = lever(['launch', '--html', 'fixtures/drag-surface.html', '--name', name, '--no-build']);
    expect(result.status, result.stderr).toBe(0);
    runDir = join(REPO_ROOT, String((result.json as Record<string, unknown>).runDir));
  }, 180000);

  afterAll(() => {
    if (!cleaned) {
      cleaned = true;
      lever(['cleanup', '--run', name]);
    }
  });

  function annotations(): Array<Record<string, unknown>> {
    return (lever(['state', '--run', name]).json?.annotations as Array<Record<string, unknown>>) ?? [];
  }

  it('needs --from, and a dry-run reports the offset it would use', () => {
    const missing = lever(['drag', '--run', name, '--dry-run']);
    expect(missing.status).toBe(2);
    expect(missing.json?.error).toMatchObject({ class: 'usage' });

    const planned = lever(['drag', '--run', name, '--from', '.drag-card', '--dx', '60', '--dy', '40', '--dry-run']);
    expect(planned.status).toBe(0);
    expect(planned.json).toMatchObject({ dryRun: true, would: { drag: { from: '.drag-card', dx: 60, dy: 40 } } });
  });

  it('drags in operating mode and creates no Annotation', () => {
    const dragged = lever(['drag', '--run', name, '--from', '.drag-card', '--dx', '60', '--dy', '40', '--frame', 'artifact']);
    expect(dragged.status, dragged.stderr).toBe(0);
    expect(existsSync(String(dragged.json?.screenshot))).toBe(true);
    expect(annotations()).toEqual([]);
  });

  it('the same drag with the point tile armed takes no target instead', () => {
    const armed = lever(['mode', '--run', name, '--to', 'point']);
    expect(armed.status, armed.stderr).toBe(0);
    const dragged = lever(['drag', '--run', name, '--from', '.drag-card', '--dx', '60', '--dy', '40', '--frame', 'artifact']);
    expect(dragged.status, dragged.stderr).toBe(0);
    expect(annotations()).toEqual([]);
  }, 180000);
});
