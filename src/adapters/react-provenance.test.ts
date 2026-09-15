// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { provenanceForElement, viteVisualIntentPlugin } from './react-provenance.js';

type FakeFiber = {
  _debugSource?: { fileName: string; lineNumber: number; columnNumber?: number };
  _debugOwner?: FakeFiber | null;
  elementType?: { displayName?: string; name?: string } | string;
  return?: FakeFiber | null;
};

function fiberOn(element: Element, fiber: FakeFiber): void {
  (element as unknown as Record<string, unknown>)['__reactFiber$test123'] = fiber;
}

describe('React fiber provenance', () => {
  it('resolves exact file, line, column, and component from fiber debug source', () => {
    document.body.innerHTML = `<button>Place order</button>`;
    const button = document.querySelector('button') as HTMLElement;
    fiberOn(button, {
      elementType: 'button',
      _debugSource: { fileName: '/app/src/Checkout.tsx', lineNumber: 42, columnNumber: 8 },
      return: { elementType: { displayName: 'CheckoutForm' } }
    });
    const provenance = provenanceForElement(button);
    expect(provenance).toEqual({
      file: '/app/src/Checkout.tsx',
      line: 42,
      column: 8,
      component: 'CheckoutForm',
      adapter: 'react-fiber@0.1'
    });
  });

  it('climbs to the nearest component with debug source', () => {
    document.body.innerHTML = `<span>hi</span>`;
    const span = document.querySelector('span') as HTMLElement;
    fiberOn(span, {
      elementType: 'span',
      return: {
        elementType: { name: 'Greeting' },
        _debugSource: { fileName: '/app/src/Greeting.tsx', lineNumber: 7 },
        return: null
      }
    });
    const provenance = provenanceForElement(span);
    expect(provenance).toMatchObject({ file: '/app/src/Greeting.tsx', line: 7, component: 'Greeting' });
  });

  it('abstains visibly on non-React DOM instead of guessing', () => {
    document.body.innerHTML = `<button>Place order</button>`;
    const button = document.querySelector('button') as HTMLElement;
    expect(provenanceForElement(button)).toBeUndefined();
  });

  it('abstains when fibers carry no debug source (production build)', () => {
    document.body.innerHTML = `<button>Place order</button>`;
    const button = document.querySelector('button') as HTMLElement;
    fiberOn(button, { elementType: 'button', return: null });
    expect(provenanceForElement(button)).toBeUndefined();
  });
});

describe('Vite plugin', () => {
  it('injects the provenance runtime into the application HTML', () => {
    const plugin = viteVisualIntentPlugin();
    expect(plugin.name).toBe('visual-intent-provenance');
    const tags = plugin.transformIndexHtml() as Array<{ tag: string; attrs: Record<string, string> }>;
    expect(tags[0]!.tag).toBe('script');
    expect(tags[0]!.attrs['src']).toBe('/@visual-intent/provenance.js');
  });
});
