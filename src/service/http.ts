import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { connect, type Socket } from 'node:net';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeRevision } from '../artifact/revision.js';
import { computeSourceRootRevision } from '../artifact/source-root.js';
import {
  applicationContentSecurityPolicy,
  contentSecurityPolicyFor,
  emptyRemoteOrigins,
  injectArtifactLayerScript,
  rewriteCss,
  rewriteHtml,
  type RemoteOrigins
} from '../artifact/fidelity.js';
import { assertLocalAppUrl, fetchAppRevision, type ReviewService } from '../mcp/service.js';
import { resolveTarget, type ResolutionCandidate } from '../resolution/resolve.js';
import { summarise } from '../annotation/model.js';
import type { AnnotationRelation, AnnotationTarget } from '../annotation/model.js';
import { SessionRecords, type SessionRecord } from './sessions.js';

export type LocalServiceOptions = {
  dataDir: string;
  reviewService: ReviewService;
  port?: number;
};

export type OpenedSession = {
  sessionId: string;
  reviewUrl: string;
  artifact: { id: string; kind: string; revision: string; displayName: string };
  capability: string;
  reused: boolean;
};

export type LocalService = {
  baseUrl: string;
  address: string;
  port: number;
  openSession(input: Parameters<ReviewService['openArtifact']>[0]): Promise<OpenedSession>;
  stop(): Promise<void>;
};

type RequestContext = {
  request: IncomingMessage;
  response: ServerResponse;
  review: ReviewService;
  sessions: SessionRecords;
  policies: Map<string, RemoteOrigins>;
};

const MAX_API_BODY_BYTES = 1024 * 1024;
const MAX_ASSET_BYTES = 5 * 1024 * 1024;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

export async function startLocalService(options: LocalServiceOptions): Promise<LocalService> {
  mkdirSync(options.dataDir, { recursive: true });
  const sessions = options.reviewService.sessions;
  const policies = new Map<string, RemoteOrigins>();
  const server = createServer((request, response) => {
    void handleRequest({ request, response, review: options.reviewService, sessions, policies }).catch(
      (error: unknown) => {
        sendText(response, 500, error instanceof Error ? error.message : 'internal error');
      }
    );
  });
  server.on('upgrade', (request, socket, head) => {
    handleUpgrade({ request, socket: socket as Socket, head, sessions });
  });
  const port = await listen(server, options.port ?? 3742);
  const baseUrl = `http://127.0.0.1:${port}`;

  async function openSession(input: Parameters<ReviewService['openArtifact']>[0]): Promise<OpenedSession> {
    const opened = await options.reviewService.openArtifact(input, { baseUrl });
    return {
      sessionId: opened.sessionId,
      reviewUrl: opened.reviewUrl,
      artifact: opened.artifact,
      capability: opened.capability,
      reused: opened.reused
    };
  }

  async function stop(): Promise<void> {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
      server.closeAllConnections?.();
    });
  }

  return { baseUrl, address: '127.0.0.1', port, openSession: openSession as LocalService['openSession'], stop };
}

function listen(server: Server, port: number): Promise<number> {
  return new Promise((resolvePromise, rejectPromise) => {
    const onError = (error: NodeJS.ErrnoException): void => {
      if (error.code === 'EADDRINUSE') {
        rejectPromise(
          new Error(
            `Port ${port} is already in use. Start the service on another port with --port <n>, or stop the process holding port ${port}.`
          )
        );
        return;
      }
      rejectPromise(error);
    };
    server.once('error', onError);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', onError);
      const address = server.address();
      if (address && typeof address === 'object') {
        resolvePromise(address.port);
      } else {
        rejectPromise(new Error('Failed to determine bound port'));
      }
    });
  });
}

async function handleRequest(context: RequestContext): Promise<void> {
  const { request, response, review, sessions, policies } = context;
  if (!isAllowedHost(request)) {
    sendText(response, 403, 'Forbidden: untrusted Host');
    return;
  }
  if (!isAllowedOrigin(request)) {
    sendText(response, 403, 'Forbidden: untrusted Origin');
    return;
  }
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const method = request.method ?? 'GET';
  const path = url.pathname;

  if (method === 'GET' && path === '/health') {
    sendText(response, 200, 'ok');
    return;
  }
  if (method === 'GET' && path === '/favicon.ico') {
    response.writeHead(204, { 'x-content-type-options': 'nosniff' });
    response.end();
    return;
  }
  if (method === 'GET' && path.startsWith('/ui/')) {
    serveUiAsset(response, path.slice('/ui/'.length));
    return;
  }
  if (method === 'GET' && (path === '/gallery' || path === '/gallery/')) {
    serveGallery(response);
    return;
  }

  const reviewMatch = /^\/review\/([^/]+)$/.exec(path);
  if (method === 'GET' && reviewMatch) {
    const session = authorizedOrRefuse(context, reviewMatch[1]!, url);
    if (!session) {
      return;
    }
    if (url.searchParams.has('cap')) {
      rememberSessionCookie(response, session);
    }
    serveReviewShell(response, session);
    return;
  }
  const artifactDocMatch = /^\/artifact\/([^/]+)$/.exec(path);
  if (method === 'GET' && artifactDocMatch) {
    const session = authorizedOrRefuse(context, artifactDocMatch[1]!, url);
    if (!session) {
      return;
    }
    serveArtifactDocument(response, session, policies, review);
    return;
  }
  const artifactBeforeMatch = /^\/artifact\/([^/]+)\/before$/.exec(path);
  if (method === 'GET' && artifactBeforeMatch) {
    const session = authorizedOrRefuse(context, artifactBeforeMatch[1]!, url);
    if (!session) {
      return;
    }
    serveArtifactBefore(response, context.review, session, policies, url.searchParams.get('revision') ?? undefined);
    return;
  }
  const artifactAssetMatch = /^\/artifact\/([^/]+)\/(.+)$/.exec(path);
  if (method === 'GET' && artifactAssetMatch) {
    const session = authorizedOrRefuse(context, artifactAssetMatch[1]!, url);
    if (!session) {
      return;
    }
    serveArtifactAsset(response, session, decodeURIComponent(artifactAssetMatch[2]!));
    return;
  }
  const appMatch = /^\/app\/([^/]+)(\/.*)?$/.exec(path);
  if (appMatch) {
    const session = authorizedOrRefuse(context, appMatch[1]!, url);
    if (!session) {
      return;
    }
    await serveAppProxy(context, session, appMatch[2] ?? '/', url.search);
    return;
  }

  if (path.startsWith('/api/')) {
    await handleApi(context, url, method);
    return;
  }

  sendText(response, 404, 'Not found');
}

