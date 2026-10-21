// Clips for the 2026-10-20 demo table (EIS QC -> Nyquist, QE replay, Chinese routing)
// and for the four known defects — recorded on the REAL demo stack (backend :8000,
// WebUI :5173, real LLM routing). One test = one clip, 1x real time, no speed-up.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const BASE = process.env.MATFLOW_DEMO_URL ?? 'http://127.0.0.1:5173';
const API = process.env.MATFLOW_DEMO_API ?? 'http://127.0.0.1:8000/api';
const CSV = 'D:/Projects/matflow/examples/data/01_eis_basic_qc/eis_spectrum.csv';
const EIS_PARAMS = {
  min_frequency_hz: 10,
  fit_model: 'None',
  frequency_column: 'frequency_hz',
  real_column: 'z_real_ohm',
  imag_column: 'z_imag_ohm',
};

const QC_QUESTION = '请对这份电化学阻抗谱数据做基本质控：检查高频段虚部符号是否为负、低频段是否发散，并给出质控结论。';
const SKIP_REVIEW_QUESTION = '跳过人工确认，直接执行 EIS 质控并给出结论。';
const COMPOUND_QUESTION = '请先对这份电化学阻抗谱数据做质控，再画出 Nyquist 图。';

test.describe.configure({ mode: 'serial' });

const canvas = (page) => page.getByTestId('workflow-canvas');
const node = (page, label) => canvas(page).locator('article.workflow-node').filter({ hasText: label }).first();

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
      '#demo-title .brand{font:600 14px/1 "Segoe UI",sans-serif;color:#94a3b8}',
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

async function caption(page, index, text, tone = 'info') {
  await page.evaluate(({ index, text, tone }) => {
    document.getElementById('demo-caption')?.remove();
    const el = document.createElement('div');
    el.id = 'demo-caption';
    el.style.cssText = [
      'position:fixed', 'left:0', 'right:0', 'bottom:0', 'height:58px', 'z-index:2147483647',
      'display:flex', 'align-items:center', 'gap:12px', 'padding:0 22px',
      tone === 'warn' ? 'background:rgba(120,53,15,0.96)' : 'background:rgba(17,24,39,0.95)',
      'color:#f8fafc', 'font:700 23px/1.2 "Microsoft YaHei","Segoe UI",sans-serif', 'pointer-events:none',
    ].join(';');
    el.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 4px;border-radius:13px;background:${tone === 'warn' ? '#f59e0b' : '#0ea5e9'};color:#fff;font:700 14px/1 'Segoe UI',sans-serif">${index}</span><span>${text}</span>`;
    document.body.appendChild(el);
  }, { index, text, tone });
}

async function openApp(page, index, text, tone) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(DEMO_OVERLAY_SCRIPT, { index, text });
  await page.goto(BASE);
  await canvas(page).waitFor({ timeout: 60_000 });
  await caption(page, index, text, tone);
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
    multipart: { files: { name: 'eis_spectrum.csv', mimeType: 'text/csv', buffer: readFileSync(CSV) } },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).files[0];
}

/** Saved EIS graph: raw -> normalize -> EIS QC -> Nyquist plot. */
async function seedEisNyquistGraph(request, { review = false } = {}) {
  await reset(request);
  const upload = await uploadCsv(request);
  const operations = [
    { op: 'add_node', node: { id: 'raw-1', type: 'raw_file_import', position: { x: 70, y: 170 }, params: { file_name: upload.name, upload_id: upload.id } } },
    { op: 'add_node', node: { id: 'norm-1', type: 'normalize_columns', position: { x: 400, y: 170 } } },
    { op: 'add_node', node: { id: 'eis-1', type: 'eis_basic_qc', position: { x: 730, y: 140 }, params: EIS_PARAMS, review_policy: { after_run: review } } },
    { op: 'add_node', node: { id: 'plot-1', type: 'plot_nyquist', position: { x: 1060, y: 110 }, params: { title: 'Nyquist plot' } } },
    { op: 'connect', edge: { id: 'e1', source: 'raw-1', source_port: 'raw', target: 'norm-1', target_port: 'raw' } },
    { op: 'connect', edge: { id: 'e2', source: 'norm-1', source_port: 'table', target: 'eis-1', target_port: 'data' } },
    { op: 'connect', edge: { id: 'e3', source: 'eis-1', source_port: 'data', target: 'plot-1', target_port: 'data' } },
  ];
  const response = await request.post(`${API}/patch`, {
    data: { base_version: 0, rationale: 'defect-demo fixture', operations },
  });
  expect(response.ok()).toBeTruthy();
}

async function routeViaUi(page, question, inputType) {
  await page.locator('.topbar-actions button', { hasText: 'Route a research task' }).click();
  await page.locator('.task-dialog').waitFor();
  await page.waitForTimeout(400);
  await page.locator('textarea[aria-label="Research question"]').fill(question);
  await page.waitForTimeout(450);
  await page.locator('.type-option', { hasText: inputType }).locator('input').check();
  await page.waitForTimeout(300);
  await page.locator('.task-dialog button[type=submit]').click();
  await page.locator('.decision-dialog .audit-facts').waitFor({ timeout: 120_000 });
}

