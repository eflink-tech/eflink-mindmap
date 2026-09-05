import { test, expect } from '@playwright/test';

/**
 * 思维导图 MVP E2E
 * 启动即进入编辑器（无开始列表页）。Konva 画布节点交互难 DOM 断言，聚焦工具栏与持久化。
 */

async function waitEditor(page: import('@playwright/test').Page) {
  await expect(page.getByRole('button', { name: '子主题' })).toBeVisible({ timeout: 8000 });
}

test.describe('思维导图 MVP E2E', () => {
  test('启动直接进入编辑器', async ({ page }) => {
    await page.goto('/');
    await waitEditor(page);
    await expect(page.getByRole('button', { name: '格式' })).toBeVisible();
  });

  test('工具栏添加子主题 → 进入编辑浮层', async ({ page }) => {
    await page.goto('/');
    await waitEditor(page);

    await page.getByRole('button', { name: '子主题' }).click();

    // TextEditorOverlay 使用 contentEditable，而非 textarea
    const editor = page.locator('[contenteditable="true"]');
    await expect(editor).toBeVisible({ timeout: 2000 });

    await editor.fill('测试主题');
    await editor.press('Enter');
    await expect(editor).not.toBeVisible({ timeout: 2000 });
  });

  test('持久化：刷新后自动恢复编辑器', async ({ page }) => {
    await page.goto('/');
    await waitEditor(page);
    await page.waitForTimeout(1000);
    await page.reload();
    await waitEditor(page);
  });

  test('格式面板冒烟：样式/画布 Tab 与主题切换', async ({ page }) => {
    await page.goto('/');
    await waitEditor(page);

    await page.getByRole('button', { name: '格式' }).click();
    await expect(page.getByRole('button', { name: '样式', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '画布', exact: true })).toBeVisible();

    await page.getByRole('button', { name: '画布', exact: true }).click();
    await expect(page.getByRole('button', { name: '画布', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // 主题选择器为下拉式：展开后切到「缤纷」组再应用一个配色（应用后下拉关闭）
    await page.getByRole('button', { name: /^配色方案/ }).click();
    await page.getByRole('button', { name: '缤纷', exact: true }).click();
    await page.getByRole('option', { name: '应用配色 舞动' }).click();
    await expect(page.getByRole('button', { name: '配色方案 舞动' })).toBeVisible();
  });

  test('布局切换：画廊 思维导图 → 逻辑图 → 组织结构图 → 括号图 → 时间轴', async ({ page }) => {
    await page.goto('/');
    await waitEditor(page);

    await page.getByRole('button', { name: '格式' }).click();
    await page.getByRole('button', { name: '画布', exact: true }).click();

    const trigger = page.getByTestId('layout-trigger');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toContainText('思维导图');

    await trigger.click();
    await expect(page.getByTestId('layout-gallery')).toBeVisible();
    await page.getByTestId('layout-preset-logic-right-curve').click();
    await expect(page.getByTestId('layout-gallery')).toBeHidden();
    await expect(trigger).toContainText('逻辑图');

    await trigger.click();
    await page.getByTestId('layout-preset-org-down-rounded').click();
    await expect(trigger).toContainText('组织结构图');

    await trigger.click();
    await page.getByTestId('layout-preset-brace-solid').click();
    await expect(trigger).toContainText('括号图');

    await trigger.click();
    await page.getByTestId('layout-preset-timeline-h-rect').click();
    await expect(trigger).toContainText('时间轴');

    await trigger.click();
    await page.getByTestId('layout-preset-map-balanced-curve').click();
    await expect(trigger).toContainText('思维导图');
  });

  test('撤销重做：初始禁用，添加节点后启用', async ({ page }) => {
    await page.goto('/');
    await waitEditor(page);

    const undo = page.getByTitle('撤销');
    const redo = page.getByTitle('重做');
    await expect(undo).toBeDisabled();
    await expect(redo).toBeDisabled();

    await page.getByRole('button', { name: '子主题' }).click();
    // 若进入编辑态，先提交
    const editor = page.locator('[contenteditable="true"]');
    if (await editor.count()) {
      await editor.press('Enter');
    }
    await expect(undo).toBeEnabled({ timeout: 2000 });
    await undo.click();
    await expect(redo).toBeEnabled({ timeout: 2000 });
  });

  test('标记面板：应用/移除标记', async ({ page }) => {
    await page.goto('/');
    await waitEditor(page);

    // 新建子主题作为标记载体（新节点默认进入编辑态，先提交）
    await page.getByRole('button', { name: '子主题' }).click();
    const editor = page.locator('[contenteditable="true"]');
    if (await editor.count()) {
      await editor.press('Enter');
    }

    // 打开标记面板（第一个「标记」是工具栏按钮，第二个是面板 Tab）
    await page.getByRole('button', { name: '标记' }).first().click();
    await expect(page.getByRole('button', { name: '贴纸' })).toBeVisible();

    // 应用优先级 1 → 图标进入开启态；再次点击移除
    const priority = page.getByRole('button', { name: '优先级 1' });
    await priority.click();
    await expect(priority).toHaveAttribute('aria-pressed', 'true');
    await priority.click();
    await expect(priority).not.toHaveAttribute('aria-pressed', 'true');
  });

  test('文档列表打开：刷新后仍在编辑器', async ({ page }) => {
    await page.goto('/');
    await waitEditor(page);
    await page.reload();
    await waitEditor(page);
  });
});
