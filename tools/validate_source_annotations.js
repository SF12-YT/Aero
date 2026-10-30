#!/usr/bin/env node
'use strict';

// Extract the browser-side source-name catalogue and test it without a WebView.
// This verifies the mapping layer, not the presence/orientation of the matching
// objects in the external GLB release.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const viewerPath = path.resolve(process.argv[2] || 'app/src/main/assets/viewer.js');
const source = fs.readFileSync(viewerPath, 'utf8');
const start = source.indexOf('  const knownSourceParts = new Map();');
const end = source.indexOf('  const meshes = [];', start);
assert.ok(start >= 0 && end > start, 'Could not locate the source annotation catalogue in viewer.js');

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(`let carRoot = null;\n${source.slice(start, end)}\nglobalThis.catalogue = knownSourceParts;\nglobalThis.lookup = findKnownSourcePart;\nglobalThis.normalize = normalizeSourceName;`, sandbox);

const catalogue = sandbox.catalogue;
const expected = [
  'redbull 03 002 001', 'redbull 31', 'redbull 03 001 001', 'redbull 32',
  'redbull 01 010 001', 'redbull 01 009 001', 'redbull 35', 'redbull 34',
  'redbull 03', 'redbull 04', 'redbull 27 SUB1', 'redbull 27 SUB0',
  'redbull 02 006 001', 'redbull 02 003 001', 'redbull 25 SUB1', 'redbull 25 SUB0',
  'redbull 26 SUB1', 'redbull 26 SUB0', 'redbull 28 SUB1', 'redbull 28 SUB0',
  'CINTURE ON SUB1', 'CINTURE ON SUB0', 'rearwing 011 001', 'rearwing 012 001',
  'rearwing', 'rearwing 003 001', 'rearwing 008 001', 'rearwing 009 001',
  'rearwing 010 001', 'rearlight', 'rearlight2', 'redbull 13 005 001',
  'redbull 13 004 001', 'redbull 13 002 001', 'redbull 13 001 001',
  'redbull 17 002 001', 'RB19 052 001', 'redbull 12 001 001', 'redbull 12 002 001',
  'redbull 12 003 001', 'redbull 15 001 001', 'redbull 13 006 001',
  'redbull 14 001 001', 'redbull 15 002 001', 'redbull 13 012 001',
  'redbull 13 013 001', 'redbull 13 014 001', 'redbull 13 015 001',
  'redbull 11 003 001', 'redbull 20 001 001', 'redbull 20 002 001',
  'redbull 20 003 001', 'redbull 13 018 001', 'redbull 13 021 001',
  'redbull 13 008 001', 'redbull 13 009 001', 'redbull 13 010 001',
  'redbull 13 011 001', 'redbull 13 022 001', 'redbull 13 023 001',
  'redbull 13 024 001'
];

const normalize = value => String(value).toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
for (const name of expected) {
  assert.ok(catalogue.has(normalize(name)), `Missing source annotation: ${name}`);
  const info = catalogue.get(normalize(name));
  assert.ok(info.displayName && info.description && info.systemId && info.userIdentified, `Incomplete metadata: ${name}`);
}
assert.equal(catalogue.size, new Set(expected.map(normalize)).size, 'Unexpected extra or duplicate source keys');

// Exact matching must distinguish the short brake-drum ID from two logo IDs.
assert.equal(catalogue.get(normalize('redbull 03')).systemId, 'brakes');
assert.match(catalogue.get(normalize('redbull 03')).displayName, /Front-left brake drum/);
assert.equal(catalogue.get(normalize('redbull 03 001 001')).systemId, 'branding');
assert.match(catalogue.get(normalize('redbull 03 001 001')).displayName, /Hard Rock/);
assert.equal(catalogue.get(normalize('redbull 03 002 001')).systemId, 'branding');
assert.match(catalogue.get(normalize('redbull 03 002 001')).displayName, /Red Bull/);

// Source-name variants and Blender duplicate suffix are normalized safely.
assert.equal(sandbox.normalize('redbull_27_SUB1'), normalize('redbull 27 SUB1'));
const dummy = { name: 'redbull_27_SUB1.001', geometry: null, userData: {}, parent: null };
const wheelInfo = sandbox.lookup(dummy);
assert.equal(wheelInfo.displayName, 'Front-right wheel / rim');

// Preserve and flag the duplicated rearwing identifier rather than overwriting it.
const conflict = catalogue.get(normalize('rearwing 011 001'));
assert.match(conflict.displayName, /Oracle logo/);
assert.match(conflict.displayName, /Gate\.io logo/);
assert.match(conflict.accuracy, /CONFLICT/);

console.log(`PASS — ${catalogue.size} unique user-supplied source identifiers represented by exact-name keys.`);
console.log('PASS — underscore/space and Blender duplicate suffix handling.');
console.log('PASS — redbull 03 / redbull 03 001 001 / redbull 03 002 001 exact distinctions.');
console.log('PASS — rearwing 011 001 duplicate annotation explicitly flagged.');
