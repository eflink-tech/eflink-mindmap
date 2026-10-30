// OPML 导入测试
import { describe, expect, it } from 'vitest';
import { parseOpml } from './opml';
import type { MindMapDocument, MindMapNode } from '../../types/mindmap';

const SINGLE_ROOT = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>项目大纲</title></head>
  <body>
    <outline text="根" _note="一段备注" _link="https://example.com">
      <outline text="A">
        <outline title="A1"/>
      </outline>
      <outline text="B"/>
    </outline>
  </body>
</opml>`;

const MULTI_ROOT = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>总览</title></head>
  <body>
    <outline text="A"/>
    <outline text="B"/>
  </body>
</opml>`;

function nodeByText(doc: MindMapDocument, text: string): MindMapNode {
  const node = Object.values(doc.nodes).find((item) => item.text === text);
  if (!node) throw new Error(`missing node: ${text}`);
  return node;
}

describe('parseOpml', () => {
  it('单根时还原层级、备注与链接', () => {
    const doc = parseOpml(SINGLE_ROOT, { fileName: '大纲.opml' });
    expect(doc.title).toBe('大纲');
    expect(doc.nodes[doc.rootId].text).toBe('根');
    expect(doc.nodes[doc.rootId].metadata?.note).toBe('一段备注');
    expect(doc.nodes[doc.rootId].metadata?.link).toBe('https://example.com');
    expect(doc.nodes[doc.rootId].children).toHaveLength(2);
    expect(nodeByText(doc, 'A').children.map((id) => doc.nodes[id].text)).toEqual(['A1']);
  });

  it('多个顶层节点用 head 标题收拢为根', () => {
    const doc = parseOpml(MULTI_ROOT);
    expect(doc.nodes[doc.rootId].text).toBe('总览');
    expect(doc.nodes[doc.rootId].children.map((id) => doc.nodes[id].text)).toEqual(['A', 'B']);
  });

  it('缺少 outline 或 XML 损坏时抛错', () => {
    expect(() => parseOpml('<opml version="2.0"><body></body></opml>')).toThrow();
    expect(() => parseOpml('<opml><body><outline text="A">')).toThrow();
    expect(() => parseOpml('not xml')).toThrow();
  });
});
