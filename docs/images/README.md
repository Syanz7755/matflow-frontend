# Screenshots

Captured on **2026-10-20** from a running backend + WebUI, light theme, no personal data or keys
visible. They show the offline historical **MgO QE replay demo** (not LLM planning and not a new
`pw.x`/Slurm run) and its post-run human-review gate. The backend repository also keeps its own copy
of this capture set, including an empty-workspace overview frame; both sets are real 2026-10-20 runs.

- `workbench-overview.png` — post-demo workbench: the four-node QE replay graph, the result inspector with parsed values, and the status bar `MgO QE replay complete · -2417.17683284 Ry · no Slurm job submitted`.
- `workflow-graph.png` — canvas crop of the four-node QE replay workflow with typed ports and `Completed` node states (the parsed values are in `workbench-overview.png`/`task-result.png`).
- `task-result.png` — parsed total energy, Fermi energy, SCF iterations and convergence under the historical-replay label.
- `node-review-gate.png` — `Parse QE result` waiting for review with **Continue / Revise node / Stop run**.

Full commands, expected values and hash checks: backend repository
[acceptance report](https://github.com/Syanz7755/matflow/blob/acceptance/2026-10-20-demo/docs/acceptance/2026-10-20/REPORT.zhcn.md).
