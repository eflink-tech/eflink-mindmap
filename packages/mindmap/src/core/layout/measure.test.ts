// 文本测量与换行测试
import { beforeEach, describe, expect, it } from 'vitest';
import type { Marker, MindMapDocument, ThemeConfig } from '../../types/mindmap';
import { addChild, createDocument } from '../editor/nodeOps';
import { DEFAULT_CANVAS_OPTIONS } from '../style/canvasOptions';
import { clearMeasureCache, computeDepths, measureAllNodes, measureNode, wrapText, type WidthFn } from './measure';

const widthOf: WidthFn = (text) => text.length * 10;

const theme: ThemeConfig = {
  name: 't',
  colors: { primary: '#000', branches: ['#111'], background: '#fff' },
  node: { shape: 'rounded', padding: [14, 8], fontSize: 14, fontWeight: 'normal' },
  connector: { type: 'curve', width: 2 },
};

beforeEach(() => clearMeasureCache());

describe('wrapText', () => {
  it('不超宽时单行', () => {
    expect(wrapText('abc', 100, 'f', widthOf)).toEqual(['abc']);
  });

  it('超宽时按字符换行', () => {
    // 6 字符 60px > 50px → 换行
    expect(wrapText('abcdef', 50, 'f', widthOf)).toEqual(['abcde', 'f']);
  });

  it('保留显式换行', () => {
    expect(wrapText('a\nb', 100, 'f', widthOf)).toEqual(['a', 'b']);
  });

  it('空文本返回单空行', () => {
    expect(wrapText('', 100, 'f', widthOf)).toEqual(['']);
  });
});

