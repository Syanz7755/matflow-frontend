// Short demo clips for the MatFlow WebUI, recorded with the recording-pr-demos
// skill (playdemo). Each test is ONE clip: real stack (backend :8000, WebUI
// :5173), real time, no playback speed-up. Fixtures are seeded through the API
// before page.goto so the clip only shows the interaction under test.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const BASE = process.env.MATFLOW_DEMO_URL ?? 'http://127.0.0.1:5173';
const API = process.env.MATFLOW_DEMO_API ?? 'http://127.0.0.1:8000/api';
const CSV = 'D:/Projects/matflow/examples/data/01_eis_basic_qc/eis_spectrum.csv';
const ROUTE_QUESTION =
  '请对这份电化学阻抗谱数据做基本质控：检查高频段虚部符号是否为负、低频段是否发散，并给出质控结论。';
const EIS_PARAMS = {
  min_frequency_hz: 10,
  fit_model: 'None',
  frequency_column: 'frequency_hz',
  real_column: 'z_real_ohm',
  imag_column: 'z_imag_ohm',
};

test.describe.configure({ mode: 'serial' });

// Playwright videos/GIFs do not render the OS pointer, so paint one in-page, and
// cover the ~0.5 s of unstyled first paint with a real title card (instead of a
// white flash), which fades out as soon as the workbench is interactive.
const DEMO_OVERLAY_SCRIPT = ({ index, text }) => {
  const boot = () => {
    if (!document.documentElement) return requestAnimationFrame(boot);
    if (document.getElementById('demo-title')) return;
    const style = document.createElement('style');
    style.textContent = [
      '#demo-title{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;',
      'background:#0b1220;color:#f8fafc;font-family:"Microsoft YaHei","Segoe UI",sans-serif;pointer-events:none;opacity:1;transition:opacity 260ms ease}',
      '#demo-title .kicker{font:600 15px/1 "Segoe UI",sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#38bdf8}',
      '#demo-title .line{display:flex;align-items:center;gap:16px;font:700 32px/1.4 "Microsoft YaHei","Segoe UI",sans-serif;max-width:1080px;text-align:center}',
      '#demo-title .badge{display:inline-flex;align-items:center;justify-content:center;min-width:46px;height:46px;padding:0 6px;border-radius:23px;background:#0ea5e9;color:#fff;font:700 21px/1 "Segoe UI",sans-serif}',
      '#demo-title .brand{font:600 14px/1 "Segoe UI",sans-serif;color:#94a3b8;letter-spacing:.04em}',
      '#demo-cursor{position:fixed;left:-60px;top:-60px;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;',
      'background:rgba(14,165,233,.30);border:2.5px solid #0ea5e9;box-shadow:0 0 0 1.5px rgba(255,255,255,.85),0 2px 6px rgba(15,23,42,.35);',
      'z-index:2147483646;pointer-events:none;transition:transform 90ms ease-out}',
      '#demo-cursor.demo-click{transform:scale(.55);background:rgba(14,165,233,.75)}',
    ].join('');
    document.head.appendChild(style);

    const title = document.createElement('div');
    title.id = 'demo-title';
    title.innerHTML = `<span class="kicker">MatFlow WebUI · 现场演示</span><span class="line"><span class="badge">${index}</span><span>${text}</span></span><span class="brand">127.0.0.1:5173 · 真实后端 · 实时录制</span>`;
    document.documentElement.appendChild(title);
    window.__demoHideTitle = () => {
      const el = document.getElementById('demo-title');
      if (!el) return;
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 320);
    };

    const mountCursor = () => {
      if (!document.body) return requestAnimationFrame(mountCursor);
      if (document.getElementById('demo-cursor')) return;
      const ring = document.createElement('div');
      ring.id = 'demo-cursor';
      document.body.appendChild(ring);
      const move = (event) => {
        if (typeof event.clientX !== 'number') return;
        ring.style.left = `${event.clientX}px`;
        ring.style.top = `${event.clientY}px`;
      };
      window.addEventListener('mousemove', move, true);
      window.addEventListener('mousedown', () => ring.classList.add('demo-click'), true);
      window.addEventListener('mouseup', () => ring.classList.remove('demo-click'), true);
    };
    mountCursor();
  };
  boot();
};


