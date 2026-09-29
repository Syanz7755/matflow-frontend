import express from 'express';
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { createMatflowClient } from '@matflow/api-client';
import { TOOL_CATALOG, resolveToolRequest } from './catalog.mjs';
import { downloadOpenAIFile } from './download.mjs';

const api = createMatflowClient(process.env.MATFLOW_API_URL ?? 'http://127.0.0.1:8000/api');

function envelope(operation) {
  return Promise.resolve().then(operation).then(
    (data) => ({ ok: true, data, error: null }),
    (error) => ({ ok: false, data: null, error: { code: error.code ?? 'matflow_error', message: error.message, retryable: false } }),
  );
}

function result(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value };
}

async function callTool(tool, args) {
  if (tool.method === 'UPLOAD') {
    const file = await downloadOpenAIFile(args.file);
    const form = new FormData();
    form.append('files', new Blob([file.bytes], { type: file.type }), file.name);
    return api.request('/uploads', { method: 'POST', body: form });
  }
  const request = resolveToolRequest(tool, args);
  const options = { method: request.method };
  if (request.body !== undefined) {
    options.headers = { 'content-type': 'application/json' };
    options.body = JSON.stringify(request.body);
  }
  return api.request(request.path, options);
}

export function createServer() {
  const server = new McpServer({ name: 'MatFlow', version: '1.0.0' }, { instructions: 'Use MatFlow to inspect datasets and build audited materials workflows. Ask before writes or execution.' });
  const schemas = {
    get_workspace_state: {},
    import_dataset: { file: z.object({ download_url: z.string().url(), file_id: z.string(), mime_type: z.string().optional(), file_name: z.string().optional() }) },
    inspect_dataset: { upload_id: z.string() },
    route_research_task: { task: z.record(z.any()) },
    create_data_type: { name: z.string(), parents: z.array(z.string()), description: z.string().optional() },
    update_data_type_inheritance: { name: z.string(), parents: z.array(z.string()) },
    validate_graph_patch: { patch: z.record(z.any()) },
    apply_graph_patch: { patch: z.record(z.any()) },
    execute_workflow: {},
    submit_human_decision: { node_id: z.string(), decision: z.string() },
    submit_node_review: { node_id: z.string(), decision: z.string(), comment: z.string().optional() },
    get_task_summary: { task_id: z.string() },
  };
  for (const tool of TOOL_CATALOG) {
    const config = {
      description: tool.name.replaceAll('_', ' '),
      inputSchema: schemas[tool.name],
      annotations: { readOnlyHint: tool.readOnly, destructiveHint: Boolean(tool.destructive), idempotentHint: tool.readOnly },
    };
    if (tool.fileParams) config._meta = { 'openai/fileParams': tool.fileParams };
    server.registerTool(tool.name, config, async (args) => result(await envelope(() => callTool(tool, args))));
  }
  return server;
}

export async function start() {
  await api.capabilities();
  const app = express();
  app.use(express.json({ limit: '36mb' }));
  app.post('/mcp', async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  const host = process.env.MATFLOW_MCP_HOST ?? '127.0.0.1';
  const port = Number(process.env.MATFLOW_MCP_PORT ?? 8001);
  app.listen(port, host, () => console.log(`MatFlow MCP bridge: http://${host}:${port}/mcp`));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  start().catch((error) => { console.error(`MatFlow MCP bridge failed: ${error.message}`); process.exitCode = 1; });
}
