// Pointer craft for fine pointers: a CAD crosshair whose pick box snaps to
// whatever it can act on, ruler guides in the sheet frame, magnetic primary
// buttons, an inspection loupe on shop-floor photos and tilting certificates.
import gsap from "gsap";

const base = import.meta.env.BASE_URL;

export function initInteractions({ reducedMotion }) {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!fine) return;
  frameGuides();
  loupes(reducedMotion);
  if (reducedMotion) return;
  cadCursor();
  magnetic();
  tilt();
}

function frameGuides() {
  const gx = document.querySelector(".frame-guide-x");
  const gy = document.querySelector(".frame-guide-y");
  const zone = document.querySelector("#frame-zone");
  const rows = "ABCDEFGH";
  let raf = 0;
  let x = 0;
  let y = 0;
  window.addEventListener(
    "pointermove",
    (event) => {
      x = event.clientX;
      y = event.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        gx.style.transform = `translate3d(${x}px,0,0)`;
        gy.style.transform = `translate3d(0,${y}px,0)`;
        const r = rows[Math.min(7, Math.floor((y / innerHeight) * 8))];
        const c = Math.min(12, Math.floor((x / innerWidth) * 12) + 1);
        zone.textContent = r + c;
      });
    },
    { passive: true },
  );
  document.documentElement.classList.add("has-guides");
}

function cursorLabel(target) {
  if (target.dataset.cursor) return target.dataset.cursor;
  if (target.matches(".shot")) return "Inspect";
  if (target.matches(".certificate")) return "View";
  if (target.matches(".viewer-sheet")) return "Drag";
  if (target.matches("[data-product]")) return "Details";
  if (target.matches("a[href$='.pdf']")) return "PDF ↓";
  if (target.matches("a[href^='mailto:']")) return "Email";
  if (target.matches("a[href^='tel:']")) return "Call";
  if (target.matches("a[target='_blank']")) return "Open ↗";
  if (target.matches("a[href^='#']")) return "Go";
  return "";
}

function cadCursor() {
  const root = document.createElement("div");
  root.className = "cad-cursor";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = '<span class="cad-x"></span><span class="cad-y"></span>';
  const snap = document.createElement("div");
  snap.className = "cad-snap";
  snap.setAttribute("aria-hidden", "true");
  snap.innerHTML = '<i></i><i></i><i></i><i></i><span class="cad-label"></span>';
  document.body.append(root, snap);
  const label = snap.querySelector(".cad-label");
  document.documentElement.classList.add("has-cad-cursor");

  const interactive = "a, button, select, summary, [data-cursor], .viewer-sheet, label";
  const textual = "input, textarea, select";
  const pointer = { x: -100, y: -100 };
  const box = { x: -100, y: -100, w: 12, h: 12 };
  let target = null;
  let visible = false;

  window.addEventListener(
    "pointermove",
    (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      root.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
      if (!visible) {
        visible = true;
        box.x = pointer.x - 6;
        box.y = pointer.y - 6;
        document.documentElement.classList.add("cursor-visible");
      }
    },
    { passive: true },
  );
  document.addEventListener("pointerleave", () => {
    visible = false;
    document.documentElement.classList.remove("cursor-visible");
  });
  document.addEventListener("pointerover", (event) => {
    const el = event.target.closest(interactive);
    const isText = !!event.target.closest(textual);
    document.documentElement.classList.toggle("cursor-text", isText);
    target = el && !isText && !el.closest("[disabled]") ? el : null;
    label.textContent = target ? cursorLabel(target) : "";
    snap.classList.toggle("is-snapped", !!target);
    snap.classList.toggle("has-label", !!label.textContent);
  });
  document.addEventListener("pointerdown", () => snap.classList.add("is-pressed"));
  document.addEventListener("pointerup", () => snap.classList.remove("is-pressed"));

  gsap.ticker.add(() => {
    let tx;
    let ty;
    let tw;
    let th;
    if (target && target.isConnected) {
      const r = target.getBoundingClientRect();
      const pad = target.matches(".shot, .viewer-sheet, .certificate, .product-row-button") ? -6 : 6;
      tx = r.left - pad;
      ty = r.top - pad;
      tw = r.width + pad * 2;
      th = r.height + pad * 2;
      // Large surfaces keep a pick box at the pointer rather than framing the whole area.
      if (r.width > 420 || r.height > 260) {
        tx = pointer.x - 22;
        ty = pointer.y - 22;
        tw = th = 44;
      }
    } else {
      tx = pointer.x - 6;
      ty = pointer.y - 6;
      tw = th = 12;
    }
    const k = 0.28;
    box.x += (tx - box.x) * k;
    box.y += (ty - box.y) * k;
    box.w += (tw - box.w) * k;
    box.h += (th - box.h) * k;
    snap.style.transform = `translate3d(${box.x.toFixed(2)}px, ${box.y.toFixed(2)}px, 0)`;
    snap.style.width = box.w.toFixed(2) + "px";
    snap.style.height = box.h.toFixed(2) + "px";
  });
}

