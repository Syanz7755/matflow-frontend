# MatFlow Frontend

Client surfaces and adapters for the authoritative [MatFlow backend](../matflow/README.md). This repository never writes MatFlow workspace files directly; WebUI, MCP, DSH, and future clients use the versioned HTTP API.

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