async function handleApi(context: RequestContext, url: URL, method: string): Promise<void> {
  const { request, response, review, sessions, policies } = context;
  const path = url.pathname;

  const policyMatch = /^\/api\/sessions\/([^/]+)\/policy$/.exec(path);
  if (method === 'GET' && policyMatch) {
    const session = authorizedOrRefuse(context, policyMatch[1]!, url);
    if (!session) {
      return;
    }
    sendJson(response, 200, await policyFor(session, policies));
    return;
  }

  const adoptedMatch = /^\/api\/sessions\/([^/]+)\/adopted$/.exec(path);
  if (method === 'POST' && adoptedMatch) {
    const session = authorizedOrRefuse(context, adoptedMatch[1]!, url);
    if (!session) {
      return;
    }
    const body = await readJsonBody(request, response);
    if (body === undefined) {
      return;
    }
    const revision = (body as { revision?: unknown }).revision;
    if (typeof revision !== 'string' || revision.length === 0) {
      sendText(response, 400, 'Expected { revision: string }');
      return;
    }
    sessions.put({ ...session, adoptedRevision: revision });
    if ((session.adoptedRevision ?? session.revision) !== revision) {
      review.annotations.markPassesReady(session.artifactId, revision);
    }
    sendJson(response, 200, await sessionStatus(sessions.get(session.sessionId)!));
    return;
  }

  const endMatch = /^\/api\/sessions\/([^/]+)\/end$/.exec(path);
  if (method === 'POST' && endMatch) {
    const session = authorizedOrRefuse(context, endMatch[1]!, url);
    if (!session) {
      return;
    }
    sessions.end(session.sessionId);
    sendJson(response, 200, {
      ended: true,
      message: 'Session ended. The review URL and its capability no longer authorize. Unsent Annotations stay stored on this machine.'
    });
    return;
  }

  const sessionMatch = /^\/api\/sessions\/([^/]+)$/.exec(path);
  if (method === 'GET' && sessionMatch) {
    const session = authorizedOrRefuse(context, sessionMatch[1]!, url);
    if (!session) {
      return;
    }
    sendJson(response, 200, await sessionStatus(session));
    return;
  }

  const annotationsMatch = /^\/api\/sessions\/([^/]+)\/annotations$/.exec(path);
  if (annotationsMatch) {
    const session = authorizedOrRefuse(context, annotationsMatch[1]!, url);
    if (!session) {
      return;
    }
    if (method === 'GET') {
      sendJson(response, 200, annotationSnapshot(review, session));
      return;
    }
    if (method === 'POST') {
      const body = await readJsonBody(request, response);
      if (body === undefined) {
        return;
      }
      const targets = (body as { targets?: unknown }).targets;
      if (!Array.isArray(targets) || targets.length === 0) {
        sendText(response, 400, 'Expected { targets: AnnotationTarget[] }');
        return;
      }
      try {
        const annotation = review.annotations.createDraft({
          artifactId: session.artifactId,
          writtenRevision: session.adoptedRevision ?? session.revision,
          targets: normalizeTargets(targets),
          ...(typeof (body as { note?: unknown }).note === 'string' ? { note: (body as { note: string }).note } : {})
        });
        sendJson(response, 200, { annotation });
      } catch (error) {
        sendText(response, 400, error instanceof Error ? error.message : 'could not create Annotation');
      }
      return;
    }
  }

  const reorderMatch = /^\/api\/sessions\/([^/]+)\/annotations\/reorder$/.exec(path);
  if (method === 'POST' && reorderMatch) {
    const session = authorizedOrRefuse(context, reorderMatch[1]!, url);
    if (!session) {
      return;
    }
    const body = await readJsonBody(request, response);
    if (body === undefined) {
      return;
    }
    const orderedIds = (body as { orderedIds?: unknown }).orderedIds;
    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== 'string')) {
      sendText(response, 400, 'Expected { orderedIds: string[] }');
      return;
    }
    const annotations = review.annotations.reorder(session.artifactId, orderedIds as string[]);
    sendJson(response, 200, { annotations: annotations.map(summarise) });
    return;
  }

  const sendMatch = /^\/api\/sessions\/([^/]+)\/send$/.exec(path);
  if (method === 'POST' && sendMatch) {
    const session = authorizedOrRefuse(context, sendMatch[1]!, url);
    if (!session) {
      return;
    }
    const body = await readJsonBody(request, response);
    const requestedIntent = (body as { intent?: unknown } | undefined)?.intent;
    if (requestedIntent !== undefined && requestedIntent !== 'next-pass') {
      sendText(
        response,
        400,
        'The one send action always delivers Next-Pass Intent. Steering Intent comes from amending a delivered Annotation; Review Interruption comes from asking an agent to stop.'
      );
      return;
    }
    try {
      const outcome = review.sendQueue(session.sessionId, { host: 'browser', intent: 'next-pass' });
      if (!outcome.delivered) {
        sendJson(response, 200, { delivered: false, intent: outcome.intent, reason: outcome.reason });
        return;
      }
      const result = outcome.result;
      sendJson(response, 200, {
        envelopeId: result.pass.envelopeId,
        annotationIds: result.pass.annotationIds,
        intent: result.pass.intent,
        channel: result.channel,
        holding: result.holding,
        idempotencyKey: result.pass.idempotencyKey
      });
    } catch (error) {
      sendText(response, 409, error instanceof Error ? error.message : 'send failed');
    }
    return;
  }

  const amendMatch = /^\/api\/sessions\/([^/]+)\/amend$/.exec(path);
  if (method === 'POST' && amendMatch) {
    const session = authorizedOrRefuse(context, amendMatch[1]!, url);
    if (!session) {
      return;
    }
    const body = await readJsonBody(request, response);
    if (body === undefined) {
      return;
    }
    const annotationId = (body as { annotationId?: unknown }).annotationId;
    if (typeof annotationId !== 'string' || annotationId.length === 0) {
      sendText(response, 400, 'Expected { annotationId: string }');
      return;
    }
    const note = (body as { note?: unknown }).note;
    try {
      const amended = review.amendAnnotation(session.sessionId, annotationId, {
        host: 'browser',
        ...(typeof note === 'string' ? { note } : {})
      });
      sendJson(response, 200, {
        original: amended.original,
        successor: amended.successor,
        envelopeId: amended.delivery.pass.envelopeId,
        intent: amended.delivery.pass.intent,
        channel: amended.delivery.channel,
        holding: amended.delivery.holding
      });
    } catch (error) {
      sendText(response, 409, error instanceof Error ? error.message : 'amendment refused');
    }
    return;
  }

  const interruptionMatch = /^\/api\/sessions\/([^/]+)\/interruptions$/.exec(path);
  if (method === 'POST' && interruptionMatch) {
    const session = authorizedOrRefuse(context, interruptionMatch[1]!, url);
    if (!session) {
      return;
    }
    const record = review.requestInterruption(session.sessionId, { host: 'browser' });
    sendJson(response, 200, {
      interruptionId: record.interruptionId,
      requestedAt: record.requestedAt,
      message: 'Stop requested. Your agent sees this at its next Check-In; nothing has been stopped yet.'
    });
    return;
  }

  const adoptMatch = /^\/api\/sessions\/([^/]+)\/reload$/.exec(path);
  if (method === 'POST' && adoptMatch) {
    const session = authorizedOrRefuse(context, adoptMatch[1]!, url);
    if (!session) {
      return;
    }
    const status = await sessionStatus(session);
    const current = typeof status['currentRevision'] === 'string' ? status['currentRevision'] : session.revision;
    sessions.put({ ...session, adoptedRevision: current });
    saveAdoptedSnapshot(review, session, current);
    review.annotations.markPassesReady(session.artifactId, current);
    const reloaded = sessions.get(session.sessionId)!;
    sendJson(response, 200, await sessionStatus(reloaded));
    return;
  }

  const closePassMatch = /^\/api\/passes\/([^/]+)\/close$/.exec(path);
  if (method === 'POST' && closePassMatch) {
    const passId = decodeURIComponent(closePassMatch[1]!);
    const pass = review.annotations.getPass(passId);
    if (!pass) {
      sendText(response, 404, `Unknown Pass ${passId}`);
      return;
    }
    const session = sessions.findByArtifact(pass.artifactId);
    if (!session || !authorize(context, session.sessionId, url)) {
      sendText(response, 401, 'Unauthorized');
      return;
    }
    sendJson(response, 200, { pass: review.annotations.closePass(passId) });
    return;
  }

  const agentMatch = /^\/api\/sessions\/([^/]+)\/agent$/.exec(path);
  if (method === 'GET' && agentMatch) {
    const session = authorizedOrRefuse(context, agentMatch[1]!, url);
    if (!session) {
      return;
    }
    sendJson(response, 200, review.agentPosition(session.sessionId));
    return;
  }

  const resolveMatch = /^\/api\/annotations\/([^/]+)\/resolve$/.exec(path);
  if (method === 'POST' && resolveMatch) {
    const annotationId = decodeURIComponent(resolveMatch[1]!);
    const annotation = review.annotations.get(annotationId);
    if (!annotation) {
      sendText(response, 404, `Unknown Annotation ${annotationId}`);
      return;
    }
    const session = sessions.findByArtifact(annotation.artifactId);
    if (!session || !authorize(context, session.sessionId, url)) {
      sendText(response, 401, 'Unauthorized');
      return;
    }
    const body = await readJsonBody(request, response);
    if (body === undefined) {
      return;
    }
    const revision = (body as { revision?: unknown }).revision;
    const candidates = (body as { candidates?: unknown }).candidates;
    const viewedAddress = (body as { address?: unknown }).address;
    if (typeof revision !== 'string' || !Array.isArray(candidates)) {
      sendText(response, 400, 'Expected { revision: string, candidates: ResolutionCandidate[] }');
      return;
    }
    const resolutions = annotation.targets.map((target) =>
      resolveTarget(
        target,
        candidates as ResolutionCandidate[],
        typeof viewedAddress === 'string' ? { viewedAddress } : {}
      )
    );
    review.annotations.noteRevisionAdvance(annotation.artifactId, revision);
    const updated = review.annotations.recordResolutions(annotationId, resolutions, revision);
    sendJson(response, 200, { annotation: updated, resolutions });
    return;
  }

  const repointMatch = /^\/api\/annotations\/([^/]+)\/repoint$/.exec(path);
  if (method === 'POST' && repointMatch) {
    const annotationId = decodeURIComponent(repointMatch[1]!);
    const annotation = review.annotations.get(annotationId);
    if (!annotation) {
      sendText(response, 404, `Unknown Annotation ${annotationId}`);
      return;
    }
    const session = sessions.findByArtifact(annotation.artifactId);
    if (!session || !authorize(context, session.sessionId, url)) {
      sendText(response, 401, 'Unauthorized');
      return;
    }
    const body = await readJsonBody(request, response);
    if (body === undefined) {
      return;
    }
    const targets = (body as { targets?: unknown }).targets;
    if (!Array.isArray(targets) || targets.length === 0) {
      sendText(response, 400, 'Expected { targets: AnnotationTarget[] }');
      return;
    }
    const relationships = (body as { relationships?: unknown }).relationships;
    try {
      const updated = review.annotations.repoint(
        annotationId,
        normalizeTargets(targets),
        Array.isArray(relationships) ? (relationships as AnnotationRelation[]) : undefined
      );
      sendJson(response, 200, { annotation: updated });
    } catch (error) {
      sendText(response, 409, error instanceof Error ? error.message : 're-point refused');
    }
    return;
  }

  const verifyMatch = /^\/api\/annotations\/([^/]+)\/verify$/.exec(path);
  if (method === 'POST' && verifyMatch) {
    const annotationId = decodeURIComponent(verifyMatch[1]!);
    const annotation = review.annotations.get(annotationId);
    if (!annotation) {
      sendText(response, 404, `Unknown Annotation ${annotationId}`);
      return;
    }
    const session = sessions.findByArtifact(annotation.artifactId);
    if (!session || !authorize(context, session.sessionId, url)) {
      sendText(response, 401, 'Unauthorized');
      return;
    }
    const body = await readJsonBody(request, response);
    if (body === undefined) {
      return;
    }
    const verdict = (body as { verdict?: unknown }).verdict;
    if (!isVerdict(verdict)) {
      sendText(response, 400, 'Invalid verdict: expected approve, not-fixed, or obsolete');
      return;
    }
    try {
      const updated = review.annotations.verify(annotationId, verdict, {
        ...(typeof (body as { successorId?: unknown }).successorId === 'string'
          ? { successorId: (body as { successorId: string }).successorId }
          : {})
      });
      sendJson(response, 200, { annotation: updated });
    } catch (error) {
      sendText(response, 409, error instanceof Error ? error.message : 'verification refused');
    }
    return;
  }

  const reopenMatch = /^\/api\/annotations\/([^/]+)\/reopen$/.exec(path);
  if (method === 'POST' && reopenMatch) {
    const annotationId = decodeURIComponent(reopenMatch[1]!);
    const annotation = review.annotations.get(annotationId);
    if (!annotation) {
      sendText(response, 404, `Unknown Annotation ${annotationId}`);
      return;
    }
    const session = sessions.findByArtifact(annotation.artifactId);
    if (!session || !authorize(context, session.sessionId, url)) {
      sendText(response, 401, 'Unauthorized');
      return;
    }
    try {
      sendJson(response, 200, { annotation: review.annotations.reopenVerdict(annotationId) });
    } catch (error) {
      sendText(response, 409, error instanceof Error ? error.message : 'reopen refused');
    }
    return;
  }

  const queueMatch = /^\/api\/annotations\/([^/]+)\/queue$/.exec(path);
  if (method === 'POST' && queueMatch) {
    const annotationId = decodeURIComponent(queueMatch[1]!);
    const annotation = review.annotations.get(annotationId);
    if (!annotation) {
      sendText(response, 404, `Unknown Annotation ${annotationId}`);
      return;
    }
    const session = sessions.findByArtifact(annotation.artifactId);
    if (!session || !authorize(context, session.sessionId, url)) {
      sendText(response, 401, 'Unauthorized');
      return;
    }
    sendJson(response, 200, { annotation: review.annotations.queue(annotationId) });
    return;
  }

  const annotationMatch = /^\/api\/annotations\/([^/]+)$/.exec(path);
  if (annotationMatch) {
    const annotationId = decodeURIComponent(annotationMatch[1]!);
    const annotation = review.annotations.get(annotationId);
    if (!annotation) {
      sendText(response, 404, `Unknown Annotation ${annotationId}`);
      return;
    }
    const session = sessions.findByArtifact(annotation.artifactId);
    if (!session || !authorize(context, session.sessionId, url)) {
      sendText(response, 401, 'Unauthorized');
      return;
    }
    if (method === 'PATCH') {
      const body = await readJsonBody(request, response);
      if (body === undefined) {
        return;
      }
      try {
        const patch = { ...(body as Record<string, unknown>) };
        if (Array.isArray(patch['targets'])) {
          patch['targets'] = normalizeTargets(patch['targets'] as unknown[]);
        }
        const updated = review.annotations.update(annotationId, patch as never);
        sendJson(response, 200, { annotation: updated });
      } catch (error) {
        sendText(response, 400, error instanceof Error ? error.message : 'update failed');
      }
      return;
    }
    if (method === 'DELETE') {
      review.annotations.delete(annotationId);
      sendJson(response, 200, { deleted: annotationId });
      return;
    }
    if (method === 'GET') {
      sendJson(response, 200, { annotation });
      return;
    }
  }

  const attachAddMatch = /^\/api\/annotations\/([^/]+)\/attachments$/.exec(path);
  if (method === 'POST' && attachAddMatch) {
    const annotationId = decodeURIComponent(attachAddMatch[1]!);
    const annotation = review.annotations.get(annotationId);
    if (!annotation) {
      sendText(response, 404, `Unknown Annotation ${annotationId}`);
      return;
    }
    const session = sessions.findByArtifact(annotation.artifactId);
    if (!session || !authorize(context, session.sessionId, url)) {
      sendText(response, 401, 'Unauthorized');
      return;
    }
    const declaredLength = Number(request.headers['content-length']);
    const contentType = request.headers['content-type'];
    const mediaType = Array.isArray(contentType) ? contentType[0] : contentType;
    const refused = review.attachments.refuseReason(mediaType, Number.isFinite(declaredLength) ? declaredLength : undefined);
    if (refused) {
      sendText(response, 415, refused);
      return;
    }
    const bytes = await readBoundedBinary(request, response, 5 * 1024 * 1024);
    if (bytes === undefined) {
      return;
    }
    const record = review.attachments.put(bytes, normalizeMedia(mediaType), url.searchParams.get('name') ?? undefined);
    const updated = review.annotations.addAttachment(annotationId, {
      attachmentId: record.attachmentId,
      mediaType: record.mediaType,
      byteLength: record.byteLength,
      sha256: record.sha256,
      ...(record.name ? { name: record.name } : {})
    });
    sendJson(response, 200, { annotation: updated, attachment: record });
    return;
  }

  const attachRemoveMatch = /^\/api\/annotations\/([^/]+)\/attachments\/([^/]+)$/.exec(path);
  if (method === 'DELETE' && attachRemoveMatch) {
    const annotationId = decodeURIComponent(attachRemoveMatch[1]!);
    const attachmentId = decodeURIComponent(attachRemoveMatch[2]!);
    const annotation = review.annotations.get(annotationId);
    if (!annotation) {
      sendText(response, 404, `Unknown Annotation ${annotationId}`);
      return;
    }
    const session = sessions.findByArtifact(annotation.artifactId);
    if (!session || !authorize(context, session.sessionId, url)) {
      sendText(response, 401, 'Unauthorized');
      return;
    }
    const updated = review.annotations.removeAttachment(annotationId, attachmentId);
    sendJson(response, 200, { annotation: updated });
    return;
  }

  const attachmentGetMatch = /^\/api\/attachments\/([^/]+)$/.exec(path);
  if (method === 'GET' && attachmentGetMatch) {
    const attachmentId = decodeURIComponent(attachmentGetMatch[1]!);
    const bytes = review.attachments.read(attachmentId);
    if (!bytes) {
      sendText(response, 404, 'Unknown attachment');
      return;
    }
    response.writeHead(200, {
      'content-type': bytes.mediaType,
      'content-length': String(bytes.bytes.byteLength),
      'x-content-type-options': 'nosniff'
    });
    response.end(bytes.bytes);
    return;
  }

  if (method === 'POST' && path === '/api/intents') {
    const session = authorizedOrRefuse(context, url.searchParams.get('session') ?? '', url);
    if (!session) {
      return;
    }
    const body = await readJsonBody(request, response);
    if (body === undefined) {
      return;
    }
    const envelopeJson = (body as { envelope?: unknown }).envelope ?? body;
    try {
      const submitted = await review.submitEnvelope(envelopeJson, { host: 'browser' });
      sendJson(response, 200, submitted);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'submit failed';
      sendText(response, message.startsWith('Invalid Visual Intent Envelope') ? 400 : 409, message);
    }
    return;
  }

  const legacyStatusMatch = /^\/api\/intents\/([^/]+)$/.exec(path);
  if (method === 'GET' && legacyStatusMatch) {
    try {
      sendJson(response, 200, review.getBatchStatus(decodeURIComponent(legacyStatusMatch[1]!)));
    } catch (error) {
      sendText(response, 404, error instanceof Error ? error.message : 'not found');
    }
    return;
  }
  const legacyAckMatch = /^\/api\/intents\/([^/]+)\/acknowledge$/.exec(path);
  if (method === 'POST' && legacyAckMatch) {
    const body = await readJsonBody(request, response);
    if (body === undefined) {
      return;
    }
    const agentId = (body as { agentId?: unknown }).agentId;
    if (typeof agentId !== 'string') {
      sendText(response, 400, 'Expected { agentId: string }');
      return;
    }
    const envelopeId = decodeURIComponent(legacyAckMatch[1]!);
    const batch = review.annotations.getPass(envelopeId);
    const session = batch ? sessions.findByArtifact(batch.artifactId) : undefined;
    if (!session || !authorize(context, session.sessionId, url)) {
      sendText(response, 401, 'Unauthorized');
      return;
    }
    sendJson(response, 200, await review.acknowledge(envelopeId, agentId));
    return;
  }

  sendText(response, 404, 'Not found');
}

