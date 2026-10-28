// Procedural equipment, drawn the way a general-arrangement drawing would show
// it. Geometry is illustrative, not a record of any Haritha project.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { penLines } from "./drafting.js";

const UP = new THREE.Vector3(0, 1, 0);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

class Draft {
  constructor() {
    this.parts = [];
    this.lines = [];
    this.anchors = [];
  }
  add(geometry, { kind = "body", edges = true, hull = true, threshold = 28 } = {}) {
    geometry.deleteAttribute("uv");
    if (edges) {
      const e = new THREE.EdgesGeometry(geometry, threshold);
      const arr = e.attributes.position.array;
      for (let i = 0; i < arr.length; i++) this.lines.push(arr[i]);
      e.dispose();
    }
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    this.parts.push({ geometry: g, kind, hull });
    return this;
  }
  seg(a, b) {
    this.lines.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  circle(center, normal, r, n = 56) {
    const [u, v] = basis(normal);
    let prev;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const p = center.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r);
      if (prev) this.seg(prev, p);
      prev = p;
    }
  }
  // Chain line: the drafting symbol for a centreline.
  chain(a, b, dash = 0.26, gap = 0.06, dot = 0.04) {
    const dir = b.clone().sub(a);
    const total = dir.length();
    dir.normalize();
    let t = 0;
    let long = true;
    while (t < total) {
      const len = Math.min(long ? dash : dot, total - t);
      this.seg(a.clone().addScaledVector(dir, t), a.clone().addScaledVector(dir, t + len));
      t += len + gap;
      long = !long;
    }
  }
  // Section hatching inside a rectangle mapped into 3D by `map(u, v)`.
  hatch(u0, u1, v0, v1, spacing, map, slope = 1) {
    for (let c = u0 - v1 * slope - spacing; c < u1 - v0 * slope + spacing; c += spacing) {
      const pts = [];
      for (const v of [v0, v1]) {
        const u = c + v * slope;
        if (u >= u0 && u <= u1) pts.push([u, v]);
      }
      for (const u of [u0, u1]) {
        const v = (u - c) / slope;
        if (v > v0 && v < v1) pts.push([u, v]);
      }
      if (pts.length >= 2) this.seg(map(...pts[0]), map(...pts[1]));
    }
  }
  anchor(name, position) {
    this.anchors.push({ name, position: position.clone() });
  }
}

function basis(normal) {
  const n = normal.clone().normalize();
  const helper = Math.abs(n.y) < 0.9 ? UP : V(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(n, helper).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  return [u, v];
}

function orient(geometry, position, dir) {
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  geometry.applyQuaternion(q);
  geometry.translate(position.x, position.y, position.z);
  return geometry;
}

const cylinder = (r, len, open = false, seg = 40) =>
  new THREE.CylinderGeometry(r, r, len, seg, 1, open).translate(0, len / 2, 0);

// 2:1 ellipsoidal dished head, built dome-up from its tangent line.
function dome(r, depth, seg = 56, steps = 16) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(r * Math.cos(t), 0.0008), depth * Math.sin(t)));
  }
  return new THREE.LatheGeometry(pts, seg);
}

function nozzle(d, base, dir, { r, len, fr, ft = 0.05, blind = false, bolts = 8 }) {
  dir = dir.clone().normalize();
  d.add(orient(cylinder(r, len + 0.08, false, 28), base.clone().addScaledVector(dir, -0.08), dir));
  d.add(orient(cylinder(fr, ft, false, 44), base.clone().addScaledVector(dir, len - ft), dir));
  const top = base.clone().addScaledVector(dir, len);
  if (blind) {
    d.add(orient(cylinder(fr, ft * 0.9, false, 44), top, dir));
    top.addScaledVector(dir, ft * 0.9);
  }
  const [u, v] = basis(dir);
  const br = (fr + r) / 2 + 0.008;
  for (let i = 0; i < bolts; i++) {
    const a = (i / bolts) * TAU + 0.3;
    const p = base
      .clone()
      .addScaledVector(dir, len - ft - 0.025)
      .addScaledVector(u, Math.cos(a) * br)
      .addScaledVector(v, Math.sin(a) * br);
    d.add(orient(cylinder(0.013, ft + (blind ? ft : 0) + 0.05, false, 6), p, dir), {
      kind: "dark",
      edges: false,
      hull: false,
    });
  }
  return top;
}