function magnetic() {
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    el.addEventListener("pointermove", (event) => {
      const r = el.getBoundingClientRect();
      xTo((event.clientX - (r.left + r.width / 2)) * 0.22);
      yTo((event.clientY - (r.top + r.height / 2)) * 0.32);
    });
    el.addEventListener("pointerleave", () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
    });
  });
}

function tilt() {
  document.querySelectorAll(".certificate").forEach((card) => {
    const rx = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" });
    const ry = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" });
    gsap.set(card, { transformPerspective: 900 });
    card.addEventListener("pointermove", (event) => {
      const r = card.getBoundingClientRect();
      const nx = (event.clientX - r.left) / r.width - 0.5;
      const ny = (event.clientY - r.top) / r.height - 0.5;
      ry(nx * 10);
      rx(-ny * 8);
      card.style.setProperty("--gx", `${(nx + 0.5) * 100}%`);
      card.style.setProperty("--gy", `${(ny + 0.5) * 100}%`);
    });
    card.addEventListener("pointerleave", () => {
      rx(0);
      ry(0);
    });
  });
}

// Inspection loupe: a 2.6× reticle over the high-resolution workshop photograph.
function loupes(reducedMotion) {
  const ZOOM = 2.6;
  document.querySelectorAll(".shot[data-loupe]").forEach((shot) => {
    const img = shot.querySelector("img");
    const loupe = document.createElement("span");
    loupe.className = "loupe";
    loupe.setAttribute("aria-hidden", "true");
    loupe.innerHTML = `<span class="loupe-readout">×${ZOOM}</span>`;
    shot.append(loupe);
    const src = base + "media/" + shot.dataset.loupe;
    let loaded = false;
    let rect = null;
    const size = () => loupe.offsetWidth || 220;

    function load() {
      if (loaded) return;
      loaded = true;
      const preload = new Image();
      preload.onload = () => {
        loupe.style.backgroundImage = `url("${src}")`;
        loupe.classList.add("is-ready");
      };
      preload.src = src;
    }
    function place(event) {
      rect = img.getBoundingClientRect();
      const shotRect = shot.getBoundingClientRect();
      const natW = img.naturalWidth || 1800;
      const natH = img.naturalHeight || 811;
      const scale = Math.max(rect.width / natW, rect.height / natH);
      const w = natW * scale;
      const h = natH * scale;
      const offX = (rect.width - w) / 2;
      const offY = (rect.height - h) / 2;
      const u = (event.clientX - rect.left - offX) / w;
      const v = (event.clientY - rect.top - offY) / h;
      const s = size();
      const lx = event.clientX - shotRect.left - s / 2;
      const ly = event.clientY - shotRect.top - s / 2;
      loupe.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
      loupe.style.backgroundSize = `${w * ZOOM}px ${h * ZOOM}px`;
      loupe.style.backgroundPosition = `${-(u * w * ZOOM - s / 2)}px ${-(v * h * ZOOM - s / 2)}px`;
    }
    shot.addEventListener("pointerenter", (event) => {
      load();
      place(event);
      shot.classList.add("is-inspecting");
    });
    shot.addEventListener("pointermove", place);
    shot.addEventListener("pointerleave", () => shot.classList.remove("is-inspecting"));
    if (reducedMotion) loupe.classList.add("no-motion");
  });
}