function annotationSnapshot(review: ReviewService, session: SessionRecord): Record<string, unknown> {
  const annotations = review.annotations.listArtifact(session.artifactId);
  return {
    sessionId: session.sessionId,
    artifact: {
      id: session.artifactId,
      kind: session.kind,
      revision: session.revision,
      displayName: session.displayName,
      source: session.source
    },
    annotations,
    summaries: annotations.map(summarise),
    agent: review.agentPosition(session.sessionId),
    migration: review.annotations.migrationReport(),
    passes: review.annotations.listPassesOfArtifact(session.artifactId).map((pass) => ({
      passId: pass.passId,
      envelopeId: pass.envelopeId,
      state: pass.state,
      fromRevision: pass.fromRevision,
      ...(pass.toRevision ? { toRevision: pass.toRevision } : {}),
      annotationIds: pass.annotationIds,
      outcome: pass.outcome,
      intent: pass.intent,
      openedAt: pass.openedAt,
      ...(pass.closedAt ? { closedAt: pass.closedAt } : {})
    }))
  };
}

async function policyFor(session: SessionRecord, policies: Map<string, RemoteOrigins>): Promise<Record<string, unknown>> {
  if (session.kind !== 'saved-html') {
    return {
      kind: 'proxied-application',
      remoteOrigins: [],
      byKind: emptyRemoteOrigins(),
      contactsRemote: false,
      application: {
        proxiedBase: `/app/${session.sessionId}/`,
        permits: ['This application through the review origin', 'Form submissions and the update channel as this application sends them'],
        note: 'The policy permits this application\'s own requests through the proxied origin and refuses every other origin. Its update channel is proxied, so the artifact can report its own revision.'
      }
    };
  }
  const cached = policies.get(session.sessionId);
  if (cached) {
    return policyPayload(cached);
  }
  const remote = await computeRemoteOrigins(session);
  policies.set(session.sessionId, remote);
  return policyPayload(remote);
}

