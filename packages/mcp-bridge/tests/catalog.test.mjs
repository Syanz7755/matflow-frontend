import assert from 'node:assert/strict';
import test from 'node:test';
import { TOOL_CATALOG, resolveToolRequest } from '../src/catalog.mjs';
import { validatePublicHttps } from '../src/download.mjs';

test('preserves the complete migrated MCP tool catalog', () => {
  assert.deepEqual(TOOL_CATALOG.map(({ name }) => name), [
    'get_workspace_state', 'import_dataset', 'inspect_dataset', 'route_research_task',
    'create_data_type', 'update_data_type_inheritance', 'validate_graph_patch',
    'apply_graph_patch', 'execute_workflow', 'submit_human_decision',
    'submit_node_review', 'get_task_summary',
  ]);
});

test('maps graph validation through the HTTP authority', () => {
  const patch = { base_version: 3, operations: [] };
  assert.deepEqual(resolveToolRequest(TOOL_CATALOG.find(({ name }) => name === 'validate_graph_patch'), { patch }), { method: 'POST', path: '/patch/validate', body: patch });
});

test('rejects local download targets', async () => {
  await assert.rejects(validatePublicHttps('https://localhost/file.csv', async () => [{ address: '127.0.0.1' }]), /private or local/);
});

test('accepts public HTTPS download targets', async () => {
  const url = await validatePublicHttps('https://files.example.test/file.csv', async () => [{ address: '203.0.113.10' }]);
  assert.equal(url.protocol, 'https:');
});