const canvas = (page) => page.getByTestId('workflow-canvas');
const node = (page, label) => canvas(page).locator('article.workflow-node').filter({ hasText: label }).first();

/** Burn a caption band into the recorded page (bottom edge, outside the app UI). */
async function caption(page, index, text) {
  await page.evaluate(({ index, text }) => {
    document.getElementById('demo-caption')?.remove();
    const el = document.createElement('div');
    el.id = 'demo-caption';
    el.style.cssText = [
      'position:fixed',
      'left:0',
      'right:0',
      'bottom:0',
      'height:58px',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'gap:12px',
      'padding:0 22px',
      'background:rgba(17,24,39,0.95)',
      'color:#f8fafc',
      'font:700 24px/1.2 "Microsoft YaHei","Segoe UI",sans-serif',
      'pointer-events:none',
    ].join(';');
    el.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;border-radius:13px;background:#0ea5e9;color:#fff;font:700 14px/1 'Segoe UI',sans-serif">${index}</span><span>${text}</span>`;
    document.body.appendChild(el);
  }, { index, text });
}

async function openApp(page, index, text) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(DEMO_OVERLAY_SCRIPT, { index, text });
  await page.goto(BASE);
  await canvas(page).waitFor({ timeout: 60_000 });
  await caption(page, index, text);
  await page.waitForTimeout(260);
  await page.evaluate(() => window.__demoHideTitle?.());
  await page.waitForTimeout(360);
}

async function reset(request) {
  const response = await request.post(`${API}/reset?include_settings=false`);
  expect(response.ok()).toBeTruthy();
}