function shellX(d, R, x0, x1, opts = {}) {
  d.add(orient(cylinder(R, x1 - x0, true, 72), V(x0, 0, 0), V(1, 0, 0)), opts);
}

function headX(d, R, x, sign) {
  d.add(orient(dome(R, R / 2), V(x, 0, 0), V(sign, 0, 0)));
}

function seamX(d, R, x) {
  const t = new THREE.TorusGeometry(R + 0.004, 0.009, 6, 96).rotateY(Math.PI / 2).translate(x, 0, 0);
  d.add(t, { edges: false, hull: false });
}

function saddle(d, x, R, w, hs, t = 0.06) {
  const yb = -R - hs;
  const a0 = (Math.PI * 7) / 6;
  const a1 = (Math.PI * 11) / 6;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, yb);
  shape.lineTo(w / 2, yb);
  shape.lineTo(R * Math.cos(a1), R * Math.sin(a1));
  shape.absarc(0, 0, R, a1, a0, true);
  shape.lineTo(-w / 2, yb);
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 36 });
  g.translate(0, 0, -t / 2).rotateY(Math.PI / 2).translate(x, 0, 0);
  d.add(g, { kind: "dark" });
  // Centre web: gives the saddle its tapered profile in elevation.
  const web = new THREE.Shape();
  const wb = Math.max(0.3, R * 0.55);
  const wt = wb * 0.6;
  web.moveTo(-wb / 2, yb);
  web.lineTo(wb / 2, yb);
  web.lineTo(wt / 2, -R + 0.012);
  web.lineTo(-wt / 2, -R + 0.012);
  web.lineTo(-wb / 2, yb);
  d.add(
    new THREE.ExtrudeGeometry(web, { depth: 0.04, bevelEnabled: false }).translate(x, 0, -0.02),
    { kind: "dark" },
  );
  d.add(new THREE.BoxGeometry(wb + 0.06, 0.04, w * 1.08).translate(x, yb - 0.02, 0), { kind: "dark" });
  return yb - 0.04;
}

function lug(d, x, y, { w = 0.26, h = 0.24, t = 0.045, hole = 0.045 } = {}) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
  s.lineTo(-w / 2, 0);
  const holePath = new THREE.Path();
  holePath.absarc(0, h - w / 2, hole, 0, TAU, true);
  s.holes.push(holePath);
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 20 });
  d.add(g.translate(x, y, -t / 2));
}

