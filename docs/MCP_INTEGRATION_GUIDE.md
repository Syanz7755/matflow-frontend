# MatFlow MCP and DSH integration

The MCP bridge is a standalone Node service that listens on `http://127.0.0.1:8001/mcp` by default. It only calls the backend HTTP API: it does not import Python backend code and does not access workspace files directly.

## Startup

Start the service in the backend repository first:

```powershell
uv run matflow start --ui none
```

Then start the bridge in this repository:

```powershell
npm install
npm run mcp
```

`MATFLOW_API_URL`, `MATFLOW_MCP_HOST` and `MATFLOW_MCP_PORT` override the default addresses. `MATFLOW_API_URL` should include `/api`.

## DSH

```powershell
npm run configure:dsh
```

The generated profile points at the new bridge. Controlled local file import is handled by the DSH adapter; remote files are allowed only from public HTTPS addresses, and the bridge checks redirects, rejects private-network targets and enforces the 25 MB limit before the content finally lands through the backend upload API.

## Compatibility

The bridge reads `/api/capabilities` at startup and requires `matflow-http >=1.0 <2.0`. Tool returns keep the `{ok,data,error}` shape and preserve the pre-migration tool names and approval annotations.

## Verification

```powershell
npm test
npm run smoke:mcp
```
