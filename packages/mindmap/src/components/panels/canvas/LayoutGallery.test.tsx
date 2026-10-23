import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LAYOUT_PRESETS } from '../../../core/layout/presets';
import { LayoutGallery } from './LayoutGallery';

afterEach(() => cleanup());

describe('LayoutGallery', () => {
  it('列出全部预设且不显示 PRO', () => {
    const { container } = render(
      <LayoutGallery selectedId="map-balanced-curve" onSelect={() => {}} />,
    );
    for (const p of LAYOUT_PRESETS) {
      expect(screen.getByTestId(`layout-preset-${p.id}`)).toBeTruthy();
    }
    expect(container.textContent ?? '').not.toMatch(/PRO/i);
  });

  it('点击回调传入 canonical 预设 id', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<LayoutGallery selectedId="map-balanced-curve" onSelect={onSelect} />);
    await user.click(screen.getByTestId('layout-preset-logic-right'));
    expect(onSelect).toHaveBeenCalledWith('logic-right');
  });

  it('折叠分组后隐藏该组缩略图', async () => {
    const user = userEvent.setup();
    render(<LayoutGallery selectedId="map-balanced-curve" onSelect={() => {}} />);
    await user.click(screen.getByTestId('layout-category-logic'));
    expect(screen.queryByTestId('layout-preset-logic-right')).toBeNull();
    expect(screen.getByTestId('layout-preset-map-balanced-curve')).toBeTruthy();
  });
});