/* ------------------------------------------------------------------ */
/* 01 — Horizontal pressure vessel (also the hero)                     */
/* ------------------------------------------------------------------ */
export function pressureVessel() {
  const d = new Draft();
  const R = 0.8;
  const L = 4.6;
  shellX(d, R, -L / 2, L / 2);
  headX(d, R, L / 2, 1);
  headX(d, R, -L / 2, -1);
  seamX(d, R, -L / 2 + L / 3);
  seamX(d, R, -L / 2 + (2 * L) / 3);

  const n1 = nozzle(d, V(-1.3, R, 0), UP, { r: 0.1, len: 0.44, fr: 0.2 });
  const n2 = nozzle(d, V(0.95, R, 0), UP, { r: 0.15, len: 0.44, fr: 0.27, bolts: 10 });
  nozzle(d, V(0.2, R, 0), UP, { r: 0.06, len: 0.36, fr: 0.13, bolts: 6 });
  nozzle(d, V(0, -R, 0), V(0, -1, 0), { r: 0.07, len: 0.22, fr: 0.14, bolts: 6 });
  const n5 = nozzle(d, V(L / 2 + R / 2 - 0.02, 0, 0), V(1, 0, 0), { r: 0.09, len: 0.3, fr: 0.18 });
  const m1 = nozzle(d, V(-0.45, 0, R - 0.02), V(0, 0, 1), {
    r: 0.3, len: 0.24, fr: 0.42, ft: 0.06, blind: true, bolts: 16,
  });
  // Manway hinge bracket.
  d.add(new THREE.BoxGeometry(0.06, 0.16, 0.2).translate(-0.45 + 0.48, 0, R + 0.12), { kind: "dark" });

  const ground = Math.min(saddle(d, -1.6, R, 1.45, 0.36), saddle(d, 1.6, R, 1.45, 0.36));
  lug(d, -1.95, R - 0.04);
  lug(d, 1.95, R - 0.04);
  d.add(new THREE.BoxGeometry(0.36, 0.22, 0.016).translate(1.05, -0.12, R - 0.002), { kind: "dark" });

  d.anchor("Shell", V(-1.1, R * 0.5, R * 0.866));
  d.anchor("Dished head", V(L / 2 + 0.3, 0.34, 0.34));
  d.anchor("Nozzle", n2);
  d.anchor("Manway", m1);
  d.anchor("Saddle support", V(1.6, -R - 0.18, 0.62));
  d.meta = { R, L, ground, n1, n2, n5, m1 };
  return d;
}

// Dimension lines, centreline and grade line for the hero elevation.
export function heroAnnotations(meta) {
  const d = new Draft();
  const { R, L, ground, n5 } = meta;
  const yDim = 1.68;
  const arrow = (tip, dir, side) => {
    const back = tip.clone().addScaledVector(dir, 0.13);
    d.seg(tip, back.clone().addScaledVector(side, 0.045));
    d.seg(tip, back.clone().addScaledVector(side, -0.045));
  };
  // Tangent-to-tangent length.
  d.seg(V(-L / 2, R + 0.1, 0), V(-L / 2, yDim + 0.1, 0));
  d.seg(V(L / 2, R + 0.1, 0), V(L / 2, yDim + 0.1, 0));
  d.seg(V(-L / 2, yDim, 0), V(L / 2, yDim, 0));
  arrow(V(-L / 2, yDim, 0), V(1, 0, 0), UP);
  arrow(V(L / 2, yDim, 0), V(-1, 0, 0), UP);
  // Diameter.
  const xd = -L / 2 - R / 2 - 0.5;
  d.seg(V(-L / 2 - 0.05, R, 0), V(xd - 0.1, R, 0));
  d.seg(V(-L / 2 - 0.05, -R, 0), V(xd - 0.1, -R, 0));
  d.seg(V(xd, -R, 0), V(xd, R, 0));
  arrow(V(xd, R, 0), V(0, -1, 0), V(1, 0, 0));
  arrow(V(xd, -R, 0), V(0, 1, 0), V(1, 0, 0));
  // Nozzle leader with a shoulder long enough to carry its note.
  const leaderEnd = V(n5.x + 0.32, 0.72, 0);
  d.seg(n5.clone().add(V(0.02, 0.1, 0)), leaderEnd);
  d.seg(leaderEnd, leaderEnd.clone().add(V(1.0, 0, 0)));
  // Centreline and grade.
  d.chain(V(-L / 2 - R / 2 - 0.35, 0, 0), V(n5.x + 0.35, 0, 0));
  d.chain(V(-1.6, ground - 0.25, 0), V(-1.6, R + 0.25, 0));
  d.chain(V(1.6, ground - 0.25, 0), V(1.6, R + 0.25, 0));
  d.seg(V(-3.1, ground, 0), V(3.1, ground, 0));
  for (let x = -3.0; x <= 3.05; x += 0.16) d.seg(V(x, ground, 0), V(x - 0.1, ground - 0.1, 0));

  return {
    lines: d.lines,
    labels: {
      length: V(0, yDim, 0),
      diameter: V(xd, 0, 0),
      nozzle: leaderEnd.clone(),
    },
  };
}

