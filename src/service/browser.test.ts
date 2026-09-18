import { describe, expect, it } from 'vitest';
import { autoOpenSuppressed, openInDefaultBrowser, openerSpec, type OpenerProcess, type OpenerSpec } from './browser.js';

type FakeOpener = {
  spawn: (spec: OpenerSpec) => OpenerProcess;
  specs: OpenerSpec[];
  unrefs: number;
  throws: boolean;
};

function fakeOpener(outcome: 'spawn' | 'error', options: { throws?: boolean } = {}): FakeOpener {
  const fake: FakeOpener = {
    specs: [],
    unrefs: 0,
    throws: options.throws ?? false,
    spawn(spec: OpenerSpec): OpenerProcess {
      fake.specs.push(spec);
      if (fake.throws) {
        throw new Error('spawn failed synchronously');
      }
      const listeners: Record<'spawn' | 'error', Array<() => void>> = { spawn: [], error: [] };
      const child: OpenerProcess = {
        once(event, listener) {
          listeners[event].push(listener);
          return child;
        },
        unref() {
          fake.unrefs += 1;
        }
      };
      queueMicrotask(() => {
        for (const listener of listeners[outcome]) {
          listener();
        }
      });
      return child;
    }
  };
  return fake;
}

describe('browser opening', () => {
  it('names the platform opener', () => {
    expect(openerSpec('http://127.0.0.1:1/review/x', 'darwin')).toEqual({
      command: 'open',
      args: ['http://127.0.0.1:1/review/x']
    });
    expect(openerSpec('http://127.0.0.1:1/review/x', 'win32').command).toBe('cmd');
    expect(openerSpec('http://127.0.0.1:1/review/x', 'linux').command).toBe('xdg-open');
  });

  it('reports a missing opener rather than throwing out of the process', async () => {
    const fake = fakeOpener('error');
    await expect(openInDefaultBrowser('http://127.0.0.1:1/x', fake.spawn)).resolves.toBe(false);
    expect(fake.specs).toHaveLength(1);
  });

  it('reports a synchronous spawn failure as a failure', async () => {
    const fake = fakeOpener('spawn', { throws: true });
    await expect(openInDefaultBrowser('http://127.0.0.1:1/x', fake.spawn)).resolves.toBe(false);
  });

  it('reports success once the opener has started, and detaches it', async () => {
    const fake = fakeOpener('spawn');
    await expect(openInDefaultBrowser('http://127.0.0.1:1/x', fake.spawn)).resolves.toBe(true);
    expect(fake.unrefs).toBe(1);
  });

  it('suppresses auto-open only on a truthy environment value', () => {
    expect(autoOpenSuppressed({})).toBe(false);
    expect(autoOpenSuppressed({ VISUAL_INTENT_NO_OPEN: '0' })).toBe(false);
    expect(autoOpenSuppressed({ VISUAL_INTENT_NO_OPEN: 'false' })).toBe(false);
    expect(autoOpenSuppressed({ VISUAL_INTENT_NO_OPEN: '1' })).toBe(true);
  });
});
