// packages/mindmap/src/i18n/runtime.ts
// 非 React 模块（store / core / 导出）读取界面语言的运行时单例。
// React 组件走 office-kit 的 useI18n()，两者共用同一份字典与同一个 locale。
import { COMMON_MESSAGES, normalizeLocale, type OfficeLocale, type OfficeMessages } from '@eflink-tech/office-kit';
import { MIND_MESSAGES } from './messages';

let currentLocale: OfficeLocale = normalizeLocale(undefined);

const MERGED: Partial<Record<OfficeLocale, OfficeMessages>> = {};

function dictFor(locale: OfficeLocale): OfficeMessages {
  MERGED[locale] ??= { ...COMMON_MESSAGES[locale], ...MIND_MESSAGES[locale] };
  return MERGED[locale]!;
}

/** 编辑器入口调用：同步 React 之外的语言状态 */
export function setMindLocale(input?: string | null): OfficeLocale {
  currentLocale = normalizeLocale(input);
  return currentLocale;
}

export function getMindLocale(): OfficeLocale {
  return currentLocale;
}

/** 取界面文案；缺失时回落 zh-CN，再回落消息键本身 */
export function mindT(key: string, vars?: Record<string, string | number>): string {
  const template = dictFor(currentLocale)[key] ?? dictFor('zh-CN')[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (raw, name: string) =>
    name in vars ? String(vars[name]) : raw,
  );
}
