// Records the MatFlow WebUI walkthrough as a video against the REAL demo stack.
//   npx playwright test demos/matflow-walkthrough.demo.spec.mjs --config demos/walkthrough.config.mjs
// The webm lands in .demo-video/out/**/video.webm; scripts/live_acceptance/record_demo_video.ps1
// converts it to mp4.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 300_000,
  workers: 1,
  fullyParallel: false,
  outputDir: './.demo-video/out',
  reporter: 'line',
  use: {
    viewport: { width: 1440, height: 900 },
    video: { mode: 'on', size: { width: 1440, height: 900 } },
  },
});
