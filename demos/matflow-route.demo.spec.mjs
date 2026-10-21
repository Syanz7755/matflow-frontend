// Demo spec recorded with the recording-pr-demos skill (playdemo recorder).
// Talks to the REAL demo stack (start_demo.ps1: backend 127.0.0.1:8000,
// WebUI 127.0.0.1:5173) instead of the mocked e2e stack on :8001.
import { test } from '@playwright/test';

const BASE = process.env.MATFLOW_DEMO_URL ?? 'http://127.0.0.1:5173';
const QUESTION =
  '请对这份电化学阻抗谱数据做基本质控：检查高频段虚部符号是否为负、低频段是否发散，并给出质控结论。';

test('MatFlow workbench: route a Chinese research question @demo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE);
  await page.getByTestId('workflow-canvas').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(1200);

  await page.locator('.topbar-actions button', { hasText: 'Route a research task' }).click();
  await page.locator('.task-dialog').waitFor();
  await page.waitForTimeout(800);

  await page.locator('textarea[aria-label="Research question"]').fill(QUESTION);
  await page.waitForTimeout(500);

  await page.locator('.type-option', { hasText: 'TypedTable' }).locator('input').check();
  await page.waitForTimeout(500);

  await page.locator('.task-dialog button[type=submit]').click();
  await page.locator('.decision-dialog .audit-facts').waitFor({ timeout: 120_000 });
  await page.waitForTimeout(4000); // money shot: decision record + provenance
});
