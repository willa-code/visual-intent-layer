// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  attachSelection,
  type SelectedTarget,
  type SelectionSink
} from './selection.js';

function fixture(): void {
  document.body.innerHTML = `
    <main class="gallery-page">
      <h1>Summer gallery</h1>
      <p class="shipping-note">Order now. Arrives Thursday if you order today.</p>
      <button class="checkout-submit" type="button">Place order</button>
      <a class="help-link" href="https://example.com/help">Help</a>
    </main>
  `;
}

function sink(): SelectionSink & { targets: SelectedTarget[]; hovered: Element[] } {
  return {
    targets: [],
    hovered: [],
    onHover(el: Element | null): void {
      if (el) {
        this.hovered.push(el);
      }
    },
    onSelection(targets: SelectedTarget[]): void {
      this.targets = targets;
    }
  };
}

function click(el: Element, options: { shiftKey?: boolean } = {}): void {
  el.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: options.shiftKey ?? false })
  );
}

describe('select mode interaction', () => {
  it('highlights hovered elements immediately', () => {
    fixture();
    const events = sink();
    const selection = attachSelection(document, events);
    selection.setMode('select');
    const button = document.querySelector('button.checkout-submit') as HTMLElement;
    button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    expect(events.hovered).toContain(button);
    expect(button.classList.contains('hover-outline')).toBe(true);
    selection.detach();
  });

  it('ignores hover in Explore mode so the page behaves normally', () => {
    fixture();
    const events = sink();
    const selection = attachSelection(document, events);
    selection.setMode('explore');
    const button = document.querySelector('button.checkout-submit') as HTMLElement;
    button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    expect(events.hovered).toHaveLength(0);
    expect(button.classList.contains('hover-outline')).toBe(false);
    selection.detach();
  });

  it('selects a clicked element with Rendered Grounding and blocks activation', () => {
    fixture();
    const events = sink();
    const selection = attachSelection(document, events);
    selection.setMode('select');
    const link = document.querySelector('a.help-link') as HTMLElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(events.targets).toHaveLength(1);
    expect(events.targets[0]!.kind).toBe('element');
    expect(events.targets[0]!.grounding.semanticRole).toBe('link');
    expect(link.classList.contains('target-outline')).toBe(true);
    selection.detach();
  });

  it('accumulates multiple targets with shift-click', () => {
    fixture();
    const events = sink();
    const selection = attachSelection(document, events);
    selection.setMode('select');
    click(document.querySelector('button.checkout-submit') as HTMLElement);
    click(document.querySelector('p.shipping-note') as HTMLElement, { shiftKey: true });
    expect(events.targets).toHaveLength(2);
    expect(events.targets.map((target) => target.kind)).toEqual(['element', 'element']);
    selection.detach();
  });

  it('captures a text range when the user selects words', () => {
    fixture();
    const events = sink();
    const selection = attachSelection(document, events);
    selection.setMode('select');
    const note = document.querySelector('p.shipping-note') as HTMLElement;
    const textNode = note.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 11);
    range.setEnd(textNode, 27);
    const domSelection = document.getSelection();
    domSelection?.removeAllRanges();
    domSelection?.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    expect(events.targets).toHaveLength(1);
    expect(events.targets[0]!.kind).toBe('text-range');
    expect(events.targets[0]!.grounding.textEvidence?.exactText).toBe('Arrives Thursday');
    selection.detach();
  });

  it('marks a region on alt-drag', () => {
    fixture();
    const events = sink();
    const selection = attachSelection(document, events);
    selection.setMode('select');
    const main = document.querySelector('main') as HTMLElement;
    main.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, altKey: true, clientX: 10, clientY: 20 }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, altKey: true, clientX: 310, clientY: 170 }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, altKey: true, clientX: 310, clientY: 170 }));
    expect(events.targets).toHaveLength(1);
    expect(events.targets[0]!.kind).toBe('region');
    expect(events.targets[0]!.grounding.boundingBox).toMatchObject({ x: 10, y: 20, width: 300, height: 150 });
    selection.detach();
  });

  it('clears the selection on Escape and returns outlines to the page', () => {
    fixture();
    const events = sink();
    const selection = attachSelection(document, events);
    selection.setMode('select');
    const button = document.querySelector('button.checkout-submit') as HTMLElement;
    click(button);
    expect(events.targets).toHaveLength(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(events.targets).toHaveLength(0);
    expect(button.classList.contains('target-outline')).toBe(false);
    selection.detach();
  });
});