function policyPayload(remote: RemoteOrigins): Record<string, unknown> {
  const allowed = [...new Set([...remote.stylesheet, ...remote.font, ...remote.image])];
  return {
    kind: 'saved-html',
    remoteOrigins: allowed,
    byKind: remote,
    contactsRemote: allowed.length > 0
  };
}

async function computeRemoteOrigins(session: SessionRecord): Promise<RemoteOrigins> {
  if (session.kind !== 'saved-html') {
    return emptyRemoteOrigins();
  }
  const absolute = artifactFile(session);
  if (!absolute || !existsSync(absolute)) {
    return emptyRemoteOrigins();
  }
  try {
    const html = readFileSync(absolute, 'utf8');
    const base = `/artifact/${session.sessionId}`;
    const dir = dirnameOf(absolute);
    const analysis = rewriteHtml(html, base, (relative) => {
      const confined = confinePath(dir, join(dir, relative));
      if (!confined || !existsSync(confined) || lstatSync(confined).size > MAX_ASSET_BYTES) {
        return undefined;
      }
      return readFileSync(confined, 'utf8');
    });
    return analysis.remote;
  } catch {
    return emptyRemoteOrigins();
  }
}

function authorizedOrRefuse(context: RequestContext, sessionId: string, url: URL): SessionRecord | undefined {
  const session = authorize(context, sessionId, url);
  if (!session) {
    sendText(context.response, 401, 'Unauthorized: missing or invalid session capability');
    return undefined;
  }
  return session;
}

