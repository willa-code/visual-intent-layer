// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  cssPath,
  describeElement,
  describeRegion,
  describeTextRange,
  modeMachine,
  type ReviewMode
} from './review.js';

function fixture(): HTMLElement {
  document.body.innerHTML = `
    <main class="gallery-page">
      <h1>Summer gallery</h1>
      <p class="shipping-note">Order now. Arrives Thursday if you order today.</p>
      <button class="checkout-submit" type="button">Place order</button>
    </main>
  `;
  return document.body;
}

describe('element grounding', () => {
  it('captures selector, role, name, structure, and geometry evidence', () => {
    fixture();
    const button = document.querySelector('button.checkout-submit') as HTMLElement;
    const grounding = describeElement(button);
    expect(grounding.selectors?.[0]).toContain('button.checkout-submit');
    expect(grounding.semanticRole).toBe('button');
    expect(grounding.accessibleName).toBe('Place order');
    expect(grounding.structuralContext?.ancestorChain).toContain('main.gallery-page');
    expect(grounding.boundingBox).toMatchObject({ x: expect.any(Number), width: expect.any(Number) });
  });

  it('never claims source provenance from DOM evidence alone', () => {
    fixture();
    const button = document.querySelector('button.checkout-submit') as HTMLElement;
    const grounding = describeElement(button);
    expect('sourceProvenance' in grounding).toBe(false);
  });

  it('builds a distinguishing css path through repeated siblings', () => {
    document.body.innerHTML = `<ul><li>a</li><li>b</li><li>c</li></ul>`;
    const items = document.querySelectorAll('li');
    const path = cssPath(items[1] as HTMLElement);
    expect(document.querySelectorAll(path).length).toBe(1);
  });
});

describe('text range grounding', () => {
  it('attaches exact text with prefix, suffix, and offsets', () => {
    fixture();
    const note = document.querySelector('p.shipping-note') as HTMLElement;
    const textNode = note.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 11);
    range.setEnd(textNode, 27);
    const grounding = describeTextRange(range);
    expect(grounding.textEvidence?.exactText).toBe('Arrives Thursday');
    expect(grounding.textEvidence?.prefix).toBe('Order now. ');
    expect(grounding.textEvidence?.suffix).toBe(' if you order today.');
    expect(grounding.textEvidence?.startOffset).toBe(11);
    expect(grounding.textEvidence?.endOffset).toBe(27);
  });
});

describe('region grounding', () => {
  it('carries spatial evidence with viewport context', () => {
    const grounding = describeRegion({ x: 10, y: 20, width: 300, height: 150 }, { width: 1280, height: 800 });
    expect(grounding.boundingBox).toMatchObject({
      x: 10,
      y: 20,
      width: 300,
      height: 150,
      viewportWidth: 1280,
      viewportHeight: 800
    });
  });
});

describe('review mode machine', () => {
  it('starts in Explore and moves to Select and back reversibly', () => {
    const machine = modeMachine();
    expect(machine.current).toBe('explore');
    machine.enter('select');
    expect(machine.current).toBe('select');
    machine.enter('explore');
    expect(machine.current).toBe('explore');
  });

  it('announces mode changes for assistive technology', () => {
    const announced: ReviewMode[] = [];
    const machine = modeMachine((mode) => announced.push(mode));
    machine.enter('select');
    machine.enter('direct');
    expect(announced).toEqual(['select', 'direct']);
  });

  it('rejects unknown modes', () => {
    const machine = modeMachine();
    expect(() => machine.enter('delete' as ReviewMode)).toThrow(/unknown mode/);
  });
});
