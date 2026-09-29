import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = new URL(process.env.MATFLOW_MCP_URL ?? 'http://127.0.0.1:8001/mcp');
const client = new Client({ name: 'matflow-smoke', version: '1.0.0' });
const transport = new StreamableHTTPClientTransport(url);
await client.connect(transport);
const listed = await client.listTools();
const state = await client.callTool({ name: 'get_workspace_state', arguments: {} });
if (listed.tools.length !== 12) throw new Error(`Expected 12 MatFlow tools, received ${listed.tools.length}.`);
const payload = JSON.parse(state.content[0].text);
if (!payload.ok || !payload.data?.state) throw new Error('get_workspace_state did not return the backend state.');
console.log(JSON.stringify({ protocol: 'connected', tools: listed.tools.length, graph_id: payload.data.state.graph_id }));
await client.close();
