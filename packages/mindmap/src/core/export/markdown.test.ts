// Markdown 双向转换测试
import { describe, expect, it } from 'vitest';
import { createDocument, addChild } from '../editor/nodeOps';
import { exportToMarkdown, importFromMarkdown } from './markdown';

function sampleDoc() {
  let doc = createDocument('项目计划');
  doc = addChild(doc, doc.rootId, '需求分析');
  doc = addChild(doc, doc.rootId, '设计');
  const design = Object.values(doc.nodes).find((n) => n.text === '设计')!;
  doc = addChild(doc, design.id, '架构设计');
  return doc;
}

describe('exportToMarkdown', () => {
  it('根节点为一级标题，子节点层级递增', () => {
    const md = exportToMarkdown(sampleDoc());
    const lines = md.split('\n').filter(Boolean);
    expect(lines[0]).toBe('# 项目计划');
    expect(lines[1]).toBe('## 需求分析');
    expect(lines[2]).toBe('## 设计');
    expect(lines[3]).toBe('### 架构设计');
  });

  it('忽略折叠状态，导出完整子树', () => {
    const md = exportToMarkdown(sampleDoc());
    expect(md).toContain('架构设计');
  });
});

describe('importFromMarkdown', () => {
  it('按 # 层级还原树结构', () => {
    const doc = importFromMarkdown('# 根\n## 子一\n## 子二\n### 孙');
    expect(doc.nodes[doc.rootId].text).toBe('根');
    expect(doc.nodes[doc.rootId].children).toHaveLength(2);
    const childIds = doc.nodes[doc.rootId].children;
    const second = doc.nodes[childIds[1]];
    expect(second.text).toBe('子二');
    expect(doc.nodes[second.children[0]].text).toBe('孙');
  });

  it('首行为文档标题', () => {
    const doc = importFromMarkdown('# 我的图');
    expect(doc.title).toBe('我的图');
  });

  it('跳过空行与非标题行', () => {
    const doc = importFromMarkdown('# 根\n\n普通文本行\n## 子');
    expect(doc.nodes[doc.rootId].children).toHaveLength(1);
  });

  it('层级跳跃时挂到最近的上级下', () => {
    const doc = importFromMarkdown('# 根\n### 跳级');
    expect(doc.nodes[doc.rootId].children).toHaveLength(1);
  });

  it('空内容返回单根文档', () => {
    const doc = importFromMarkdown('');
    expect(Object.keys(doc.nodes)).toHaveLength(1);
  });

  it('导出再导入结构一致（round-trip）', () => {
    const original = sampleDoc();
    const restored = importFromMarkdown(exportToMarkdown(original));
    expect(restored.nodes[restored.rootId].text).toBe('项目计划');
    expect(restored.nodes[restored.rootId].children).toHaveLength(2);
  });

  it('缩进列表还原层级（2 空格）', () => {
    const doc = importFromMarkdown('- 根\n  - 子\n    - 孙');
    expect(doc.nodes[doc.rootId].text).toBe('根');
    const child = doc.nodes[doc.nodes[doc.rootId].children[0]];
    expect(child.text).toBe('子');
    expect(doc.nodes[child.children[0]].text).toBe('孙');
  });

  it('4 空格缩进同样按层级处理', () => {
    const doc = importFromMarkdown('- 根\n    - 子\n        - 孙');
    const child = doc.nodes[doc.nodes[doc.rootId].children[0]];
    expect(child.text).toBe('子');
    expect(doc.nodes[child.children[0]].text).toBe('孙');
  });

  it('标题与列表混排', () => {
    const doc = importFromMarkdown('# 方案\n- 目标\n  - 指标\n## 实施\n- 步骤');
    const rootChildren = doc.nodes[doc.rootId].children.map((id) => doc.nodes[id].text);
    expect(rootChildren).toEqual(['目标', '实施']);
    const goal = Object.values(doc.nodes).find((node) => node.text === '目标')!;
    expect(goal.children.map((id) => doc.nodes[id].text)).toEqual(['指标']);
    const plan = Object.values(doc.nodes).find((node) => node.text === '实施')!;
    expect(plan.children.map((id) => doc.nodes[id].text)).toEqual(['步骤']);
  });

  it('跳过代码块中的列表行', () => {
    const doc = importFromMarkdown('# 根\n```\n- 不是节点\n```\n- 真节点');
    expect(doc.nodes[doc.rootId].children).toHaveLength(1);
    expect(doc.nodes[doc.nodes[doc.rootId].children[0]].text).toBe('真节点');
  });

  it('任务复选框映射为任务标记', () => {
    const doc = importFromMarkdown('# 清单\n- [x] 已完成\n- [ ] 未开始');
    const [doneId, todoId] = doc.nodes[doc.rootId].children;
    expect(doc.nodes[doneId].metadata?.markers).toEqual([{ type: 'task', state: 'done' }]);
    expect(doc.nodes[todoId].metadata?.markers).toEqual([{ type: 'task', state: 'start' }]);
  });

  it('有序列表与无序列表同级', () => {
    const doc = importFromMarkdown('# 根\n1. 一\n2. 二');
    expect(doc.nodes[doc.rootId].children.map((id) => doc.nodes[id].text)).toEqual(['一', '二']);
  });

  it('深度超过 6 级的节点 round-trip 不丢失', () => {
    // 构造 8 层链：根 → a → b → c → d → e → f → g
    let doc = createDocument('深树');
    let parentId = doc.rootId;
    for (const text of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      doc = addChild(doc, parentId, text);
      parentId = Object.values(doc.nodes).find((n) => n.text === text)!.id;
    }
    const restored = importFromMarkdown(exportToMarkdown(doc));
    // 逐层下钻，应能完整还原 8 层
    let id = restored.rootId;
    for (const text of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      const children = restored.nodes[id].children;
      expect(children).toHaveLength(1);
      id = children[0];
      expect(restored.nodes[id].text).toBe(text);
    }
  });
});
