import { RECENT_COLORS_KEY_PREFIX } from '../../core/persistence/keys';

export { ColorPicker, type ColorPickerProps, type ColorSelectOptions } from './ColorPicker';
export { ColorField, type ColorFieldProps } from './ColorField';
export { normalizeColor } from './colorFormat';

export function colorRecentKey(scope: string): string {
  return `${RECENT_COLORS_KEY_PREFIX}${scope}`;
}
