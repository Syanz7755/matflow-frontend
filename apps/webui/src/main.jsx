import { useEffect, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createMatflowClient } from '@matflow/api-client';
import WorkflowEditor from './WorkflowEditor.jsx';
import './style.css';

const API = (import.meta.env.VITE_MATFLOW_API_URL ?? 'http://127.0.0.1:8000/api').replace(/\/$/, '');
const apiClient = createMatflowClient(API);

async function request(path, options = {}) {
  return apiClient.request(path, options);
}

function uniqueTaskId() {
  return globalThis.crypto?.randomUUID?.() ?? `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function RegistryItem({ toolId, tool }) {
  return (
    <li className="registry-item">
      <div>
        <strong>{tool.label}</strong>
        <span className="registered-id">{toolId}</span>
      </div>
      <span className="tool-version">v{tool.version}</span>
    </li>
  );
}

function ModalDialog({ labelledBy, onClose, children, className = '' }) {
  const dialogRef = useRef(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = () => [...dialog.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')];
    const first = focusable()[0];
    first?.focus();
    function handleKeyDown(event) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); return; }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    }
    dialog.addEventListener('keydown', handleKeyDown);
    return () => { dialog.removeEventListener('keydown', handleKeyDown); restoreFocusRef.current?.focus?.(); };
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className={`workbench-dialog ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>{children}</section>
    </div>
  );
}

function WorkspacePanel({ graph, registry, datasets, capabilities, datasetDetail, busy, onRefresh, onUpload, onInspect }) {
  return (
    <div className="evidence-sidebar-content">
      <section className="sidebar-section">
        <div className="eyebrow-row"><span>Graph state</span><button type="button" onClick={onRefresh} disabled={busy}>Refresh</button></div>
        {graph ? <><strong className="graph-version">v{graph.version}</strong><p>{graph.nodes.length} nodes · {graph.edges.length} edges</p></> : <p>Waiting for server state.</p>}
        <div className="graph-summary" aria-label="Current graph summary">
          {graph?.nodes.length ? graph.nodes.map((node) => <div key={node.id}><span className={`node-dot node-${node.status}`} aria-hidden="true" /><strong>{node.label ?? node.type}</strong><code>{node.tool_id}</code></div>) : <p className="muted">The current graph is empty. Routing never changes it on its own.</p>}
        </div>
      </section>
      <section className="sidebar-section registry-section">
        <div className="eyebrow-row"><span>Active registry</span><small>{Object.keys(registry).length} tools</small></div>
        <ul className="registry-list" tabIndex="0" aria-label="Active registry tools">{Object.entries(registry).map(([toolId, tool]) => <RegistryItem key={toolId} toolId={toolId} tool={tool} />)}</ul>
      </section>
      <section className="sidebar-section dataset-section">
        <div className="eyebrow-row"><span>Datasets</span><small>{datasets.length} files</small></div>
        <label className="dataset-upload">Import dataset<input type="file" onChange={onUpload} disabled={busy} accept=".csv,.txt,.xlsx,.xls,.json,.png,.jpg,.jpeg,.tif,.tiff" /></label>
        {datasets.length ? <ul className="dataset-list" aria-label="Imported datasets">{datasets.map((dataset) => <li className="registry-item" key={dataset.id}><button type="button" onClick={() => onInspect(dataset.id)}><strong>{dataset.name}</strong><span>{Math.ceil(dataset.size / 1024)} KB</span></button></li>)}</ul> : <p className="muted">No data imported yet.</p>}
        {datasetDetail && <div className="dataset-detail"><strong>{datasetDetail.name}</strong><p>{datasetDetail.kind === 'table' ? `${datasetDetail.rows} rows · ${datasetDetail.columns.length} columns` : datasetDetail.kind}</p></div>}
      </section>
      <section className="sidebar-section feature-section">
        <span className="eyebrow">Feature flags</span>
        {Object.entries(capabilities?.features ?? {}).map(([feature, enabled]) => <p key={feature}><span className={enabled ? 'flag-on' : 'flag-off'} aria-hidden="true" />{feature.replaceAll('_', ' ')} <b>{enabled ? 'enabled' : 'disabled'}</b></p>)}
      </section>
    </div>
  );
}

