// One continuous walkthrough video of the MatFlow WebUI on the REAL demo stack
// (backend :8000, WebUI :5173, real LLM routing). Recorded with Playwright video
// and converted to mp4; nothing is sped up, the pacing is the real interaction.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const BASE = process.env.MATFLOW_DEMO_URL ?? 'http://127.0.0.1:5173';
const API = process.env.MATFLOW_DEMO_API ?? 'http://127.0.0.1:8000/api';
const CSV = 'D:/Projects/matflow/examples/data/01_eis_basic_qc/eis_spectrum.csv';
const QUESTION =
  '请对这份电化学阻抗谱数据做基本质控：检查高频段虚部符号是否为负、低频段是否发散，并给出质控结论。';

const OVERLAY_SCRIPT = () => {
  const boot = () => {
    if (!document.documentElement) return requestAnimationFrame(boot);
    if (document.getElementById('demo-helpers')) return;
    const style = document.createElement('style');
    style.textContent = [
      '#demo-title{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;',
      'background:#0b1220;color:#f8fafc;font-family:"Microsoft YaHei","Segoe UI",sans-serif;pointer-events:none;opacity:1;transition:opacity 320ms ease}',
      '#demo-title .kicker{font:600 15px/1 "Segoe UI",sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#38bdf8}',
      '#demo-title .headline{font:700 40px/1.35 "Microsoft YaHei","Segoe UI",sans-serif;max-width:1120px;text-align:center}',
      '#demo-title .sub{font:500 18px/1.5 "Microsoft YaHei","Segoe UI",sans-serif;color:#94a3b8;max-width:900px;text-align:center}',
      '#demo-caption{position:fixed;left:0;right:0;bottom:0;height:58px;z-index:2147483646;display:flex;align-items:center;gap:12px;padding:0 22px;',
      'background:rgba(17,24,39,.95);color:#f8fafc;font:700 24px/1.2 "Microsoft YaHei","Segoe UI",sans-serif;pointer-events:none}',
      '#demo-caption .step{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 4px;border-radius:14px;background:#0ea5e9;color:#fff;font:700 15px/1 "Segoe UI",sans-serif}',
      '#demo-cursor{position:fixed;left:-60px;top:-60px;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;background:rgba(14,165,233,.30);',
      'border:2.5px solid #0ea5e9;box-shadow:0 0 0 1.5px rgba(255,255,255,.85),0 2px 6px rgba(15,23,42,.35);z-index:2147483645;pointer-events:none;transition:transform 90ms ease-out}',
      '#demo-cursor.demo-click{transform:scale(.55);background:rgba(14,165,233,.75)}',
    ].join('');
    document.head.appendChild(style);
    const holder = document.createElement('div');
    holder.id = 'demo-helpers';
    document.documentElement.appendChild(holder);
    window.__demoTitle = (headline, sub) => {
      document.getElementById('demo-title')?.remove();
      const el = document.createElement('div');
      el.id = 'demo-title';
      el.innerHTML = `<span class="kicker">MatFlow WebUI · 现场演示</span><span class="headline">${headline}</span><span class="sub">${sub}</span><span class="sub">127.0.0.1:5173 · 真实后端 · 真实 LLM · 1× 实时</span>`;
      el.style.opacity = '1';
      document.documentElement.appendChild(el);
    };
    window.__demoFade = () => {
      const el = document.getElementById('demo-title');
      if (!el) return;
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 380);
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
const nodeCount = (page) => canvas(page).locator('article.workflow-node').count();
const edgeCount = (page) => canvas(page).locator('.react-flow__edge').count();

async function say(page, step, text) {
  await page.evaluate(({ step, text }) => {
    let el = document.getElementById('demo-caption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'demo-caption';
      document.body.appendChild(el);
    }
    el.innerHTML = `<span class="step">${step}</span><span>${text}</span>`;
  }, { step, text });
}

async function addTool(page, label) {
  await page.locator('#library-tab').click();
  await page.locator('button.tool-card').filter({ hasText: label }).first().click();
  await page.waitForFunction(
    (text) => [...document.querySelectorAll('article.workflow-node strong')].some((el) => el.textContent.trim() === text),
    label,
  );
}

async function selectNode(page, label) {
  await node(page, label).click();
  await page.waitForFunction(() => Boolean(document.querySelector('.node-inspector')), null, { timeout: 8000 });
}

async function connectPorts(page, sourceLabel, sourcePort, targetLabel, targetPort) {
  const before = await edgeCount(page);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await node(page, sourceLabel).locator(`.workflow-port[data-port-id="${sourcePort}"]`).first().locator('.react-flow__handle').click({ force: true });
    try {
      await page.locator('.connect-helper').waitFor({ timeout: 2000 });
    } catch {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      continue;
    }
    await node(page, targetLabel).locator(`.workflow-port[data-port-id="${targetPort}"]`).first().locator('.react-flow__handle').click({ force: true });
    await page.waitForFunction(
      (expected) => document.querySelectorAll('[data-testid="workflow-canvas"] .react-flow__edge').length === expected,
      before + 1,
      { timeout: 5000 },
    );
    return;
  }
  throw new Error(`could not connect ${sourceLabel}.${sourcePort} -> ${targetLabel}.${targetPort}`);
}

async function setParam(page, label, value) {
  const field = page.locator('.inspector-params label.inspector-field').filter({ has: page.locator('span', { hasText: label }) }).first();
  await field.locator('input').fill(String(value));
  await field.locator('input').blur();
}

test('MatFlow WebUI walkthrough', async ({ page, request }) => {
  test.setTimeout(240_000);
  const reset = await request.post(`${API}/reset?include_settings=false`);
  expect(reset.ok()).toBeTruthy();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(OVERLAY_SCRIPT);
  await page.goto(BASE);
  await page.evaluate(() => window.__demoTitle?.('MatFlow WebUI 演示', '从中文提问到可复现、可审核的材料计算工作流'));
  await page.waitForTimeout(2200);
  await canvas(page).waitFor({ timeout: 60_000 });
  await page.evaluate(() => window.__demoFade?.());
  await page.waitForTimeout(420);

  // ---------------------------------------------------------------- ① workbench
  await say(page, '①', '打开工作台：空图，左侧是可用的 18 个注册工具');
  await page.waitForTimeout(900);
  await page.locator('#library-tab').click();
  await page.waitForTimeout(900);

  // ------------------------------------------------------------------- ② import
  await say(page, '②', '导入 EIS 数据集：文件选择或拖入 CSV，服务端读取列信息');
  await page.locator('#workspace-tab').click();
  await page.waitForTimeout(400);
  await page.getByLabel('Import dataset').setInputFiles({
    name: 'eis_spectrum.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(CSV),
  });
  await expect(page.getByLabel('Imported datasets').getByText('eis_spectrum.csv', { exact: true }).first()).toBeVisible();
  await page.waitForTimeout(600);
  await page.locator('.dataset-list button').first().click();
  await page.locator('.dataset-detail').waitFor();
  await page.waitForTimeout(900);

  // -------------------------------------------------------------- ③ add nodes
  await say(page, '③', '工具库添加三个节点：端口自带类型，接错类型会被拒绝');
  await addTool(page, 'Raw File Import');
  await page.waitForTimeout(420);
  await addTool(page, 'Normalize / Column Mapping');
  await page.waitForTimeout(420);
  await addTool(page, 'EIS Basic Analysis');
  await expect(canvas(page).locator('article.workflow-node')).toHaveCount(3);
  await page.waitForTimeout(800);

  // ----------------------------------------------------------------- ④ connect
  await say(page, '④', '点出端口、点入端口完成连线（RawData → TypedTable）');
  await connectPorts(page, 'Raw File Import', 'raw', 'Normalize / Column Mapping', 'raw');
  await page.waitForTimeout(420);
  await connectPorts(page, 'Normalize / Column Mapping', 'table', 'EIS Basic Analysis', 'data');
  await expect(canvas(page).locator('.react-flow__edge')).toHaveCount(2);
  await page.waitForTimeout(800);

  // ------------------------------------------------------------- ⑤ bind params
  await say(page, '⑤', '绑定数据集与列参数：频率、实部、虚部列各有明确映射');
  await node(page, 'Raw File Import').click();
  await page.locator('.inspector-params select').first().selectOption({ index: 1 });
  await page.waitForTimeout(500);
  await node(page, 'EIS Basic Analysis').click();
  await page.waitForTimeout(300);
  await setParam(page, 'frequency column', 'frequency_hz');
  await setParam(page, 'real column', 'z_real_ohm');
  await setParam(page, 'imag column', 'z_imag_ohm');
  await page.waitForTimeout(800);

  // -------------------------------------------------------- ⑥ review and save
  await say(page, '⑥', '给 EIS 节点打开“运行后人工审核”，然后保存为 Graph v1');
  await node(page, 'EIS Basic Analysis').locator('label.node-review-toggle input').check();
  await page.waitForTimeout(500);
  await page.locator('button[aria-label="Save workflow"]').click();
  await page.waitForFunction(
    () => /Saved · Graph v\d+/.test(document.querySelector('.graph-state-chip')?.textContent ?? ''),
    null,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(900);

  // -------------------------------------------------------------- ⑦ run/gate
  await say(page, '⑦', '运行工作流：上游完成，停在人工审核门等待确认');
  await page.locator('button[aria-label="Run workflow from start"]').click();
  await page.waitForFunction(
    () => [...document.querySelectorAll('[data-testid="workflow-canvas"] .node-status')].some((el) => el.textContent.trim() === 'Waiting'),
    null,
    { timeout: 60_000 },
  );
  await expect(page.locator('.editor-notice')).toContainText('The workflow paused for human review.');
  await page.waitForTimeout(1200);

  // ------------------------------------------------------------ ⑧ continue
  await say(page, '⑧', '人工确认 Continue：节点完成，读到 EISQCReport（rows_valid=13, pass=true）');
  await node(page, 'EIS Basic Analysis').click();
  await page.locator('.decision-actions button', { hasText: 'Continue' }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(400);
  await page.locator('.decision-actions button', { hasText: 'Continue' }).click();
  await page.waitForFunction(
    () => [...document.querySelectorAll('[data-testid="workflow-canvas"] .node-status')].some((el) => el.textContent.trim() === 'Completed'),
    null,
    { timeout: 60_000 },
  );
  await page.locator('.preview-panel').waitFor({ timeout: 15_000 });
  await expect(page.locator('.preview-panel')).toContainText('rows_valid');
  await page.waitForTimeout(1500);

  // ---------------------------------------------------------- ⑨ delete an edge
  await say(page, '⑨', '编辑图：选中一条连线按 Delete，只删这条边，节点不受影响');
  const box = await canvas(page).boundingBox();
  await page.mouse.click(box.x + box.width - 80, box.y + box.height - 140);
  await page.waitForTimeout(200);
  const point = await page.evaluate(() => {
    const paths = [...document.querySelectorAll('[data-testid="workflow-canvas"] .react-flow__edge-path')];
    for (const path of paths) {
      const matrix = path.getScreenCTM();
      const total = path.getTotalLength();
      for (const fraction of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
        const p = path.getPointAtLength(total * fraction);
        const x = p.x * matrix.a + p.y * matrix.c + matrix.e;
        const y = p.x * matrix.b + p.y * matrix.d + matrix.f;
        const hit = document.elementFromPoint(x, y);
        if (hit && hit.closest('.react-flow__edge')) return { x, y };
      }
    }
    return null;
  });
  expect(point).toBeTruthy();  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="workflow-canvas"] .react-flow__edge.selected').length === 1, null, { timeout: 10_000 });
  await page.waitForTimeout(400);
  await page.keyboard.press('Delete');
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="workflow-canvas"] .react-flow__edge').length === 1, null, { timeout: 10_000 });
  await expect(canvas(page).locator('article.workflow-node')).toHaveCount(3);
  await page.waitForTimeout(1100);

  // --------------------------------------------------------------- ⑩ QE replay
  await say(page, '⑩', '清空工作区后一键回放 MgO QE 归档结果，不提交 Slurm 作业');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.locator('.inspector-empty button', { hasText: 'Clear workflow' }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="workflow-canvas"] article.workflow-node').length === 0, null, { timeout: 8000 });
  await page.locator('button[aria-label="Save workflow"]').click();
  await page.waitForTimeout(500);
  await page.locator('.topbar-actions button', { hasText: 'Run MgO QE replay demo' }).click();
  await page.waitForFunction(
    () => {
      const nodes = [...document.querySelectorAll('[data-testid="workflow-canvas"] article.workflow-node')];
      return nodes.length === 4 && nodes.every((el) => (el.querySelector('.node-status')?.textContent ?? '').trim() === 'Completed');
    },
    null,
    { timeout: 120_000 },
  );
  await page.waitForTimeout(1000);

  // --------------------------------------------------------------- ⑪ QE result
  await say(page, '⑪', '读结果：-2417.17683284 Ry / 9.7133 eV，并标明“归档回放、未提交 Slurm”');
  await page.locator('article.workflow-node').filter({ hasText: 'Parse QE result' }).first().click();
  await page.locator('.qe-result-preview').waitFor({ timeout: 20_000 });
  await page.locator('.qe-result-preview').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    el.closest('.preview-panel, .inspector-panel, aside, section')?.scrollIntoView({ block: 'end' });
  });
  await expect(page.locator('.qe-result-preview')).toContainText('-2417.17683284');
  await page.waitForTimeout(1800);

  // ------------------------------------------------------------------ ⑫ routing
  await say(page, '⑫', '中文提问 → 服务端路由：给出决策来源、模型、置信度与候选工具');
  await page.locator('.topbar-actions button', { hasText: 'Route a research task' }).click();
  await page.locator('.task-dialog').waitFor();
  await page.waitForTimeout(400);
  await page.locator('textarea[aria-label="Research question"]').fill(QUESTION);
  await page.waitForTimeout(500);
  await page.locator('.type-option', { hasText: 'TypedTable' }).locator('input').check();
  await page.waitForTimeout(300);
  await page.locator('.task-dialog button[type=submit]').click();
  await page.locator('.decision-dialog .audit-facts').waitFor({ timeout: 120_000 });
  await page.waitForTimeout(1600);
  await page.locator('.dialog-close').click();
  await page.waitForTimeout(400);

  // ------------------------------------------------------------------ ⑬ narrow
  await say(page, '⑬', '窄视口 1280×720：无横向溢出，顶栏操作仍然可达');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(1400);

  // ------------------------------------------------------------------- outro
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    document.getElementById('demo-caption')?.remove();
    window.__demoTitle?.('完整链路已跑通', '导入 → 建图 → 审核 → 结果 → 归档回放 → 中文路由；每一步都留下可审计记录');
  });
  await page.waitForTimeout(3000);
});
