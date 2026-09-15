// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createAlignPreview, createMatchSizePreview, createReorderPreview } from './previews.js';

function fixture(): HTMLElement[] {
  document.body.innerHTML = `
    <ul class="items">
      <li data-target="t-1">First</li>
      <li data-target="t-2">Second</li>
      <li data-target="t-3">Third</li>
    </ul>
  `;
  return [...document.querySelectorAll('li')] as HTMLElement[];
}

describe('drag-to-reorder preview', () => {
  it('renders reversible ghosts and confirms ordering intent', () => {
    const items = fixture();
    const before = document.body.innerHTML;
    const preview = createReorderPreview(document, items, ['t-3', 't-1', 't-2']);
    expect(document.querySelectorAll('.intent-ghost').length).toBe(3);
    const confirmed = preview.confirm();
    expect(confirmed.relationship).toMatchObject({ type: 'ordering', operator: 'before' });
    expect(confirmed.relationship.targetIds).toEqual(['t-3', 't-1', 't-2']);
    expect(confirmed.preview.reversible).toBe(true);
    expect(confirmed.preview.interactionEvidence.confirmedAt).toBeDefined();
    preview.discard();
    expect(document.body.innerHTML).toBe(before);
  });

  it('leaves the original elements untouched', () => {
    const items = fixture();
    const preview = createReorderPreview(document, items, ['t-2', 't-1', 't-3']);
    for (const item of items) {
      expect(item.classList.contains('intent-ghost')).toBe(false);
      expect(item.getAttribute('style')).toBeNull();
    }
    preview.discard();
  });
});

describe('align preview', () => {
  it('shows alignment ghosts and confirms alignment intent', () => {
    const items = fixture();
    const before = document.body.innerHTML;
    const preview = createAlignPreview(document, items.slice(0, 2), 'align-left', ['t-1', 't-2']);
    expect(document.querySelectorAll('.intent-ghost').length).toBe(2);
    const confirmed = preview.confirm();
    expect(confirmed.relationship).toMatchObject({ type: 'alignment', operator: 'align-left' });
    preview.discard();
    expect(document.body.innerHTML).toBe(before);
  });
});

describe('match-size preview', () => {
  it('shows a resized ghost and confirms comparative sizing', () => {
    const items = fixture();
    const before = document.body.innerHTML;
    const preview = createMatchSizePreview(document, items[0]!, items[1]!, 'same-width', ['t-1', 't-2']);
    expect(document.querySelectorAll('.intent-ghost').length).toBe(1);
    const confirmed = preview.confirm();
    expect(confirmed.relationship).toMatchObject({ type: 'comparative-size', operator: 'same-width' });
    preview.discard();
    expect(document.body.innerHTML).toBe(before);
  });

  it('records a started timestamp for keep-or-kill evidence', () => {
    const items = fixture();
    const preview = createMatchSizePreview(document, items[0]!, items[1]!, 'same-height', ['t-1', 't-2']);
    expect(preview.evidence.startedAt).toBeDefined();
    preview.discard();
  });
});
