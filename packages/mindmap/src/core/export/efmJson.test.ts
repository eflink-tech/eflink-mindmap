import { describe, expect, it } from 'vitest';
import { addChild, createDocument, updateText } from '../editor/nodeOps';
import {
  EFM_FORMAT,
  EFM_VERSION,
  exportToEfmJson,
  importFromEfmJson,
  parseMindMapDocument,
} from './efmJson';

function sampleDoc() {
  let doc = createDocument('项目计划');
  doc = updateText(doc, doc.rootId, '项目计划');
  doc = addChild(doc, doc.rootId, '需求分析');
  doc = {
    ...doc,
    themeId: 'classic',
    styleOverrides: { colors: { primary: '#112233', branches: [], background: '#fff' } },
    relations: [{ id: 'r1', from: doc.rootId, to: doc.nodes[doc.rootId].children[0], label: '关联' }],
  };
  return doc;
}

describe('exportToEfmJson', () => {
  it('包装 format/version/document', () => {
    const json = exportToEfmJson(sampleDoc());
    const parsed = JSON.parse(json) as { format: string; version: number; document: { title: string } };
    expect(parsed.format).toBe(EFM_FORMAT);
    expect(parsed.version).toBe(EFM_VERSION);
    expect(parsed.document.title).toBe('项目计划');
  });

  it('保留样式与关联等完整字段', () => {
    const original = sampleDoc();
    const restored = importFromEfmJson(exportToEfmJson(original));
    expect(restored.nodes[restored.rootId].text).toBe('项目计划');
    expect(restored.nodes[restored.rootId].children).toHaveLength(1);
    expect(restored.styleOverrides?.colors?.primary).toBe('#112233');
    expect(restored.relations).toHaveLength(1);
    expect(restored.relations[0].label).toBe('关联');
  });
});

describe('importFromEfmJson', () => {
  it('导出再导入结构一致，但文档 id 重新分配', () => {
    const original = sampleDoc();
    const restored = importFromEfmJson(exportToEfmJson(original));
    expect(restored.id).not.toBe(original.id);
    expect(restored.rootId).toBe(original.rootId);
    expect(Object.keys(restored.nodes)).toEqual(Object.keys(original.nodes));
  });

  it('兼容无包装的裸 MindMapDocument', () => {
    const original = sampleDoc();
    const restored = importFromEfmJson(JSON.stringify(original));
    expect(restored.nodes[restored.rootId].text).toBe('项目计划');
  });

  it('拒绝无效 JSON', () => {
    expect(() => importFromEfmJson('{')).toThrow(/有效的 JSON/);
  });

  it('拒绝缺少 rootId 的对象', () => {
    expect(() => parseMindMapDocument({ id: 'a', title: 't', nodes: {} })).toThrow(/rootId/);
  });

  it('拒绝未知 format', () => {
    expect(() =>
      importFromEfmJson(JSON.stringify({ format: 'other', version: 1, document: sampleDoc() })),
    ).toThrow(/不支持的文件格式/);
  });
});
