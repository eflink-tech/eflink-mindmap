// 素材本地化覆盖率守卫：目录型素材（配色主题 / 标记分组 / 布局预设 / 快捷键 / 贴纸）与
// 运行时默认文案（节点主题、标记提示）在 zh-CN 以外的界面语言下都不允许漏出中文。
// 新增中文素材时只需在 titlesCatalog.ts 或 titlesCore.ts 补一行，本测试会列出缺失项。
import { describe, expect, it } from 'vitest';
import { translateTitle } from '../assetTitles';
import { setMindLocale } from '../runtime';
import { MARKER_COLORS, MARKER_GROUPS, STICKER_GROUPS, colorLabel, markerLabel } from '../../core/markers/registry';
import { LAYOUT_PRESETS } from '../../core/layout/presets';
import { THEME_GROUPS, THEMES } from '../../core/style/themes';
import { SHORTCUT_GROUPS } from '../../core/shortcuts/catalog';
import { addChild, createDocument } from '../../core/editor/nodeOps';

const HAS_CJK = /[一-鿿]/;
const LOCALES = ['en', 'es', 'pt-BR'] as const;

/** translateTitle 原样返回即视为查表未命中 */
function missingFrom(label: string, values: Array<string | undefined | null>, out: string[]) {
  for (const value of values) {
    if (!value || !HAS_CJK.test(value)) continue;
    if (translateTitle(value, 'en') === value) out.push(`${label}: ${value}`);
  }
}

describe('素材标题本地化', () => {
  it('目录型素材名全部有译文', () => {
    const missing: string[] = [];

    missingFrom('主题分类', THEME_GROUPS.map((g) => g.label), missing);
    missingFrom('配色主题', Object.values(THEMES).map((t) => t.name), missing);
    missingFrom('布局分类', LAYOUT_PRESETS.map((p) => p.categoryLabel), missing);
    missingFrom('布局预设', LAYOUT_PRESETS.map((p) => p.label), missing);
    missingFrom('标记分组', MARKER_GROUPS.map((g) => g.title), missing);
    missingFrom('贴纸分组', STICKER_GROUPS.map((g) => g.title), missing);
    missingFrom('标记颜色', MARKER_COLORS.map((c) => colorLabel(c)), missing);
    missingFrom('快捷键分组', SHORTCUT_GROUPS.map((g) => g.title), missing);
    missingFrom('快捷键动作', SHORTCUT_GROUPS.flatMap((g) => g.items.map((i) => i.label)), missing);

    expect(
      missing,
      `缺少 ${missing.length} 项素材译文：\n${missing.slice(0, 60).join('\n')}${missing.length > 60 ? '\n…' : ''}`,
    ).toEqual([]);
  });

  for (const locale of LOCALES) {
    it(`${locale}：标记提示与新建文档默认文案不含中文`, () => {
      setMindLocale(locale);
      try {
        const labels = MARKER_GROUPS.flatMap((g) => g.items.map((m) => markerLabel(m)));
        expect(labels.length).toBeGreaterThan(20);
        const leaked = labels.filter((text) => HAS_CJK.test(text));
        expect(leaked, `标记提示漏出中文：${leaked.slice(0, 12).join(' / ')}`).toEqual([]);

        const doc = createDocument();
        const withChild = addChild(doc, doc.rootId);
        const root = withChild.nodes[withChild.rootId]!;
        const child = withChild.nodes[root.children[0]!]!;
        const texts = [doc.title, root.text, child.text];
        const leakedDocs = texts.filter((text) => HAS_CJK.test(text));
        expect(leakedDocs, `${locale} 下新建文档仍含中文：${leakedDocs.join(' / ')}`).toEqual([]);
      } finally {
        setMindLocale('zh-CN');
      }
    });
  }

  it('未登记的名字原样保留（用户内容与纯英文素材不受影响）', () => {
    expect(translateTitle('客户自定义主题', 'en')).toBe('客户自定义主题');
    expect(translateTitle('Q3 Plan', 'en')).toBe('Q3 Plan');
  });
});
