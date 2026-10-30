// KityMinder / 百度脑图 .km 导入测试
import { describe, expect, it } from 'vitest';
import { parseKityMinder } from './kityMinder';
import type { MindMapDocument, MindMapNode } from '../../types/mindmap';

const SAMPLE = JSON.stringify({
  root: {
    data: { id: 'r', text: '项目', note: '根备注', hyperlink: 'https://example.com' },
    children: [
      {
        data: { id: 'a', text: '任务A', priority: 2, progress: 9, expandState: 'collapse' },
        children: [{ data: { text: '子任务' } }],
      },
      {
        data: { text: '任务B', progress: 5, image: 'data:image/png;base64,AAAA' },
      },
      { data: { text: '<b>富文本</b>节点' } },
    ],
  },
  template: 'filetree',
  theme: 'fresh-blue',
  version: '1.4.43',
});

function nodeByText(doc: MindMapDocument, text: string): MindMapNode {
  const node = Object.values(doc.nodes).find((item) => item.text === text);
  if (!node) throw new Error(`missing node: ${text}`);
  return node;
}

describe('parseKityMinder', () => {
  it('还原层级、标题与模板布局', () => {
    const doc = parseKityMinder(SAMPLE, { fileName: '计划.km' });
    expect(doc.title).toBe('计划');
    expect(doc.nodes[doc.rootId].text).toBe('项目');
    expect(doc.nodes[doc.rootId].children).toHaveLength(3);
    expect(nodeByText(doc, '任务A').children.map((id) => doc.nodes[id].text)).toEqual(['子任务']);
    expect(doc.layout).toBe('tree-right');
  });

  it('保留备注、链接、优先级、进度、折叠与图片', () => {
    const doc = parseKityMinder(SAMPLE);
    const root = doc.nodes[doc.rootId];
    expect(root.metadata?.note).toBe('根备注');
    expect(root.metadata?.link).toBe('https://example.com');

    const taskA = nodeByText(doc, '任务A');
    expect(taskA.metadata?.collapsed).toBe(true);
    expect(taskA.metadata?.markers).toEqual([
      { type: 'priority', level: 2 },
      { type: 'task', state: 'done' },
    ]);

    expect(nodeByText(doc, '任务B').metadata?.markers).toEqual([{ type: 'task', state: 'p50' }]);
    expect(nodeByText(doc, '任务B').metadata?.image).toBe('data:image/png;base64,AAAA');
  });

  it('富文本节点转纯文本', () => {
    const doc = parseKityMinder(SAMPLE);
    expect(nodeByText(doc, '富文本节点')).toBeTruthy();
  });

  it('未知模板回落到默认布局', () => {
    const doc = parseKityMinder(JSON.stringify({ root: { data: { text: '根' } }, template: 'unknown' }));
    expect(doc.layout).toBe('map-balanced-curve');
  });

  it('JSON 损坏或缺少 root 时抛错', () => {
    expect(() => parseKityMinder('{')).toThrow();
    expect(() => parseKityMinder('{"template":"right"}')).toThrow();
    expect(() => parseKityMinder('[]')).toThrow();
  });
});
