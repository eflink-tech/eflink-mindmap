// packages/mindmap/src/i18n/assetTitles.ts
// 素材名称翻译：主题/标记/布局/模板等目录里的中文名是**存储值与查表键**（导入导出、
// IndexedDB 都依赖它），所以不改动数据，只在展示与写入文档时按中文原文查表换语言。
import type { OfficeLocale } from '@eflink-tech/office-kit';
import { getMindLocale } from './runtime';
import { CATALOG_TITLES } from './titlesCatalog';
import { CORE_TITLES } from './titlesCore';

/** [en, es, pt-BR]；zh-CN 直接用中文原文 */
type TitleRow = readonly [string, string, string];

const TITLE_INDEX: Record<string, TitleRow> = {
  ...CATALOG_TITLES,
  ...CORE_TITLES,
};

/** 目录里可能出现的中文素材名，供覆盖率测试反查 */
export const ASSET_TITLES = Object.keys(TITLE_INDEX);

const COLUMN: Record<Exclude<OfficeLocale, 'zh-CN'>, 0 | 1 | 2> = {
  en: 0,
  es: 1,
  'pt-BR': 2,
};

export const HAS_CJK = /[一-鿿]/;

/** 中文素材名 → 当前语言显示名；未收录或不含中文时原样返回 */
export function translateTitle(title: string, locale: OfficeLocale = getMindLocale()): string {
  if (locale === 'zh-CN' || !HAS_CJK.test(title)) return title;
  const row = TITLE_INDEX[title];
  return row ? row[COLUMN[locale]] : title;
}

/** 素材名在四种语言下的全部写法（占位文本判定要用：文档可能由任一语言的界面创建） */
export function titleVariants(zhTitle: string): string[] {
  const row = TITLE_INDEX[zhTitle];
  return row ? [zhTitle, row[0], row[1], row[2]] : [zhTitle];
}
