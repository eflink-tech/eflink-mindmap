import { describe, expect, it } from 'vitest';
import { addChild, createDocument } from '../editor/nodeOps';
import { presentationSequence } from './sequence';

describe('演示翻页序列', () => {
  it('默认从根节点前序遍历，父主题先于子主题', () => {
    const doc0 = createDocument();
    const doc1 = addChild(doc0, doc0.rootId, 'A');
    const rootChildren1 = doc1.nodes[doc1.rootId].children;
    const a = rootChildren1[0];
    const doc2 = addChild(doc1, doc1.rootId, 'B');
    const b = doc2.nodes[doc2.rootId].children[1];
    const doc3 = addChild(doc2, a, 'A1');

    const ids = presentationSequence(doc3);
    expect(ids[0]).toBe(doc3.rootId);
    expect(ids).toEqual([doc3.rootId, a, doc3.nodes[a].children[0], b]);
  });

  it('指定起始节点时只遍历该分支', () => {
    const doc0 = createDocument();
    const doc1 = addChild(doc0, doc0.rootId, 'A');
    const a = doc1.nodes[doc1.rootId].children[0];
    const doc2 = addChild(doc1, doc1.rootId, 'B');
    const doc3 = addChild(doc2, a, 'A1');

    expect(presentationSequence(doc3, a)).toEqual([a, doc3.nodes[a].children[0]]);
  });

  it('无效起始节点回退到根节点', () => {
    const doc = createDocument();
    addChild(doc, doc.rootId, 'A');
    const withA = addChild(doc, doc.rootId, 'B');
    expect(presentationSequence(withA, 'missing')[0]).toBe(withA.rootId);
  });
});
