# CDB fork: install on another machine

Use this fork's **cdb-development** branch, not stock main or the published npm MCP package, for CDB branding and the guarded live-canvas tools. Source includes web app, independent MCP engine, and local browser bridge. No registry publication is needed to run the fork.

## Prerequisites and build

Git, Node.js 24 (see root `.nvmrc`), npm, Python 3 for the optional agent helper, and a browser. On Linux the optional service below uses user systemd. Install prerequisites using the target machine's supported package manager.

```sh
git clone --branch cdb-development https://github.com/Ductape-Build/opentakeoff.git "$HOME/.local/share/opentakeoff"
cd "$HOME/.local/share/opentakeoff"
npm ci --prefix web
npm ci --prefix mcp
npm ci --prefix protocol
npm run check --prefix web
npm run typecheck --prefix mcp
npm test --prefix mcp
npm run build --prefix mcp
npm run smoke:dist --prefix mcp
npm run check --prefix protocol
```

If the directory already exists, inspect branch/status and preserve local changes before pulling; do not clone over it or reset it. The first clean build and smoke test may need network access to install dependencies.

## Start the CDB app

```sh
cd "$HOME/.local/share/opentakeoff/web"
OPENTAKEOFF_LOCAL_AGENT=1 npm run preview -- --host 127.0.0.1 --port 5188 --strictPort
```

Open **http://127.0.0.1:5188/** in one browser tab/window. Confirm CDB is visible in the workspace chrome. Keep that exact host/port/browser profile stable to retain local saved work. Preview is intentional: this authenticated bridge is implemented for preview, not arbitrary static hosts. Never expose it to the LAN.

Optional Linux service, created through the target machine's normal configuration workflow at `~/.config/systemd/user/opentakeoff.service`:

```ini
[Unit]
Description=CDB OpenTakeoff local app

[Service]
Type=simple
WorkingDirectory=%h/.local/share/opentakeoff/web
Environment=OPENTAKEOFF_LOCAL_AGENT=1
# Replace /ABSOLUTE/PATH/TO/node with `command -v node` on the target machine.
ExecStart=/ABSOLUTE/PATH/TO/node %h/.local/share/opentakeoff/web/node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5188 --strictPort
Restart=on-failure
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=default.target
```

After replacing the placeholder: `systemctl --user daemon-reload` then `systemctl --user enable --now opentakeoff.service`. Stop the manually launched preview first to avoid a port conflict. No service, autostart or agent configuration is installed merely by cloning.

## Connect the fork MCP to each intended agent

Configure a **local stdio MCP** using an absolute Node executable and the freshly built server:

```json
{
  "mcpServers": {
    "opentakeoff": {
      "command": "/ABSOLUTE/PATH/TO/node",
      "args": ["/ABSOLUTE/HOME/.local/share/opentakeoff/mcp/dist/server.js"]
    }
  }
}
```

Replace both paths on the target machine. For Hermes use its supported MCP configuration/installation workflow; do not hand-edit its config file. Configure other agents deliberately; one agent's registration does not automatically configure all agents.

**Important:** checked-in `.mcp.json`, `.cursor/mcp.json`, and `.vscode/mcp.json` are inherited upstream configurations using `npx -y opentakeoff-mcp`. That downloads the public package, not this fork. Override them in the intended client with the local built server above; do not assume those defaults provide the CDB live tools.

An optional executable wrapper can live at `~/.local/bin/opentakeoff-mcp` and exec the target machine's Node plus the same `mcp/dist/server.js`. The optional CLI helper is tracked at `scripts/opentakeoff-agent`; copy it to `~/.local/bin/opentakeoff-agent` with executable permissions or run it with Python directly.

## Verify the integration

- Discover the actual MCP tool list. The fork includes `live_browser_status`, `live_browser_state`, and `live_remove_unused_conditions` in addition to the independent engine tools.
- Read `live_browser_status` with `port: 5188`. A disconnected browser is not a connected project; there is no offline fallback.
- Read `live_browser_state` and match the project name, PDFs and workspace identity against the visible app before any mutation.
- Existing normal measurement tools still operate a separate offline engine session, not the open browser canvas.
- The guarded unused-condition operation requires exact identity/revision/tag pairs, zero shapes, no pending proposals, and a verified private backup. It is not a general deletion or approval API.
- Keep only one canvas open. After refresh/reopen, a five-second multiple-canvas conflict lease may need to expire before reads succeed.

The preview generates its own private bearer token under `~/.local/state/opentakeoff/agent-token`; do **not** copy or commit it. Restarting preview requires refreshing the browser.

## Move projects separately

GitHub contains source, not this machine's IndexedDB/localStorage projects, PDF sources, backup files, browser profile, built output, node_modules, service files or credentials. Export work using the app's supported project/archive/export operations and retain all original source PDFs. A takeoff JSON snapshot alone does not embed its source PDFs. Transfer private project files by an authorized private channel, not this public repository. Preserve originals until import, quantities and persistence are verified on the second machine.

See [local bridge contract](LOCAL_AGENT.md), [repository guide](wiki/repo-guide.md), and [MCP documentation](../mcp/README.md). Upstream is https://github.com/Kentucky-ai/opentakeoff; do not confuse an available upstream update with a requirement to merge it before using this fork.
