import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../server.ts';
test('dedicated live tools exist without a plan and cannot confuse offline session with canvas', async () => {
 const [a,b] = InMemoryTransport.createLinkedPair(); const server=buildServer(); await server.connect(b);
 const client=new Client({name:'live-test',version:'1'}); await client.connect(a);
 try {
  const names=(await client.listTools()).tools.map(t=>t.name);
  for(const name of ['live_browser_status','live_browser_state','live_remove_unused_conditions']) assert.ok(names.includes(name), name);
  const result=await client.callTool({name:'live_browser_status',arguments:{port:1}});
  assert.equal(result.isError,true);
 } finally { await client.close(); await server.close(); }
});
