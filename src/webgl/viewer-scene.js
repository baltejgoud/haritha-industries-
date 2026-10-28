// Sheet 02 viewer: each product line as a rotating hidden-line drawing with
// balloon callouts. Switching products re-plots the sheet bottom to top.
import * as THREE from "three";
import {
  createDraftUniforms,
  createFillMaterial,
  createHullMaterial,
  createPenMaterial,
} from "./drafting.js";
import { assemble, models } from "./equipment.js";

const SHEET = 0xeeece6;
const INK = 0x151515;
const SVG_NS = "http://www.w3.org/2000/svg";
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createViewerScene(container, balloonSvg, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  const resolution = new THREE.Vector2(1, 1);
  const pens = [];
  const cache = new Map();

  function build(id) {
    if (cache.has(id)) return cache.get(id);
    const uniforms = createDraftUniforms({ paper: SHEET, ink: INK, axis: [0, 1, 0] });
    const pen = createPenMaterial(uniforms, resolution, { width: 1.1, followFront: false });
    pens.push(pen);
    const fillOptions = { color: 0xffffff };
    const materials = {
      fill: {
        body: createFillMaterial(uniforms, fillOptions),
        dark: createFillMaterial(uniforms, fillOptions),
      },
      hull: createHullMaterial(uniforms, resolution, 1.15),
      pen,
    };
    for (const m of Object.values(materials.fill)) m.side = THREE.DoubleSide;
    const assembled = assemble(models[id](), materials);
    const center = assembled.box.getCenter(new THREE.Vector3());
    const size = assembled.box.getSize(new THREE.Vector3());
    const pivot = new THREE.Group();
    assembled.group.position.copy(center).multiplyScalar(-1);
    pivot.add(assembled.group);
    const entry = {
      id,
      pivot,
      uniforms,
      anchors: assembled.anchors,
      offset: center.clone().multiplyScalar(-1),
      radius: Math.max(size.x, size.y, size.z) * 0.56,
      min: assembled.box.min.y - 0.05,
      max: assembled.box.max.y + 0.05,
    };
    cache.set(id, entry);
    return entry;
  }

  let active = null;
  let leaving = null;
  let sweepStart = 0;
  const SWEEP = reducedMotion ? 0 : 950;
  let dragYaw = 0;
  let dragVelocity = 0;
  let dragging = false;
  let lastX = 0;
  let width = 1;
  let height = 1;
  const clock = { start: performance.now() };

  // Fit to the part of the sheet above the photo plate and parts list.
  function fit(entry) {
    // Compact (sticky) sheets only lose a strip at the bottom to the parts legend.
    const usable = height < 520 ? 0.8 : 0.7;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const fov = Math.min(vFov * usable, hFov * 0.92);
    const distance = entry.radius / Math.sin(fov / 2);
    const pitch = 0.38;
    camera.position.set(0, Math.sin(pitch) * distance, Math.cos(pitch) * distance);
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(width, height, 0, height * (1 - usable) * 0.42, width, height);
    camera.updateProjectionMatrix();
  }

  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    resolution.set(width, height);
    for (const m of pens) m.resolution = resolution;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (active) fit(active);
  }

  // Balloon callouts: numbered circles on leaders, as on a GA drawing.
  const balloons = [];
  function setBalloons(entry) {
    balloonSvg.replaceChildren();
    balloons.length = 0;
    if (!entry) return;
    entry.anchors.forEach((anchor, index) => {
      const g = document.createElementNS(SVG_NS, "g");
      const line = document.createElementNS(SVG_NS, "line");
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("r", "2.2");
      dot.setAttribute("class", "balloon-dot");
      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("r", "11");
      circle.setAttribute("class", "balloon");
      const text = document.createElementNS(SVG_NS, "text");
      text.textContent = String(index + 1);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      g.append(line, dot, circle, text);
      balloonSvg.append(g);
      balloons.push({ anchor, g, line, dot, circle, text });
    });
  }

  const v = new THREE.Vector3();
  const centerScreen = new THREE.Vector3();
  function placeBalloons(opacity) {
    if (!active) return;
    centerScreen.set(0, 0, 0).project(camera);
    const cx = (centerScreen.x * 0.5 + 0.5) * width;
    const cy = (-centerScreen.y * 0.5 + 0.5) * height;
    for (const b of balloons) {
      v.copy(b.anchor.position).add(active.offset).applyAxisAngle(THREE.Object3D.DEFAULT_UP, active.pivot.rotation.y).project(camera);
      const x = (v.x * 0.5 + 0.5) * width;
      const y = (-v.y * 0.5 + 0.5) * height;
      let dx = x - cx;
      let dy = y - cy;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const reach = Math.min(64, width * 0.09);
      const bx = Math.min(width - 16, Math.max(16, x + dx * reach));
      const by = Math.min(height - 16, Math.max(16, y + dy * reach));
      b.line.setAttribute("x1", x.toFixed(1));
      b.line.setAttribute("y1", y.toFixed(1));
      b.line.setAttribute("x2", (bx - dx * 11).toFixed(1));
      b.line.setAttribute("y2", (by - dy * 11).toFixed(1));
      b.dot.setAttribute("cx", x.toFixed(1));
      b.dot.setAttribute("cy", y.toFixed(1));
      b.circle.setAttribute("cx", bx.toFixed(1));
      b.circle.setAttribute("cy", by.toFixed(1));
      b.text.setAttribute("x", bx.toFixed(1));
      b.text.setAttribute("y", by.toFixed(1));
    }
    balloonSvg.style.opacity = opacity.toFixed(3);
  }

  let frameId = 0;
  let visible = false;
  let last = performance.now();

  function tick(now) {
    frameId = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - clock.start) / 1000;

    let sweepT = 1;
    if (SWEEP && sweepStart) {
      sweepT = Math.min(1, (now - sweepStart) / SWEEP);
      const e = easeInOut(sweepT);
      if (active) active.uniforms.uDraw.value = active.min + (active.max - active.min) * e;
      if (leaving) leaving.uniforms.uErase.value = leaving.min + (leaving.max - leaving.min) * e;
      if (sweepT >= 1) {
        sweepStart = 0;
        if (active) active.uniforms.uDraw.value = 1e4;
        if (leaving) {
          scene.remove(leaving.pivot);
          leaving.uniforms.uErase.value = -1e4;
          leaving = null;
        }
      }
    }

    if (!dragging) {
      dragVelocity *= Math.pow(0.04, dt);
      dragYaw += dragVelocity * dt;
    }
    const idle = reducedMotion ? 0 : Math.sin(t * 0.32) * 0.3;
    const yaw = -0.62 + idle + dragYaw;
    if (active) active.pivot.rotation.y = yaw;
    if (leaving) leaving.pivot.rotation.y = yaw;

    renderer.render(scene, camera);
    placeBalloons(sweepT < 1 ? 0 : 1);

    if (visible && !reducedMotion) frameId = requestAnimationFrame(tick);
    else if (visible && (sweepStart || dragging || Math.abs(dragVelocity) > 0.01)) frameId = requestAnimationFrame(tick);
  }

  function wake() {
    if (frameId || !visible) return;
    last = performance.now();
    frameId = requestAnimationFrame(tick);
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();
    wake();
  });
  resizeObserver.observe(container);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
  });
  io.observe(container);

  // Drag to rotate, with a little inertia on release.
  const surface = container.parentElement;
  surface.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    lastX = event.clientX;
    dragVelocity = 0;
    surface.setPointerCapture(event.pointerId);
    surface.classList.add("is-dragging");
    wake();
  });
  surface.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    lastX = event.clientX;
    dragYaw += dx * 0.01;
    dragVelocity = dx * 0.6;
    wake();
  });
  const endDrag = () => {
    dragging = false;
    surface.classList.remove("is-dragging");
  };
  surface.addEventListener("pointerup", endDrag);
  surface.addEventListener("pointercancel", endDrag);

  resize();
  container.classList.add("is-live");

  return {
    show(id) {
      const next = id && models[id] ? build(id) : null;
      if (next === active) return;
      if (leaving) {
        scene.remove(leaving.pivot);
        leaving.uniforms.uErase.value = -1e4;
      }
      leaving = active;
      active = next;
      if (active) {
        active.uniforms.uErase.value = -1e4;
        active.uniforms.uDraw.value = SWEEP ? active.min : 1e4;
        scene.add(active.pivot);
        fit(active);
      }
      if (!SWEEP && leaving) {
        scene.remove(leaving.pivot);
        leaving = null;
      }
      setBalloons(active);
      sweepStart = SWEEP ? performance.now() : 0;
      wake();
      return active ? active.anchors.map((a) => a.name) : [];
    },
    dispose() {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      io.disconnect();
      renderer.dispose();
    },
  };
}
