// packages/mindmap/src/i18n/buildMessages.ts
// messages / messagesPanels / messagesCatalog / messagesCore 四个文案文件共享的构建器：
// 行式数组 [zh-CN, en, es, pt-BR] → 按语言分组的字典。
// 列顺序与 office-kit 的 OFFICE_LOCALES 一致；新增语言只需同步改这里的 ORDER 与 Row。
import type { OfficeMessagesByLocale } from '@eflink-tech/office-kit';

/** 一条文案的四语行：顺序固定 [zh-CN, en, es, pt-BR] */
export type Row = readonly [string, string, string, string];

export const ORDER = ['zh-CN', 'en', 'es', 'pt-BR'] as const;

/** 把 `as const satisfies Record<string, Row>` 的文案行表构建成 OfficeMessagesByLocale */
export function buildMessages<Rows extends Record<string, Row>>(rows: Rows): OfficeMessagesByLocale {
  const out: OfficeMessagesByLocale = { 'zh-CN': {}, en: {}, es: {}, 'pt-BR': {} };
  for (const [key, values] of Object.entries(rows as Record<string, Row>)) {
    ORDER.forEach((locale, index) => {
      out[locale]![key] = values[index];
    });
  }
  return out;
}