/* ------------------------------------------------------------------ */
/* 02 — Cladded pressure vessel, quarter section showing the cladding  */
/* ------------------------------------------------------------------ */
export function claddedVessel() {
  const d = new Draft();
  const R = 0.72;
  const L = 3.4;
  const wall = 0.12;
  const clad = 0.045;
  const c0 = -0.85;
  const c1 = 0.55;
  shellX(d, R, -L / 2, c0);
  shellX(d, R, c1, L / 2);
  // Cut-away span: outer and clad surfaces at 270°, missing the quadrant facing the viewer.
  const cut = (r, opts) =>
    d.add(
      new THREE.CylinderGeometry(r, r, c1 - c0, 54, 1, true, 0, Math.PI * 1.5)
        .translate(0, (c1 - c0) / 2, 0)
        .rotateZ(-Math.PI / 2)
        .translate(c0, 0, 0),
      opts,
    );
  cut(R, { hull: true });
  cut(R - wall, { hull: false });
  // Section faces (horizontal and vertical cut planes).
  const faceH = new THREE.PlaneGeometry(c1 - c0, wall).rotateX(-Math.PI / 2).translate((c0 + c1) / 2, 0, R - wall / 2);
  const faceV = new THREE.PlaneGeometry(c1 - c0, wall).translate((c0 + c1) / 2, R - wall / 2, 0);
  d.add(faceH, { hull: false });
  d.add(faceV, { hull: false });
  for (const x of [c0, c1]) {
    const ring = new THREE.RingGeometry(R - wall, R, 12, 1, 0, Math.PI / 2).rotateY(-Math.PI / 2).translate(x, 0, 0);
    d.add(ring, { hull: false });
  }
  // Base metal hatched at 45°, cladding cross-hatched finer — the drafting convention.
  const base0 = R - wall + clad;
  d.hatch(c0, c1, base0, R, 0.06, (u, v) => V(u, 0.001, v));
  d.hatch(c0, c1, R - wall, base0, 0.022, (u, v) => V(u, 0.001, v), -1);
  d.hatch(c0, c1, base0, R, 0.06, (u, v) => V(u, v, 0.001));
  d.hatch(c0, c1, R - wall, base0, 0.022, (u, v) => V(u, v, 0.001), -1);
  d.seg(V(c0, 0.001, base0), V(c1, 0.001, base0));
  d.seg(V(c0, base0, 0.001), V(c1, base0, 0.001));

  headX(d, R, -L / 2, -1);
  // Body flange pair and bolted cover on the right.
  const fR = R + 0.16;
  d.add(orient(cylinder(fR, 0.09, false, 64), V(L / 2 - 0.09, 0, 0), V(1, 0, 0)));
  d.add(orient(cylinder(fR, 0.09, false, 64), V(L / 2 + 0.002, 0, 0), V(1, 0, 0)));
  d.add(orient(cylinder(R, 0.08, true, 64), V(L / 2 + 0.09, 0, 0), V(1, 0, 0)));
  headX(d, R, L / 2 + 0.17, 1);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    d.add(orient(cylinder(0.018, 0.3, false, 6), V(L / 2 - 0.14, Math.cos(a) * (R + 0.09), Math.sin(a) * (R + 0.09)), V(1, 0, 0)), { kind: "dark", edges: false, hull: false });
  }
  const n1 = nozzle(d, V(-1.2, R, 0), UP, { r: 0.1, len: 0.4, fr: 0.2 });
  nozzle(d, V(1.05, R, 0), UP, { r: 0.08, len: 0.36, fr: 0.17 });
  saddle(d, -1.15, R, 1.3, 0.32);
  saddle(d, 1.1, R, 1.3, 0.32);
  d.anchor("Cladding (process side)", V(-0.2, R - wall + clad / 2, 0.02));
  d.anchor("Base metal", V(0.25, 0.02, R - 0.03));
  d.anchor("Body flange", V(L / 2, R + 0.12, 0.25));
  d.anchor("Nozzle", n1);
  d.anchor("Saddle", V(-1.15, -R - 0.16, 0.55));
  return d;
}

