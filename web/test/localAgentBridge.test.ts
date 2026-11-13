import test from "node:test";
import assert from "node:assert/strict";
import { createServer, request } from "node:http";

// Node fetch pins Host to the URL; use HTTP directly to test host validation.
function fetch(url: string, options: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: options.method || "GET", headers: options.headers }, res => {
      let body = "";
      res.on("data", chunk => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, json: async () => JSON.parse(body) }));
    });
    req.on("error", reject);
    req.end(options.body);
  });
}
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localAgentBridge } from "../scripts/local-agent-bridge.mjs";

test("local bridge authenticates callers, pins origin, and routes a canvas command once", async () => {
  const home = mkdtempSync(join(tmpdir(), "ot-bridge-"));
  const oldHome = process.env.HOME, oldEnabled = process.env.OPENTAKEOFF_LOCAL_AGENT;
  process.env.HOME = home;
  process.env.OPENTAKEOFF_LOCAL_AGENT = "1";
  let handler: any;
  const server = createServer((req, res) => handler(req, res, () => { res.writeHead(404); res.end(); }));
  try {
    localAgentBridge().configurePreviewServer({ config: { preview: { host: '127.0.0.1', port: 5173, strictPort: true } }, httpServer: server, middlewares: { use: (fn: any) => { handler = fn; } } });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as any;
    const base = `http://127.0.0.1:${address.port}/__agent/`;
    const token = readFileSync(join(home, ".local/state/opentakeoff/agent-token"), "utf8");
    const headers = { Host: "127.0.0.1:5173", Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const post = (path: string, body: object) => fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
    assert.equal((await fetch(base + "status", { headers: { Host: "127.0.0.1:5173" } })).status, 401);
    assert.equal((await fetch(base + "status", { headers: { ...headers, Origin: "https://evil.example" } })).status, 403);
    assert.equal((await fetch(base + "status", { headers: { ...headers, Host: "evil.example:5173" } })).status, 403);
    assert.equal((await fetch(base + "bootstrap", { headers })).status, 403);
    const bootstrap = await fetch(base + "bootstrap", { headers: { ...headers, "Sec-Fetch-Site": "same-origin" } });
    assert.equal((await bootstrap.json()).token, token);
    assert.equal((await post("call", { name: "list_sheets", args: {} })).status, 409);
    await post("poll", { client: "canvas-1" });
    assert.equal((await post("poll", { client: "canvas-2" })).status, 409);
    assert.equal((await post("call", { name: "workspace_state", args: {} })).status, 409);
    await new Promise(r => setTimeout(r, 5100));
    await post("poll", { client: "canvas-1" });
    const resultPromise = post("call", { name: "list_sheets", args: {} });
    let command: any;
    for (let i = 0; i < 20 && !command; i++) {
      command = (await (await post("poll", { client: "canvas-1" })).json()).command;
      if (!command) await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(command.name, "list_sheets");
    assert.equal((await (await post("poll", { client: "canvas-1" })).json()).command, null);
    await post("result", { client: "canvas-1", id: command.id, result: { sheets: ["A3.02"] } });
    assert.deepEqual(await (await resultPromise).json(), { sheets: ["A3.02"] });
    const state = { workspace_id: 'canvas:local', revision: '1', project_name: '697', snapshot: { schema: 'opentakeoff.takeoff_canvas.v1', conditions: [{ id: 'c1', finish_tag: 'CPT-1' }], shapes: [] }, pending_proposals: [] };
    const args = { expected_workspace_id: state.workspace_id, expected_revision: state.revision, expected_project_name: '697', conditions: state.snapshot.conditions };
    const removal = post('call', { name: 'remove_unused_conditions', args });
    const next = async () => {
      for (let i = 0; i < 100; i++) {
        const c = (await (await post('poll', { client: 'canvas-1' })).json()).command;
        if (c) return c;
        await new Promise(r => setTimeout(r, 5));
      }
      throw new Error('No command');
    };
    const read = await next(); assert.equal(read.name, 'workspace_state');
    await post('result', { client: 'canvas-1', id: read.id, result: state });
    const remove = await next(); assert.equal(remove.name, 'remove_unused_conditions');
    // Backup exists BEFORE browser ever receives the write.
    const fs = await import('node:fs');
    const backupDir = join(home, '.local/state/opentakeoff/backups');
    const names = fs.readdirSync(backupDir); assert.equal(names.length, 1);
    assert.deepEqual(JSON.parse(readFileSync(join(backupDir, names[0]), 'utf8')), state.snapshot);
    await post('result', { client: 'canvas-1', id: remove.id, result: { removed: args.conditions } });
    const receipt = await (await removal).json();
    assert.match(receipt.backup_sha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(receipt.removed, args.conditions);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (oldHome === undefined) delete process.env.HOME; else process.env.HOME = oldHome;
    if (oldEnabled === undefined) delete process.env.OPENTAKEOFF_LOCAL_AGENT; else process.env.OPENTAKEOFF_LOCAL_AGENT = oldEnabled;
    rmSync(home, { recursive: true, force: true });
  }
});
