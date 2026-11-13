# Connect CDB OpenTakeoff to your AI

CDB is Ductape-Build's downstream app and MCP fork of [Kentucky-ai/opentakeoff](https://github.com/Kentucky-ai/opentakeoff). The private `cdb-opentakeoff-mcp` package is **local-source-only**, not the upstream npm release. Use Node 24 for the full checkout and follow [CDB build/setup](CDB_SECOND_MACHINE.md).

Normal measurement tools operate an independent offline engine session, **not this canvas**. Only explicit live-browser tools target the opt-in connected project; verify status and workspace identity before mutation. Assistant chat pairing does not change this boundary.

## Claude Code

Build first, then replace the absolute path below:

```sh
claude mcp add --scope user cdb-opentakeoff -- node /ABSOLUTE/PATH/TO/opentakeoff/mcp/dist/server.js
claude mcp list
```

The server must initialize as `cdb-opentakeoff-mcp`, title **CDB OpenTakeoff (Ductape-Build fork)**. Remove an old upstream registration if it would create duplicates. `--scope user` makes it available in every folder.

## Codex CLI

```sh
codex mcp add cdb-opentakeoff -- node /ABSOLUTE/PATH/TO/opentakeoff/mcp/dist/server.js
codex mcp list
```

## Cursor and other MCP clients

Checked-in `.mcp.json` and `.cursor/mcp.json` use `node mcp/dist/server.js`; launch the client from the repository root. VS Code uses `${workspaceFolder}/mcp/dist/server.js`; open this repo as that folder. Build first. For global registrations or clients launched elsewhere, use an absolute path:

```json
{
  "mcpServers": {
    "cdb-opentakeoff": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/opentakeoff/mcp/dist/server.js"]
    }
  }
}
```

Node must be on the client PATH; otherwise use an absolute Node executable too. No download fallback is provided.

## Claude Desktop

Use the same local stdio JSON in Desktop settings after building. No CDB npm or MCPB release is published; upstream download bundles are not this fork.

## claude.ai, the Claude mobile app, and ChatGPT

Cloud apps cannot reach this local stdio server. No public hosted CDB MCP endpoint is provided; do not expose the local browser bridge to the network.

## Try it on a real plan

The bundled `demo/sample-finish-plan.pdf` is the public VA St. Cloud finish plan, with AF101 and its schedule AF600. Ask the connected CDB agent to load its absolute path, list sheets and read detected scale. Expect AF101 at **1/8" = 1'-0"** and AF600 with no scale found. A detected scale is not an adopted scale; explicitly set each measured sheet's scale. Follow the [agent manual](AGENT_GUIDE.md) and [MCP guide](MCP.md) through overlay review and marked-PDF export. This example loads the independent engine, not the live browser.

## Talk to your AI from inside the canvas (Assistant window)

Ask your connected agent to call `assistant_open`, then use its link/code in the canvas Assistant window. The chat bridge is distinct from the live canvas measurement bridge. If it refuses the local app origin, report that limitation; do not bypass origin/authentication checks. Assistant messaging does not make ordinary MCP measurements target the browser. The guarded live tools are documented in [LOCAL_AGENT.md](LOCAL_AGENT.md).

## Good to know

- **Privacy:** the server reads/writes local files; text, quantities and images returned to your agent become part of your AI-provider conversation.
- **Updates:** inspect branch/status, preserve local changes, intentionally pull `cdb-development`, rebuild and reconnect. npm updates fetch upstream, not CDB.
- **Staged tools:** `OPENTAKEOFF_MCP_STAGED_TOOLS=1` starts with setup tools; see [staged exposure](../mcp/README.md#staged-tool-exposure-opt-in).
- **Source and Docker:** see [MCP setup](MCP.md#setup) and the [server reference](../mcp/README.md).
