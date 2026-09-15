import { blake3 } from '@noble/hashes/blake3.js';
import { posix } from 'node:path';

export type AssetManifestEntry = {
  path: string;
  digest: string;
};

export function stableArtifactId(sourceUri: string): string {
  const normalized = normalizeSourceUri(sourceUri);
  return `artifact-${blakeHex(Buffer.from(normalized, 'utf8')).slice(0, 32)}`;
}

export function normalizeSourceUri(sourceUri: string): string {
  const trimmed = sourceUri.trim();
  if (trimmed.startsWith('file://')) {
    const rest = trimmed.slice('file://'.length);
    const decoded = decodeURIComponent(rest);
    const normalized = posix.normalize(decoded).replace(/\/+$/, '') || '/';
    return `file://${normalized}`;
  }
  return trimmed.replace(/\/+$/, '');
}

export function computeRevision(canonicalBytes: Uint8Array, manifest: AssetManifestEntry[]): string {
  const sorted = [...manifest].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : a.digest < b.digest ? -1 : 1
  );
  const manifestJson = JSON.stringify(sorted.map((entry) => ({ path: entry.path, digest: entry.digest })));
  const manifestBytes = Buffer.from(manifestJson, 'utf8');
  const preimage = Buffer.concat([
    u32le(canonicalBytes.byteLength),
    Buffer.from(canonicalBytes),
    u32le(manifestBytes.byteLength),
    manifestBytes
  ]);
  return `blake3:${blakeHex(preimage)}`;
}

export function blakeHex(bytes: Uint8Array): string {
  return Buffer.from(blake3(bytes)).toString('hex');
}

function u32le(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value, 0);
  return buffer;
}
