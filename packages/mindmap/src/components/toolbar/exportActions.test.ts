import { describe, expect, it } from 'vitest';
import { createDocument, updateText } from '../../core/editor/nodeOps';
import { exportBasename } from './exportActions';

describe('exportBasename', () => {
  it('优先使用文档标题', () => {
    let doc = createDocument('文件名标题');
    doc = updateText(doc, doc.rootId, '中心主题文本');
    expect(exportBasename(doc)).toBe('文件名标题');
  });

  it('文档标题为空时回退中心主题', () => {
    let doc = createDocument('');
    doc = { ...doc, title: '   ' };
    doc = updateText(doc, doc.rootId, '年度产品规划');
    expect(exportBasename(doc)).toBe('年度产品规划');
  });

  it('标题与中心主题都空时回退默认名', () => {
    let doc = createDocument('');
    doc = { ...doc, title: '' };
    doc = updateText(doc, doc.rootId, '');
    expect(exportBasename(doc)).toBe('思维导图');
  });
});
