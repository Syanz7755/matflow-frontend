import { defineConfig, devices } from '@playwright/test';

const frontendPort = Number(process.env.MATFLOW_E2E_FRONTEND_PORT ?? 5173);
const backendRoot = process.env.MATFLOW_BACKEND_ROOT ?? '../../../matflow';
// The backend virtualenv layout depends on the platform: Windows keeps the
// interpreter under .venv\Scripts, POSIX under .venv/bin.  Hard-coding the
// Windows path made the webServer command fail on Linux/macOS (and in CI).
// MATFLOW_E2E_PYTHON overrides both, e.g. for a conda or system interpreter.
const backendPython = process.env.MATFLOW_E2E_PYTHON
  ?? (process.platform === 'win32' ? '.venv\\Scripts\\python.exe' : '.venv/bin/python');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: `${backendPython} -m uvicorn backend.main:app --host 127.0.0.1 --port 8001`,
      cwd: backendRoot,
      url: 'http://127.0.0.1:8001/docs',
      env: {
        MATFLOW_CORS_ORIGINS: `http://127.0.0.1:${frontendPort}`,
        // The backend owns its runtime data, so it lives under the backend
        // checkout. It used to sit in this repo's test-results/ directory, which
        // Playwright wipes on every run, so each beforeEach reset failed.
        MATFLOW_DATA_ROOT: '.tmp/e2e-runtime',
        MATFLOW_ALLOW_MODEL_MOCK: '1',
        MATFLOW_REVISION_MOCK_JSON: JSON.stringify({
          label: 'AI revised input',
          description: 'Imports the selected dataset with a reviewed, bounded table preview.',
          params: { file_name: 'sample-eis.csv', upload_id: '' },
          preview_spec: { version: '1.0', outputs: { raw: { renderer: 'table_head', max_rows: 5 } } },
          generated_code: null,
        }),
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort}`,
      cwd: '.',
      url: `http://127.0.0.1:${frontendPort}`,
      env: { VITE_MATFLOW_API_URL: 'http://127.0.0.1:8001/api' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
