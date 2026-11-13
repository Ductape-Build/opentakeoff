import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const json = (path: string) => JSON.parse(read(path));

test("CDB metadata cannot publish or resolve to the official npm package", () => {
  const pkg = json("mcp/package.json");
  assert.equal(pkg.name, "cdb-opentakeoff-mcp");
  assert.equal(pkg.private, true);
  assert.match(pkg.repository.url, /Ductape-Build/);
  assert.equal(json("mcp/package-lock.json").name, pkg.name);
  assert.equal(json("mcp/package-lock.json").packages[""].name, pkg.name);
  for (const path of ["mcp/server.json", "web/public/.well-known/mcp.json"]) {
    const manifest = json(path);
    assert.match(manifest.title, /CDB/);
    assert.equal(manifest.distribution, "local-source-only");
    assert.equal(manifest.packages[0].registryType, "local");
    assert.equal(manifest.packages[0].identifier, pkg.name);
    assert.match(manifest.repository.url, /Ductape-Build/);
    assert.equal(manifest.$schema, undefined, "local descriptor must not claim registry schema compliance");
  }
  assert.match(read(".github/workflows/publish-mcp.yml"), /if: github.repository == 'Kentucky-ai\/opentakeoff'/);
});

test("checked-in clients execute the local built fork, never npx", () => {
  for (const path of [".mcp.json", ".cursor/mcp.json", ".vscode/mcp.json"]) {
    const config = json(path);
    const entry = (config.mcpServers || config.servers)["cdb-opentakeoff"];
    assert.equal(entry.command, "node", path);
    assert.deepEqual(entry.args, [path.startsWith(".vscode") ? "${workspaceFolder}/mcp/dist/server.js" : "mcp/dist/server.js"], path);
  }
});
