// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { boundaryRefusal, FRAME_SEPARATOR, SHADOW_SEPARATOR } from './boundary.js';
import { elementByComposedSelector } from './grounding.js';

function doc(html: string): Document {
  return new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html');
}

describe('artifact boundary refusal', () => {
  it('names a closed shadow root when the host is still there but cannot be entered', () => {
    const document = doc('<main><div id="closed"></div></main>');
    const host = document.getElementById('closed') as HTMLElement;
    host.attachShadow({ mode: 'closed' }).innerHTML = '<button id="hidden">Hidden</button>';
    const selector = `div#closed${SHADOW_SEPARATOR}button#hidden`;
    expect(boundaryRefusal([selector], document)).toBe('closed-shadow-root');
  });

  it('does not name a boundary when the host itself is gone', () => {
    const document = doc('<main><button id="light">Light</button></main>');
    expect(boundaryRefusal([`div#gone${SHADOW_SEPARATOR}button`], document)).toBeUndefined();
  });

  it('does not refuse a light-DOM selector', () => {
    const document = doc('<main><button id="light">Light</button></main>');
    expect(boundaryRefusal(['body > main > button#light'], document)).toBeUndefined();
  });

  it('refuses a frame interior it cannot reach, with that cause', () => {
    const document = doc('<main><iframe id="other"></iframe></main>');
    const selector = `iframe#other${FRAME_SEPARATOR}button`;
    expect(boundaryRefusal([selector], document, () => null)).toBe('cross-origin-frame');
  });

  it('does not name a boundary when a frame element is gone rather than merely unreachable', () => {
    const document = doc('<main><button id="light">Light</button></main>');
    expect(boundaryRefusal([`iframe#gone${FRAME_SEPARATOR}button`], document)).toBeUndefined();
  });

  it('carries a frame path in a composed selector and resolves through it', () => {
    const document = doc('<main><iframe id="w"></iframe></main>');
    const frame = document.getElementById('w') as HTMLIFrameElement;
    frame.contentDocument!.body.innerHTML = '<button class="widget-action">Confirm</button>';
    const button = frame.contentDocument!.querySelector('button') as HTMLElement;
    const selector = `iframe#w${FRAME_SEPARATOR}body > button.widget-action`;
    expect(boundaryRefusal([selector], document)).toBeUndefined();
    expect(elementByComposedSelector(selector, document)).toBe(button);
  });
});
