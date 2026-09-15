import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJsonFile } from '../service/json-file.js';
import type { AnnotationAttachment } from './model.js';

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml'
] as const;

export type AttachmentRecord = AnnotationAttachment & { storedAt: string };

export type AttachmentBytes = { bytes: Buffer; mediaType: string; name?: string };

export class AttachmentStore {
  private readonly dir: string;
  private readonly indexFile: string;

  constructor(dataDir: string) {
    this.dir = join(dataDir, 'attachments');
    this.indexFile = join(this.dir, 'index.json');
    mkdirSync(this.dir, { recursive: true });
  }

  refuseReason(contentType: string | undefined, declaredLength: number | undefined): string | undefined {
    const mediaType = normalizeMediaType(contentType);
    if (!mediaType) {
      return 'A reference image needs a Content-Type header.';
    }
    if (!(ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(mediaType)) {
      return `${mediaType} is not an allowed reference image type (${ALLOWED_ATTACHMENT_TYPES.join(', ')}).`;
    }
    if (declaredLength !== undefined && declaredLength > MAX_ATTACHMENT_BYTES) {
      return `The file is larger than the ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))}MB limit, so it was refused unread.`;
    }
    return undefined;
  }

  put(bytes: Buffer, mediaType: string, name?: string): AttachmentRecord {
    if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
      throw new Error(`The file is larger than the ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))}MB limit.`);
    }
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const attachmentId = `att-${sha256.slice(0, 32)}`;
    writeFileSync(join(this.dir, `${sha256}.bin`), bytes);
    const record: AttachmentRecord = {
      attachmentId,
      mediaType,
      byteLength: bytes.byteLength,
      sha256,
      ...(name ? { name } : {}),
      storedAt: new Date().toISOString()
    };
    const index = this.index();
    index[attachmentId] = record;
    writeFileSync(this.indexFile, JSON.stringify(index, null, 2), 'utf8');
    return record;
  }

  get(attachmentId: string): AttachmentRecord | undefined {
    return this.index()[attachmentId];
  }

  read(attachmentId: string): AttachmentBytes | undefined {
    const record = this.get(attachmentId);
    if (!record) {
      return undefined;
    }
    const file = join(this.dir, `${record.sha256}.bin`);
    if (!existsSync(file)) {
      return undefined;
    }
    return { bytes: readFileSync(file), mediaType: record.mediaType, ...(record.name ? { name: record.name } : {}) };
  }

  private index(): Record<string, AttachmentRecord> {
    return readJsonFile<Record<string, AttachmentRecord>>(this.indexFile, {});
  }
}

function normalizeMediaType(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const [type] = value.split(';');
  return type?.trim().toLowerCase() || undefined;
}