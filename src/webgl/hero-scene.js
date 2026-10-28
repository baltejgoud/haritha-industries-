// Sheet 01: a general-arrangement elevation that scrolling welds into steel.
// A dolly zoom carries the camera from a near-orthographic drawing view into a
// perspective three-quarter view while the weld front crosses the vessel.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  createDraftUniforms,
  createFillMaterial,
  createHullMaterial,
  createPenMaterial,
  penLines,
} from "./drafting.js";
import { assemble, heroAnnotations, pressureVessel } from "./equipment.js";

const PAPER = 0xe7e4dd;
const INK = 0x151515;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createHeroScene(container, labelRoot, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xfff0dc, 1.9);
  key.position.set(4, 7, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc9d6e6, 0.6);
  fill.position.set(-6, 2, -3);
  scene.add(fill);

  const resolution = new THREE.Vector2(1, 1);
  const uniforms = createDraftUniforms({ paper: PAPER, ink: INK });
  const pens = [];
  const pen = (u, o) => {
    const m = createPenMaterial(u, resolution, o);
    pens.push(m);
    return m;
  };
  const materials = {
    fill: {
      body: createFillMaterial(uniforms, { color: 0x6c2418, roughness: 0.74, metalness: 0.1 }),
      dark: createFillMaterial(uniforms, { color: 0x34322f, roughness: 0.6, metalness: 0.45 }),
    },
    hull: createHullMaterial(uniforms, resolution, 1.35),
    pen: pen(uniforms, { width: 1.3 }),
  };

  const draft = pressureVessel();
  const vessel = assemble(draft, materials);
  const model = new THREE.Group();
  model.add(vessel.group);
  scene.add(model);
  const { R, L, ground } = draft.meta;

  // Annotation layer fades on its own, independent of the weld front.
  const annUniforms = { ...uniforms, uLineOpacity: { value: 1 } };
  const annotations = heroAnnotations(draft.meta);
  const annLines = penLines(
    annotations.lines,
    pen(annUniforms, { width: 0.95, followFront: false, opacity: 0.8 }),
  );
  annLines.renderOrder = 3;
  model.add(annLines);

  // Soft contact shadow replaces the grade line once the vessel is steel.
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 256;
  const ctx = shadowCanvas.getContext("2d");
  const gradient = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  gradient.addColorStop(0, "rgba(28,20,16,0.62)");
  gradient.addColorStop(0.55, "rgba(28,20,16,0.22)");
  gradient.addColorStop(1, "rgba(28,20,16,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  shadowTexture.colorSpace = THREE.SRGBColorSpace;
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(L + 2.6, 2.6).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      toneMapped: false,
    }),
  );
  shadow.position.y = ground + 0.004;
  model.add(shadow);

  // Sparks thrown from the weld front; emission follows scroll speed.
  const MAX_SPARKS = reducedMotion ? 0 : 180;
  const sparkPos = new Float32Array(Math.max(1, MAX_SPARKS) * 3);
  const sparkLife = new Float32Array(Math.max(1, MAX_SPARKS));
  const sparkVel = new Float32Array(Math.max(1, MAX_SPARKS) * 3);
  const sparkRate = new Float32Array(Math.max(1, MAX_SPARKS));
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  sparkGeometry.setAttribute("aLife", new THREE.BufferAttribute(sparkLife, 1));
  const sparkMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uScale: { value: 1 }, uFocal: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aLife;
      uniform float uScale;
      varying float vLife;
      void main() {
        vLife = aLife;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aLife > 0.0 ? uScale * projectionMatrix[1][1] * (0.012 + 0.03 * aLife) / -mv.z : 0.0;
      }`,
    fragmentShader: /* glsl */ `
      varying float vLife;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5 || vLife <= 0.0) discard;
        vec3 c = mix(vec3(0.95, 0.32, 0.04), vec3(1.0, 0.93, 0.7), vLife * vLife);
        gl_FragColor = vec4(c, smoothstep(0.5, 0.1, d) * min(1.0, vLife * 1.6));
      }`,
  });
  const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
  sparks.frustumCulled = false;
  sparks.renderOrder = 4;
  model.add(sparks);
  let sparkCursor = 0;
  let sparksAlive = 0;

  const minX = vessel.box.min.x - 0.05;
  const maxX = vessel.box.max.x + 0.05;
  uniforms.uDraw.value = reducedMotion ? 1e4 : minX - 0.6;

  // Camera choreography.
  const camera = new THREE.PerspectiveCamera(4, 1, 0.1, 600);
  const dirA = new THREE.Vector3(0, 0, 1);
  const target = new THREE.Vector3(0, 0.08, 0);
  let layout = { coverage: 0.62, coverageB: 0.6, shiftX: 0.03, shiftY: 0.02, shiftYB: 0, dirB: new THREE.Vector3(0.62, 0.36, 0.7).normalize() };
  let width = 1;
  let height = 1;

  const labels = [...labelRoot.querySelectorAll("[data-dim]")].map((el) => ({
    el,
    point: annotations.labels[el.dataset.dim],
  }));

  const state = { target: 0, progress: 0, pointerX: 0, pointerY: 0, px: 0, py: 0, dirty: true };
  const tmpDir = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const qA = new THREE.Quaternion();
  const qB = new THREE.Quaternion();
  const projected = new THREE.Vector3();

  function frameCamera(e) {
    qA.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirA);
    qB.setFromUnitVectors(new THREE.Vector3(0, 0, 1), layout.dirB);
    tmpQ.slerpQuaternions(qA, qB, e);
    tmpDir.set(0, 0, 1).applyQuaternion(tmpQ);
    // Pointer parallax grows as the drawing gains depth.
    const sway = 0.3 + 0.7 * e;
    tmpDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.px * 0.09 * sway);
    tmpDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), -state.py * 0.045 * sway);
    const fov = 4 * Math.pow(30 / 4, e);
    const coverage = layout.coverage + (layout.coverageB - layout.coverage) * e;
    const visibleWidth = 7.2 / coverage;
    const visibleHeight = visibleWidth / camera.aspect;
    const distance = visibleHeight / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
    camera.fov = fov;
    camera.near = Math.max(0.05, distance - 12);
    camera.far = distance + 12;
    camera.position.copy(target).addScaledVector(tmpDir, distance);
    camera.lookAt(target);
    const shiftY = layout.shiftY + (layout.shiftYB - layout.shiftY) * e;
    camera.setViewOffset(width, height, -layout.shiftX * width, -shiftY * height, width, height);
    camera.updateProjectionMatrix();
  }

  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    resolution.set(width, height);
    for (const m of pens) m.resolution = resolution;
    camera.aspect = width / height;
    const aspect = camera.aspect;
    if (aspect < 0.75) {
      layout = { coverage: 0.94, coverageB: 0.98, shiftX: 0, shiftY: -0.045, shiftYB: -0.05, dirB: new THREE.Vector3(0.82, 0.34, 0.46).normalize() };
    } else if (aspect < 1.25) {
      layout = { coverage: 0.84, coverageB: 0.8, shiftX: 0, shiftY: 0.03, shiftYB: -0.02, dirB: new THREE.Vector3(0.7, 0.36, 0.62).normalize() };
    } else {
      layout = { coverage: 0.64, coverageB: 0.58, shiftX: 0.03, shiftY: 0.035, shiftYB: -0.035, dirB: new THREE.Vector3(0.62, 0.34, 0.71).normalize() };
    }
    sparkMaterial.uniforms.uScale.value = height * 0.5 * renderer.getPixelRatio();
    state.dirty = true;
  }

  function spawnSpark(front) {
    const i = sparkCursor;
    sparkCursor = (sparkCursor + 1) % MAX_SPARKS;
    const local = camera.position.clone();
    model.worldToLocal(local);
    const facing = Math.atan2(local.y, local.z);
    const a = facing + (Math.random() - 0.5) * 1.6;
    const x = Math.min(L / 2, Math.max(-L / 2, front));
    sparkPos[i * 3] = x;
    sparkPos[i * 3 + 1] = Math.sin(a) * (R + 0.01);
    sparkPos[i * 3 + 2] = Math.cos(a) * (R + 0.01);
    const speed = 1.1 + Math.random() * 2.2;
    sparkVel[i * 3] = (Math.random() - 0.5) * 1.6;
    sparkVel[i * 3 + 1] = Math.sin(a) * speed + 0.8 + Math.random() * 1.2;
    sparkVel[i * 3 + 2] = Math.cos(a) * speed;
    sparkLife[i] = 1;
    sparkRate[i] = 1 / (0.35 + Math.random() * 0.5);
  }

  let last = performance.now();
  let lastFront = minX;
  let introStart = 0;
  let introDuration = 0;
  let running = false;
  let visible = true;
  let frameId = 0;

  function tick(now) {
    frameId = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const before = state.progress;
    state.progress += (state.target - state.progress) * Math.min(1, dt * 9);
    if (Math.abs(state.target - state.progress) < 0.0002) state.progress = state.target;
    const before2 = state.px + state.py;
    state.px += (state.pointerX - state.px) * Math.min(1, dt * 4);
    state.py += (state.pointerY - state.py) * Math.min(1, dt * 4);
    const moving = Math.abs(before - state.progress) > 1e-5 || Math.abs(before2 - state.px - state.py) > 1e-4;

    const p = state.progress;
    const e = easeInOut(smooth(0.02, 0.8, p));
    const front = minX + (maxX - minX) * smooth(0.1, 0.78, p);
    uniforms.uFront.value = front;
    uniforms.uHeat.value = smooth(0.08, 0.14, p) * (1 - smooth(0.72, 0.8, p));
    annUniforms.uLineOpacity.value = 1 - smooth(0.05, 0.26, p);
    shadow.material.opacity = smooth(0.3, 0.85, p) * 0.9;
    const labelOpacity = annUniforms.uLineOpacity.value;

    let introActive = false;
    if (introDuration) {
      const t = clamp01((now - introStart) / introDuration);
      uniforms.uDraw.value = minX - 0.6 + (maxX - minX + 1.4) * easeInOut(t);
      introActive = t < 1;
      if (!introActive) {
        uniforms.uDraw.value = 1e4;
        introDuration = 0;
      }
    }

    // Sparks.
    if (MAX_SPARKS) {
      const dFront = Math.abs(front - lastFront);
      if (uniforms.uHeat.value > 0.2 && dFront > 0.0004) {
        const count = Math.min(14, Math.ceil(dFront * 160));
        for (let i = 0; i < count; i++) spawnSpark(front);
      }
      sparksAlive = 0;
      for (let i = 0; i < MAX_SPARKS; i++) {
        if (sparkLife[i] <= 0) continue;
        sparkLife[i] -= dt * sparkRate[i];
        sparkVel[i * 3 + 1] -= 6.5 * dt;
        sparkPos[i * 3] += sparkVel[i * 3] * dt;
        sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
        sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
        if (sparkPos[i * 3 + 1] < ground) {
          sparkPos[i * 3 + 1] = ground;
          sparkVel[i * 3 + 1] *= -0.3;
        }
        if (sparkLife[i] > 0) sparksAlive++;
      }
      sparkGeometry.attributes.position.needsUpdate = true;
      sparkGeometry.attributes.aLife.needsUpdate = true;
    }
    lastFront = front;

    frameCamera(e);
    renderer.render(scene, camera);

    for (const label of labels) {
      projected.copy(label.point).applyMatrix4(model.matrixWorld).project(camera);
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      label.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      label.el.style.opacity = (labelOpacity * (introDuration ? 0 : 1)).toFixed(3);
    }

    state.dirty = false;
    if (running && visible && (moving || introActive || sparksAlive > 0 || state.progress !== state.target)) {
      frameId = requestAnimationFrame(tick);
    }
  }

  function wake() {
    if (!running || !visible || frameId) return;
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
  const onVisibility = () => {
    if (!document.hidden) wake();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const onPointer = (event) => {
    state.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    state.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    wake();
  };
  if (finePointer && !reducedMotion) window.addEventListener("pointermove", onPointer, { passive: true });

  resize();
  running = true;
  container.classList.add("is-live");
  // The pen plots the elevation once, left to right, as the page settles.
  if (!reducedMotion) {
    introStart = performance.now() + 250;
    introDuration = 1800;
  }
  wake();

  return {
    setProgress(value) {
      state.target = clamp01(value);
      if (reducedMotion) state.progress = state.target;
      wake();
    },
    intro(duration = 1700) {
      if (reducedMotion) return;
      introStart = performance.now();
      introDuration = duration;
      wake();
    },
    dispose() {
      running = false;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      renderer.dispose();
      renderer.domElement.remove();
      container.classList.remove("is-live");
    },
  };
}