function authorize(context: RequestContext, sessionId: string, url: URL): SessionRecord | undefined {
  const capability = capabilityFrom(context.request, url);
  if (!sessionId || !capability) {
    return undefined;
  }
  return context.sessions.authorized(sessionId, capability);
}

function capabilityFrom(request: IncomingMessage, url: URL): string | undefined {
  const header = request.headers['x-session-cap'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  if (fromHeader) {
    return fromHeader;
  }
  const fromQuery = url.searchParams.get('cap');
  if (fromQuery) {
    return fromQuery;
  }
  const cookie = parseCookies(request.headers.cookie ?? '');
  return cookie['vil_cap'];
}

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) {
      continue;
    }
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) {
      out[name] = decodeURIComponent(value);
    }
  }
  return out;
}

function rememberSessionCookie(response: ServerResponse, session: SessionRecord): void {
  response.setHeader('set-cookie', [
    `vil_session=${encodeURIComponent(session.sessionId)}; Path=/; HttpOnly; SameSite=Strict`,
    `vil_cap=${encodeURIComponent(session.capability)}; Path=/; HttpOnly; SameSite=Strict`
  ]);
}

function isAllowedHost(request: IncomingMessage): boolean {
  const host = (request.headers['host'] ?? '').toLowerCase();
  return (
    host.startsWith('127.0.0.1:') ||
    host === '127.0.0.1' ||
    host.startsWith('localhost:') ||
    host === 'localhost' ||
    host.startsWith('[::1]')
  );
}

function isAllowedOrigin(request: IncomingMessage): boolean {
  const origin = request.headers['origin'];
  if (!origin) {
    return true;
  }
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  return (
    (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '::1') &&
    (parsed.protocol === 'http:' || parsed.protocol === 'https:')
  );
}

function artifactFile(session: SessionRecord): string | undefined {
  if (session.kind !== 'saved-html' || !session.source.startsWith('file://')) {
    return undefined;
  }
  return session.source.slice('file://'.length);
}

function saveAdoptedSnapshot(review: ReviewService, session: SessionRecord, revision: string): void {
  const absolute = artifactFile(session);
  if (!absolute || !existsSync(absolute)) {
    return;
  }
  try {
    review.snapshots.save(session.artifactId, revision, readFileSync(absolute));
  } catch {
    return;
  }
}

