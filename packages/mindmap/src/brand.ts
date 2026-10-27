// 品牌可切换：宿主按部署站点选择 DocuLuma 或 Eflink 品牌（logo + 产品名）。
// 只影响界面观感；本地存储命名空间始终是 doculuma:*，与品牌切换无关。
import type { OfficeHeaderBrand } from '@eflink-tech/office-kit';
import doculumaLogo from './assets/mindmap-doculuma-logo.png';
import eflinkLogo from './assets/mindmap-eflink-logo.png';

export type EditorBrandId = 'doculuma' | 'eflink';

export const EDITOR_BRAND_IDS = ['doculuma', 'eflink'] as const;

const BUILTIN_BRANDS: Record<EditorBrandId, Required<OfficeHeaderBrand>> = {
  doculuma: { name: 'DocuLuma MindMap', logo: doculumaLogo },
  eflink: { name: '易飞思维导图', logo: eflinkLogo },
};

/** 宽松解析品牌参数（'Eflink'/'EFLINK' 均可），缺省 doculuma */
export function resolveEditorBrandId(input?: string | null): EditorBrandId {
  return (input ?? '').trim().toLowerCase() === 'eflink' ? 'eflink' : 'doculuma';
}

export function builtinEditorBrand(id: EditorBrandId): Required<OfficeHeaderBrand> {
  return BUILTIN_BRANDS[id];
}

// 当前品牌是模块级状态（与 setMindLocale / setEditorBackHref 同一模式）：
// MindMapEditor 挂载时设置，ToolBar / StartScreen 等深层组件渲染时直接读取，避免逐层透传。
let activeBrand: Required<OfficeHeaderBrand> = BUILTIN_BRANDS.doculuma;

/** 编辑器入口调用：设置当前品牌（未调用时保持缺省 doculuma） */
export function setActiveEditorBrand(id: EditorBrandId): void {
  activeBrand = BUILTIN_BRANDS[id];
}

/** 读取当前品牌（OfficeHeader 的 brand 与起始页 logo/产品名取用） */
export function getActiveEditorBrand(): Required<OfficeHeaderBrand> {
  return activeBrand;
}