describe('measureNode', () => {
  it('宽度 = 最长行 + 水平 padding，高度 = 行数*行高 + 垂直 padding', () => {
    const size = measureNode({ text: 'abcde' }, theme, widthOf, 2);
    // 行高 = 14 * 1.4 = 19.6
    expect(size.width).toBeCloseTo(50 + 28);
    expect(size.height).toBeCloseTo(19.6 + 16);
    expect(size.lines).toEqual(['abcde']);
  });

  it('宽度不超过 maxWidth + padding', () => {
    const size = measureNode({ text: 'x'.repeat(100) }, theme, widthOf, 2);
    expect(size.width).toBeLessThanOrEqual(400 + 28);
  });

  it('缓存命中：第二次调用返回同一引用', () => {
    const size1 = measureNode({ text: 'cache-test' }, theme, widthOf, 2);
    const size2 = measureNode({ text: 'cache-test' }, theme, widthOf, 2);
    expect(size1).toBe(size2);
  });

  it('标记行加宽节点并压缩文字可用宽，缓存按标记区分', () => {
    const markers: Marker[] = [
      { type: 'priority', level: 1 },
      { type: 'flag', color: 'red' },
    ];
    // 2 × 16px 图标 + 4px 间距（含尾部）= 40
    const withMarkers = measureNode({ text: 'abcde', metadata: { markers } }, theme, widthOf, 2);
    const without = measureNode({ text: 'abcde' }, theme, widthOf, 2);
    expect(withMarkers.width).toBeCloseTo(without.width + 40);
    // 长文本换行更早：可用宽压缩后行数增多
    const longWith = measureNode({ text: 'x'.repeat(40), metadata: { markers } }, theme, widthOf, 2);
    const longWithout = measureNode({ text: 'x'.repeat(40) }, theme, widthOf, 2);
    expect(longWith.lines.length).toBeGreaterThanOrEqual(longWithout.lines.length);
    // 标记不同 → 缓存不串用
    const other = measureNode(
      { text: 'abcde', metadata: { markers: [{ type: 'priority', level: 2 }] } },
      theme, widthOf, 2,
    );
    expect(other).not.toBe(withMarkers);
  });

  it('大号贴纸撑高节点', () => {
    const size = measureNode(
      { text: 'ab', metadata: { markers: [{ type: 'sticker', value: '💼', large: true }] } },
      theme, widthOf, 2,
    );
    // 文本行高 19.6 < 贴纸 30 → 高度由标记决定
    expect(size.height).toBeCloseTo(30 + 16);
  });

  it('自定义 fontSize', () => {
    const size = measureNode({ text: 'abc', style: { fontSize: 20 } }, theme, widthOf, 2);
    // 行高 = 20 * 1.4 = 28
    expect(size.height).toBeCloseTo(28 + 16);
    expect(size.lines).toEqual(['abc']);
  });

  it('根节点(depth=0)字体更大', () => {
    const size = measureNode({ text: 'abc' }, theme, widthOf, 0);
    // 行高 = (14+4) * 1.4 = 25.2
    expect(size.height).toBeCloseTo(25.2 + 16);
  });

  it('一级分支(depth=1)字体中等', () => {
    const size = measureNode({ text: 'abc' }, theme, widthOf, 1);
    // 行高 = (14+2) * 1.4 = 22.4
    expect(size.height).toBeCloseTo(22.4 + 16);
  });

  it('fixedWidth 固定总宽度，高度仍按换行计算', () => {
    const size = measureNode(
      { text: 'abcdef', style: { fixedWidth: 80 } },
      theme,
      widthOf,
      2,
    );
    expect(size.width).toBe(80);
    expect(size.lines.length).toBeGreaterThan(1);
    expect(size.height).toBeGreaterThan(16);
  });

  it('fontFamily 优先节点 style，其次 canvasOptions', () => {
    const fonts: string[] = [];
    const capture: WidthFn = (text, font) => {
      fonts.push(font);
      return widthOf(text, font);
    };
    measureNode(
      { text: 'abc', style: { fontFamily: 'NodeFont' } },
      theme,
      capture,
      2,
      { ...DEFAULT_CANVAS_OPTIONS, fontFamily: 'CanvasFont' },
    );
    measureNode(
      { text: 'abc' },
      theme,
      capture,
      2,
      { ...DEFAULT_CANVAS_OPTIONS, fontFamily: 'CanvasFont' },
    );
    expect(fonts.some((f) => f.includes('NodeFont'))).toBe(true);
    expect(fonts.some((f) => f.includes('CanvasFont'))).toBe(true);
  });

  it('italic 进入 fontString 与缓存键，测量宽度可更大', () => {
    const widthOfItalic: WidthFn = (text, font) =>
      text.length * 10 * (font.includes('italic') ? 1.2 : 1);
    const normal = measureNode({ text: 'abcdef' }, theme, widthOfItalic, 2);
    const italic = measureNode(
      { text: 'abcdef', style: { italic: true } },
      theme,
      widthOfItalic,
      2,
    );
    expect(italic.width).toBeGreaterThan(normal.width);
    expect(italic).not.toBe(normal);
    // 缓存：同 italic 再测命中
    const again = measureNode(
      { text: 'abcdef', style: { italic: true } },
      theme,
      widthOfItalic,
      2,
    );
    expect(again).toBe(italic);
  });
});

describe('measureAllNodes', () => {
  it('为所有节点产出尺寸', () => {
    let doc: MindMapDocument = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    const sizes = measureAllNodes(doc, theme, widthOf);
    expect(Object.keys(sizes)).toHaveLength(2);
    expect(sizes[doc.rootId].width).toBeGreaterThan(0);
  });

  it('根节点比子节点大', () => {
    let doc: MindMapDocument = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    doc = addChild(doc, doc.rootId, 'B');
    const sizes = measureAllNodes(doc, theme, widthOf);
    // 根节点 fontSize=18, 子节点 fontSize=16
    expect(sizes[doc.rootId].height).toBeGreaterThan(sizes[Object.keys(sizes).find((k) => k !== doc.rootId)!].height);
  });
});

describe('computeDepths', () => {
  it('根节点深度为0，子节点递增', () => {
    let doc: MindMapDocument = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    // 获取一级子节点 ID
    const childId = doc.nodes[doc.rootId].children[0];
    doc = addChild(doc, childId, 'B');
    const grandchildId = doc.nodes[childId].children[0];
    const depths = computeDepths(doc);
    expect(depths[doc.rootId]).toBe(0);
    expect(depths[childId]).toBe(1);
    expect(depths[grandchildId]).toBe(2);
  });
});
