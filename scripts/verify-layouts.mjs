// 本地真机验收：注入样例文档，逐类切换布局预设并截图。
// 用法：node scripts/verify-layouts.mjs [category...]
// 输出：/tmp/mm-verify/<category>/<preset>.png + gallery.png
import { mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRequire = createRequire(path.resolve(here, '../../eflink-frontend/package.json'));
const { chromium } = frontendRequire('playwright');

const OUT = '/tmp/mm-verify';
const BASE = 'http://localhost:5199';

const GROUPS = {
  mindmap: ['map-balanced-curve', 'map-right-curve', 'map-left', 'map-down', 'map-up', 'map-radial'],
  brace: ['brace-right', 'brace-left', 'brace-balanced', 'brace-down', 'brace-up', 'brace-outline'],
  logic: ['logic-right', 'logic-left', 'logic-down', 'logic-up', 'logic-balanced', 'logic-outline'],
  org: ['org-down', 'org-up', 'org-right', 'org-left', 'org-balanced', 'org-radial', 'org-classic'],
  tree: ['tree-right', 'tree-left', 'tree-down', 'tree-up', 'tree-balanced', 'tree-radial', 'tree-wbs'],
  timeline: ['timeline-h', 'timeline-h-top', 'timeline-h-bottom', 'timeline-v', 'timeline-v-left', 'timeline-v-right'],
  fishbone: ['fishbone-classic', 'fishbone-reverse', 'fishbone-vertical', 'fishbone-vertical-up', 'fishbone-6m', 'fishbone-effect', 'fishbone-comb'],
  matrix: ['matrix-2x2', 'matrix-2x3', 'matrix-3x2', 'matrix-3x3', 'matrix-1x2', 'matrix-1x3'],
};

function makeDoc(layout) {
  const nodes = {};
  let seq = 0;
  const n = (parentId, text) => {
    const id = `n${seq++}`;
    nodes[id] = { id, parentId, children: [], text };
    if (parentId) nodes[parentId].children.push(id);
    return id;
  };
  const root = n(null, '产品发布策略');
  const branches = [
    ['用户需求', ['目标用户', '核心痛点', '使用场景']],
    ['产品功能', ['核心模块', '差异亮点', '体验优化']],
    ['市场推广', ['渠道策略', '内容节奏', '预算分配']],
    ['技术架构', ['前端', '后端服务', '数据平台']],
    ['运营计划', ['上线节奏', '增长指标', '复盘机制']],
    ['风险管理', ['竞争风险', '合规风险', '应急预案']],
  ];
  for (const [label, kids] of branches) {
    const b = n(root, label);
    kids.forEach((k, i) => {
      const c = n(b, k);
      if (i === 0) {
        n(c, `${k}细化A`);
        n(c, `${k}细化B`);
      }
    });
  }
  return {
    id: 'verify-doc',
    title: '布局验收样例',
    rootId: root,
    nodes,
    themeId: 'classic',
    layout,
    viewport: { x: 0, y: 0, scale: 1 },
    relations: [],
    boundaries: [],
    summaries: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

async function putDoc(page, layout) {
  await page.evaluate(async (doc) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('efmindmap');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      const store = tx.objectStore('documents');
      const clear = store.clear();
      clear.onsuccess = () => {
        store.put(doc);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    localStorage.setItem('efmindmap:lastDoc', doc.id);
  }, makeDoc(layout));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const categories = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(GROUPS);
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.error('[console]', m.text());
});

for (const category of categories) {
  const presets = GROUPS[category];
  const dir = `${OUT}/${category}`;
  await mkdir(dir, { recursive: true });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  // 首次启动会自动建档并写入 lastDoc，等 IndexedDB 就绪后再注入验收样例
  await page.getByText('格式', { exact: true }).waitFor();
  await putDoc(page, presets[0]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('格式', { exact: true }).waitFor();
  await page.getByText('格式', { exact: true }).click();
  await page.getByRole('button', { name: '画布', exact: true }).click();
  await page.getByTestId('layout-trigger').waitFor();
  await sleep(900);

  // 缩略图总览（滚动到当前分类）
  await page.getByTestId('layout-trigger').click();
  await page.getByTestId('layout-gallery').waitFor();
  await page.getByTestId(`layout-category-${category}`).scrollIntoViewIfNeeded();
  await sleep(300);
  await page.getByTestId('layout-gallery').screenshot({ path: `${dir}/gallery.png` });
  await page.keyboard.press('Escape');
  await page.getByText('格式', { exact: true }).click();

  for (const preset of presets) {
    await page.getByText('格式', { exact: true }).click();
    await page.getByTestId('layout-trigger').click();
    await page.getByTestId(`layout-preset-${preset}`).click();
    await page.getByText('格式', { exact: true }).click();
    await page.getByText('适应屏幕', { exact: true }).click();
    await sleep(700);
    await page.screenshot({ path: `${dir}/${preset}.png` });
    console.log('shot', category, preset);
  }
}

await browser.close();
console.log('done ->', OUT);