/* ------------------------------------------------------------------ */
/* 03 — Shell-and-tube heat exchanger, tube sheet exposed              */
/* ------------------------------------------------------------------ */
export function heatExchanger() {
  const d = new Draft();
  const R = 0.55;
  const L = 3.2;
  shellX(d, R, -L / 2, L / 2);
  seamX(d, R, 0);
  // Channel and channel head on the left.
  const fR = R + 0.12;
  d.add(orient(cylinder(fR, 0.08, false, 60), V(-L / 2 - 0.08, 0, 0), V(1, 0, 0)));
  d.add(orient(cylinder(fR, 0.08, false, 60), V(-L / 2 - 0.17, 0, 0), V(1, 0, 0)));
  shellX(d, R, -L / 2 - 0.75, -L / 2 - 0.17);
  headX(d, R, -L / 2 - 0.75, -1);
  const c1 = nozzle(d, V(-L / 2 - 0.46, R, 0), UP, { r: 0.12, len: 0.34, fr: 0.22 });
  nozzle(d, V(-L / 2 - 0.46, -R, 0), V(0, -1, 0), { r: 0.12, len: 0.3, fr: 0.22 });
  // Tube sheet on the right, face exposed.
  const ts = L / 2 + 0.02;
  d.add(orient(cylinder(fR, 0.1, false, 64), V(ts - 0.02, 0, 0), V(1, 0, 0)));
  const face = ts + 0.081;
  const pitch = 0.064;
  for (let y = -R + 0.07; y <= R - 0.07; y += pitch * 0.866) {
    const row = Math.round((y + R) / (pitch * 0.866));
    for (let z = -R + 0.07 + (row % 2) * (pitch / 2); z <= R - 0.07; z += pitch) {
      if (y * y + z * z < (R - 0.08) ** 2) d.circle(V(face, y, z), V(1, 0, 0), 0.02, 10);
    }
  }
  const s1 = nozzle(d, V(1.0, R, 0), UP, { r: 0.13, len: 0.32, fr: 0.23 });
  nozzle(d, V(-0.9, -R, 0), V(0, -1, 0), { r: 0.13, len: 0.24, fr: 0.23 });
  saddle(d, -0.95, R, 1.05, 0.3, 0.05);
  saddle(d, 1.15, R, 1.05, 0.3, 0.05);
  d.anchor("Shell", V(0.3, R * 0.5, R * 0.866));
  d.anchor("Tube sheet", V(face, -0.2, 0.25));
  d.anchor("Channel", V(-L / 2 - 0.5, -0.2, R * 0.95));
  d.anchor("Shell nozzle", s1);
  d.anchor("Saddle", V(1.15, -R - 0.14, 0.45));
  return d;
}

