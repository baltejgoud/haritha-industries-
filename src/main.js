import "./style.css";
import {
  initMotion,
  animateProducts,
  animateDialog,
  animateMedia,
  animateEnquiry,
  scrollToTarget,
  pauseScroll,
  resumeScroll,
  bindHero,
} from "./motion.js";
import { initInteractions } from "./interactions.js";

// Public assets must work both locally and under the configured deployment subpath.
const base = import.meta.env.BASE_URL;
const asset = (name) => base + "media/" + name;
// Vite already prefixes image URLs in the HTML; this catches the rest (PDF links).
if (base !== "/") {
  const unprefixed = /(^|[\s,])\/media\//g;
  document
    .querySelectorAll('[src*="/media/"], [href*="/media/"], [srcset*="/media/"]')
    .forEach((element) => {
      for (const attribute of ["src", "href", "srcset"]) {
        const value = element.getAttribute(attribute);
        if (value && unprefixed.test(value))
          element.setAttribute(attribute, value.replace(unprefixed, `$1${base}media/`));
        unprefixed.lastIndex = 0;
      }
    });
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionAllowed = () => !reducedMotion.matches;
document.documentElement.classList.add("js");

// Names follow the original Haritha product list; each photo is the company's own.
const products = [
  {
    id: "01",
    category: "vessels",
    label: "Pressure vessels",
    title: "Pressure vessels",
    photo: "product-1.webp",
    size: [463, 287],
    alt: "Stainless steel horizontal pressure vessels on saddle supports",
    interest: "Pressure vessels",
    description:
      "Horizontal and vertical vessels fabricated to your process duty and design basis.",
    detail:
      "Custom pressure vessels configured around your process duty, installation requirements and agreed design basis.",
    inputs: "Design pressure, temperature, working volume and process fluid",
    configuration: "Horizontal or vertical, subject to design",
    application: "Pressure containment and process service",
  },
  {
    id: "02",
    category: "vessels",
    label: "Pressure vessels",
    title: "Cladded pressure vessels",
    photo: "product-2.webp",
    size: [504, 271],
    alt: "Cladded pressure vessel with a bolted flange cover, in primer",
    interest: "Cladded pressure vessels",
    description:
      "Pressure vessels with cladding, fabricated for demanding process service.",
    detail:
      "Cladded pressure vessels built around your process conditions, service requirements and approved engineering specification.",
    inputs: "Design conditions, base and cladding material, process fluid",
    configuration: "Project-specific shell, heads and nozzles",
    application: "Corrosive or demanding process service",
  },
  {
    id: "03",
    category: "exchangers",
    label: "Heat transfer",
    title: "Heat exchangers",
    photo: "product-3.webp",
    size: [490, 301],
    alt: "Shell-and-tube heat exchanger showing its tube sheet",
    interest: "Heat exchangers",
    description: "Shell-and-tube heat exchangers built around your thermal duty.",
    detail:
      "Shell-and-tube equipment developed around your heat-transfer requirement. Discuss fluid properties, operating conditions and installation constraints with our team.",
    inputs: "Heat duty, fluid data, flow rates, temperature and pressure",
    configuration: "Shell-and-tube, project-specific arrangement",
    application: "Industrial heating and cooling",
  },
  {
    id: "04",
    category: "exchangers",
    label: "Heat transfer",
    title: "U-tube heat exchangers",
    photo: "product-4.webp",
    size: [492, 260],
    alt: "U-tube heat exchanger bundle on supports in the workshop",
    interest: "Heat exchangers",
    description:
      "U-tube bundles and exchangers for industrial heat-transfer service.",
    detail:
      "U-tube heat exchanger configurations for industrial heat-transfer requirements. Share the thermal brief and installation requirements for an engineering discussion.",
    inputs: "Thermal duty, fluid data, temperatures and pressures",
    configuration: "U-tube bundle arrangement",
    application: "Industrial heat transfer",
  },
  {
    id: "05",
    category: "reactors",
    label: "Process equipment",
    title: "Reactors",
    photo: "product-5.webp",
    size: [504, 321],
    alt: "Stainless steel reactor vessel with multiple flanged nozzles",
    interest: "Reactors",
    description:
      "Process reactors fabricated around your chemistry and mixing requirements.",
    detail:
      "Reactor equipment designed around your chemistry, temperature profile and mixing requirements. The final arrangement follows your approved process brief.",
    inputs: "Process volume, fluid properties, temperature and mixing duty",
    configuration: "Agitation and jacket requirements by project",
    application: "Reaction and process mixing",
  },
  {
    id: "06",
    category: "fabrication",
    label: "Piping & fabrication",
    title: "Pressure piping",
    photo: "product-6.webp",
    size: [514, 305],
    alt: "Fabricated pressure piping manifold with branch connections",
    interest: "Pressure piping",
    description: "Fabricated pressure piping and manifolds, made to your drawings.",
    detail:
      "Pressure piping spools and manifolds fabricated to your drawings, service conditions and inspection requirements.",
    inputs: "Piping drawings, line sizes, materials and service conditions",
    configuration: "Spools, bends and manifolds by drawing",
    application: "Process and utility piping",
  },
  {
    id: "07",
    category: "fabrication",
    label: "Piping & fabrication",
    title: "Tanks & other fabrication",
    photo: "product-7.webp",
    size: [515, 391],
    alt: "Rectangular fabricated steel tank with stiffeners",
    interest: "Tanks & other fabrication",
    description:
      "Tanks and other process fabrication, made to your drawings and site.",
    detail:
      "Tanks and miscellaneous process fabrication configured to the stored medium, working volume, installation layout and handling requirements.",
    inputs: "Drawings, medium, working capacity and site conditions",
    configuration: "Shape, connections and supports by requirement",
    application: "Storage and general process fabrication",
  },
];

/* ---------- Equipment schedule ---------- */
const productGrid = document.querySelector("#product-grid");
const productCount = document.querySelector("#product-count");
const viewer = document.querySelector("#schedule-viewer");
const viewerPhoto = document.querySelector("#viewer-photo");
const viewerCode = document.querySelector("#viewer-code");
const viewerParts = document.querySelector("#viewer-parts");
let activeFilter = "all";
let activeProduct = null;
let viewerScene = null;
let rowObserver = null;
const hoverSelect = window.matchMedia("(hover: hover) and (min-width: 960px)");

function renderProducts() {
  const matching = products.filter(
    (p) => activeFilter === "all" || p.category === activeFilter,
  );
  productGrid.innerHTML =
    matching
      .map(
        (p) => `
    <li class="product-row" data-id="${p.id}">
      <button class="product-row-button" data-product="${p.id}" aria-describedby="desc-${p.id}">
        <span class="pr-code">HI-${p.id}</span>
        <span class="pr-title">${p.title}</span>
        <span class="pr-cat">${p.label}</span>
        <span class="pr-open">Details<span class="sr-only">: ${p.title}</span> <span class="arrow" aria-hidden="true">→</span></span>
      </button>
      <div class="pr-body"><div class="pr-inner">
        <p class="pr-desc" id="desc-${p.id}">${p.description}</p>
        <img class="pr-photo" src="${asset(p.photo)}" alt="" width="${p.size[0]}" height="${p.size[1]}" loading="lazy">
      </div></div>
    </li>`,
      )
      .join("") +
    `<li class="product-row product-row-cta" data-id="custom">
      <a class="product-row-button" href="#contact">
        <span class="pr-code">HI-—</span>
        <span class="pr-title">Don’t see your equipment?</span>
        <span class="pr-cat">Custom requirement</span>
        <span class="pr-open" aria-hidden="true">Discuss your project <span class="arrow">→</span></span>
      </a>
      <div class="pr-body"><div class="pr-inner"><p class="pr-desc">Send us the drawing or specification and we’ll discuss what it takes to build it.</p></div></div>
    </li>`;
  productCount.textContent = `Showing ${matching.length} of ${products.length}`;
  setActiveProduct(matching[0]?.id ?? "custom", true);
  observeRows();
  animateProducts(productGrid);
}

function setActiveProduct(id, force = false) {
  if (id === activeProduct && !force) return;
  activeProduct = id;
  productGrid.querySelectorAll(".product-row").forEach((row) => {
    row.classList.toggle("is-active", row.dataset.id === id);
  });
  const product = products.find((p) => p.id === id);
  viewer.classList.toggle("is-custom", !product);
  viewerCode.textContent = product ? `HI-${product.id} · ${product.title}` : "HI-— · Your equipment";
  if (product) {
    if (!viewerPhoto.src.endsWith(product.photo)) {
      viewerPhoto.src = asset(product.photo);
      viewerPhoto.width = product.size[0];
      viewerPhoto.height = product.size[1];
    }
    viewerPhoto.alt = product.alt;
  }
  const parts = viewerScene ? viewerScene.show(product ? id : null) : null;
  if (parts) viewerParts.innerHTML = parts.map((name) => `<li>${name}</li>`).join("");
  else if (!product) viewerParts.innerHTML = "";
}

// Desktop selects on hover or focus; touch layouts select the row at the centre of the screen.
productGrid.addEventListener("pointerover", (event) => {
  if (!hoverSelect.matches) return;
  const row = event.target.closest(".product-row");
  if (row) setActiveProduct(row.dataset.id);
});
productGrid.addEventListener("focusin", (event) => {
  const row = event.target.closest(".product-row");
  if (row) setActiveProduct(row.dataset.id);
});
function observeRows() {
  rowObserver?.disconnect();
  if (hoverSelect.matches) return;
  rowObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) setActiveProduct(entry.target.dataset.id);
    },
    { rootMargin: "-55% 0px -40% 0px" },
  );
  productGrid.querySelectorAll(".product-row").forEach((row) => rowObserver.observe(row));
}
hoverSelect.addEventListener("change", observeRows);

