// FreeMind .mm 导入测试
import { describe, expect, it } from 'vitest';
import { parseFreeMind } from './freeMind';
import type { MindMapDocument, MindMapNode } from '../../types/mindmap';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.0.1">
  <node TEXT="发布计划" ID="root" FOLDED="true" LINK="https://example.com" COLOR="#ff0000" BACKGROUND_COLOR="#ffffcc">
    <font NAME="Sans" SIZE="14" BOLD="true" ITALIC="true"/>
    <edge COLOR="#00aa00" WIDTH="3" STYLE="bezier"/>
    <richcontent TYPE="NOTE"><html><body><p>备注第一行</p><p>第二行</p></body></html></richcontent>
    <icon BUILTIN="full-2"/>
    <icon BUILTIN="flag-blue"/>
    <icon BUILTIN="smiley-smile"/>
    <node TEXT="子一" POSITION="right" ID="a">
      <icon BUILTIN="button_ok"/>
    </node>
    <node TEXT="子二" POSITION="right" ID="b"/>
    <arrowlink DESTINATION="b" MIDDLE_LABEL="依赖"/>
  </node>
</map>`;

function nodeByText(doc: MindMapDocument, text: string): MindMapNode {
  const node = Object.values(doc.nodes).find((item) => item.text === text);
  if (!node) throw new Error(`missing node: ${text}`);
  return node;
}

describe('parseFreeMind', () => {
  it('还原层级、侧别与文档标题', () => {
    const doc = parseFreeMind(SAMPLE, { fileName: 'FreeMind样例.mm' });
    expect(doc.title).toBe('FreeMind样例');
    expect(doc.nodes[doc.rootId].text).toBe('发布计划');
    expect(doc.nodes[doc.rootId].children).toHaveLength(2);
    expect(nodeByText(doc, '子一').metadata?.side).toBe('right');
    expect(doc.layout).toBe('map-right-curve');
  });

  it('保留备注、链接、折叠与标记', () => {
    const doc = parseFreeMind(SAMPLE);
    const metadata = doc.nodes[doc.rootId].metadata!;
    expect(metadata.note).toContain('备注第一行');
    expect(metadata.note).toContain('第二行');
    expect(metadata.link).toBe('https://example.com');
    expect(metadata.collapsed).toBe(true);
    expect(metadata.markers).toEqual([
      { type: 'priority', level: 2 },
      { type: 'flag', color: 'blue' },
      { type: 'emoji', value: '😊' },
    ]);
    expect(nodeByText(doc, '子一').metadata?.markers).toEqual([{ type: 'task', state: 'done' }]);
  });

  it('映射字体与连线样式', () => {
    const doc = parseFreeMind(SAMPLE);
    const style = doc.nodes[doc.rootId].style!;
    expect(style.textColor).toBe('#ff0000');
    expect(style.fillColor).toBe('#ffffcc');
    expect(style.fontSize).toBe(19);
    expect(style.fontWeight).toBe('bold');
    expect(style.italic).toBe(true);
    expect(style.fontFamily).toBe('Sans');
    expect(style.connectorColor).toBe('#00aa00');
    expect(style.connectorWidth).toBe(3);
    expect(style.connectorType).toBe('curve');
  });

  it('arrowlink 还原为联系线', () => {
    const doc = parseFreeMind(SAMPLE);
    expect(doc.relations).toHaveLength(1);
    const relation = doc.relations[0];
    expect(doc.nodes[relation.from].text).toBe('发布计划');
    expect(doc.nodes[relation.to].text).toBe('子二');
    expect(relation.label).toBe('依赖');
  });

  it('内容缺失或损坏时抛错', () => {
    expect(() => parseFreeMind('<map version="1.0.1"></map>')).toThrow();
    expect(() => parseFreeMind('<map><node TEXT="x">')).toThrow();
    expect(() => parseFreeMind('<not-a-map/>')).toThrow();
  });
});
