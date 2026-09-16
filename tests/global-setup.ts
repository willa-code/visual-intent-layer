import { execFileSync } from 'node:child_process';

export default function setup(): void {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execFileSync(npm, ['run', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' });
}