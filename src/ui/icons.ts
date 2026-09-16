export type IconName =
  | 'point'
  | 'box'
  | 'operate'
  | 'more'
  | 'stop'
  | 'attention'
  | 'amend'
  | 'attach'
  | 'delete'
  | 'move-up'
  | 'move-down'
  | 'close'
  | 'check'
  | 'reject'
  | 'another-pass'
  | 'obsolete'
  | 'recovered'
  | 'ambiguous'
  | 'deleted'
  | 'alert'
  | 'reload'
  | 'theme-light'
  | 'theme-dark'
  | 'theme-auto'
  | 'send'
  | 'show';

const PATHS: Record<IconName, string> = {
  point:
    '<path d="M4 3h3M11 3h3M18 3h2v2M21 8v3M21 14v3M21 20v1h-2M16 21h-3M10 21H7M4 21h-1v-2M3 16v-3M3 10V7M3 4v-1h1"/><path d="M12 11.5 20 15l-3.4 1.3L15.3 20z"/>',
  box: '<rect x="4" y="5" width="16" height="14" rx="2" stroke-dasharray="3 3"/>',
  operate: '<path d="M6 3.5 17 12l-5 .9L9.6 18z"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="1.5"/>',
  attention: '<path d="M6 10a6 6 0 0 1 12 0v4l1.5 2.5h-15L6 14z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  amend: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13.5 6.5 17.5 10.5"/>',
  attach: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M4 17 9.5 12l4 4 2.5-2.5L20 17"/>',
  delete: '<path d="M5 7h14M10 7V5h4v2M8 7l1 12h6l1-12"/>',
  'move-up': '<path d="M12 19V5M6 11l6-6 6 6"/>',
  'move-down': '<path d="M12 5v14M6 13l6 6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M5 12.5 10 17.5 19 7"/>',
  reject: '<circle cx="12" cy="12" r="8"/><path d="M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5"/>',
  'another-pass': '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/>',
  obsolete: '<rect x="4" y="5" width="16" height="4" rx="1"/><path d="M6 9v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9M10 13h4"/>',
  recovered: '<path d="M12 5a7 7 0 1 1-6.5 4.5"/><path d="M5 5v4h4"/>',
  ambiguous: '<circle cx="12" cy="12" r="8"/><path d="M9.8 9.5a2.3 2.3 0 1 1 3 2.2c-.8.3-.8 1-.8 1.6"/><circle cx="12" cy="16.4" r=".6"/>',
  deleted: '<circle cx="12" cy="12" r="8"/><path d="M7 7l10 10"/>',
  alert: '<path d="M12 4 21 20H3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".6"/>',
  reload: '<path d="M20 11a8 8 0 0 0-13.7-5.3L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 13.7 5.3L20 16"/><path d="M20 20v-4h-4"/>',
  'theme-light': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  'theme-dark': '<path d="M19 14.5A8 8 0 0 1 9.5 5a8 8 0 1 0 9.5 9.5z"/>',
  'theme-auto': '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  send: '<path d="M4 12 20 5l-7 15-2.5-6.5z"/>',
  show: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'
};

export function icon(name: IconName, options: { size?: number; className?: string } = {}): SVGSVGElement {
  const size = options.size ?? 18;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (options.className) {
    svg.setAttribute('class', options.className);
  }
  svg.innerHTML = PATHS[name];
  return svg;
}

export function iconNames(): IconName[] {
  return Object.keys(PATHS) as IconName[];
}