function DecisionRecord({ summary }) {
  if (!summary) {
    return (
      <section className="decision-panel empty-panel" aria-labelledby="decision-heading">
        <div className="section-heading"><span className="section-index">02</span><h2 id="decision-heading">Decision record</h2></div>
        <p>After you submit a research task, this panel keeps the server's candidate tools, registered IDs, routing rationale, and safety guidance.</p>
      </section>
    );
  }

  const selected = summary.decision?.selected_tools ?? [];
  const candidates = summary.decision?.candidate_tools ?? [];
  const waiting = summary.status === 'waiting_for_confirmation';
  return (
    <section className="decision-panel" aria-labelledby="decision-heading">
      <div className="section-heading">
        <span className="section-index">02</span>
        <div><h2 id="decision-heading">Decision record</h2><p>The server recorded an auditable routing result for this task.</p></div>
        <span className={`state-badge ${waiting ? 'state-attention' : 'state-ready'}`}>{waiting ? 'Confirmation required' : 'Routed'}</span>
      </div>

      <dl className="audit-facts">
        <div><dt>Task ID</dt><dd>{summary.task_id}</dd></div>
        <div><dt>Trace ID</dt><dd>{summary.trace_id}</dd></div>
        <div><dt>Graph version</dt><dd>v{summary.input_context?.graph_version ?? '—'}</dd></div>
      </dl>

      <div className="prompt-evidence"><span>User prompt</span><p>{summary.user_prompt}</p></div>

      <div className="decision-columns">
        <div>
          <h3>Selected registered tool</h3>
          {selected.length ? <ul className="tool-list">{selected.map((tool) => <li key={tool.registered_id}><strong>{tool.label}</strong><code>{tool.registered_id}</code><span>v{tool.version}</span></li>)}</ul> : <p className="muted">No tool was selected automatically.</p>}
        </div>
        <div>
          <h3>Candidate retrieval</h3>
          {candidates.length ? <ul className="candidate-list">{candidates.map((tool) => <li key={tool.registered_id}><code>{tool.registered_id}</code><span>{Math.round((tool.retrieval_score ?? 0) * 100)}% match</span></li>)}</ul> : <p className="muted">No candidate matched.</p>}
        </div>
      </div>

      <div className="rationale"><h3>Why this decision</h3><p>{summary.decision?.rationale ?? 'No rationale was returned.'}</p></div>
      <div className={`handling ${waiting ? 'handling-attention' : ''}`}><span>{waiting ? 'Human review required' : 'Error & handling'}</span><p>{summary.error_and_handling?.handling ?? 'No handling record was returned.'}</p></div>
    </section>
  );
}