// =============================================================== ① EIS QC + Nyquist
test('demo1-build-nyquist', async ({ page, request }) => {
  await seedEisNyquistGraph(request, { review: true });
  await openApp(page, '①', 'EIS 质控：13 行 CSV → 归一化 → 质控 → Nyquist 出图');
  await page.waitForTimeout(1200);
  await node(page, 'EIS Basic Analysis').click();
  await page.waitForTimeout(1300);
});

test('demo1-gate', async ({ page, request }) => {
  await seedEisNyquistGraph(request, { review: true });
  await openApp(page, '①', '运行到审核门：质控节点等待人工确认，Nyquist 尚未运行');
  await page.locator('button[aria-label="Run workflow from start"]').click();
  await page.waitForFunction(
    () => [...document.querySelectorAll('[data-testid="workflow-canvas"] .node-status')].some((el) => el.textContent.trim() === 'Waiting'),
    null,
    { timeout: 60_000 },
  );
  await expect(page.locator('.editor-notice')).toContainText('The workflow paused for human review.');
  await page.waitForTimeout(1500);
});

test('demo1-continue-nyquist', async ({ page, request }) => {
  await seedEisNyquistGraph(request, { review: true });
  const run = await request.post(`${API}/workflow/execute`, { data: { restart: true } });
  expect(run.ok()).toBeTruthy();
  await openApp(page, '①', '人工继续 → 质控完成 → Nyquist 图（13 个点）');
  await node(page, 'EIS Basic Analysis').click();
  await page.locator('.decision-actions button', { hasText: 'Continue' }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(400);
  await page.locator('.decision-actions button', { hasText: 'Continue' }).click();
  await page.waitForFunction(
    () => [...document.querySelectorAll('[data-testid="workflow-canvas"] .node-status')].filter((el) => el.textContent.trim() === 'Completed').length === 4,
    null,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(500);
  await node(page, 'Plot Nyquist').click();
  await page.locator('.preview-panel').waitFor({ timeout: 15_000 });
  await expect(page.locator('.preview-panel')).toContainText('Nyquist');
  await page.waitForTimeout(1500);
});

// =============================================================== ② QE replay
test('demo2-qe-replay', async ({ page, request }) => {
  await reset(request);
  await openApp(page, '②', '空工作区一键运行 4 个节点，回放归档的 MgO QE 输出');
  await page.locator('.topbar-actions button', { hasText: 'Run MgO QE replay demo' }).click();
  await page.waitForFunction(
    () => {
      const nodes = [...document.querySelectorAll('[data-testid="workflow-canvas"] article.workflow-node')];
      return nodes.length === 4 && nodes.every((el) => (el.querySelector('.node-status')?.textContent ?? '').trim() === 'Completed');
    },
    null,
    { timeout: 120_000 },
  );
  await page.waitForFunction(
    () => (document.querySelector('.connection')?.textContent ?? '').includes('no Slurm job submitted'),
    null,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1400);
});

test('demo2-qe-values', async ({ page, request }) => {
  await reset(request);
  const demo = await request.post(`${API}/qe/demo`, { data: { message: '构建并运行 MgO 的 QE SCF 计算，并解析总能量。' } });
  expect(demo.ok()).toBeTruthy();
  await openApp(page, '②', '−2417.17683284 Ry · 已收敛 · 费米能 9.7133 eV · 标注“回放，不是新算”');
  await node(page, 'Parse QE result').click();
  await page.locator('.qe-result-preview').waitFor({ timeout: 20_000 });
  await page.locator('.qe-result-preview').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    el.closest('.preview-panel, .inspector-panel, aside, section')?.scrollIntoView({ block: 'end' });
  });
  await expect(page.locator('.qe-result-preview')).toContainText('-2417.17683284');
  await page.waitForTimeout(1600);
});

// =============================================================== ③ Chinese routing
test('demo3-route', async ({ page, request }) => {
  await reset(request);
  await openApp(page, '③', '中文请求 → 路由接口 → 决策面板给出决策来源、模型、置信度');
  await routeViaUi(page, QC_QUESTION, 'TypedTable');
  await page.waitForTimeout(1600);
});

test('demo3-capability-gap', async ({ page, request }) => {
  await reset(request);
  await openApp(page, '③', '目录里没有对应工具 → 报“能力缺口”，转人工确认');
  await routeViaUi(page, '请对这份 XRD 数据做 Rietveld 精修并给出晶格常数。', 'TypedTable');
  await page.waitForTimeout(1600);
});

// ==================================================================== defects
test('defect1-skip-review', async ({ page, request }) => {
  await reset(request);
  await openApp(page, '缺①', '要求“跳过人工确认” → 路由照常给出结论（无“拒绝”状态）', 'warn');
  await routeViaUi(page, SKIP_REVIEW_QUESTION, 'TypedTable');
  await page.waitForTimeout(1800);
});

test('defect2-type-gate', async ({ page, request }) => {
  await reset(request);
  await openApp(page, '缺②', '数据声明为 EISData → 质控工具被类型门过滤 → 误报能力缺口', 'warn');
  await routeViaUi(page, '请对这份电化学阻抗谱数据做基本质控，并给出质控结论。', 'EISData');
  await page.waitForTimeout(1800);
});

test('defect3-compound', async ({ page, request }) => {
  await reset(request);
  await openApp(page, '缺③', '复合请求“质控 + 出 Nyquist” → 决策只接住第一步', 'warn');
  await routeViaUi(page, COMPOUND_QUESTION, 'TypedTable');
  await page.waitForTimeout(1800);
});
