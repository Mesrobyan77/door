import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { SelectDropdown } from '@/components/ui/SelectDropdown';

const options = [
  { label: 'Հայերեն', value: 'hy' },
  { label: 'Русский', value: 'ru' },
  { label: 'English', value: 'en' },
];

function renderDropdown(placement?: 'bottom' | 'top'): string {
  return renderToStaticMarkup(
    createElement(SelectDropdown, {
      ariaLabel: 'Language',
      value: 'hy',
      options,
      placement,
      onValueChange: vi.fn(),
    }),
  );
}

describe('SelectDropdown placement', () => {
  it('opens below the trigger by default', () => {
    expect(renderDropdown()).toContain('top-[calc(100%+0.5rem)]');
  });

  it('can open above the trigger when placed near the viewport bottom', () => {
    expect(renderDropdown('top')).toContain('bottom-[calc(100%+0.5rem)]');
  });
});
