import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { blakeHex, computeRevision, type AssetManifestEntry } from './revision.js';

export const SOURCE_ROOT_IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.output',
  '.turbo',
  '.cache',
  '.parcel-cache',
  'coverage',
  'tmp',
  '.tmp'
]);

const IGNORED_FILE = /(^|\.)(lock)$|\.(log|tsbuildinfo)$|^package-lock\.json$|^pnpm-lock\.yaml$|^yarn\.lock$/;

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 5000;

export type SourceRootScope = {
  root: string;
  fileCount: number;
  truncated: boolean;
  ignoredDirs: string[];
};

export function computeSourceRootRevision(root: string): string {
  const manifest: AssetManifestEntry[] = [];
  const files: string[] = [];
  collectFilePaths(root, files);
  for (const file of files) {
    if (manifest.length >= MAX_FILES) {
      break;
    }
    try {
      if (lstatSync(file).size > MAX_FILE_BYTES) {
        continue;
      }
      manifest.push({ path: relative(root, file).split(sep).join('/'), digest: blakeHex(readFileSync(file)) });
    } catch {
      continue;
    }
  }
  return computeRevision(Buffer.alloc(0), manifest);
}

export function describeSourceRootScope(root: string): SourceRootScope {
  const files: string[] = [];
  collectFilePaths(root, files);
  return {
    root,
    fileCount: files.length,
    truncated: files.length > MAX_FILES,
    ignoredDirs: [...SOURCE_ROOT_IGNORED_DIRS]
  };
}

function collectFilePaths(dir: string, out: string[]): void {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (out.length >= MAX_FILES) {
      return;
    }
    const path = join(dir, name);
    let stat;
    try {
      stat = lstatSync(path);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) {
      continue;
    }
    if (stat.isDirectory()) {
      if (SOURCE_ROOT_IGNORED_DIRS.has(name)) {
        continue;
      }
      collectFilePaths(path, out);
      continue;
    }
    if (!stat.isFile() || IGNORED_FILE.test(name)) {
      continue;
    }
    out.push(path);
  }
}
