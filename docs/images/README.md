# Screenshots

Captured on **2026-10-20** from a running backend + WebUI, light theme, 1600 px wide, no personal
data or keys visible. They show the offline historical **MgO QE replay demo** (not LLM planning and
not a new `pw.x`/Slurm run) and its post-run human-review gate.

- `workbench-overview.png` — full workbench after connecting with a fresh save (prompt/task entries, tool registry, empty graph, inspector).
- `workflow-graph.png` — the four-node QE replay workflow with node states, `Historical output replay · Slurm not submitted` label and parsed values.
- `task-result.png` — parsed total energy, Fermi energy, SCF iterations and convergence under the historical-replay label.
- `node-review-gate.png` — `Parse QE result` waiting for review with **Continue / Revise node / Stop run**.

Full commands, expected values and hash checks: backend repository
[acceptance report](https://github.com/Syanz7755/matflow/blob/acceptance/2026-10-20-demo/docs/acceptance/2026-10-20/REPORT.zhcn.md).
