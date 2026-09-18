// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { isArtifactDocument } from './bootstrap.js';

function frameElementWith(className: string, sessionId?: string): Element {
  const frame = document.createElement('iframe');
  frame.className = className;
  if (sessionId !== undefined) {
    frame.setAttribute('data-vil-session', sessionId);
  }
  return frame;
}

describe('artifact layer bootstrap', () => {
  it('runs in the document the shell framed as the artifact', () => {
    expect(isArtifactDocument(frameElementWith('artifact-frame', 'session-1'), 'session-1')).toBe(true);
  });

  it('does not run in a frame the artifact itself embeds', () => {
    expect(isArtifactDocument(frameElementWith('embedded-widget', 'session-1'), 'session-1')).toBe(false);
  });

  it('does not run in a frame that only copies the shell class for another session', () => {
    expect(isArtifactDocument(frameElementWith('artifact-frame', 'session-2'), 'session-1')).toBe(false);
    expect(isArtifactDocument(frameElementWith('artifact-frame'), 'session-1')).toBe(false);
  });

  it('does not run when the document is not framed at all', () => {
    expect(isArtifactDocument(null, 'session-1')).toBe(false);
    expect(isArtifactDocument(undefined, 'session-1')).toBe(false);
  });
});
