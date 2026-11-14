#!/usr/bin/env node
/**
 * 从 eflink-mindmap 源码提取布局预设与主题色板 → assets/presets-data.json / assets/themes-data.json
 * 源码基准：
 *   - packages/mindmap/src/core/layout/presets.ts（LAYOUT_PRESETS / LEGACY_LAYOUT_MAP）
 *   - packages/mindmap/src/core/style/themes.ts（THEMES）
 * 用法：node extract-mindmap-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = '/Users/apple/Documents/myf-project/eflink.tech/eflink-mindmap/packages/mindmap/src';
const TS = '/Users/apple/Documents/myf-project/eflink.tech/eflink-frontend/node_modules/typescript/lib/typescript.js';
const ts = require(TS);

const stripImports = (src) => src.replace(/^import[\s\S]*?from\s*['"][^'"]+['"];?/gm, '');

function load(file, names) {
  const raw = stripImports(fs.readFileSync(file, 'utf8'));
  const js = ts.transpileModule(raw, { compilerOptions: { module: 1, target: 99 } }).outputText;
  const exports = {};
  const fn = new Function(
    'exports', 'module', 'require',
    js + '\nreturn {' + names.map((n) =>
      `${n}: typeof ${n} !== "undefined" ? ${n} : exports[${JSON.stringify(n)}]`).join(',') + '};',
  );
  return fn(exports, { exports }, require);
}

const presets = load(path.join(REPO, 'core/layout/presets.ts'), ['LAYOUT_PRESETS', 'LEGACY_LAYOUT_MAP', 'DEFAULT_LAYOUT_PRESET_ID']);
const themes = load(path.join(REPO, 'core/style/themes.ts'), ['THEMES']);

const outDir = path.join(DIR, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'presets-data.json'),
  JSON.stringify({
    default: presets.DEFAULT_LAYOUT_PRESET_ID,
    presets: presets.LAYOUT_PRESETS,
    legacyMap: presets.LEGACY_LAYOUT_MAP,
  }, null, 2),
);
fs.writeFileSync(
  path.join(outDir, 'themes-data.json'),
  JSON.stringify({ themes: themes.THEMES }, null, 2),
);
console.log(`✅ presets: ${presets.LAYOUT_PRESETS.length} 个（legacy ${Object.keys(presets.LEGACY_LAYOUT_MAP).length} 条）`);
console.log(`✅ themes: ${Object.keys(themes.THEMES).length} 个`);
