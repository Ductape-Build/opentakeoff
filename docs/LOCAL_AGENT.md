# Local canvas control (Ductape-Build fork)

The optional MCP Assistant window is a chat relay, not shared browser project control. This fork adds a separate opt-in bridge to the **currently open local canvas**, using the existing in-canvas agent tool registry and proposal review gate.

## Start

Build with `cd web && npm run build`. Run the preview with `OPENTAKEOFF_LOCAL_AGENT=1 npm run preview -- --host 127.0.0.1 --port 5173 --strictPort`, then refresh the app at **http://127.0.0.1:5173/**. The desktop installation's user service sets this environment variable. Keep only one canvas tab open. New code cannot attach to an already loaded page until it is refreshed.

The local desktop helper supports:

```bash
opentakeoff-agent status
opentakeoff-agent workspace_state
opentakeoff-agent describe_tools
opentakeoff-agent list_sheets
opentakeoff-agent read_sheet_text '{"sheet":"KEY"}'
opentakeoff-agent create_condition '{"finish_tag":"SIDING-1"}'
```

The helper is installed at `~/.local/bin/opentakeoff-agent`. For other local clients, POST `{ "name": "TOOL", "args": {} }` to `/__agent/call` with `Authorization: Bearer TOKEN`. Read TOKEN from `~/.local/state/opentakeoff/agent-token` (mode 0600). `GET /__agent/status` reports whether a canvas is polling. `describe_tools` returns the currently available registry schemas. `workspace_state` returns the live project name, open sheets, focused sheet, conditions, shapes and pending proposals.

## Boundaries and safety

- Disabled unless the preview process explicitly sets `OPENTAKEOFF_LOCAL_AGENT=1`; the build alone does not enable it. Not for public hosting.
- Loopback binding, pinned Host and Origin, no CORS, same-origin browser bootstrap, random per-process bearer token. Local processes running as this user can control the canvas. Do not share the token.
- Two simultaneous canvas tabs are refused rather than silently targeting the wrong project.
- Existing agent tools read only rendered/open sheets. Scale must already be verified and set in the app. No arbitrary JavaScript execution, file access, deletion, project replacement, or human approval endpoint.
- Creating a condition changes the project immediately. Shapes go through `propose_shapes`: staged for human review, not silently approved or committed. Existing schema validation, scale gates and undo/review behavior are reused.
- A 60-second timeout does not prove a write failed. Inspect state before retrying. Commands are dequeued once, never replayed automatically. Restarting the local server requires a browser refresh.
- Vision replies may include PNG data URLs; save/decode those locally to inspect drawings.

## Verification

`node --import tsx --test test/localAgentBridge.test.ts` in `web/` exercises missing credentials, forbidden Host/Origin, bootstrap restrictions, no-canvas refusal, multiple-tab refusal and single-delivery command/result routing. Run `npm run check` for the full web gate. Live browser verification requires refreshing the app and observing `status.connected: true`, then checking `workspace_state` against the visible drawing before making changes.
