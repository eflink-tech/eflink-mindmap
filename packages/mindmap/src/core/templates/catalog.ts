// packages/mindmap/src/core/templates/catalog.ts
// 内置模板：模板名与节点文本以中文原文为键（经 titlesCatalog 换语言），
// 新建文档时按当前界面语言落地，后续编辑/导出不依赖目录。
import { translateTitle } from '../../i18n/assetTitles';
import type { LayoutPresetId, MindMapDocument } from '../../types/mindmap';
import { addChild, createDocument } from '../editor/nodeOps';
import { getPreset } from '../layout/presets';
import type { ThemeId } from '../style/themes';

export interface TemplateNodeSpec {
  text: string;
  children?: TemplateNodeSpec[];
}

export interface TemplateSpec {
  id: string;
  /** 模板名（同时作为文档标题与中心主题） */
  name: string;
  theme: ThemeId;
  layout: LayoutPresetId;
  tree: TemplateNodeSpec[];
}

export const TEMPLATES: TemplateSpec[] = [
  {
    id: 'meeting',
    name: '会议纪要',
    theme: 'business',
    layout: 'map-balanced-curve',
    tree: [
      {
        text: '会议信息',
        children: [{ text: '日期' }, { text: '地点' }, { text: '参会人' }],
      },
      { text: '议题' },
      { text: '决议' },
      {
        text: '待办事项',
        children: [{ text: '负责人' }, { text: '截止时间' }],
      },
    ],
  },
  {
    id: 'project',
    name: '项目计划',
    theme: 'fresh',
    layout: 'logic-right',
    tree: [
      {
        text: '项目目标',
        children: [{ text: '里程碑' }, { text: '任务拆解' }],
      },
      { text: '风险' },
      { text: '资源' },
    ],
  },
  {
    id: 'swot',
    name: 'SWOT 分析',
    theme: 'mint',
    layout: 'matrix-2x2',
    tree: [{ text: '优势' }, { text: '劣势' }, { text: '机会' }, { text: '威胁' }],
  },
  {
    id: 'weekly',
    name: '周报',
    theme: 'sand',
    layout: 'map-right-curve',
    tree: [{ text: '本周成果' }, { text: '进行中' }, { text: '风险与阻塞' }, { text: '下周计划' }],
  },
  {
    id: 'okr',
    name: 'OKR 目标',
    theme: 'vitality',
    layout: 'logic-down',
    tree: [
      { text: '目标 O', children: [{ text: '关键结果 KR' }, { text: '行动计划' }] },
    ],
  },
  {
    id: 'timeline',
    name: '里程碑时间轴',
    theme: 'island',
    layout: 'timeline-h',
    tree: [{ text: '启动' }, { text: '规划' }, { text: '执行' }, { text: '收尾' }],
  },
];

function appendChildren(doc: MindMapDocument, parentId: string, specs: TemplateNodeSpec[]): MindMapDocument {
  return specs.reduce((acc, spec) => {
    const next = addChild(acc, parentId, translateTitle(spec.text));
    const children = next.nodes[parentId]?.children ?? [];
    const childId = children[children.length - 1];
    if (!childId || !spec.children?.length) return next;
    return appendChildren(next, childId, spec.children);
  }, doc);
}

export function buildTemplateDocument(spec: TemplateSpec): MindMapDocument {
  const doc = createDocument(translateTitle(spec.name));
  const preset = getPreset(spec.layout);
  const withNodes: MindMapDocument = {
    ...doc,
    themeId: spec.theme,
    layout: preset?.id ?? doc.layout,
    layoutDefaults: preset ? { ...preset.defaults } : doc.layoutDefaults,
    nodes: appendChildren(doc, doc.rootId, spec.tree).nodes,
    updatedAt: Date.now(),
  };
  return withNodes;
}

export function getTemplate(id: string): TemplateSpec | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