function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll("[data-filter]").forEach((button) => {
    const active = button.dataset.filter === filter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderProducts();
}
document
  .querySelectorAll("[data-filter]")
  .forEach((button) =>
    button.addEventListener("click", () => setFilter(button.dataset.filter)),
  );
// Category links land on the catalogue already filtered.
document
  .querySelectorAll("[data-jump]")
  .forEach((link) =>
    link.addEventListener("click", () => setFilter(link.dataset.jump)),
  );
renderProducts();

/* ---------- Dialogs ---------- */
const productDialog = document.querySelector("#product-dialog");
const productDialogContent = document.querySelector("#product-dialog-content");
function openProduct(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;
  productDialogContent.innerHTML = `<div class="product-modal-layout">
    <div class="modal-image"><img src="${asset(product.photo)}" alt="${product.alt}" width="${product.size[0]}" height="${product.size[1]}"><span class="label">HI-${product.id} · Haritha product gallery</span></div>
    <div class="modal-copy"><span class="label">${product.label}</span><h2 id="product-dialog-title">${product.title}</h2><p>${product.detail}</p>
    <dl class="modal-specs"><div><dt>Application</dt><dd>${product.application}</dd></div><div><dt>Configuration</dt><dd>${product.configuration}</dd></div><div><dt>Useful to share</dt><dd>${product.inputs}</dd></div></dl>
    <button class="button button-primary" id="product-enquire"><span class="button-label">Enquire about this equipment</span> <span class="arrow" aria-hidden="true">→</span></button><p class="modal-note">Materials, design code, capacity and ratings are confirmed against your project requirements.</p></div></div>`;
  openDialog(productDialog);
  document.querySelector("#product-enquire").addEventListener("click", () => {
    const select = document.querySelector("#enquiry-equipment");
    select.value = product.interest;
    document.querySelector("#enquiry-form").hidden = false;
    document.querySelector("#enquiry-result").hidden = true;
    // The close event releases the dialog's scroll lock; only then can the page move.
    productDialog.addEventListener(
      "close",
      () =>
        scrollToTarget(document.querySelector("#contact"), () =>
          select.focus({ preventScroll: true }),
        ),
      { once: true },
    );
    productDialog.close();
  });
}
productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-product]");
  if (button) openProduct(button.dataset.product);
});

