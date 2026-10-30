// UI store 面板状态测试
import { describe, expect, it } from 'vitest';
import { useMindMapStore } from './mindMapStore';
import { useUiStore } from './uiStore';

describe('uiStore panel', () => {
  it('togglePanel 打开与关闭', () => {
    useUiStore.setState({ panel: null });
    useUiStore.getState().togglePanel('properties');
    expect(useUiStore.getState().panel).toBe('properties');
    useUiStore.getState().togglePanel('properties');
    expect(useUiStore.getState().panel).toBeNull();
  });

  it('togglePanel 切换不同面板', () => {
    useUiStore.setState({ panel: 'properties' });
    useUiStore.getState().togglePanel('markers');
    expect(useUiStore.getState().panel).toBe('markers');
  });

  it('openInsertEditor 打开对应编辑器并收起面板，closeInsertEditor 关闭', () => {
    useUiStore.setState({ panel: 'properties' });
    useUiStore.getState().openInsertEditor('note');
    expect(useUiStore.getState().insertEditor).toBe('note');
    expect(useUiStore.getState().panel).toBeNull();
    useUiStore.getState().closeInsertEditor();
    expect(useUiStore.getState().insertEditor).toBeNull();
  });

  it('setMarkersTab 切换标记面板 Tab', () => {
    useUiStore.getState().setMarkersTab('stickers');
    expect(useUiStore.getState().markersTab).toBe('stickers');
    useUiStore.getState().setMarkersTab('markers');
    expect(useUiStore.getState().markersTab).toBe('markers');
  });

  it('properties 面板与 tab 记忆', () => {
    useUiStore.setState({ panel: null, propertiesTab: 'style' });
    useUiStore.getState().togglePanel('properties');
    expect(useUiStore.getState().panel).toBe('properties');
    useUiStore.getState().setPropertiesTab('canvas');
    useUiStore.getState().togglePanel('properties'); // 关闭
    useUiStore.getState().togglePanel('properties'); // 再开
    expect(useUiStore.getState().propertiesTab).toBe('canvas');
  });
});

describe('uiStore 连线模式', () => {
  it('startLinking 以当前选中节点为连线起点（对齐 XMind）', () => {
    useMindMapStore.setState({ selectedId: 'n1' });
    useUiStore.setState({ linking: false, linkFrom: null });
    useUiStore.getState().startLinking();
    expect(useUiStore.getState().linking).toBe(true);
    expect(useUiStore.getState().linkFrom).toBe('n1');
    useUiStore.getState().endLinking();
    // 无选中时起点为空，等待画布首次点击补选
    useMindMapStore.setState({ selectedId: null });
    useUiStore.getState().startLinking();
    expect(useUiStore.getState().linkFrom).toBeNull();
    useUiStore.getState().endLinking();
    useMindMapStore.setState({ selectedId: null });
  });

  it('setView 切回 start 复位连线模式', () => {
    useUiStore.setState({ view: 'editor', linking: true, linkFrom: 'n1' });
    useUiStore.getState().setView('start');
    expect(useUiStore.getState().view).toBe('start');
    expect(useUiStore.getState().linking).toBe(false);
    expect(useUiStore.getState().linkFrom).toBeNull();
  });

  it('setView 进入 editor 不影响连线模式', () => {
    useUiStore.setState({ view: 'start', linking: true, linkFrom: 'n1' });
    useUiStore.getState().setView('editor');
    expect(useUiStore.getState().linking).toBe(true);
    expect(useUiStore.getState().linkFrom).toBe('n1');
    // 还原，避免影响其它用例
    useUiStore.setState({ view: 'start', linking: false, linkFrom: null });
  });
});

describe('uiStore 演示模式', () => {
  it('startPresentation 收拢浮层并从头开始，step 不越界', () => {
    useUiStore.setState({
      presentation: null,
      searchOpen: true,
      searchQuery: 'x',
      markerFilter: 'm1',
      panel: 'properties',
      canvasMode: 'outline',
    });
    useUiStore.getState().startPresentation(['a', 'b', 'c']);
    const st = useUiStore.getState();
    expect(st.presentation).toEqual({ ids: ['a', 'b', 'c'], index: 0 });
    expect(st.searchOpen).toBe(false);
    expect(st.searchQuery).toBe('');
    expect(st.markerFilter).toBeNull();
    expect(st.panel).toBeNull();
    expect(st.canvasMode).toBe('mindmap');

    useUiStore.getState().stepPresentation(-1);
    expect(useUiStore.getState().presentation?.index).toBe(0);
    useUiStore.getState().stepPresentation(1);
    useUiStore.getState().stepPresentation(1);
    useUiStore.getState().stepPresentation(1);
    expect(useUiStore.getState().presentation?.index).toBe(2);

    useUiStore.getState().stopPresentation();
    expect(useUiStore.getState().presentation).toBeNull();
  });

  it('空序列不进入演示；setView(start) 复位演示', () => {
    useUiStore.setState({ presentation: null });
    useUiStore.getState().startPresentation([]);
    expect(useUiStore.getState().presentation).toBeNull();

    useUiStore.getState().startPresentation(['a']);
    useUiStore.getState().setView('start');
    expect(useUiStore.getState().presentation).toBeNull();
  });
});
