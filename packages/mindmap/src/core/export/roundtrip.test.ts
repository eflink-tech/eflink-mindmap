// 导出 → 导入往返测试：XMind / FreeMind / OPML 三种外部格式
import { describe, expect, it } from 'vitest';
import type { MindMapDocument } from '../../types/mindmap';
import { addChild, addRelation, addBoundary, addSummary, createDocument, updateMetadata, updateStyle } from '../editor/nodeOps';
import { parseFreeMind } from '../import/freeMind';
import { parseOpml } from '../import/opml';
import { parseXmind } from '../import/xmind';
import { exportToFreeMind } from './freeMind';
import { exportToOpml } from './opml';
import { exportToXmind } from './xmind';

function sample(): { doc: MindMapDocument; aId: string; bId: string; cId: string } {
  let doc = createDocument('项目计划');
  doc = { ...doc, layout: 'logic-right' };
  doc = addChild(doc, doc.rootId, '需求');
  const aId = Object.values(doc.nodes).find((n) => n.text === '需求')!.id;
  doc = addChild(doc, doc.rootId, '设计');
  const bId = Object.values(doc.nodes).find((n) => n.text === '设计')!.id;
  doc = addChild(doc, doc.rootId, '开发');
  const cId = Object.values(doc.nodes).find((n) => n.text === '开发')!.id;
  doc = updateMetadata(doc, aId, {
    note: '收集需求',
    labels: ['P0'],
    link: 'https://example.com',
    markers: [
      { type: 'priority', level: 1 },
      { type: 'task', state: 'done' },
    ],
    collapsed: true,
  });
  doc = updateStyle(doc, bId, { fillColor: '#FFEEDD', fontSize: 18, fontWeight: 'bold' });
  doc = addRelation(doc, aId, cId);
  doc = addRelation(doc, bId, cId);
  doc = addBoundary(doc, [aId, bId]);
  doc = addSummary(doc, doc.rootId, [0, 1], '前期');
  return { doc, aId, bId, cId };
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function findText(doc: MindMapDocument, text: string) {
  return Object.values(doc.nodes).find((n) => n.text === text);
}

describe('XMind 导出往返', () => {
  it('保留布局、文本、元数据、标记、关系、外框与概要', async () => {
    const { doc, aId, bId, cId } = sample();
    const bytes = exportToXmind(doc);
    const back = await parseXmind(toArrayBuffer(bytes));

    expect(back.layout).toBe('logic-right');
    expect(back.title).toBe('项目计划');
    expect(findText(back, '需求')).toBeTruthy();

    const a = findText(back, '需求')!;
    expect(a.metadata?.note).toBe('收集需求');
    expect(a.metadata?.labels).toEqual(['P0']);
    expect(a.metadata?.link).toBe('https://example.com');
    expect(a.metadata?.collapsed).toBe(true);
    expect(a.metadata?.markers?.some((m) => m.type === 'priority' && m.level === 1)).toBe(true);
    expect(a.metadata?.markers?.some((m) => m.type === 'task' && m.state === 'done')).toBe(true);

    const b = findText(back, '设计')!;
    expect(b.style?.fillColor).toBe('#FFEEDD');
    expect(b.style?.fontWeight).toBe('bold');
    expect(b.style?.fontSize).toBe(18);

    expect(back.relations).toHaveLength(2);
    expect(back.boundaries).toHaveLength(1);
    expect(back.boundaries[0].title).toBeFalsy();
    expect(back.boundaries[0].nodeIds).toHaveLength(2);
    expect(back.summaries).toHaveLength(1);
    expect(back.summaries[0].text).toBe('前期');

    // 关系端点按文本核对（导入生成新 id）
    const relTexts = back.relations.map((r) => [back.nodes[r.from].text, back.nodes[r.to].text].join('->'));
    expect(relTexts).toContain('需求->开发');
    expect(relTexts).toContain('设计->开发');
    expect(aId).toBeTruthy();
    expect(bId).toBeTruthy();
    expect(cId).toBeTruthy();
  });

  it('data URL 图片写入资源并在导入时还原', async () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, '带图');
    const id = Object.values(doc.nodes).find((n) => n.text === '带图')!.id;
    doc = updateMetadata(doc, id, { image: 'data:image/png;base64,iVBORw0KGgo=' });
    const back = await parseXmind(toArrayBuffer(exportToXmind(doc)));
    const node = findText(back, '带图')!;
    expect(node.metadata?.image).toBe('data:image/png;base64,iVBORw0KGgo=');
  });
});

describe('FreeMind 导出往返', () => {
  it('保留层级、备注、链接、标记、折叠、样式与关系', () => {
    const { doc } = sample();
    const back = parseFreeMind(exportToFreeMind(doc));
    const a = findText(back, '需求')!;
    expect(findText(back, '设计')).toBeTruthy();
    expect(a.metadata?.note).toBe('收集需求');
    expect(a.metadata?.link).toBe('https://example.com');
    expect(a.metadata?.collapsed).toBe(true);
    expect(a.metadata?.markers?.some((m) => m.type === 'priority' && m.level === 1)).toBe(true);
    const b = findText(back, '设计')!;
    expect(b.style?.fontWeight).toBe('bold');
    expect(b.style?.fillColor).toBe('#FFEEDD');
    expect(back.relations).toHaveLength(2);
    expect(back.nodes[back.relations[0].to].text).toBeTruthy();
  });
});

describe('OPML 导出往返', () => {
  it('保留层级、备注与链接', () => {
    const { doc } = sample();
    const back = parseOpml(exportToOpml(doc));
    expect(back.title).toBe('项目计划');
    const a = findText(back, '需求')!;
    expect(a.metadata?.note).toBe('收集需求');
    expect(a.metadata?.link).toBe('https://example.com');
    expect(back.nodes[back.rootId].children).toHaveLength(3);
  });

  it('空节点与特殊字符安全转义', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A & B "quoted" <tag>');
    const back = parseOpml(exportToOpml(doc));
    expect(findText(back, 'A & B "quoted" <tag>')).toBeTruthy();
  });
});