function openDialog(dialog) {
  dialog.showModal();
  pauseScroll();
  animateDialog(dialog);
}
// Native dialogs provide keyboard focus containment and Escape-to-close.
document.querySelectorAll("dialog").forEach((dialog) => {
  dialog
    .querySelector("[data-close]")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", resumeScroll);
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dialog.close();
  });
});

const mediaSets = {
  gallery: [
    {
      file: "slideimg1.webp",
      title: "Process vessel fabrication",
      caption: "Fig. 02 — Fabrication · Haritha workshop",
    },
    {
      file: "slideimg2.webp",
      title: "Equipment in the workshop",
      caption: "Fig. 03 — Work in progress · Haritha workshop",
    },
    {
      file: "slideimg3.webp",
      title: "Fabricated process vessel",
      caption: "Fig. 04 — The finished detail · Haritha workshop",
    },
  ],
  certificates: [
    {
      file: "certificate2.png",
      title: "Published ISO 9001:2015 certificate",
      caption:
        "01 / 04 — Archived ISO certificate · Published document; ask for current validity",
    },
    {
      file: "certificate3.png",
      title: "Published I.B.R. manufacturer registration",
      caption: "02 / 04 — Archived boiler-component manufacturer registration",
    },
    {
      file: "certificate4.png",
      title: "Published I.B.R. erector / repairer registration",
      caption: "03 / 04 — Archived boiler erector / repairer registration",
    },
    {
      file: "certificate1.png",
      title: "BHEL recognition — November 2011",
      caption: "04 / 04 — BHEL quality recognition · November 2011",
    },
  ],
};
const mediaDialog = document.querySelector("#media-dialog");
let mediaSet = "gallery";
let mediaIndex = 0;
function showMedia() {
  const item = mediaSets[mediaSet][mediaIndex];
  const image = document.querySelector("#media-dialog-image");
  image.src = asset(item.file);
  image.alt = item.title;
  document.querySelector("#media-dialog-title").textContent = item.title;
  document.querySelector("#media-dialog-caption").textContent = item.caption;
  mediaDialog.dataset.set = mediaSet;
  animateMedia(image);
}
function openMedia(set, index) {
  mediaSet = set;
  mediaIndex = index;
  showMedia();
  openDialog(mediaDialog);
}
function moveMedia(direction) {
  mediaIndex =
    (mediaIndex + direction + mediaSets[mediaSet].length) %
    mediaSets[mediaSet].length;
  showMedia();
}
document
  .querySelectorAll("[data-gallery]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      openMedia("gallery", Number(button.dataset.gallery)),
    ),
  );