/* ------------------------------------------------------------------ */
/* 04 — U-tube bundle                                                  */
/* ------------------------------------------------------------------ */
export function uTubeBundle() {
  const d = new Draft();
  const BR = 0.5;
  const x0 = -1.55;
  const x1 = 1.4;
  d.add(orient(cylinder(BR + 0.12, 0.1, false, 64), V(x0 - 0.1, 0, 0), V(1, 0, 0)));
  const tubes = [];
  for (const z of [-0.3, -0.1, 0.1, 0.3]) {
    const max = Math.sqrt(BR * BR - z * z) - 0.06;
    for (let r = 0.08; r <= max; r += 0.085) {
      const path = new THREE.CurvePath();
      path.add(new THREE.LineCurve3(V(x0, r, z), V(x1, r, z)));
      const bend = new THREE.EllipseCurve(0, 0, r, r, Math.PI / 2, -Math.PI / 2, true);
      const pts = bend.getPoints(18).map((p) => V(x1 + p.x, p.y, z));
      path.add(new THREE.CatmullRomCurve3(pts));
      path.add(new THREE.LineCurve3(V(x1, -r, z), V(x0, -r, z)));
      tubes.push(new THREE.TubeGeometry(path, 96, 0.022, 6, false));
    }
  }
  for (const t of tubes) d.add(t, { edges: false, hull: true });
  // Segmental baffles, cuts alternating top and bottom.
  [-0.85, -0.1, 0.65].forEach((x, i) => {
    const s = new THREE.Shape();
    const cutA = i % 2 ? Math.PI * 0.2 : Math.PI * 1.2;
    s.absarc(0, 0, BR + 0.04, cutA, cutA + Math.PI * 1.6, false);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false, curveSegments: 48 });
    g.rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(x, 0, 0);
    d.add(g);
  });
  for (const [y, z] of [[0.36, 0.3], [-0.36, -0.3]]) {
    d.add(orient(cylinder(0.014, x1 - x0 - 0.2, false, 8), V(x0, y, z), V(1, 0, 0)), { edges: false });
  }
  // Workshop stands.
  for (const x of [-0.85, 0.65]) {
    d.add(new THREE.BoxGeometry(0.1, 0.3, 0.9).translate(x, -BR - 0.2, 0), { kind: "dark" });
  }
  d.anchor("U-tubes", V(x1 + 0.3, 0.22, 0.3));
  d.anchor("Tube sheet", V(x0 - 0.05, BR + 0.06, 0.2));
  d.anchor("Baffle plate", V(-0.1, -0.2, BR * 0.7));
  return d;
}

/* ------------------------------------------------------------------ */
/* 05 — Jacketed reactor with top-mounted drive                        */
/* ------------------------------------------------------------------ */
export function reactor() {
  const d = new Draft();
  const R = 0.66;
  const y0 = -0.75;
  const y1 = 0.7;
  d.add(cylinder(R, y1 - y0, true, 72).translate(0, y0, 0));
  d.add(dome(R, R / 2).translate(0, y1, 0));
  d.add(dome(R, R / 2).rotateX(Math.PI).translate(0, y0, 0));
  // Jacket over the lower shell.
  const J = R + 0.07;
  d.add(cylinder(J, 0.95, true, 72).translate(0, y0 - 0.05, 0));
  d.add(new THREE.RingGeometry(R, J, 72).rotateX(-Math.PI / 2).translate(0, y0 + 0.9, 0), { hull: false });
  d.add(new THREE.RingGeometry(R - 0.1, J, 72).rotateX(Math.PI / 2).translate(0, y0 - 0.05, 0), { hull: false });
  nozzle(d, V(J - 0.02, y0 + 0.75, 0), V(1, 0, 0), { r: 0.05, len: 0.18, fr: 0.1, bolts: 4 });
  nozzle(d, V(0, y0 + 0.05, J - 0.02), V(0, 0, 1), { r: 0.05, len: 0.18, fr: 0.1, bolts: 4 });
  // Drive stack.
  const top = y1 + R / 2;
  const nTop = nozzle(d, V(0, top - 0.04, 0), UP, { r: 0.14, len: 0.16, fr: 0.24 });
  d.add(cylinder(0.12, 0.2, false, 32).translate(0, nTop.y, 0));
  d.add(new THREE.BoxGeometry(0.36, 0.28, 0.36).translate(0, nTop.y + 0.34, 0), { kind: "dark" });
  d.add(cylinder(0.13, 0.42, false, 40).translate(0, nTop.y + 0.48, 0), { kind: "dark" });
  for (const a of [0.6, 2.2, 3.6, 5.0]) {
    const x = Math.cos(a) * 0.42;
    const z = Math.sin(a) * 0.42;
    const yOn = y1 + (R / 2) * Math.sqrt(Math.max(0, 1 - (0.42 / R) ** 2));
    nozzle(d, V(x, yOn - 0.03, z), UP, { r: a === 3.6 ? 0.16 : 0.07, len: 0.22, fr: a === 3.6 ? 0.26 : 0.13, bolts: 8 });
  }
  nozzle(d, V(0, y0 - R / 2 + 0.03, 0), V(0, -1, 0), { r: 0.08, len: 0.18, fr: 0.15 });
  // Legs.
  const yg = y0 - R / 2 - 0.42;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const x = Math.cos(a) * (J + 0.06);
    const z = Math.sin(a) * (J + 0.06);
    d.add(cylinder(0.045, y0 + 0.2 - yg, false, 16).translate(x, yg, z), { kind: "dark" });
    d.add(new THREE.BoxGeometry(0.2, 0.025, 0.2).translate(x, yg, z), { kind: "dark" });
  }
  d.anchor("Drive", V(0.13, nTop.y + 0.62, 0.1));
  d.anchor("Top head", V(0.3, y1 + 0.24, 0.3));
  d.anchor("Jacket", V(J * 0.7, y0 + 0.3, J * 0.7));
  d.anchor("Nozzles", V(Math.cos(3.6) * 0.42, y1 + 0.55, Math.sin(3.6) * 0.42));
  d.anchor("Support leg", V(Math.cos(Math.PI / 4) * (J + 0.06), yg + 0.3, Math.sin(Math.PI / 4) * (J + 0.06)));
  return d;
}