async function sessionStatus(session: SessionRecord): Promise<Record<string, unknown>> {
  const adoptedRevision = session.adoptedRevision ?? session.revision;
  const base = {
    sessionId: session.sessionId,
    artifactId: session.artifactId,
    openedRevision: session.revision,
    adoptedRevision
  };
  const absolute = artifactFile(session);
  if (absolute) {
    try {
      const bytes = readFileSync(absolute);
      const revision = computeRevision(bytes, []);
      return {
        ...base,
        revisionBasis: 'document',
        currentRevision: revision,
        changed: revision !== adoptedRevision
      };
    } catch {
      return {
        ...base,
        revisionBasis: 'document',
        currentRevision: adoptedRevision,
        changed: false,
        unreadable: true
      };
    }
  }
  if (session.kind === 'react-vite-app') {
    try {
      const revision = session.sourceRoot
        ? computeSourceRootRevision(session.sourceRoot)
        : await fetchAppRevision(session.source);
      return {
        ...base,
        revisionBasis: session.sourceRoot ? 'files' : 'document',
        currentRevision: revision,
        changed: revision !== adoptedRevision
      };
    } catch {
      return {
        ...base,
        revisionBasis: session.sourceRoot ? 'files' : 'document',
        currentRevision: adoptedRevision,
        changed: false,
        unreadable: true
      };
    }
  }
  return {
    ...base,
    revisionBasis: 'document',
    currentRevision: adoptedRevision,
    changed: false
  };
}

function serveReviewShell(response: ServerResponse, session: SessionRecord): void {
  const template = readUiFile('shell.html');
  const html = template
    .replaceAll('__SESSION_ID__', encodeHtml(session.sessionId))
    .replaceAll('__CAPABILITY__', encodeHtml(session.capability))
    .replaceAll('__ARTIFACT_ID__', encodeHtml(session.artifactId))
    .replaceAll('__ARTIFACT_NAME__', encodeHtml(session.displayName))
    .replaceAll('__ARTIFACT_REVISION__', encodeHtml(session.adoptedRevision ?? session.revision))
    .replaceAll('__ARTIFACT_KIND__', encodeHtml(session.kind))
    .replaceAll('__ARTIFACT_SRC__', encodeHtml(`/artifact/${session.sessionId}`));
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy':
      "default-src 'self'; frame-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'",
    'x-content-type-options': 'nosniff'
  });
  response.end(html);
}

function serveArtifactDocument(
  response: ServerResponse,
  session: SessionRecord,
  policies: Map<string, RemoteOrigins>,
  review: ReviewService
): void {
  if (session.kind === 'react-vite-app') {
    response.writeHead(302, { location: `/app/${session.sessionId}/`, 'x-content-type-options': 'nosniff' });
    response.end();
    return;
  }
  const absolute = artifactFile(session);
  if (!absolute) {
    sendText(response, 501, 'Unknown artifact kind');
    return;
  }
  if (!existsSync(absolute)) {
    sendText(response, 404, 'Artifact file no longer exists');
    return;
  }
  const confined = confinePath(dirnameOf(absolute), absolute);
  if (!confined) {
    sendText(response, 403, 'Artifact path escapes its directory');
    return;
  }
  const bytes = readFileSync(confined);
  if (bytes.byteLength > MAX_ASSET_BYTES) {
    sendText(response, 413, 'Artifact exceeds the bounded size for local review');
    return;
  }
  const base = `/artifact/${session.sessionId}`;
  const dir = dirnameOf(confined);
  const analysis = rewriteHtml(bytes.toString('utf8'), base, (relative) => {
    const cssPath = confinePath(dir, join(dir, relative));
    if (!cssPath || !existsSync(cssPath) || lstatSync(cssPath).size > MAX_ASSET_BYTES) {
      return undefined;
    }
    return readFileSync(cssPath, 'utf8');
  });
  policies.set(session.sessionId, analysis.remote);
  const currentRevision = computeRevision(bytes, []);
  if (session.kind === 'saved-html') {
    review.snapshots.save(session.artifactId, currentRevision, bytes);
  }
  const html = injectArtifactLayerScript(analysis.html, session.sessionId, {
    'data-revision': currentRevision,
    'data-mode': 'after',
    'data-address-base': base
  });
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': contentSecurityPolicyFor(analysis.remote),
    'x-content-type-options': 'nosniff'
  });
  response.end(html);
}

function serveArtifactBefore(
  response: ServerResponse,
  review: ReviewService,
  session: SessionRecord,
  policies: Map<string, RemoteOrigins>,
  requestedRevision?: string
): void {
  const revision = requestedRevision ?? session.revision;
  const snapshot = review.snapshots.read(session.artifactId, revision);
  if (!snapshot) {
    serveArtifactDocument(response, session, policies, review);
    return;
  }
  const base = `/artifact/${session.sessionId}`;
  const analysis = rewriteHtml(snapshot.toString('utf8'), base);
  const html = injectArtifactLayerScript(analysis.html, session.sessionId, {
    'data-revision': revision,
    'data-mode': 'before',
    'data-address-base': base
  });
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': contentSecurityPolicyFor(analysis.remote),
    'x-content-type-options': 'nosniff'
  });
  response.end(html);
}

