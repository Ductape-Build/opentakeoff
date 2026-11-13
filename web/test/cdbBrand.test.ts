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

test('all workspace layouts use the custom brand', () => {
  for (const file of ['components/PremiumChrome.jsx', 'components/WorkspaceChrome.jsx', 'pages/TakeoffCanvas.jsx']) {
    const source = readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
    assert.match(source, /<CdbBrand[\s/>]/, file);
    assert.doesNotMatch(source, /<Ot(?:Mark|Lockup)[\s/>]/, file);
  }
});
