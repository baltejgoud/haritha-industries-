// Drafting materials: one shared set of uniforms lets a model be a pen drawing,
// welded steel, or anything between. Every part's geometry is baked into model
// space, so `position` is the coordinate the weld front and plotter sweep use.
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

const HUGE = 1e4;

export function createDraftUniforms({ paper, ink, axis = [1, 0, 0] }) {
  return {
    uPaper: { value: srgb(paper) },
    uInk: { value: srgb(ink) },
    uGlow: { value: new THREE.Vector3(1.0, 0.52, 0.16) },
    uAxis: { value: new THREE.Vector3(...axis) },
    // Steel where sweep coordinate < uFront; paper drawing beyond it.
    uFront: { value: -HUGE },
    uBand: { value: 0.55 },
    uHeat: { value: 0 },
    // Plotter sweep: visible only where uErase < coordinate < uDraw.
    uDraw: { value: HUGE },
    uErase: { value: -HUGE },
    uLineOpacity: { value: 1 },
  };
}

// Raw sRGB values: the paper fill is composited after tone mapping so it
// matches the CSS background exactly.
function srgb(hex) {
  return new THREE.Vector3(
    ((hex >> 16) & 255) / 255,
    ((hex >> 8) & 255) / 255,
    (hex & 255) / 255,
  );
}

const sweepPars = /* glsl */ `
  uniform vec3 uAxis;
  uniform float uFront, uBand, uHeat, uDraw, uErase, uLineOpacity;
  uniform vec3 uPaper, uInk, uGlow;
  varying float vSweep;
`;

// Lit steel that resolves to flat paper beyond the weld front.
export function createFillMaterial(uniforms, options = {}) {
  const material = new THREE.MeshStandardMaterial({
    color: options.color ?? 0x9c3b28,
    roughness: options.roughness ?? 0.6,
    metalness: options.metalness ?? 0.18,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${sweepPars}`)
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvSweep = dot(position, uAxis);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${sweepPars}`)
      .replace(
        "#include <dithering_fragment>",
        /* glsl */ `#include <dithering_fragment>
        if (vSweep > uDraw || vSweep < uErase) discard;
        float solid = 1.0 - smoothstep(uFront - 0.012, uFront + 0.012, vSweep);
        float behind = max(uFront - vSweep, 0.0);
        float hz = 1.0 - clamp(behind / uBand, 0.0, 1.0);
        float heat = solid * hz * hz * uHeat;
        vec3 hot = mix(vec3(0.42, 0.06, 0.02), uGlow, hz * hz);
        vec3 metal = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.35 + hot * 1.45, heat);
        float seam = (1.0 - smoothstep(0.0, 0.03, abs(vSweep - uFront))) * uHeat;
        metal += vec3(1.0, 0.86, 0.6) * seam;
        gl_FragColor.rgb = mix(uPaper, metal, solid);`,
      );
  };
  material.customProgramCacheKey = () => "draft-fill";
  return material;
}

// Inverted-hull silhouette: back faces pushed out a constant pixel width.
export function createHullMaterial(uniforms, resolution, width = 1.25) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    uniforms: {
      ...uniforms,
      uWidth: { value: width },
      uRes: { value: resolution },
    },
    vertexShader: /* glsl */ `
      ${sweepPars}
      uniform float uWidth;
      uniform vec2 uRes;
      void main() {
        vSweep = dot(position, uAxis);
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 viewNormal = normalize(normalMatrix * normal);
        vec2 dir = (projectionMatrix * vec4(viewNormal, 0.0)).xy;
        float len = length(dir);
        if (len > 1e-5) clip.xy += (dir / len) * uWidth * 2.0 / uRes * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: /* glsl */ `
      ${sweepPars}
      void main() {
        if (vSweep > uDraw || vSweep < uErase) discard;
        float solid = 1.0 - smoothstep(uFront - 0.04, uFront + 0.04, vSweep);
        float alpha = uLineOpacity * (1.0 - solid);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(uInk, alpha);
      }`,
  });
}

// Fat pen lines (crease edges, dimensions) that share the sweep logic.
export function createPenMaterial(uniforms, resolution, options = {}) {
  const material = new LineMaterial({
    color: options.color ?? 0x141414,
    linewidth: options.width ?? 1.2,
    transparent: true,
    opacity: options.opacity ?? 1,
    depthWrite: false,
    dashed: false,
  });
  material.resolution = resolution;
  const followFront = options.followFront ?? true;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${sweepPars}`)
      .replace(
        "void main() {",
        "void main() {\nvSweep = dot(( position.y < 0.5 ) ? instanceStart : instanceEnd, uAxis);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${sweepPars}`)
      .replace(
        "gl_FragColor = vec4( diffuseColor.rgb, alpha );",
        /* glsl */ `if (vSweep > uDraw || vSweep < uErase) discard;
        float solid = ${followFront ? "1.0 - smoothstep(uFront - 0.04, uFront + 0.04, vSweep)" : "0.0"};
        gl_FragColor = vec4( diffuseColor.rgb, alpha * uLineOpacity * (1.0 - solid) );`,
      );
  };
  material.customProgramCacheKey = () =>
    "draft-pen-" + (followFront ? "f" : "s");
  return material;
}

export function penLines(positions, material) {
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  return new LineSegments2(geometry, material);
}