/* ------------------------------------------------------------------ */
/* 06 — Pressure piping spool                                           */
/* ------------------------------------------------------------------ */
export function pipingSpool() {
  const d = new Draft();
  const r = 0.11;
  const path = new THREE.CurvePath();
  const A = V(-1.8, -0.55, 0.2);
  const B = V(-0.2, -0.55, 0.2);
  const C = V(0.3, -0.05, 0.2);
  const D = V(0.3, 0.45, 0.2);
  const E = V(0.8, 0.95, 0.2);
  const F = V(1.75, 0.95, 0.2);
  path.add(new THREE.LineCurve3(A, B));
  path.add(new THREE.QuadraticBezierCurve3(B, V(0.3, -0.55, 0.2), C));
  path.add(new THREE.LineCurve3(C, D));
  path.add(new THREE.QuadraticBezierCurve3(D, V(0.3, 0.95, 0.2), E));
  path.add(new THREE.LineCurve3(E, F));
  d.add(new THREE.TubeGeometry(path, 160, r, 28, false), { edges: false });
  const fl = (p, dir) => d.add(orient(cylinder(0.22, 0.06, false, 44), p, dir));
  fl(A.clone().add(V(-0.06, 0, 0)), V(1, 0, 0));
  fl(F.clone().add(V(0, 0, 0)), V(1, 0, 0));
  // Flanged joint mid-run.
  fl(V(-1.0, -0.55, 0.2), V(1, 0, 0));
  fl(V(-0.94, -0.55, 0.2), V(1, 0, 0));
  // Girth welds at the bend ends.
  for (const p of [B, C, D, E]) {
    const t = p === B || p === E ? V(1, 0, 0) : UP;
    d.circle(p, t, r + 0.004, 32);
  }
  // Branch tee.
  const branchTop = nozzle(d, V(-0.55, -0.55, 0.2 + r - 0.02), V(0, 0, 1), { r: 0.065, len: 0.42, fr: 0.14, bolts: 6 });
  // Pipe supports.
  d.add(new THREE.BoxGeometry(0.08, 0.5, 0.36).translate(-1.4, -0.92, 0.2), { kind: "dark" });
  d.add(new THREE.BoxGeometry(0.36, 0.08, 0.36).translate(-0.06, -1.1, 0.2), { kind: "dark" });
  d.add(cylinder(0.04, 0.4, false, 12).translate(-0.06, -1.06, 0.2), { kind: "dark" });
  d.anchor("Pipe spool", V(0.3 + r * 0.7, 0.22, 0.2 + r * 0.7));
  d.anchor("Long-radius bend", V(0.18, -0.4, 0.2 + r));
  d.anchor("Branch", branchTop);
  d.anchor("Flanged joint", V(-0.97, -0.33, 0.25));
  return d;
}

