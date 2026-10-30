import { describe, expect, it } from 'vitest';
import { addChild } from './nodeOps';
import { createDocument } from './nodeOps';
import { replaceAllText, searchNodes } from './search';

function sampleDoc() {
  let doc = createDocument('中心');
  doc = addChild(doc, doc.rootId, 'Alpha');
  const a = Object.values(doc.nodes).find((n) => n.text === 'Alpha')!;
  doc = addChild(doc, a.id, 'alpha 子节点');
  doc = addChild(doc, doc.rootId, 'Beta');
  return doc;
}

describe('searchNodes', () => {
  it('按先序返回忽略大小写的文本命中', () => {
    const doc = sampleDoc();
    const hits = searchNodes(doc, 'ALPHA');
    expect(hits).toHaveLength(2);
    expect(doc.nodes[hits[0]].text).toBe('Alpha');
    expect(doc.nodes[hits[1]].text).toBe('alpha 子节点');
  });

  it('空查询返回空数组', () => {
    expect(searchNodes(sampleDoc(), '   ')).toEqual([]);
  });

  it('无命中返回空数组', () => {
    expect(searchNodes(sampleDoc(), 'gamma')).toEqual([]);
  });

  it('子节点排在父节点之后（先序）', () => {
    const doc = sampleDoc();
    const hits = searchNodes(doc, 'a');
    const alpha = Object.values(doc.nodes).find((n) => n.text === 'Alpha')!;
    const betaIndex = hits.indexOf(Object.values(doc.nodes).find((n) => n.text === 'Beta')!.id);
    expect(hits.indexOf(alpha.id)).toBeLessThan(betaIndex);
  });
});

describe('replaceAllText', () => {
  it('忽略大小写替换全部命中', () => {
    expect(replaceAllText('Alpha alpha ALPHA', 'alpha', 'A')).toBe('A A A');
  });

  it('query 为空时原样返回', () => {
    expect(replaceAllText('文本', '', 'x')).toBe('文本');
  });

  it('特殊字符按字面量处理', () => {
    expect(replaceAllText('a.b a.b', 'a.b', 'c')).toBe('c c');
  });
});
