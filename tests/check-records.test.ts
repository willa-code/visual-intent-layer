import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = process.cwd();
const SCRIPT = join(REPO_ROOT, 'scripts', 'check-records.js');
const FIXTURES = join(REPO_ROOT, 'tests', 'fixtures', 'records');

function run(root: string): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [SCRIPT, '--root', root], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('record check: fixture trees prove each failure mode', () => {
  it('passes a tree whose statuses, boxes and triggers agree', () => {
    const result = run(join(FIXTURES, 'passing'));
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('fails an unknown status', () => {
    const result = run(join(FIXTURES, 'unknown-status'));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unknown Status "in-progress"');
  });

  it('fails a file with no Status line', () => {
    const result = run(join(FIXTURES, 'no-status'));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('no Status line');
  });

  it('fails done with an unticked box and no Deferred confirmation', () => {
    const result = run(join(FIXTURES, 'done-with-gap'));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unticked box and no Deferred confirmation');
    expect(result.stderr).toContain('Two');
  });

  it('fails deferred with no Trigger', () => {
    const result = run(join(FIXTURES, 'deferred-without-trigger'));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('deferred with no Trigger line');
  });

  it('fails deferred whose Trigger names no date', () => {
    const result = run(join(FIXTURES, 'deferred-without-date'));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('names no date');
  });

  it('fails an issue file that is not named NN-<slug>.md', () => {
    const result = run(join(FIXTURES, 'bad-filename'));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('not NN-<slug>.md');
  });
});

describe('record check: the real tree', () => {
  it('finds every record consistent', () => {
    const result = run(join(REPO_ROOT, '.scratch'));
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
});