/* ------------------------------------------------------------------ */
/* 07 — Stiffened rectangular tank                                      */
/* ------------------------------------------------------------------ */
export function tank() {
  const d = new Draft();
  const W = 2.4;
  const H = 1.2;
  const D = 1.2;
  d.add(new THREE.BoxGeometry(W, H, D));
  const s = 0.05;
  for (const y of [-0.22, 0.28]) {
    d.add(new THREE.BoxGeometry(W + s * 2, 0.06, s).translate(0, y, D / 2 + s / 2), { kind: "dark" });
    d.add(new THREE.BoxGeometry(W + s * 2, 0.06, s).translate(0, y, -D / 2 - s / 2), { kind: "dark" });
    d.add(new THREE.BoxGeometry(s, 0.06, D).translate(W / 2 + s / 2, y, 0), { kind: "dark" });
    d.add(new THREE.BoxGeometry(s, 0.06, D).translate(-W / 2 - s / 2, y, 0), { kind: "dark" });
  }
  for (const x of [-0.6, 0, 0.6]) {
    d.add(new THREE.BoxGeometry(0.06, H, s).translate(x, 0, D / 2 + s / 2), { kind: "dark" });
    d.add(new THREE.BoxGeometry(0.06, H, s).translate(x, 0, -D / 2 - s / 2), { kind: "dark" });
  }
  const man = nozzle(d, V(-0.6, H / 2 - 0.02, 0), UP, { r: 0.24, len: 0.12, fr: 0.32, blind: true, bolts: 12 });
  nozzle(d, V(0.75, H / 2 - 0.02, 0.2), UP, { r: 0.06, len: 0.2, fr: 0.12, bolts: 6 });
  const out = nozzle(d, V(W / 2 - 0.02, -H / 2 + 0.2, 0), V(1, 0, 0), { r: 0.08, len: 0.22, fr: 0.16 });
  for (const z of [-0.4, 0.4]) {
    d.add(new THREE.BoxGeometry(W + 0.2, 0.12, 0.12).translate(0, -H / 2 - 0.06, z), { kind: "dark" });
  }
  d.anchor("Tank shell", V(-0.3, 0.05, D / 2));
  d.anchor("Stiffener", V(0.6, 0.28, D / 2 + s));
  d.anchor("Top manhole", man);
  d.anchor("Outlet nozzle", out);
  return d;
}

export const models = {
  "01": pressureVessel,
  "02": claddedVessel,
  "03": heatExchanger,
  "04": uTubeBundle,
  "05": reactor,
  "06": pipingSpool,
  "07": tank,
};

// Turns a draft into fill meshes, a silhouette hull and pen lines.
export function assemble(draft, materials) {
  const group = new THREE.Group();
  const byKind = new Map();
  for (const part of draft.parts) {
    if (!byKind.has(part.kind)) byKind.set(part.kind, []);
    byKind.get(part.kind).push(part.geometry);
  }
  for (const [kind, geometries] of byKind) {
    const mesh = new THREE.Mesh(mergeGeometries(geometries), materials.fill[kind] ?? materials.fill.body);
    group.add(mesh);
  }
  const hullParts = draft.parts.filter((p) => p.hull).map((p) => p.geometry);
  if (hullParts.length) {
    const hull = new THREE.Mesh(mergeGeometries(hullParts), materials.hull);
    hull.renderOrder = 1;
    group.add(hull);
  }
  if (draft.lines.length) {
    const lines = penLines(draft.lines, materials.pen);
    lines.renderOrder = 2;
    group.add(lines);
  }
  const box = new THREE.Box3();
  for (const child of group.children) if (child.isMesh) box.expandByObject(child);
  return { group, anchors: draft.anchors, box };
}
