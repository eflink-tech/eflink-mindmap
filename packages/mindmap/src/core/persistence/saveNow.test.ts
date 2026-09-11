import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocument } from '../editor/nodeOps';

vi.mock('../../store/mindMapStore', () => ({
  useMindMapStore: {
    getState: vi.fn(),
  },
}));

vi.mock('../../store/uiStore', () => ({
  useUiStore: {
    getState: vi.fn(),
  },
}));

vi.mock('./db', () => ({
  saveDocument: vi.fn(),
}));

vi.mock('./autosave', () => ({
  clearDraft: vi.fn(),
}));

import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';
import { clearDraft } from './autosave';
import { saveDocument } from './db';
import { saveNow, saveNowWithToast } from './saveNow';

describe('saveNow（手动云端保存）', () => {
  const showToast = vi.fn();
  const markSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUiStore.getState).mockReturnValue({ showToast } as never);
  });

  it('无文档时提示且不保存', async () => {
    vi.mocked(useMindMapStore.getState).mockReturnValue({ doc: null } as never);
    await expect(saveNow()).resolves.toBe(false);
    expect(saveDocument).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('当前没有可保存的文档');
  });

  it('保存成功：清除 dirty 与本地草稿，不弹 toast（由调用方决定文案）', async () => {
    const doc = createDocument();
    vi.mocked(useMindMapStore.getState).mockReturnValue({ doc, markSaved } as never);
    vi.mocked(saveDocument).mockResolvedValue(undefined);
    await expect(saveNow()).resolves.toBe(true);
    expect(saveDocument).toHaveBeenCalledWith(doc);
    expect(markSaved).toHaveBeenCalledWith(doc);
    expect(clearDraft).toHaveBeenCalledWith(doc.id);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('保存失败：提示重试，不清 dirty、不删草稿', async () => {
    const doc = createDocument();
    vi.mocked(useMindMapStore.getState).mockReturnValue({ doc, markSaved } as never);
    vi.mocked(saveDocument).mockRejectedValue(new Error('网络异常'));
    await expect(saveNow()).resolves.toBe(false);
    expect(markSaved).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('保存失败，请稍后重试');
  });

  it('saveNowWithToast 成功后提示已保存', async () => {
    const doc = createDocument();
    vi.mocked(useMindMapStore.getState).mockReturnValue({ doc, markSaved } as never);
    vi.mocked(saveDocument).mockResolvedValue(undefined);
    await saveNowWithToast();
    expect(showToast).toHaveBeenCalledWith('已保存');
  });

  it('saveNowWithToast 失败不提示已保存', async () => {
    const doc = createDocument();
    vi.mocked(useMindMapStore.getState).mockReturnValue({ doc, markSaved } as never);
    vi.mocked(saveDocument).mockRejectedValue(new Error('网络异常'));
    await saveNowWithToast();
    expect(showToast).not.toHaveBeenCalledWith('已保存');
  });
});