async function uploadCsv(request) {
  const response = await request.post(`${API}/uploads`, {
    multipart: {
      files: { name: 'eis_spectrum.csv', mimeType: 'text/csv', buffer: readFileSync(CSV) },
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).files[0];
}

/** Seed a saved EIS graph (the nodes the UI would build) before the clip starts. */
async function seedEisGraph(request, { review = false, edges = true } = {}) {
  await reset(request);
  const upload = await uploadCsv(request);
  const operations = [
    { op: 'add_node', node: { id: 'raw-1', type: 'raw_file_import', position: { x: 80, y: 150 }, params: { file_name: upload.name, upload_id: upload.id } } },
    { op: 'add_node', node: { id: 'norm-1', type: 'normalize_columns', position: { x: 430, y: 150 } } },
    {
      op: 'add_node',
      node: {
        id: 'eis-1',
        type: 'eis_basic_qc',
        position: { x: 800, y: 120 },
        params: EIS_PARAMS,
        review_policy: { after_run: review },
      },
    },
  ];
  if (edges) {
    operations.push(
      { op: 'connect', edge: { id: 'e1', source: 'raw-1', source_port: 'raw', target: 'norm-1', target_port: 'raw' } },
      { op: 'connect', edge: { id: 'e2', source: 'norm-1', source_port: 'table', target: 'eis-1', target_port: 'data' } },
    );
  }
  const response = await request.post(`${API}/patch`, {
    data: { base_version: 0, rationale: 'demo clip fixture', operations },
  });
  expect(response.ok()).toBeTruthy();
}

// ---------------------------------------------------------------- ① workbench
test('clip01-workbench', async ({ page, request }) => {
  await reset(request);
  await openApp(page, '①', '打开 WebUI：空工作台 + 左侧工具库');
  await page.waitForTimeout(1000);
  await page.getByRole('tab', { name: 'Tool library' }).click();
  await page.waitForTimeout(900);
  await expect(page.locator('.tool-card').first()).toBeVisible();
});

// ------------------------------------------------------------------- ② import
test('clip02-import-dataset', async ({ page, request }) => {
  await reset(request);
  await openApp(page, '②', '导入 EIS 数据集：选择或拖入 CSV 即可');
  await page.getByLabel('Import dataset').setInputFiles({
    name: 'eis_spectrum.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(CSV),
  });
  await expect(page.getByLabel('Imported datasets').getByText('eis_spectrum.csv', { exact: true }).first()).toBeVisible();
  await page.waitForTimeout(500);
  await page.locator('.dataset-list button').first().click();
  await page.locator('.dataset-detail').waitFor();
  await page.waitForTimeout(1000);
});

// -------------------------------------------------------------------- ③ build
test('clip03-build-nodes', async ({ page, request }) => {
  await reset(request);
  await openApp(page, '③', '工具库添加三个节点，端口自带类型');
  await page.getByRole('tab', { name: 'Tool library' }).click();
  for (const name of ['Raw File Import', 'Normalize / Column Mapping', 'EIS Basic Analysis']) {
    await page.locator('.tool-card').filter({ hasText: name }).click();
    await page.waitForTimeout(500);
  }
  await expect(canvas(page).locator('article.workflow-node')).toHaveCount(3);
  await page.waitForTimeout(900);
});

// ------------------------------------------------------------------ ④ connect
test('clip04-connect-ports', async ({ page, request }) => {
  await seedEisGraph(request, { edges: false });
  await openApp(page, '④', '点出端口、点入端口，类型匹配才连线');
  await node(page, 'Raw File Import').locator('[aria-label="output raw, RawData"]').click();
  await page.waitForTimeout(450);
  await node(page, 'Normalize / Column Mapping').locator('[aria-label="input raw, RawData"]').click();
  await expect(canvas(page).locator('.react-flow__edge')).toHaveCount(1);
  await page.waitForTimeout(450);
  await node(page, 'Normalize / Column Mapping').locator('[aria-label="output table, TypedTable"]').click();
  await page.waitForTimeout(450);
  await node(page, 'EIS Basic Analysis').locator('[aria-label="input data, TypedTable"]').click();
  await expect(canvas(page).locator('.react-flow__edge')).toHaveCount(2);
  await page.waitForTimeout(900);
});

// -------------------------------------------------------- ⑤ review policy save
test('clip05-review-and-save', async ({ page, request }) => {
  await seedEisGraph(request);
  await openApp(page, '⑤', '打开“运行后人工审核”并保存到服务端');
  await node(page, 'EIS Basic Analysis').locator('label.node-review-toggle input').check();
  await page.waitForTimeout(500);
  await page.locator('button[aria-label="Save workflow"]').click();
  await page.waitForFunction(
    () => /Saved · Graph v\d+/.test(document.querySelector('.graph-state-chip')?.textContent ?? ''),
    null,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(1800);
});

// ------------------------------------------------------------- ⑥ run to gate
test('clip06-run-to-review-gate', async ({ page, request }) => {
  await seedEisGraph(request, { review: true });
  await openApp(page, '⑥', '运行工作流，停在人工审核门');
  await page.locator('button[aria-label="Run workflow from start"]').click();
  await page.waitForFunction(
    () => [...document.querySelectorAll('[data-testid="workflow-canvas"] .node-status')].some((el) => el.textContent.trim() === 'Waiting'),
    null,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(300);
  await expect(node(page, 'EIS Basic Analysis')).toContainText('Waiting');
  await expect(page.locator('.editor-notice')).toContainText('The workflow paused for human review.');
  await page.waitForTimeout(1800);
});

// ------------------------------------------------------------ ⑦ continue run
test('clip07-continue-to-result', async ({ page, request }) => {
  await seedEisGraph(request, { review: true });
  const run = await request.post(`${API}/workflow/execute`, { data: { restart: true } });
  expect(run.ok()).toBeTruthy();
  await openApp(page, '⑦', '人工确认继续，节点完成并给出质控结果');
  await node(page, 'EIS Basic Analysis').click();
  await page.locator('.decision-actions button', { hasText: 'Continue' }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(500);
  await page.locator('.decision-actions button', { hasText: 'Continue' }).click();
  await page.waitForFunction(
    () => [...document.querySelectorAll('[data-testid="workflow-canvas"] .node-status')].some((el) => el.textContent.trim() === 'Completed'),
    null,
    { timeout: 60_000 },
  );
  await page.locator('.preview-panel').waitFor({ timeout: 15_000 });
  await expect(page.locator('.preview-panel')).toContainText('rows_valid');
  await page.waitForTimeout(1200);
});

// ----------------------------------------------------------- ⑧ chinese routing
test('clip08-chinese-routing', async ({ page, request }) => {
  await reset(request);
  await openApp(page, '⑧', '中文提问 → 服务端路由出工具决策（真实 LLM）');
  await page.locator('.topbar-actions button', { hasText: 'Route a research task' }).click();
  await page.locator('.task-dialog').waitFor();
  await page.waitForTimeout(400);
  await page.locator('textarea[aria-label="Research question"]').fill(ROUTE_QUESTION);
  await page.waitForTimeout(400);
  await page.locator('.type-option', { hasText: 'TypedTable' }).locator('input').check();
  await page.waitForTimeout(300);
  await page.locator('.task-dialog button[type=submit]').click();
  await page.locator('.decision-dialog .audit-facts').waitFor({ timeout: 120_000 });
  await page.waitForTimeout(900);
});

// ------------------------------------------------------------- ⑨ delete an edge
test('clip09-delete-edge', async ({ page, request }) => {
  await seedEisGraph(request);
  await openApp(page, '⑨', '选中一条连线按 Delete：只删这条边，节点不动');
  const box = await canvas(page).boundingBox();
  await page.mouse.click(box.x + box.width - 80, box.y + box.height - 120);
  await page.waitForTimeout(200);
  const point = await page.evaluate(() => {
    const paths = [...document.querySelectorAll('[data-testid="workflow-canvas"] .react-flow__edge-path')];
    const longest = paths
      .map((item) => ({ item, length: item.getTotalLength() }))
      .sort((a, b) => b.length - a.length)[0].item;
    const mid = longest.getPointAtLength(longest.getTotalLength() * 0.5);
    const matrix = longest.getScreenCTM();
    return { x: mid.x * matrix.a + mid.y * matrix.c + matrix.e, y: mid.x * matrix.b + mid.y * matrix.d + matrix.f };
  });
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="workflow-canvas"] .react-flow__edge.selected').length === 1, null, { timeout: 10_000 });
  await page.waitForTimeout(500);
  await page.keyboard.press('Delete');
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="workflow-canvas"] .react-flow__edge').length === 1, null, { timeout: 10_000 });
  await expect(canvas(page).locator('article.workflow-node')).toHaveCount(3);
  await page.waitForTimeout(1100);
});

// ----------------------------------------------------------------- ⑩ QE replay
test('clip10-qe-replay', async ({ page, request }) => {
  await reset(request);
  await openApp(page, '⑩', '一条命令回放 MgO QE 归档结果（不提交 Slurm）');
  await page.locator('.topbar-actions button', { hasText: 'Run MgO QE replay demo' }).click();
  await page.waitForFunction(
    () => {
      const nodes = [...document.querySelectorAll('[data-testid="workflow-canvas"] article.workflow-node')];
      return nodes.length === 4 && nodes.every((el) => (el.querySelector('.node-status')?.textContent ?? '').trim() === 'Completed');
    },
    null,
    { timeout: 120_000 },
  );
  await page.waitForTimeout(1900);
});

// ------------------------------------------------------------- ⑪ QE result read
test('clip11-qe-result', async ({ page, request }) => {
  await reset(request);
  const demo = await request.post(`${API}/qe/demo`, { data: { message: '构建并运行 MgO 的 QE SCF 计算，并解析总能量。' } });
  expect(demo.ok()).toBeTruthy();
  await openApp(page, '⑪', '归档来源 + 解析出的总能量，可追溯到唯一结果');
  await node(page, 'Parse QE result').click();
  await page.locator('.qe-result-preview').waitFor({ timeout: 20_000 });
  await expect(page.locator('.qe-result-preview')).toContainText('-2417.17683284');
  // The total energy sits below the fold at 1440x900; scroll it above the caption band.
  await page.locator('.qe-result-preview').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    el.closest('.preview-panel, .inspector-panel, aside, section')?.scrollIntoView({ block: 'end' });
  });
  await page.waitForTimeout(1900);
});
