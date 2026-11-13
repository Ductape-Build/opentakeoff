import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import * as marks from '../src/brand/marks.jsx';

(globalThis as any).React = React;

test('custom workspace brand displays CDB without the upstream logo', () => {
  assert.equal(typeof marks.CdbBrand, 'function');
  const html = renderToStaticMarkup(React.createElement(marks.CdbBrand));
  assert.match(html, />CDB</);
  assert.match(html, /CDB custom development/);
  assert.doesNotMatch(html, /<svg/);
});

test('app entry and AI connection guide identify the local CDB fork', () => {
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(index, /<title>CDB OpenTakeoff/);
  assert.doesNotMatch(index, /npx -y opentakeoff-mcp|cloudflareinsights/);
  const connect = readFileSync(new URL('../src/components/ConnectAI.jsx', import.meta.url), 'utf8');
  assert.match(connect, /CDB.*fork/);
  assert.match(connect, /mcp\/dist\/server.js/);
  assert.doesNotMatch(connect, /npx -y opentakeoff-mcp|releases\/latest\/download/);
});

test('all workspace layouts use the custom brand', () => {
  for (const file of ['components/PremiumChrome.jsx', 'components/WorkspaceChrome.jsx', 'pages/TakeoffCanvas.jsx']) {
    const source = readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
    assert.match(source, /<CdbBrand[\s/>]/, file);
    assert.doesNotMatch(source, /<Ot(?:Mark|Lockup)[\s/>]/, file);
  }
});
