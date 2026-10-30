#!/usr/bin/env node
'use strict';

// Lightweight geometry-builder smoke test. This intentionally stubs Three.js
// primitives: it validates mesh inventory, naming, metadata and axis placement,
// not WebGL rendering or the final RB21 installation fit.
const assert = require('node:assert/strict');
const path = require('node:path');

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  normalize() { const n = this.length() || 1; return this.multiplyScalar(1 / n); }
}
class Group {
  constructor() {
    this.children = [];
    this.position = new Vector3();
    this.rotation = { set() {}, x: 0, y: 0, z: 0 };
    this.userData = {};
    this.name = '';
  }
  add(child) { this.children.push(child); child.parent = this; }
}
class Material { constructor(options) { Object.assign(this, options); } }
class Mesh {
  constructor(geometry, material) {
    this.geometry = geometry;
    this.material = material;
    this.position = new Vector3();
    this.rotation = { set() {}, x: 0, y: 0, z: 0 };
    this.quaternion = { setFromUnitVectors() {} };
    this.scale = new Vector3(1, 1, 1);
    this.userData = {};
  }
}
class Geometry { constructor(...args) { this.args = args; } }
class Curve { constructor(points) { this.points = points; } }

global.window = {
  THREE: {
    Group, Mesh, MeshStandardMaterial: Material,
    BoxGeometry: Geometry, SphereGeometry: Geometry,
    CylinderGeometry: Geometry, TorusGeometry: Geometry,
    TubeGeometry: Geometry, Vector3, CatmullRomCurve3: Curve
  }
};
require(path.resolve(process.argv[2] || 'app/src/main/assets/powerunit.js'));

function collectMeshes(root) {
  const found = [];
  const visit = node => {
    for (const child of node.children || []) {
      if (child instanceof Mesh) found.push(child);
      visit(child);
    }
  };
  visit(root);
  return found;
}

const expected = [
  ['pistons', / piston [1-3] \(80 mm bore family\)$/, 6],
  ['connecting rods', / connecting rod [1-3]$/, 6],
  ['crankpin journals', /crankpin journal [1-3] \(/, 3],
  ['camshafts', / (?:inlet|exhaust) camshaft$/, 4],
  ['cam lobes', / cam lobe C[1-3]-[AB]$/, 24],
  ['valve stems', / (?:inlet|exhaust) valve [AB] stem$/, 24],
  ['valve heads', / (?:inlet|exhaust) valve [AB] head$/, 24],
  ['exhaust primaries', / primary [1-3]$/, 6],
  ['intake runners', / intake runner [1-3]$/, 6],
  ['survival-cell mounting studs', /survival-cell M12 mounting stud [1-3]$/, 6],
  ['transmission mounting studs', /transmission mounting stud [LR] (?:lower|upper)$/, 4]
];

for (const lengthAxis of ['x', 'z']) {
  const group = window.AeroPowerUnit.build({
    bounds: { min: { x: -2.8, y: 0, z: -1 }, max: { x: 2.9, y: 1.4, z: 1 } },
    size: { x: 5.7, y: 1.4, z: 2 },
    lengthAxis
  });
  const meshes = collectMeshes(group);
  const names = meshes.map(mesh => mesh.name);
  const uniqueNames = new Set(names);
  const invalid = meshes.filter(mesh =>
    !mesh.userData.componentInfo?.label ||
    !mesh.userData.componentInfo?.description ||
    mesh.userData.systemId !== 'power'
  );

  assert.equal(meshes.length, 235, `${lengthAxis}: expected 235 meshes`);
  assert.equal(uniqueNames.size, meshes.length, `${lengthAxis}: duplicate mesh names`);
  assert.equal(invalid.length, 0, `${lengthAxis}: missing component metadata`);
  for (const [label, pattern, count] of expected) {
    const actual = names.filter(name => pattern.test(name)).length;
    assert.equal(actual, count, `${lengthAxis}: ${label}: expected ${count}, got ${actual}`);
  }
  assert.ok(Number.isFinite(group.position.x) && Number.isFinite(group.position.y) && Number.isFinite(group.position.z));
  if (lengthAxis === 'x') assert.equal(group.rotation.y, 0);
  else assert.ok(Math.abs(group.rotation.y + Math.PI / 2) < 1e-10);

  console.log(`${lengthAxis.toUpperCase()}-axis: PASS — ${meshes.length} unique meshes; 6 pistons/rods; 3 crankpins; 4 camshafts; 24 cam lobes; 24 valves; exhaust/intake and mount counts verified.`);
}
