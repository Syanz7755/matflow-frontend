# MatFlow MCP 与 DSH 集成

MCP bridge 是独立 Node 服务，默认监听 `http://127.0.0.1:8001/mcp`。它只调用后端 HTTP API，不导入 Python 后端代码，也不直接访问工作区文件。

## 启动

先在后端仓库启动服务：

```powershell
uv run matflow start --ui none
```

再在本仓库启动 bridge：

```powershell
npm install
npm run mcp
```

可通过 `MATFLOW_API_URL`、`MATFLOW_MCP_HOST` 与 `MATFLOW_MCP_PORT` 覆盖默认地址。`MATFLOW_API_URL` 应包含 `/api`。

## DSH

```powershell
npm run configure:dsh
```

生成的 profile 指向新 bridge。受控本地文件导入由 DSH 适配层完成；远程文件只允许公共 HTTPS 地址，bridge 会检查重定向、拒绝私网目标并限制为 25 MB，内容最终经后端上传 API 落盘。

## 兼容性

bridge 启动时读取 `/api/capabilities`，要求 `matflow-http >=1.0 <2.0`。工具返回保持 `{ok,data,error}` 形状，并保留迁移前的工具名称与审批注解。

## 验证

```powershell
npm test
npm run smoke:mcp
```
