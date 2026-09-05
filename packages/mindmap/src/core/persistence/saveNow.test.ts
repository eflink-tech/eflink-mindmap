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

vi.mock('./autosave', () => ({
  flushSave: vi.fn(),
}));

import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';
import { flushSave } from './autosave';
import { saveNowWithToast } from './saveNow';

describe('saveNowWithToast', () => {
  const showToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUiStore.getState).mockReturnValue({ showToast } as never);
  });

  it('无文档时提示', async () => {
    vi.mocked(useMindMapStore.getState).mockReturnValue({ doc: null } as never);
    await saveNowWithToast();
    expect(flushSave).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('当前没有可保存的文档');
  });

  it('保存成功后提示已自动保存', async () => {
    const doc = createDocument();
    vi.mocked(useMindMapStore.getState).mockReturnValue({ doc } as never);
    vi.mocked(flushSave).mockResolvedValue(undefined);
    await saveNowWithToast();
    expect(flushSave).toHaveBeenCalledWith(doc);
    expect(showToast).toHaveBeenCalledWith('您的工作已自动保存。');
  });
});
