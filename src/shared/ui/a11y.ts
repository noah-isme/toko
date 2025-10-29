import { createElement } from 'react';
import type { ReactElement } from 'react';

export function srOnly(text: string): ReactElement {
  return createElement('span', { className: 'sr-only' }, text);
}
