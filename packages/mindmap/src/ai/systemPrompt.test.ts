import { describe, expect, it } from 'vitest';
import { buildExpandPrompt, buildTreePrompt, isPlaceholderRoot, parseAITree, parseJSONFromText } from './systemPrompt';

describe('parseJSONFromText', () => {
  it('解析裸 JSON', () => {
    expect(parseJSONFromText('{"a":1}')).toEqual({ a: 1 });
  });
  it('剥掉 markdown 代码块', () => {
    expect(parseJSONFromText('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('截取首尾大括号', () => {
    expect(parseJSONFromText('好的，以下是结果：{"a":1} 请查收')).toEqual({ a: 1 });
  });
  it('非法输入抛错', () => {
    expect(() => parseJSONFromText('不是JSON')).toThrow();
  });
});

describe('parseAITree', () => {
  it('解析中心主题与嵌套分支', () => {
    const tree = parseAITree(
      '{"root":"产品规划","children":[{"text":"市场","children":[{"text":"竞品"}]},{"text":"研发"}]}',
    );
    expect(tree.root).toBe('产品规划');
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0].children?.[0].text).toBe('竞品');
    expect(tree.children[1].children).toEqual([]);
  });
  it('expand 模式忽略 root，仅取 children', () => {
    const tree = parseAITree('{"root":"其他","children":[{"text":"要点"}]}', true);
    expect(tree.root).toBeUndefined();
    expect(tree.children).toHaveLength(1);
  });
  it('兼容单节点结构（顶层为 text+children）', () => {
    const tree = parseAITree('{"text":"主题","children":[{"text":"A"}]}');
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].text).toBe('A');
  });
  it('丢弃空文本节点并裁剪超长文本', () => {
    const longText = 'x'.repeat(200);
    const tree = parseAITree(`{"children":[{"text":"  "},{"text":"ok"},{"text":"${longText}"}]}`);
    expect(tree.children.map((n) => n.text)).toEqual(['ok', 'x'.repeat(100)]);
  });
  it('无有效内容抛错', () => {
    expect(() => parseAITree('{"children":[]}')).toThrow();
    expect(() => parseAITree('{"a":1}')).toThrow();
  });
});

describe('isPlaceholderRoot', () => {
  it('识别默认占位文本', () => {
    expect(isPlaceholderRoot('中心主题')).toBe(true);
    expect(isPlaceholderRoot('  ')).toBe(true);
    expect(isPlaceholderRoot('我的导图')).toBe(false);
  });
});

describe('prompts', () => {
  it('buildTreePrompt 包含主题与要求', () => {
    const prompt = buildTreePrompt('发布计划', '三层');
    expect(prompt).toContain('发布计划');
    expect(prompt).toContain('三层');
    expect(prompt).toContain('"children"');
  });
  it('buildExpandPrompt 包含主题与上下文', () => {
    const prompt = buildExpandPrompt('展开「{topic}」', '市场', '- 中心主题');
    expect(prompt).toContain('展开「市场」');
    expect(prompt).toContain('- 中心主题');
  });
});
