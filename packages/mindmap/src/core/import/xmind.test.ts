import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { layoutFromStructureClass, parseXmind } from './xmind';

function makeZip(files: Record<string, string | Uint8Array>): ArrayBuffer {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, value] of Object.entries(files)) {
    entries[name] = typeof value === 'string' ? strToU8(value) : value;
  }
  const zipped = zipSync(entries);
  return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
}

function nodeByText(doc: Awaited<ReturnType<typeof parseXmind>>, text: string) {
  const node = Object.values(doc.nodes).find((item) => item.text === text);
  if (!node) throw new Error(`node not found: ${text}`);
  return node;
}

const JSON_CONTENT = [
  {
    id: 'sheet1',
    class: 'sheet',
    title: '项目规划',
    rootTopic: {
      id: 'root',
      title: '中心',
      structureClass: 'org.xmind.ui.logic.right',
      children: {
        attached: [
          {
            id: 'a',
            title: '分支 A',
            branch: 'folded',
            notes: { plain: { content: '备注 A' } },
            labels: ['标签一', '标签二'],
            href: 'https://example.com/a',
            markers: [
              { markerId: 'priority-1' },
              { markerId: 'flag-red' },
              { markerId: 'task-half' },
              { markerId: 'smiley-smile' },
            ],
            style: {
              properties: {
                'svg:fill': '#FFE0B2',
                'fo:color': '#333333',
                'shape-class': 'org.xmind.ui.topicShape.ellipse',
                'fo:font-size': '12pt',
                'fo:font-weight': 'bold',
              },
            },
            children: { attached: [{ id: 'a1', title: '孙子' }] },
            boundaries: [{ id: 'bd', range: '(0,1)', title: '外框' }],
            summaries: [{ id: 'sm', range: '(0,1)', topic: { title: '概要' } }],
          },
          { id: 'b', title: '分支 B', position: 'left' },
        ],
        detached: [{ id: 'd', title: '浮动主题' }],
      },
    },
    relationships: [{ id: 'r1', end1Id: 'a', end2Id: 'b', title: '关联' }],
    theme: {
      backgroundColor: '#101820',
      centralTopic: { properties: { 'svg:fill': '#123456' } },
    },
  },
];

const LEGACY_CONTENT = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" version="2.0">
  <sheet id="sheet1">
    <topic id="root" structure-class="org.xmind.ui.map.unbalanced">
      <title>中心</title>
      <children>
        <topics type="attached">
          <topic id="a" style-id="s1" branch="folded">
            <title>A</title>
            <notes><plain>旧版备注</plain></notes>
            <labels><label>L1</label></labels>
            <marker-refs>
              <marker-ref marker-id="priority-2"/>
              <marker-ref marker-id="star-blue"/>
            </marker-refs>
            <href>https://example.com/legacy</href>
            <children>
              <topics type="attached">
                <topic id="a1"><title>A1</title></topic>
              </topics>
            </children>
            <boundaries><boundary id="bd" range="(0,1)" title="旧框"/></boundaries>
            <summaries><summary id="sm" range="(0,1)"><topic><title>旧概要</title></topic></summary></summaries>
          </topic>
          <topic id="b"><title>B</title></topic>
        </topics>
      </children>
    </topic>
    <relationships>
      <relationship id="r1" end1="a" end2="b" title="旧联系"/>
    </relationships>
  </sheet>
</xmap-content>`;

const LEGACY_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<xmap-styles xmlns="urn:xmind:xmap:xmlns:style:2.0"
  xmlns:svg="http://www.w3.org/2000/svg"
  xmlns:fo="http://www.w3.org/1999/XSL/Format">
  <styles>
    <style id="s1" type="topic">
      <topic-properties svg:fill="#FF0000" fo:color="#FFFFFF" fo:font-size="14pt"
        shape-class="org.xmind.topicShape.hexagon"/>
    </style>
  </styles>
</xmap-styles>`;

