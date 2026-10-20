# MatFlow Frontend

Client surfaces and adapters for the authoritative MatFlow backend: [github.com/Syanz7755/matflow](https://github.com/Syanz7755/matflow) (local fallback when both repositories are siblings: [../matflow/README.md](../matflow/README.md)). This repository never writes MatFlow workspace files directly; WebUI, MCP, DSH, and future clients use the versioned HTTP API.

**Compatible backend contract:** `matflow-http` v1 (the client accepts `>=1.0 <2.0`; the backend currently declares `1.0` via `GET /api/capabilities`). The WebUI, MCP bridge and DSH adapter refuse to start against another contract name or major version.

## What you will see

The WebUI is a research workbench driven by the backend's typed workflow graph:

- a prompt area to route a natural-language research task and inspect the auditable routing decision (candidate tools, rationale, safety guidance);
- a workflow graph editor with typed ports, per-node review gates, dataset import, JSON export/import and AI-assisted node revision;
- result panels with progressive previews; the one-click **Run MgO QE replay demo** builds a four-node Quantum ESPRESSO workflow and shows the parsed energy and convergence, clearly labelled as a historical replay (no `pw.x` or Slurm job is run).

## Screenshots

Placeholders, to be captured from a running backend + WebUI (see the backend's `docs/images/README.md` for the capture notes):

![Workbench overview](docs/images/workbench-overview.png)
![Workflow graph](docs/images/workflow-graph.png)
![Task result](docs/images/task-result.png)

## Install and run

```powershell
npm install
npm run dev
```

The WebUI expects `http://127.0.0.1:8000/api` by default. The backend can locate and manage it automatically when both repositories are siblings:

```powershell
Set-Location ..\matflow
uv run matflow start --ui webui
```

## Workspace layout

- `apps/webui`: React/Vite research workbench.
- `packages/api-client`: shared `matflow-http` v1 client and compatibility check.
- `packages/mcp-bridge`: MCP Streamable HTTP adapter backed only by the HTTP API.
- `integrations/dsh`: DSH approvals and guarded local-file import.

## MCP and DSH

Start the MatFlow backend first, then:

```powershell
npm run mcp
```

The MCP endpoint is `http://127.0.0.1:8001/mcp`. To prepare the isolated DSH profile, run `npm run configure:dsh`, then `dsh --profile matflow` while the backend and bridge are running.

## Verification

```powershell
npm test
npm run build
npm run test:e2e
```

Set `MATFLOW_BACKEND_ROOT` when the backend repository is not the default sibling `../matflow`.

## Documentation languages

English is the primary language of this repository. Documentation is written in English as `X.md`, and the Chinese version is retained as a sibling `X.zhcn.md`; the two are kept in sync. Chinese text elsewhere — in tests, fixtures and examples — is input data that exercises the Chinese interaction path, not documentation.

## License

MIT — see [LICENSE](LICENSE).
