# MatFlow v0.2 research workbench: design brief

## What this version solves

A materials-science researcher needs to understand a task's **input, tool decision, result and handling advice** before editing the workflow step by step. The first UI version does not disguise an empty canvas as a complete scientific automation system, and it does not reimplement routing or validation rules in the browser.

## First deliverable slice

The user can:

1. Read the server-confirmed GraphState and the registered tools;
2. Enter a research task and select the data types they already have;
3. See the backend's candidates, the `registered_id` of the selected tool, the rationale, and whether human confirmation is required;
4. Read an audit summary containing the original prompt in the same interface.

The only source of truth for this slice is `GET /api/state`, `GET /api/capabilities`, `POST /api/route` and `GET /api/task-summaries/{task_id}`. Graph editing, execution, event streaming, cancellation and retry will be added once their respective backend contracts are stable.

## Visual direction

The interface is a "lab bench record", not a black terminal and not a gamified node canvas. Its primary surface is lab-notebook paper white, deep indigo carries navigation and actions, and verdigris expresses only a normal state already confirmed by the server. The most important content is the research question the user just submitted and the next step the backend proposes, not decorative dashboard metrics.

### Draft tokens

| Role | Value | Use |
| --- | --- | --- |
| Paper | `#F5F7F5` | page background with a very light green-grey tint |
| Surface | `#FFFFFF` | the readable work area |
| Ink | `#182537` | primary text and headings |
| Indigo | `#244B78` | primary actions, keyboard focus, structural hierarchy |
| Verdigris | `#19756B` | confirmed/complete states |
| Copper | `#A85C2D` | human confirmation and states needing attention |

Typography uses `IBM Plex Sans` (body text and controls) and `IBM Plex Mono` (stable IDs, versions and traces). Corner radius is restrained to 8px; no meaningless gradients, glassmorphism or continuous animation.

## Layout

On desktop the content is organized as a collapsible evidence sidebar plus one main work area:

```text
┌──────────────────────────────────────────────────────────┐
│ MatFlow / Research workbench     connection / Graph vN     │
├───────────────────┬──────────────────────────────────────┤
│ current graph and │ research task                        │
│ tool registry     │  prompt + data types → routing        │
│ (evidence         │                                      │
│  sidebar)         │  decision record / audit summary      │
└───────────────────┴──────────────────────────────────────┘
```

On narrow screens it becomes a single column, with task input and decision record first and the evidence sidebar collapsed behind them. Every state carries a text and icon/border cue and never relies on colour alone.

## Accessibility baseline

- One `h1` and one `main` landmark; the first keyboard stop is "skip to main content".
- Every form control has a visible label, and every dynamic routing state is announced through a permanent `aria-live` region.
- Focus is visible, touch targets are at least 44px, and text/component contrast meets WCAG AA.
- Only action-feedback animation is kept, and `prefers-reduced-motion` is supported.

## Acceptance seam

Playwright verifies user-visible results through a browser and interacts only through these HTTP interfaces:

- `GET /api/state`
- `GET /api/capabilities`
- `POST /api/route`
- `GET /api/task-summaries/{task_id}`

First end-to-end scenario: enter "Run basic EIS quality checks", select `TypedTable`, and the interface shows the server-selected `eis_basic_qc` plus the original prompt.