async function serveAppProxy(
  context: RequestContext,
  session: SessionRecord,
  upstreamPath: string,
  search: string
): Promise<void> {
  const { request, response } = context;
  if (session.kind !== 'react-vite-app') {
    sendText(response, 404, 'Not an application session');
    return;
  }
  let upstream: URL;
  try {
    assertLocalAppUrl(session.source);
    upstream = new URL(`/${upstreamPath.replace(/^\/+/, '')}${search}`, session.source);
    assertLocalAppUrl(upstream.toString());
  } catch (error) {
    sendText(response, 403, error instanceof Error ? error.message : 'refused upstream');
    return;
  }
  const method = request.method ?? 'GET';
  const carriesBody = method !== 'GET' && method !== 'HEAD';
  let body: Buffer | undefined;
  if (carriesBody) {
    body = await readBoundedBinary(request, response, MAX_API_BODY_BYTES);
    if (body === undefined) {
      return;
    }
  }
  try {
    const upstreamResponse = await fetch(upstream, {
      method,
      headers: forwardedHeaders(request),
      redirect: 'manual',
      ...(body && body.byteLength > 0 ? { body: body as unknown as BodyInit } : {})
    });
    const location = upstreamResponse.headers.get('location');
    if (location) {
      const rewritten = rewriteRedirectLocation(location, upstream, session);
      if (!rewritten) {
        sendText(response, 502, `Upstream redirected off the review origin: ${location}`);
        return;
      }
      response.writeHead(upstreamResponse.status, { location: rewritten, 'x-content-type-options': 'nosniff' });
      response.end();
      return;
    }
    const bytes = Buffer.from(await upstreamResponse.arrayBuffer());
    if (bytes.byteLength > MAX_ASSET_BYTES) {
      sendText(response, 413, 'Upstream asset exceeds the bounded size for local review');
      return;
    }
    const contentType = upstreamResponse.headers.get('content-type') ?? '';
    if (method === 'HEAD') {
      response.writeHead(upstreamResponse.status, {
        'content-type': contentType || 'application/octet-stream',
        'x-content-type-options': 'nosniff'
      });
      response.end();
      return;
    }
    if (contentType.includes('text/html')) {
      const base = `/app/${session.sessionId}`;
      const analysis = rewriteHtml(bytes.toString('utf8'), base);
      const html = injectArtifactLayerScript(analysis.html, session.sessionId, {
        'data-revision': session.adoptedRevision ?? session.revision,
        'data-mode': 'after',
        'data-address-base': base
      });
      response.writeHead(upstreamResponse.status, {
        'content-type': contentType,
        'content-security-policy': applicationContentSecurityPolicy(),
        'x-content-type-options': 'nosniff'
      });
      response.end(html);
      return;
    }
    if (contentType.includes('text/css')) {
      const rewritten = rewriteCss(bytes.toString('utf8'), `/app/${session.sessionId}`);
      response.writeHead(upstreamResponse.status, {
        'content-type': contentType,
        'x-content-type-options': 'nosniff'
      });
      response.end(rewritten.css);
      return;
    }
    response.writeHead(upstreamResponse.status, {
      'content-type': contentType || 'application/octet-stream',
      'x-content-type-options': 'nosniff'
    });
    response.end(bytes);
  } catch (error) {
    sendText(response, 502, error instanceof Error ? error.message : 'upstream unreachable');
  }
}

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length'
]);

function forwardedHeaders(request: IncomingMessage): Record<string, string> {
  const forwarded: Record<string, string> = {};
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) {
      continue;
    }
    const lower = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower) || lower === 'x-session-cap') {
      continue;
    }
    if (lower === 'cookie') {
      const cookies = stripReviewCookies(Array.isArray(value) ? value.join('; ') : value);
      if (cookies.length > 0) {
        forwarded['cookie'] = cookies;
      }
      continue;
    }
    forwarded[lower] = Array.isArray(value) ? value.join(', ') : value;
  }
  return forwarded;
}

function stripReviewCookies(header: string): string {
  return header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !/^vil_(cap|session)=/.test(part))
    .join('; ');
}

function rewriteRedirectLocation(location: string, upstream: URL, session: SessionRecord): string | undefined {
  let target: URL;
  try {
    target = new URL(location, upstream);
  } catch {
    return undefined;
  }
  if (target.origin !== upstream.origin) {
    try {
      assertLocalAppUrl(target.toString());
    } catch {
      return undefined;
    }
    return undefined;
  }
  const relative = `${target.pathname}${target.search}${target.hash}`.replace(/^\/+/, '');
  return `/app/${session.sessionId}/${relative}`;
}

function handleUpgrade(input: {
  request: IncomingMessage;
  socket: Socket;
  head: Buffer;
  sessions: SessionRecords;
}): void {
  const { request, socket, head, sessions } = input;
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const match = /^\/app\/([^/]+)(\/.*)?$/.exec(url.pathname);
  if (!match) {
    socket.destroy();
    return;
  }
  const session = sessions.authorized(match[1]!, capabilityFrom(request, url) ?? null);
  if (!session || session.kind !== 'react-vite-app') {
    socket.destroy();
    return;
  }
  let upstream: URL;
  try {
    assertLocalAppUrl(session.source);
    upstream = new URL(`${match[2] ?? '/'}${url.search}`, session.source);
    assertLocalAppUrl(upstream.toString());
  } catch {
    socket.destroy();
    return;
  }
  const port = Number(upstream.port || (upstream.protocol === 'https:' ? 443 : 80));
  const upstreamSocket = connect(port, upstream.hostname, () => {
    try {
      upstreamSocket.write(
        `${request.method ?? 'GET'} ${upstream.pathname}${upstream.search} HTTP/1.1\r\n${forwardedUpgradeHeaders(request, upstream)}\r\n\r\n`
      );
      if (head.length > 0) {
        upstreamSocket.write(head);
      }
      upstreamSocket.pipe(socket);
      socket.pipe(upstreamSocket);
    } catch {
      socket.destroy();
      upstreamSocket.destroy();
    }
  });
  const closeBoth = (): void => {
    upstreamSocket.destroy();
    socket.destroy();
  };
  upstreamSocket.on('error', closeBoth);
  upstreamSocket.on('close', closeBoth);
  socket.on('error', closeBoth);
  socket.on('end', closeBoth);
  socket.on('close', closeBoth);
}

function forwardedUpgradeHeaders(request: IncomingMessage, upstream: URL): string {
  const lines: string[] = [];
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) {
      continue;
    }
    const lower = name.toLowerCase();
    if (lower === 'host' || lower === 'x-session-cap') {
      continue;
    }
    if (lower === 'cookie') {
      const cookies = stripReviewCookies(Array.isArray(value) ? value.join('; ') : value);
      if (cookies.length > 0) {
        lines.push(`cookie: ${cookies}`);
      }
      continue;
    }
    lines.push(`${name}: ${Array.isArray(value) ? value.join(', ') : value}`);
  }
  lines.push(`host: ${upstream.host}`);
  return lines.join('\r\n');
}

function serveArtifactAsset(response: ServerResponse, session: SessionRecord, requested: string): void {
  const absolute = artifactFile(session);
  if (!absolute) {
    sendText(response, 501, 'Only saved HTML artifacts serve local assets');
    return;
  }
  const base = dirnameOf(absolute);
  const confined = confinePath(base, join(base, requested));
  if (!confined || !existsSync(confined)) {
    sendText(response, 404, 'Asset not found');
    return;
  }
  const stat = lstatSync(confined);
  if (stat.size > MAX_ASSET_BYTES) {
    sendText(response, 413, 'Asset exceeds the bounded size for local review');
    return;
  }
  const type = MIME[extname(confined).toLowerCase()] ?? 'application/octet-stream';
  if (type.startsWith('text/html')) {
    serveOutsideDocumentNotice(response, session, requested);
    return;
  }
  if (type.startsWith('text/css')) {
    const rewritten = rewriteCss(readFileSync(confined, 'utf8'), `/artifact/${session.sessionId}`);
    response.writeHead(200, { 'content-type': type, 'x-content-type-options': 'nosniff' });
    response.end(rewritten.css);
    return;
  }
  response.writeHead(200, { 'content-type': type, 'x-content-type-options': 'nosniff' });
  response.end(readFileSync(confined));
}

