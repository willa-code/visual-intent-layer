import { icon, type IconName } from './icons.js';

export type Props = {
  class?: string;
  text?: string;
  html?: string;
  id?: string;
  type?: string;
  src?: string;
  alt?: string;
  hidden?: boolean;
  disabled?: boolean;
  title?: string;
  dataset?: Record<string, string>;
  attrs?: Record<string, string | number | boolean | null | undefined>;
  style?: Partial<CSSStyleDeclaration> | string;
  on?: Partial<Record<keyof HTMLElementEventMap, EventListener>>;
};

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Array<Node | string | false | null | undefined | Array<Node | string | false | null | undefined>>
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (props.class) {
    element.className = props.class;
  }
  if (props.id) {
    element.id = props.id;
  }
  if (props.text !== undefined) {
    element.textContent = props.text;
  }
  if (props.html !== undefined) {
    element.innerHTML = props.html;
  }
  if (props.title !== undefined) {
    element.title = props.title;
  }
  if (props.src !== undefined && 'src' in element) {
    (element as HTMLImageElement).src = props.src;
  }
  if (props.alt !== undefined && 'alt' in element) {
    (element as HTMLImageElement).alt = props.alt;
  }
  if (props.type !== undefined && 'type' in element) {
    (element as HTMLInputElement).type = props.type;
  }
  if (props.hidden) {
    element.hidden = true;
  }
  if (props.disabled && 'disabled' in element) {
    (element as HTMLButtonElement).disabled = true;
  }
  if (props.dataset) {
    for (const [key, value] of Object.entries(props.dataset)) {
      element.dataset[key] = value;
    }
  }
  if (props.attrs) {
    for (const [key, value] of Object.entries(props.attrs)) {
      if (value === null || value === undefined || value === false) {
        element.removeAttribute(key);
      } else {
        element.setAttribute(key, String(value));
      }
    }
  }
  if (props.style) {
    if (typeof props.style === 'string') {
      element.setAttribute('style', props.style);
    } else {
      Object.assign(element.style, props.style);
    }
  }
  if (props.on) {
    for (const [name, listener] of Object.entries(props.on)) {
      element.addEventListener(name, listener as EventListener);
    }
  }
  append(element, children);
  return element;
}

export function append(
  parent: Node,
  children: Array<Node | string | false | null | undefined | Array<Node | string | false | null | undefined>>
): void {
  for (const child of flatten(children)) {
    if (child === null || child === undefined || child === false) {
      continue;
    }
    parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

function flatten(
  children: Array<Node | string | false | null | undefined | Array<Node | string | false | null | undefined>>
): Array<Node | string | false | null | undefined> {
  const out: Array<Node | string | false | null | undefined> = [];
  for (const child of children) {
    if (Array.isArray(child)) {
      out.push(...flatten(child));
    } else {
      out.push(child);
    }
  }
  return out;
}

export function clear(element: Element): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function qs<T extends Element = HTMLElement>(root: ParentNode, selector: string): T | null {
  return root.querySelector<T>(selector);
}

export function iconButton(label: string, name: IconName, onClick: () => void): HTMLButtonElement {
  const button = h('button', {
    class: 'icon-button',
    type: 'button',
    title: label,
    attrs: { 'aria-label': label },
    on: { click: onClick }
  });
  button.appendChild(icon(name, { size: 16 }));
  return button;
}

export function button(
  label: string,
  options: { variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'; disabled?: boolean; title?: string; onClick?: () => void } = {}
): HTMLButtonElement {
  return h('button', {
    class: 'button',
    type: 'button',
    text: label,
    ...(options.variant ? { dataset: { variant: options.variant } } : {}),
    ...(options.disabled ? { disabled: true } : {}),
    ...(options.title ? { title: options.title } : {}),
    on: { click: () => options.onClick?.() }
  });
}
