// 导入解析共用取值工具：外部 JSON/XML 字段类型不可控，统一在此收窄
export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonRecord) : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function trimText(value: string | undefined): string | undefined {
  const text = value?.replaceAll('\u0000', '').trim();
  return text ? text : undefined;
}

/** 宽高/线宽：允许 "2"、"2px" 这类写法，非数字返回 undefined */
export function sizeValue(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : undefined;
}

export function fontSizeToPx(value: unknown): number | undefined {
  if (typeof value === 'number') return value > 0 ? Math.round(value) : undefined;
  if (typeof value !== 'string') return undefined;
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  if (/pt\s*$/i.test(value)) return Math.round((amount * 4) / 3);
  return Math.round(amount);
}

export function colorValue(value: unknown): string | undefined {
  const color = trimText(asString(value));
  if (!color) return undefined;
  if (/^(none|transparent)$/i.test(color)) return undefined;
  if (/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(color)) return color;
  return undefined;
}