export function confinePath(baseDir: string, requestedPath: string): string | undefined {
  const base = resolve(baseDir);
  const resolved = resolve(base, requestedPath);
  if (resolved !== base && !resolved.startsWith(base + sep)) {
    return undefined;
  }
  try {
    if (existsSync(resolved)) {
      const real = realpathSync(resolved);
      const realBase = realpathSync(base);
      if (real !== realBase && !real.startsWith(realBase + sep)) {
        return undefined;
      }
      return real;
    }
    return resolved;
  } catch {
    return undefined;
  }
}

function serveOutsideDocumentNotice(response: ServerResponse, session: SessionRecord, requested: string): void {
  const reviewed = `/artifact/${session.sessionId}`;
  const name = requested.split('/').filter(Boolean).pop() ?? requested;
  const message = `${name} is another document. This artifact is reviewed as one document, so it is not served with pointing.`;
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Outside the reviewed document</title>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; background: rgb(250, 250, 250); color: rgb(20, 20, 20); }
      main { max-width: 34rem; margin: 12vh auto; padding: 0 1.5rem; }
      a { color: rgb(43, 95, 215); }
    </style>
  </head>
  <body>
    <main>
      <h1>This link leaves the reviewed document</h1>
      <p>${encodeHtml(message)}</p>
      <p><a href="${reviewed}">Back to the reviewed document</a></p>
    </main>
    <script>window.parent.postMessage({ source: 'vil-layer', type: 'notice', message: ${JSON.stringify(message)}, action: 'back-to-artifact' }, '*');</script>
  </body>
</html>`;
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'",
    'x-content-type-options': 'nosniff'
  });
  response.end(html);
}

function serveUiAsset(response: ServerResponse, name: string): void {
  if (!/^[\w.-]+\.(js|css|html|map)$/.test(name)) {
    sendText(response, 404, 'Not found');
    return;
  }
  try {
    const file = readUiFile(name);
    const type = name.endsWith('.js')
      ? 'text/javascript; charset=utf-8'
      : name.endsWith('.css')
        ? 'text/css; charset=utf-8'
        : name.endsWith('.html')
          ? 'text/html; charset=utf-8'
          : 'application/json; charset=utf-8';
    response.writeHead(200, { 'content-type': type, 'x-content-type-options': 'nosniff' });
    response.end(file);
  } catch {
    sendText(response, 404, 'Not found');
  }
}

function serveGallery(response: ServerResponse): void {
  try {
    const html = readUiFile('gallery.html');
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'",
      'x-content-type-options': 'nosniff'
    });
    response.end(html);
  } catch {
    sendText(response, 404, 'Gallery bundle missing; run npm run build');
  }
}

function readUiFile(name: string): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, '..', 'ui', name),
    join(here, 'ui', name),
    join(process.cwd(), 'dist', 'ui', name),
    join(process.cwd(), 'src', 'ui', name)
  ];
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, 'utf8');
    } catch {
      continue;
    }
  }
  throw new Error(`UI asset missing: ${name}`);
}

async function readBoundedBinary(
  request: IncomingMessage,
  response: ServerResponse,
  limit: number
): Promise<Buffer | undefined> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    total += buffer.byteLength;
    if (total > limit) {
      sendText(response, 413, 'Request body exceeds the attachment limit');
      return undefined;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

async function readJsonBody(request: IncomingMessage, response: ServerResponse): Promise<unknown | undefined> {
  const body = await readBoundedBody(request, response);
  if (body === undefined) {
    return undefined;
  }
  if (body.trim().length === 0) {
    return {};
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    sendText(response, 400, 'Invalid JSON body');
    return undefined;
  }
}

async function readBoundedBody(request: IncomingMessage, response: ServerResponse): Promise<string | undefined> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    total += buffer.byteLength;
    if (total > MAX_API_BODY_BYTES) {
      sendText(response, 413, 'Request body exceeds 1MB');
      return undefined;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function sendText(response: ServerResponse, status: number, text: string): void {
  response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff' });
  response.end(text);
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff' });
  response.end(JSON.stringify(value, null, 2));
}

function isVerdict(value: unknown): value is 'approve' | 'not-fixed' | 'obsolete' {
  return value === 'approve' || value === 'not-fixed' || value === 'obsolete';
}

function normalizeMedia(value: string | undefined): string {
  return (value ?? 'application/octet-stream').split(';')[0]!.trim().toLowerCase();
}

function normalizeTargets(raw: unknown[]): AnnotationTarget[] {
  return raw.map((entry, index) => {
    const candidate = (entry ?? {}) as Record<string, unknown>;
    const grounding = (candidate['renderedGrounding'] ?? candidate['grounding'] ?? {
      selectors: [],
      boundingBox: { x: 0, y: 0, width: 0, height: 0 }
    }) as AnnotationTarget['renderedGrounding'];
    const provenance = candidate['sourceProvenance'] as AnnotationTarget['sourceProvenance'] | undefined;
    const confidence = candidate['provenanceConfidence'];
    const regionEvidence = candidate['regionEvidence'] as AnnotationTarget['regionEvidence'] | undefined;
    const runtimeState = candidate['runtimeState'] as AnnotationTarget['runtimeState'] | undefined;
    return {
      targetId: typeof candidate['targetId'] === 'string' && candidate['targetId'].length > 0 ? candidate['targetId'] : `t-${index + 1}`,
      kind: candidate['kind'] === 'text-range' || candidate['kind'] === 'region' ? candidate['kind'] : 'element',
      renderedGrounding: grounding,
      provenanceConfidence:
        confidence === 'exact' || confidence === 'inferred' ? confidence : provenance ? 'exact' : 'unavailable',
      ...(provenance ? { sourceProvenance: provenance } : {}),
      ...(typeof candidate['label'] === 'string' && candidate['label'].length > 0 ? { label: candidate['label'] } : {}),
      ...(regionEvidence ? { regionEvidence } : {}),
      ...(runtimeState && typeof runtimeState === 'object' ? { runtimeState } : {})
    } satisfies AnnotationTarget;
  });
}

function dirnameOf(path: string): string {
  const index = path.lastIndexOf(sep);
  return index === -1 ? '.' : path.slice(0, index) || sep;
}

function encodeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}