describe('parseXmind（content.json）', () => {
  it('映射节点树、布局、元数据、样式与覆盖层', async () => {
    const doc = await parseXmind(makeZip({ 'content.json': JSON.stringify(JSON_CONTENT) }), {
      fileName: 'Quarterly Plan.xmind',
    });

    expect(doc.title).toBe('Quarterly Plan');
    expect(doc.layout).toBe('logic-right');
    expect(doc.nodes[doc.rootId].text).toBe('中心');
    expect(doc.nodes[doc.rootId].style?.fillColor).toBe('#123456');
    expect(doc.canvasOptions?.background).toBe('#101820');

    // attached 在前，detached 作为普通一级主题接在末尾
    expect(doc.nodes[doc.rootId].children.map((id) => doc.nodes[id].text)).toEqual(['分支 A', '分支 B', '浮动主题']);

    const branchA = nodeByText(doc, '分支 A');
    expect(branchA.metadata).toMatchObject({
      note: '备注 A',
      labels: ['标签一', '标签二'],
      link: 'https://example.com/a',
      collapsed: true,
    });
    expect(branchA.metadata?.markers?.map((marker) => marker.type)).toEqual(['priority', 'flag', 'task', 'emoji']);
    expect(branchA.metadata?.markers).toContainEqual({ type: 'task', state: 'p50' });
    expect(branchA.metadata?.markers).toContainEqual({ type: 'emoji', value: '😊' });
    expect(branchA.style).toMatchObject({
      fillColor: '#FFE0B2',
      textColor: '#333333',
      shape: 'ellipse',
      fontSize: 16,
      fontWeight: 'bold',
    });
    expect(doc.nodes[branchA.id].children.map((id) => doc.nodes[id].text)).toEqual(['孙子']);

    const branchB = nodeByText(doc, '分支 B');
    expect(branchB.metadata?.side).toBe('left');

    expect(doc.boundaries).toHaveLength(1);
    expect(doc.boundaries[0].title).toBe('外框');
    expect(doc.boundaries[0].nodeIds).toEqual([nodeByText(doc, '孙子').id]);

    expect(doc.summaries).toHaveLength(1);
    expect(doc.summaries[0]).toMatchObject({
      parentId: branchA.id,
      range: [0, 0],
      text: '概要',
    });

    expect(doc.relations).toHaveLength(1);
    expect(doc.relations[0]).toMatchObject({
      from: branchA.id,
      to: branchB.id,
      label: '关联',
    });
  });

  it('多画布只取第一个；无文件名时回退画布标题', async () => {
    const second = {
      ...JSON_CONTENT[0],
      id: 'sheet2',
      title: '第二画布',
      rootTopic: { ...JSON_CONTENT[0].rootTopic, title: '第二中心' },
    };
    const doc = await parseXmind(makeZip({ 'content.json': JSON.stringify([JSON_CONTENT[0], second]) }));

    expect(doc.title).toBe('项目规划');
    expect(doc.nodes[doc.rootId].text).toBe('中心');
  });

  it('把内嵌 resources 图片转为 data URL', async () => {
    const content = [
      {
        ...JSON_CONTENT[0],
        rootTopic: {
          ...JSON_CONTENT[0].rootTopic,
          children: {
            attached: [{ id: 'img', title: '带图', image: { src: 'xap:resources/pic.png' } }],
          },
        },
      },
    ];
    const doc = await parseXmind(
      makeZip({
        'content.json': JSON.stringify(content),
        'resources/pic.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      }),
    );
    expect(nodeByText(doc, '带图').metadata?.image).toBe('data:image/png;base64,iVBORw==');
  });
});

describe('parseXmind（content.xml，XMind 8）', () => {
  it('解析旧版 topic 树、样式表、标记与覆盖层', async () => {
    const doc = await parseXmind(
      makeZip({
        'content.xml': LEGACY_CONTENT,
        'styles.xml': LEGACY_STYLES,
      }),
    );

    expect(doc.layout).toBe('map-balanced-curve');
    expect(doc.title).toBe('中心');
    const branchA = nodeByText(doc, 'A');
    expect(branchA.metadata).toMatchObject({
      note: '旧版备注',
      labels: ['L1'],
      link: 'https://example.com/legacy',
      collapsed: true,
    });
    expect(branchA.metadata?.markers).toEqual([
      { type: 'priority', level: 2 },
      { type: 'star', color: 'blue' },
    ]);
    expect(branchA.style).toMatchObject({
      fillColor: '#FF0000',
      textColor: '#FFFFFF',
      shape: 'hexagon',
      fontSize: 19,
    });
    expect(doc.boundaries[0].nodeIds).toEqual([nodeByText(doc, 'A1').id]);
    expect(doc.summaries[0]).toMatchObject({ text: '旧概要', range: [0, 0] });
    expect(doc.relations[0].label).toBe('旧联系');
  });

  it('旧版 branch=folded 保留折叠状态', async () => {
    const doc = await parseXmind(makeZip({ 'content.xml': LEGACY_CONTENT }));
    expect(nodeByText(doc, 'A').metadata?.collapsed).toBe(true);
  });
});

describe('parseXmind 异常与结构映射', () => {
  it('非 ZIP 文件报无效 XMind', async () => {
    await expect(parseXmind(new Uint8Array([1, 2, 3]).buffer)).rejects.toThrow();
  });

  it('缺少 content 文件报没有可导入画布', async () => {
    await expect(parseXmind(makeZip({ 'readme.txt': 'hello' }))).rejects.toThrow();
  });

  it('content.json 损坏时报解析失败', async () => {
    await expect(parseXmind(makeZip({ 'content.json': '{oops' }))).rejects.toThrow();
  });

  it('structureClass 映射到对应布局', () => {
    expect(layoutFromStructureClass('org.xmind.ui.map.unbalanced')).toBe('map-balanced-curve');
    expect(layoutFromStructureClass('org.xmind.ui.map.right')).toBe('map-right-curve');
    expect(layoutFromStructureClass('org.xmind.ui.logic.left')).toBe('logic-left');
    expect(layoutFromStructureClass('org.xmind.ui.org.down')).toBe('org-down');
    expect(layoutFromStructureClass('org.xmind.ui.tree.right')).toBe('tree-right');
    expect(layoutFromStructureClass('org.xmind.ui.timeline.vertical')).toBe('timeline-v');
    expect(layoutFromStructureClass('org.xmind.ui.brace.right')).toBe('brace-right');
    expect(layoutFromStructureClass('org.xmind.ui.unknown.thing')).toBe('map-balanced-curve');
    expect(layoutFromStructureClass(undefined)).toBe('map-balanced-curve');
  });
});