document
  .querySelectorAll("[data-certificate]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      openMedia("certificates", Number(button.dataset.certificate)),
    ),
  );
document.querySelector("#media-prev").addEventListener("click", () => moveMedia(-1));
document.querySelector("#media-next").addEventListener("click", () => moveMedia(1));
mediaDialog.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    moveMedia(event.key === "ArrowLeft" ? -1 : 1);
  }
});

/* ---------- Navigation ---------- */
const header = document.querySelector("#site-header");
const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector("#mobile-nav");
function closeMenu(restoreFocus = false) {
  if (mobileNav.hidden) return;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
  mobileNav.hidden = true;
  header.classList.remove("menu-open");
  document.querySelector("main").inert = false;
  document.querySelector(".site-footer").inert = false;
  resumeScroll();
  if (restoreFocus) menuToggle.focus();
}
menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  if (!open) return closeMenu();
  menuToggle.setAttribute("aria-expanded", "true");
  menuToggle.setAttribute("aria-label", "Close navigation");
  mobileNav.hidden = false;
  header.classList.add("menu-open");
  document.querySelector("main").inert = true;
  document.querySelector(".site-footer").inert = true;
  pauseScroll();
});
mobileNav
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", () => closeMenu()));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mobileNav.hidden) closeMenu(true);
  if (event.key === "Tab" && !mobileNav.hidden) {
    const links = [...mobileNav.querySelectorAll("a[href]")];
    const last = links.at(-1);
    if (event.shiftKey && document.activeElement === menuToggle) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      menuToggle.focus();
    }
  }
});
window.matchMedia("(min-width: 1080px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});
window.addEventListener(
  "scroll",
  () => header.classList.toggle("scrolled", window.scrollY > 24),
  { passive: true },
);

const navLinks = [...document.querySelectorAll(".desktop-nav a")];
const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      document.body.dataset.section = id;
      navLinks.forEach((link) => {
        const active = link.hash === "#" + id;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    });
  },
  { rootMargin: "-45% 0px -50% 0px" },
);
document
  .querySelectorAll("#home, #products, #about, #process, #gallery, #quality, #contact")
  .forEach((section) => navObserver.observe(section));

