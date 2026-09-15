import { spawn } from 'node:child_process';

export function autoOpenSuppressed(env: NodeJS.ProcessEnv = process.env): boolean {
  return truthy(env['VISUAL_INTENT_NO_OPEN']);
}

export function openInDefaultBrowser(url: string): boolean {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
      return true;
    }
    if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
      return true;
    }
    spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
    return true;
  } catch {
    return false;
  }
}

function truthy(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== '0' && normalized !== 'false' && normalized !== 'no';
}