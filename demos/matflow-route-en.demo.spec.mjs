// English version of the "ask in natural language -> server-side routing" clip.
// Same real stack as the Chinese clips; the prompt and all on-screen text are English.
import { expect, test } from '@playwright/test';

const BASE = process.env.MATFLOW_DEMO_URL ?? 'http://127.0.0.1:5173';
const API = process.env.MATFLOW_DEMO_API ?? 'http://127.0.0.1:8000/api';
const QUESTION =
  'Run a basic quality-control check on this electrochemical impedance spectrum: verify the imaginary part is negative at high frequency, check low-frequency divergence, and report the QC conclusion.';

test.describe.configure({ mode: 'serial' });

const canvas = (page) => page.getByTestId('workflow-canvas');

const OVERLAY_SCRIPT = ({ index, text }) => {
  const boot = () => {
    if (!document.documentElement) return requestAnimationFrame(boot);
    if (document.getElementById('demo-title')) return;
    const style = document.createElement('style');
    style.textContent = [
      '#demo-title{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;',
      'background:#0b1220;color:#f8fafc;font-family:"Segoe UI",sans-serif;pointer-events:none;opacity:1;transition:opacity 260ms ease}',
      '#demo-title .kicker{font:600 15px/1 "Segoe UI",sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#38bdf8}',
      '#demo-title .line{display:flex;align-items:center;gap:16px;font:700 32px/1.4 "Segoe UI",sans-serif;max-width:1080px;text-align:center}',
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
    title.innerHTML = `<span class="kicker">MatFlow WebUI · live demo</span><span class="line"><span class="badge">${index}</span><span>${text}</span></span><span class="brand">127.0.0.1:5173 · real backend · real LLM · recorded in real time</span>`;
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

async function caption(page, index, text) {
  await page.evaluate(({ index, text }) => {
    document.getElementById('demo-caption')?.remove();
    const el = document.createElement('div');
    el.id = 'demo-caption';
    el.style.cssText = [
      'position:fixed', 'left:0', 'right:0', 'bottom:0', 'height:58px', 'z-index:2147483647',
      'display:flex', 'align-items:center', 'gap:12px', 'padding:0 22px',
      'background:rgba(17,24,39,0.95)', 'color:#f8fafc',
      'font:700 22px/1.2 "Segoe UI",sans-serif', 'pointer-events:none',
    ].join(';');
    el.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 4px;border-radius:13px;background:#0ea5e9;color:#fff;font:700 14px/1 'Segoe UI',sans-serif">${index}</span><span>${text}</span>`;
    document.body.appendChild(el);
  }, { index, text });
}

test('route-en', async ({ page, request }) => {
  const reset = await request.post(`${API}/reset?include_settings=false`);
  expect(reset.ok()).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(OVERLAY_SCRIPT, { index: '③', text: 'Ask in English -> the server routes it to a registered tool' });
  await page.goto(BASE);
  await canvas(page).waitFor({ timeout: 60_000 });
  await caption(page, '③', 'English request -> routing decision: source, model, confidence, selected tool');
  await page.waitForTimeout(260);
  await page.evaluate(() => window.__demoHideTitle?.());
  await page.waitForTimeout(360);

  await page.locator('.topbar-actions button', { hasText: 'Route a research task' }).click();
  await page.locator('.task-dialog').waitFor();
  await page.waitForTimeout(400);
  await page.locator('textarea[aria-label="Research question"]').fill(QUESTION);
  await page.waitForTimeout(900);
  await page.locator('.type-option', { hasText: 'TypedTable' }).locator('input').check();
  await page.waitForTimeout(350);
  await page.locator('.task-dialog button[type=submit]').click();
  await page.locator('.decision-dialog .audit-facts').waitFor({ timeout: 120_000 });
  const facts = (await page.locator('.decision-dialog .audit-facts').innerText()).replace(/\n/g, ' | ');
  expect(facts).toMatch(/llm/i);
  expect(facts).toMatch(/deepseek-official-flash/i);
  const selected = (await page.locator('.decision-dialog .tool-list').innerText()).replace(/\n/g, ' ');
  expect(selected).toContain('eis_basic_qc');
  await page.waitForTimeout(2200);
});