/* ---------- Enquiry (prepares an email; never pretends to submit) ---------- */
const enquiryForm = document.querySelector("#enquiry-form");
const enquiryResult = document.querySelector("#enquiry-result");
const enquirySummary = document.querySelector("#enquiry-summary");
enquiryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  // Reject whitespace-only required values while retaining native field validation.
  for (const control of enquiryForm.querySelectorAll("[required]")) {
    const minimum = control.name === "requirements" ? 10 : 1;
    control.setCustomValidity(
      control.value.trim().length < minimum
        ? minimum === 10
          ? "Please describe your requirement in at least 10 characters."
          : control.name === "email"
            ? "Please enter your email address."
            : "Please enter your name."
        : "",
    );
  }
  if (!enquiryForm.reportValidity()) return;
  const data = new FormData(enquiryForm);
  const value = (name) => String(data.get(name) || "").trim();
  const summary = [
    "Hello Haritha Industries,",
    "",
    "I would like to discuss a project.",
    "",
    "Name: " + value("name"),
    "Email: " + value("email"),
    "Company: " + (value("company") || "Not specified"),
    "Equipment: " + (value("equipment") || "To be discussed"),
    "",
    "Requirement:",
    value("requirements"),
    "",
    "Please contact me to discuss the next steps.",
  ].join("\n");
  enquirySummary.textContent = summary;
  const subject =
    "Project enquiry — " + (value("equipment") || "Process equipment");
  document.querySelector("#send-enquiry").href =
    "mailto:info@harithaindustries.com?subject=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(summary);
  enquiryForm.hidden = true;
  enquiryResult.hidden = false;
  animateEnquiry(enquiryResult);
  document.querySelector("#copy-status").textContent = "";
  enquiryResult.querySelector("h3").focus({ preventScroll: true });
  enquiryResult.scrollIntoView({
    block: "center",
    behavior: motionAllowed() ? "smooth" : "instant",
  });
});
enquiryForm.addEventListener("input", (event) => {
  if ("setCustomValidity" in event.target) event.target.setCustomValidity("");
  const field = event.target.closest(".field");
  if (field) field.classList.toggle("is-filled", event.target.value.trim() !== "");
});
document.querySelector("#edit-enquiry").addEventListener("click", () => {
  enquiryResult.hidden = true;
  enquiryForm.hidden = false;
  enquiryForm.querySelector("input").focus({ preventScroll: true });
});
document.querySelector("#copy-enquiry").addEventListener("click", async () => {
  const status = document.querySelector("#copy-status");
  status.textContent = "Copying enquiry…";
  let timeout;
  try {
    await Promise.race([
      navigator.clipboard.writeText(enquirySummary.textContent),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Clipboard unavailable")),
          2000,
        );
      }),
    ]);
    status.textContent =
      "Copied. Paste into an email to info@harithaindustries.com.";
  } catch {
    // Selection provides a useful fallback when clipboard permission is unavailable.
    const range = document.createRange();
    range.selectNodeContents(enquirySummary);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    status.textContent =
      "Enquiry selected. Copy it and email info@harithaindustries.com.";
  } finally {
    clearTimeout(timeout);
  }
});

const today = new Date();
document.querySelector("#copyright-year").textContent = new Intl.DateTimeFormat(
  "en",
  { timeZone: "Asia/Kolkata", year: "numeric" },
).format(today);
document.querySelector("#rfq-date").textContent = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
}).format(today);

/* ---------- WebGL, loaded after first paint and only where supported ---------- */
function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
const hasWebGL = webglAvailable();
document.documentElement.classList.toggle("no-webgl", !hasWebGL);

if (hasWebGL) {
  const startHero = () =>
    import("./webgl/hero-scene.js")
      .then(({ createHeroScene }) => {
        const scene = createHeroScene(
          document.querySelector("#hero-canvas"),
          document.querySelector("#hero-dims"),
          { reducedMotion: !motionAllowed() },
        );
        bindHero(scene);
      })
      .catch((error) => console.warn("Hero drawing unavailable:", error));
  if ("requestIdleCallback" in window) requestIdleCallback(startHero, { timeout: 600 });
  else setTimeout(startHero, 120);

  const viewerCanvas = document.querySelector("#viewer-canvas");
  const viewerWatch = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      viewerWatch.disconnect();
      import("./webgl/viewer-scene.js")
        .then(({ createViewerScene }) => {
          viewerScene = createViewerScene(
            viewerCanvas,
            document.querySelector("#viewer-balloons"),
            { reducedMotion: !motionAllowed() },
          );
          viewer.classList.add("has-drawing");
          setActiveProduct(activeProduct, true);
        })
        .catch((error) => console.warn("Equipment drawings unavailable:", error));
    },
    { rootMargin: "800px 0px" },
  );
  viewerWatch.observe(viewerCanvas);
}

initMotion();
initInteractions({ reducedMotion: !motionAllowed() });
