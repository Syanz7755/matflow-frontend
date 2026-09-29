import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const profile = process.env.MATFLOW_DSH_PROFILE ?? 'matflow';
if (!/^[A-Za-z0-9_-]+$/.test(profile)) throw new Error('DSH profile names may contain only letters, numbers, - and _.');
const dshHome = resolve(process.env.DSH_HOME ?? resolve(homedir(), '.dsh'));
const profileDir = resolve(dshHome, 'profiles', profile);
const patchPath = resolve(profileDir, 'cordis.patch.yml');
const packagePath = resolve(profileDir, 'package.json');
const integration = resolve(import.meta.dirname, '..', 'integrations', 'dsh');
const patch = `# Managed by matflow-frontend configure:dsh; dedicated MatFlow profile only.
- insert:
    - id: mcp-matflow
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: matflow
        transport: streamable-http
        url: http://127.0.0.1:8001/mcp
        headers: {}
        toolCallTimeoutMs: 180000
        failOnStartupError: true
        reconnect:
          enabled: true
          initialDelayMs: 500
          maxDelayMs: 30000
          maxAttempts: 10

    - id: matflow-dsh-integration
      name: '@matflow/dsh-integration'
      config:
        apiBaseUrl: http://127.0.0.1:8000
`;

function run(args) {
  const outcome = spawnSync('dsh', args, { stdio: 'inherit', shell: false });
  if (outcome.error) throw outcome.error;
  if (outcome.status !== 0) throw new Error(`dsh ${args.join(' ')} failed with status ${outcome.status}`);
}

await mkdir(profileDir, { recursive: true });
try { await readFile(packagePath); } catch { run(['--profile', profile, '--from-default-profile', 'web', '--dump-config']); }
try { await copyFile(patchPath, `${patchPath}.bak`, 1); } catch {}
try { await copyFile(packagePath, `${packagePath}.bak`, 1); } catch {}
await writeFile(patchPath, patch, 'utf8');
run(['plugin', '--profile', profile, 'add', '@deepseek-ai/dsh-mcp-client@0.1.5-rc.1', integration]);
run(['--profile', profile, '--dump-config']);
console.log(`Configured DSH profile '${profile}'. Start the backend, npm run mcp, then dsh --profile ${profile}.`);
