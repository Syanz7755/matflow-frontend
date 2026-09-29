import assert from 'node:assert/strict';
import test from 'node:test';
import { MatflowApiClient, MatflowApiError, assertCompatibleContract } from '../src/index.js';

test('accepts the supported v1 HTTP contract', () => {
  const value = { api_contract: { name: 'matflow-http', version: '1.7' } };
  assert.equal(assertCompatibleContract(value), value);
});

test('rejects an incompatible HTTP contract', () => {
  assert.throws(() => assertCompatibleContract({ api_contract: { name: 'matflow-http', version: '2.0' } }), /Expected matflow-http/);
});

test('preserves stable server error codes', async () => {
  const client = new MatflowApiClient('http://test/api', async () => new Response(JSON.stringify({ detail: { code: 'graph_version_conflict', message: 'stale' } }), { status: 409, headers: { 'content-type': 'application/json' } }));
  await assert.rejects(client.request('/patch'), (error) => error instanceof MatflowApiError && error.status === 409 && error.code === 'graph_version_conflict');
});
