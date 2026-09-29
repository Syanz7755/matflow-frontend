export const TOOL_CATALOG = [
  { name: 'get_workspace_state', method: 'GET', path: '/state', readOnly: true },
  { name: 'import_dataset', method: 'UPLOAD', path: '/uploads', readOnly: false, fileParams: ['file'] },
  { name: 'inspect_dataset', method: 'GET', path: ({ upload_id }) => `/uploads/${encodeURIComponent(upload_id)}`, readOnly: true },
  { name: 'route_research_task', method: 'POST', path: '/route', body: ({ task }) => ({ task }), readOnly: true },
  { name: 'create_data_type', method: 'POST', path: '/data-types', body: ({ name, parents, description = '' }) => ({ name, parents, description }), readOnly: false },
  { name: 'update_data_type_inheritance', method: 'PUT', path: ({ name }) => `/data-types/${encodeURIComponent(name)}/parents`, body: ({ parents }) => ({ parents }), readOnly: false, destructive: true },
  { name: 'validate_graph_patch', method: 'POST', path: '/patch/validate', body: ({ patch }) => patch, readOnly: true },
  { name: 'apply_graph_patch', method: 'POST', path: '/patch', body: ({ patch }) => patch, readOnly: false, destructive: true },
  { name: 'execute_workflow', method: 'POST', path: '/workflow/execute', body: () => ({ restart: false }), readOnly: false, destructive: true },
  { name: 'submit_human_decision', method: 'POST', path: '/workflow/human-decision', body: ({ node_id, decision }) => ({ node_id, decision }), readOnly: false, destructive: true },
  { name: 'submit_node_review', method: 'POST', path: '/workflow/decision', body: ({ node_id, decision, comment = null }) => ({ node_id, decision, comment }), readOnly: false, destructive: true },
  { name: 'get_task_summary', method: 'GET', path: ({ task_id }) => `/task-summaries/${encodeURIComponent(task_id)}`, readOnly: true },
];

export function resolveToolRequest(tool, args) {
  const path = typeof tool.path === 'function' ? tool.path(args) : tool.path;
  return { method: tool.method, path, body: tool.body?.(args) };
}