function App() {
  const questionId = useId();
  const [state, setState] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [question, setQuestion] = useState('');
  const [inputTypes, setInputTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [providers, setProviders] = useState([]);
  const [datasetDetail, setDatasetDetail] = useState(null);
  const [status, setStatus] = useState({ kind: 'loading', message: 'Reading the MatFlow control plane…' });
  const [busy, setBusy] = useState(false);
  const [activeDialog, setActiveDialog] = useState(null);

  async function refreshControlPlane() {
    setStatus({ kind: 'loading', message: 'Refreshing server state…' });
    try {
      const nextCapabilities = await apiClient.capabilities();
      const [nextState, nextDatasets, nextProviders] = await Promise.all([request('/state'), request('/uploads'), request('/model-providers')]);
      setState(nextState);
      setCapabilities(nextCapabilities);
      setDatasets(nextDatasets.files ?? []);
      setProviders(nextProviders.providers ?? []);
      setStatus({ kind: 'ready', message: `Connected · Graph v${nextState.state.version}` });
    } catch (error) {
      setStatus({ kind: 'error', message: error.message });
    }
  }

  useEffect(() => { refreshControlPlane(); }, []);

  function toggleInputType(type) {
    setInputTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  }

  async function routeTask(event) {
    event.preventDefault();
    if (!question.trim() || !state) return;
    setBusy(true);
    setStatus({ kind: 'loading', message: 'Requesting a server routing decision…' });
    try {
      const taskId = uniqueTaskId();
      const routed = await request('/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: { task_id: taskId, user_message: question.trim(), graph_version: state.state.version, available_input_types: inputTypes } }),
      });
      const persisted = await request(`/task-summaries/${encodeURIComponent(taskId)}`);
      setSummary(persisted ?? routed.summary);
      setStatus({ kind: routed.requires_human_confirmation ? 'attention' : 'ready', message: routed.requires_human_confirmation ? 'Routing is waiting for human confirmation' : 'Routing decision saved' });
      setActiveDialog('decision');
    } catch (error) {
      setStatus({ kind: 'error', message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function runQeDemo() {
    const prompt = question.trim() || 'For pristine MgO 2x2x2, generate a QE SCF input and report convergence, total energy, and Fermi energy.';
    setBusy(true);
    setStatus({ kind: 'loading', message: 'Building the MgO QE replay workflow…' });
    try {
      const demo = await request('/qe/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      setQuestion(prompt);
      await refreshControlPlane();
      setActiveDialog(null);
      const result = demo.results?.find((item) => item.result?.kind === 'QEResult')?.result;
      setStatus({ kind: 'attention', message: result ? `MgO QE replay complete · ${result.energy.value} ${result.energy.unit} · no Slurm job submitted` : 'MgO QE replay ran · using archived output' });
    } catch (error) {
      setStatus({ kind: 'error', message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function uploadDataset(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus({ kind: 'loading', message: `Importing ${file.name}…` });
    try {
      const body = new FormData();
      body.append('files', file);
      const imported = await request('/uploads', { method: 'POST', body });
      const record = imported.files[0];
      setDatasetDetail(await request(`/uploads/${encodeURIComponent(record.id)}`));
      const listed = await request('/uploads');
      setDatasets(listed.files ?? []);
      setStatus({ kind: 'ready', message: `Imported ${record.name}` });
    } catch (error) {
      setStatus({ kind: 'error', message: error.message });
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  async function inspectDataset(uploadId) {
    try {
      setDatasetDetail(await request(`/uploads/${encodeURIComponent(uploadId)}`));
    } catch (error) {
      setStatus({ kind: 'error', message: error.message });
    }
  }

  async function saveWorkflow(patch) {
    setBusy(true);
    setStatus({ kind: 'loading', message: 'Validating and saving the workflow…' });
    try {
      const saved = await request('/patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      setState((current) => ({ ...current, state: saved.state }));
      setStatus({ kind: 'ready', message: `Workflow saved · Graph v${saved.state.version}` });
      return saved.state;
    } finally {
      setBusy(false);
    }
  }

  async function runWorkflow(options) {
    setBusy(true);
    setStatus({ kind: 'loading', message: 'Running the workflow from the start…' });
    try {
      const outcome = await request('/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      setState((current) => ({ ...current, state: outcome.state }));
      const failed = outcome.results?.some((item) => item.error);
      setStatus({ kind: failed ? 'error' : 'ready', message: failed ? 'The workflow stopped at an error' : 'Workflow run complete' });
      return outcome;
    } finally {
      setBusy(false);
    }
  }

  async function submitDecision(nodeId, decision) {
    setBusy(true);
    try {
      const result = await request('/workflow/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: nodeId, decision }),
      });
      setState((current) => ({ ...current, state: result.state }));
      setStatus({ kind: 'ready', message: `Decision submitted: ${decision}` });
      return result;
    } finally {
      setBusy(false);
    }
  }

  async function proposeNodeRevision(payload) {
    setBusy(true);
    setStatus({ kind: 'loading', message: 'Generating an isolated node-revision proposal…' });
    try {
      const proposal = await request('/node-revisions/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setStatus({ kind: 'attention', message: 'Revision proposal generated; the workflow is unchanged' });
      return proposal;
    } finally { setBusy(false); }
  }

  async function applyNodeRevision(proposalId, edgeDecisions) {
    setBusy(true);
    setStatus({ kind: 'loading', message: 'Applying the node revision atomically…' });
    try {
      const result = await request(`/node-revisions/proposals/${encodeURIComponent(proposalId)}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edge_decisions: edgeDecisions }) });
      const snapshot = await request('/state');
      setState(snapshot);
      setCapabilities((current) => ({ ...current, registry: snapshot.registry, data_types: snapshot.data_types, data_type_definitions: snapshot.data_type_definitions, features: snapshot.features }));
      setStatus({ kind: 'ready', message: `Revision applied · Graph v${result.state.version}` });
      return snapshot.state;
    } finally { setBusy(false); }
  }

  async function addModelProvider(payload) {
    setBusy(true);
    try {
      const created = await request('/model-providers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const refreshed = await request('/model-providers');
      setProviders(refreshed.providers ?? []);
      setStatus({ kind: created.key_configured ? 'ready' : 'attention', message: created.key_configured ? `Model API added: ${created.label}` : `Added ${created.label}; set ${created.api_key_env} in .env` });
      return created;
    } finally { setBusy(false); }
  }

  const registry = capabilities?.registry ?? state?.registry ?? {};
  const graph = state?.state;
  const dataTypes = capabilities?.data_types ?? state?.data_types ?? [];

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <a className="brand" href="#main-content" aria-label="MatFlow research workbench home"><span className="brand-mark" aria-hidden="true">M</span><span><strong>MatFlow</strong><small>materials research agent</small></span></a>
        <div className={`connection connection-${status.kind}`} role="status" aria-live="polite"><span aria-hidden="true" />{status.message}</div>
        <nav className="topbar-actions" aria-label="Research workbench actions">
          <button type="button" onClick={runQeDemo} disabled={busy}>Run MgO QE replay demo</button>
          <button type="button" onClick={() => setActiveDialog('task')}>Route a research task</button>
          <button type="button" onClick={() => setActiveDialog('decision')}>Decision record</button>
        </nav>
      </header>

      <main id="main-content" className="main-content">
        <h1 className="visually-hidden">MatFlow research workbench</h1>
        {graph && <WorkflowEditor graph={graph} registry={registry} dataTypes={dataTypes} dataTypeDefinitions={capabilities?.data_type_definitions ?? state?.data_type_definitions ?? {}} datasets={datasets} providers={providers} busy={busy} onSave={saveWorkflow} onRun={runWorkflow} onDecision={submitDecision} onProposeRevision={proposeNodeRevision} onApplyRevision={applyNodeRevision} onAddProvider={addModelProvider} onStatus={setStatus} workspacePanel={<WorkspacePanel graph={graph} registry={registry} datasets={datasets} capabilities={capabilities} datasetDetail={datasetDetail} busy={busy} onRefresh={refreshControlPlane} onUpload={uploadDataset} onInspect={inspectDataset} />} />}
      </main>
      {activeDialog === 'task' && <ModalDialog labelledBy="task-heading" onClose={() => setActiveDialog(null)} className="task-dialog">
        <header className="dialog-header"><div><h2 id="task-heading">Route a research task</h2><p>Describe the materials data you want to analyze and declare the inputs available now.</p></div><button type="button" aria-label="Close route task dialog" onClick={() => setActiveDialog(null)}>×</button></header>
        <form onSubmit={routeTask} className="dialog-form">
          <label htmlFor={questionId}>Research question <span className="label-hint">natural language</span></label>
          <textarea id={questionId} aria-label="Research question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="For example: run basic EIS quality checks on normalized impedance spectra" rows="4" required />
          <fieldset><legend>Available input types</legend><div className="input-type-grid">{dataTypes.map((type) => <label key={type} className="type-option"><input type="checkbox" checked={inputTypes.includes(type)} onChange={() => toggleInputType(type)} /><span>{type}</span></label>)}</div></fieldset>
          <div className="task-actions"><p>Normal routing only records a decision. The QE replay demo builds and runs an MgO workflow from archived QE output and does not submit a Slurm job.</p><button type="button" onClick={runQeDemo} disabled={busy}>{busy ? 'Building workflow…' : 'Run MgO QE replay demo'}</button><button type="submit" disabled={busy || !question.trim() || !state}>{busy ? 'Routing…' : 'Get routing decision'}</button></div>
        </form>
      </ModalDialog>}
      {activeDialog === 'decision' && <ModalDialog labelledBy="decision-heading" onClose={() => setActiveDialog(null)} className="decision-dialog">
        <button type="button" className="dialog-close" aria-label="Close decision record" onClick={() => setActiveDialog(null)}>×</button>
        <DecisionRecord summary={summary} />
      </ModalDialog>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
