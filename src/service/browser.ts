import { spawn } from 'node:child_process';

export type OpenerSpec = { command: string; args: string[] };

export type OpenerProcess = {
  once(event: 'error' | 'spawn', listener: () => void): unknown;
  unref(): void;
};

export type SpawnOpener = (spec: OpenerSpec) => OpenerProcess;

export function autoOpenSuppressed(env: NodeJS.ProcessEnv = process.env): boolean {
  return truthy(env['VISUAL_INTENT_NO_OPEN']);
}

export function openerSpec(url: string, platform: NodeJS.Platform = process.platform): OpenerSpec {
  if (platform === 'darwin') {
    return { command: 'open', args: [url] };
  }
  if (platform === 'win32') {
    return { command: 'cmd', args: ['/c', 'start', '', url] };
  }
  return { command: 'xdg-open', args: [url] };
}

function nodeSpawn(spec: OpenerSpec): OpenerProcess {
  return spawn(spec.command, spec.args, { stdio: 'ignore', detached: true });
}

export async function openInDefaultBrowser(
  url: string,
  spawnOpener: SpawnOpener = nodeSpawn
): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    let child: OpenerProcess;
    try {
      child = spawnOpener(openerSpec(url));
    } catch {
      resolve(false);
      return;
    }
    child.once('spawn', () => {
      child.unref();
      resolve(true);
    });
    child.once('error', () => resolve(false));
  });
}

function truthy(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== '0' && normalized !== 'false' && normalized !== 'no';
}
