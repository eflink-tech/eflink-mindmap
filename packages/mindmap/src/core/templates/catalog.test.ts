import { afterEach, describe, expect, it } from 'vitest';
import { createDocument } from '../editor/nodeOps';
import { LAYOUT_PRESETS } from '../layout/presets';
import { setMindLocale } from '../../i18n/runtime';
import { buildTemplateDocument, getTemplate, TEMPLATES } from './catalog';

afterEach(() => setMindLocale('zh-CN'));

function collectTexts(doc: ReturnType<typeof createDocument>): string[] {
  return Object.values(doc.nodes).map((n) => n.text);
}

describe('内置模板', () => {
  it('模板 id 唯一，布局与主题都在目录内', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tpl of TEMPLATES) {
      expect(LAYOUT_PRESETS.some((p) => p.id === tpl.layout), tpl.id).toBe(true);
    }
  });

  it('按模板生成文档：中心主题即模板名，根子节点与定义一致', () => {
    const tpl = getTemplate('meeting')!;
    const doc = buildTemplateDocument(tpl);
    const root = doc.nodes[doc.rootId]!;
    expect(doc.title).toBe('会议纪要');
    expect(root.text).toBe('会议纪要');
    expect(root.children.map((id) => doc.nodes[id]!.text)).toEqual([
      '会议信息',
      '议题',
      '决议',
      '待办事项',
    ]);
    const info = doc.nodes[root.children[0]!]!;
    expect(info.children.map((id) => doc.nodes[id]!.text)).toEqual(['日期', '地点', '参会人']);
  });

  it('模板文档自带工作簿、主题与布局预设', () => {
    for (const tpl of TEMPLATES) {
      const doc = buildTemplateDocument(tpl);
      expect(doc.workbookId).toBe(doc.id);
      expect(doc.themeId).toBe(tpl.theme);
      expect(doc.layout).toBe(tpl.layout);
      expect(doc.layoutDefaults).toBeTruthy();
      expect(Object.keys(doc.nodes).length).toBeGreaterThan(1);
    }
  });

  it('英文界面下模板节点不含中文', () => {
    setMindLocale('en');
    for (const tpl of TEMPLATES) {
      const doc = buildTemplateDocument(tpl);
      const leaked = [doc.title, ...collectTexts(doc)].filter((text) => /[一-鿿]/.test(text));
      expect(leaked, `${tpl.id}: ${leaked.join(' / ')}`).toEqual([]);
    }
  });

  it('未知模板返回 undefined', () => {
    expect(getTemplate('missing')).toBeUndefined();
  });
});
