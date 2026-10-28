// Motion language — "lines before solids".
// Hairlines draw along their own axis, type rises out of masks, images open like
// shutters, and the weld front is always scroll-driven, never on a timer.
// Durations: micro 0.18s · interface 0.35s · reveal 0.9–1.1s · intro 1.8s.
// Easing: draft (inOut) for lines, settle (expo.out) for arrivals, stamp (back.out) for impact.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);
const EASE = { draft: "power3.inOut", settle: "expo.out", stamp: "back.out(2.2)" };
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let lenis = null;
let heroScene = null;
let heroProgress = 0;
let locks = 0;

export function bindHero(scene) {
  heroScene = scene;
  scene.setProgress(reduced() ? 1 : heroProgress);
}

export function scrollToTarget(target, done) {
  if (!target) return;
  const offset = target.id === "main" || target.id === "home" ? 0 : -8;
  const finish = () => {
    if (!target.hasAttribute("tabindex") && !target.matches("a, button, input, select, textarea"))
      target.setAttribute("tabindex", "-1");
    if (done) done();
    else target.focus({ preventScroll: true });
  };
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.25, onComplete: finish });
  } else {
    target.scrollIntoView({ behavior: reduced() ? "instant" : "smooth", block: "start" });
    finish();
  }
}

export function pauseScroll() {
  locks++;
  lenis?.stop();
  document.documentElement.classList.add("scroll-locked");
}
export function resumeScroll() {
  locks = Math.max(0, locks - 1);
  if (locks) return;
  lenis?.start();
  document.documentElement.classList.remove("scroll-locked");
}

// Wraps each word in a mask so headings can rise out of their own baseline.
function splitWords(element, { label = true } = {}) {
  if (element.dataset.splitDone) return element.querySelectorAll(".wi");
  const words = element.textContent.trim().split(/\s+/);
  // Headings keep their name through aria-label; body text stays readable as plain spans.
  if (label) element.setAttribute("aria-label", element.textContent.trim().replace(/\s+/g, " "));
  const hidden = label ? ' aria-hidden="true"' : "";
  element.innerHTML = words
    .map((w) => `<span class="w"${hidden}><span class="wi">${w}</span></span>`)
    .join(" ");
  element.dataset.splitDone = "1";
  return element.querySelectorAll(".wi");
}

export function animateProducts(list) {
  if (reduced() || list.getBoundingClientRect().top > innerHeight) return;
  const rows = list.querySelectorAll(".product-row");
  gsap.fromTo(
    rows,
    { "--draw": 0 },
    { "--draw": 1, duration: 0.9, stagger: 0.05, ease: EASE.draft, overwrite: true },
  );
  gsap.fromTo(
    list.querySelectorAll(".pr-title, .pr-code, .pr-cat"),
    { yPercent: 60, opacity: 0 },
    { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.02, ease: EASE.settle, clearProps: "transform,opacity", overwrite: true },
  );
}

export function animateDialog(dialog) {
  if (reduced()) return;
  gsap.fromTo(
    dialog,
    { clipPath: "inset(0 0 100% 0)" },
    { clipPath: "inset(0 0 0% 0)", duration: 0.55, ease: EASE.draft, clearProps: "clipPath" },
  );
  gsap.fromTo(
    dialog.querySelectorAll(".modal-copy > *, .media-image-wrap"),
    { y: 18, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.6, stagger: 0.04, delay: 0.18, ease: EASE.settle, clearProps: "transform,opacity" },
  );
}

export function animateMedia(image) {
  if (reduced()) return;
  gsap.fromTo(image, { opacity: 0.25, scale: 1.02 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power2.out", clearProps: "opacity,transform" });
}

export function animateEnquiry(result) {
  if (reduced()) return;
  const stamp = result.querySelector(".rfq-stamp");
  const sheet = result.closest(".rfq-sheet");
  gsap
    .timeline()
    .fromTo(
      result.querySelectorAll(":scope > *:not(.rfq-stamp)"),
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: EASE.settle, clearProps: "transform,opacity" },
      0,
    )
    .fromTo(
      stamp,
      { scale: 2.4, rotation: -26, opacity: 0 },
      { scale: 1, rotation: -9, opacity: 1, duration: 0.42, ease: EASE.stamp },
      0.25,
    )
    .fromTo(sheet, { x: 0 }, { x: 3, duration: 0.05, yoyo: true, repeat: 3, ease: "none", clearProps: "transform" }, 0.6);
}

function heroUpdate(p) {
  heroProgress = p;
  heroScene?.setProgress(p);
  const hero = document.querySelector(".hero");
  const weld = Math.min(1, Math.max(0, (p - 0.1) / 0.68));
  hero.style.setProperty("--weld", (weld * 100).toFixed(2) + "%");
  hero.style.setProperty("--hero-p", p.toFixed(4));
  const readout = document.querySelector("#fab-readout");
  if (readout) readout.textContent = String(Math.round(weld * 100)).padStart(3, "0");
}

function initLenis() {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.1,
  });
  lenis.on("scroll", ScrollTrigger.update);
  if (import.meta.env.DEV) window.__lenis = lenis;
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function bindAnchors() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey) return;
    const id = link.getAttribute("href").slice(1);
    const target = id && document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    history.replaceState(null, "", "#" + id);
    scrollToTarget(target);
  });
}

function intro() {
  // Drop the pre-paint hiding first: from-tweens read the final layout as their destination.
  document.documentElement.classList.remove("intro-pending");
  const tl = gsap.timeline({ defaults: { ease: EASE.settle } });
  tl.from(".frame-top", { scaleX: 0, transformOrigin: "left", duration: 1.1, ease: EASE.draft }, 0)
    .from(".frame-left", { scaleY: 0, transformOrigin: "top", duration: 1.1, ease: EASE.draft }, 0)
    .from(".site-header > *", { yPercent: -120, opacity: 0, duration: 0.9, stagger: 0.05 }, 0.1)
    .from(".hero-sheet", { "--draw": 0, duration: 0.9, ease: EASE.draft }, 0.15)
    .from(".hero-sheet span, .hero-eyebrow", { yPercent: 100, opacity: 0, duration: 0.8, stagger: 0.06 }, 0.2)
    .from(".ht-word", { yPercent: 108, duration: 1.15, stagger: 0.075 }, 0.28)
    .from(".hero-lead", { clipPath: "inset(0 0 100% 0)", duration: 1, ease: EASE.draft }, 0.75)
    .from(".hero-actions > *", { clipPath: "inset(0 100% 0 0)", duration: 0.8, stagger: 0.1, ease: EASE.draft }, 0.85)
    .from(".title-block .tb-cell", { clipPath: "inset(0 100% 0 0)", duration: 0.8, stagger: 0.06, ease: EASE.draft }, 0.9)
    .from(".scroll-cue", { opacity: 0, duration: 0.6 }, 1.4)
    .eventCallback("onComplete", () =>
      gsap.set(".hero-lead, .hero-actions > *, .title-block .tb-cell", { clearProps: "clipPath" }),
    );
}

function sectionHeads() {
  document.querySelectorAll("[data-split]").forEach((heading) => {
    const words = splitWords(heading);
    gsap.from(words, {
      yPercent: 110,
      duration: 1.05,
      stagger: 0.06,
      ease: EASE.settle,
      scrollTrigger: { trigger: heading, start: "top 88%", once: true },
    });
  });
  document.querySelectorAll(".sheet-head .sheet-label, .contact-copy .sheet-label").forEach((label) => {
    gsap.from(label, {
      "--draw": 0,
      duration: 1.1,
      ease: EASE.draft,
      scrollTrigger: { trigger: label, start: "top 90%", once: true },
    });
  });
  document.querySelectorAll(".section-intro, .contact-lead").forEach((intro) => {
    gsap.from(intro, {
      clipPath: "inset(0 0 100% 0)",
      duration: 1,
      ease: EASE.draft,
      clearProps: "clipPath",
      scrollTrigger: { trigger: intro, start: "top 90%", once: true },
    });
  });
}

function drawArt(svg, scrollTrigger) {
  const paths = svg.querySelectorAll(".art-draw:not([stroke-dasharray])");
  paths.forEach((path) => {
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
  });
  const tl = gsap.timeline({ scrollTrigger });
  tl.to(paths, { strokeDashoffset: 0, duration: 1.4, stagger: 0.12, ease: EASE.draft });
  const quiet = svg.querySelectorAll(".art-draw[stroke-dasharray], .art-sheet");
  if (quiet.length) tl.from(quiet, { opacity: 0, duration: 0.6 }, 0);
  const stamp = svg.querySelector(".art-stamp");
  if (stamp) tl.from(stamp, { scale: 1.8, rotation: -20, opacity: 0, transformOrigin: "50% 50%", duration: 0.45, ease: EASE.stamp }, 0.9);
  return tl;
}

function method(mm) {
  const section = document.querySelector(".method");
  const pin = section.querySelector(".method-pin");
  const track = section.querySelector(".method-track");
  const viewport = section.querySelector(".method-viewport");
  const fill = section.querySelector(".method-progress-fill");

  mm.add("(min-width: 960px)", () => {
    section.classList.add("is-horizontal");
    const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: pin,
        start: "top top",
        end: () => "+=" + distance(),
        pin: true,
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: (self) => fill.style.setProperty("--p", self.progress.toFixed(4)),
      },
    });
    track.querySelectorAll(".method-step").forEach((step) => {
      drawArt(step.querySelector(".step-art"), {
        trigger: step,
        containerAnimation: tween,
        start: "left 78%",
        once: true,
      });
      ScrollTrigger.create({
        trigger: step,
        containerAnimation: tween,
        start: "left 60%",
        end: "right 40%",
        toggleClass: "is-current",
      });
    });
    return () => section.classList.remove("is-horizontal");
  });
  mm.add("(max-width: 959px)", () => {
    track.querySelectorAll(".method-step").forEach((step) => {
      drawArt(step.querySelector(".step-art"), { trigger: step, start: "top 80%", once: true });
      ScrollTrigger.create({ trigger: step, start: "top 60%", end: "bottom 40%", toggleClass: "is-current" });
    });
  });
}

function shopFloor() {
  const section = document.querySelector(".shopfloor");
  // Lights down: the page dims into the shop floor and comes back up after it.
  const setDim = (v) => document.body.style.setProperty("--dim", v.toFixed(3));
  ScrollTrigger.create({
    trigger: section,
    start: "top 80%",
    end: "top 30%",
    scrub: true,
    onUpdate: (self) => setDim(self.progress),
    onLeaveBack: () => setDim(0),
  });
  ScrollTrigger.create({
    trigger: section,
    start: "bottom 70%",
    end: "bottom 20%",
    scrub: true,
    onUpdate: (self) => setDim(1 - self.progress),
    onLeave: () => setDim(0),
  });

  const stage = section.querySelector(".shot-stage");
  const main = stage.querySelector(".shot-main");
  gsap
    .timeline({
      scrollTrigger: { trigger: stage, start: "top top", end: "bottom bottom", scrub: 0.4 },
    })
    .fromTo(
      main,
      { clipPath: "inset(22% 26% 22% 26%)" },
      { clipPath: "inset(0% 0% 0% 0%)", ease: "none" },
      0,
    )
    .fromTo(main.querySelector("img"), { scale: 1.32 }, { scale: 1, ease: "none" }, 0)
    .fromTo(main.querySelector(".shot-caption"), { opacity: 0 }, { opacity: 1, ease: "none", duration: 0.2 }, 0.75);

  section.querySelectorAll(".shot-pair .shot").forEach((shot, i) => {
    gsap.fromTo(
      shot,
      { clipPath: "inset(100% 0 0 0)" },
      {
        clipPath: "inset(0% 0 0 0)",
        duration: 1.2,
        delay: i * 0.12,
        ease: EASE.draft,
        clearProps: "clipPath",
        scrollTrigger: { trigger: shot, start: "top 85%", once: true },
      },
    );
    gsap.fromTo(
      shot.querySelector("img"),
      { yPercent: -6, scale: 1.14 },
      { yPercent: 6, scale: 1.14, ease: "none", scrollTrigger: { trigger: shot, start: "top bottom", end: "bottom top", scrub: true } },
    );
  });
}

function quality() {
  const cards = gsap.utils.toArray(".certificate");
  gsap.from(cards, {
    y: 90,
    rotation: (i) => (i - 1.5) * 5,
    opacity: 0,
    duration: 1.1,
    stagger: 0.09,
    ease: EASE.settle,
    clearProps: "transform,opacity",
    scrollTrigger: { trigger: ".certificate-rail", start: "top 85%", once: true },
  });
  gsap.from(".register-list li", {
    "--draw": 0,
    duration: 1,
    stagger: 0.1,
    ease: EASE.draft,
    scrollTrigger: { trigger: ".register", start: "top 85%", once: true },
  });
}

function contact() {
  gsap.from(".rfq-sheet", {
    yPercent: 14,
    rotation: 1.6,
    opacity: 0,
    duration: 1.2,
    ease: EASE.settle,
    clearProps: "transform,opacity",
    scrollTrigger: { trigger: ".rfq-sheet", start: "top 90%", once: true },
  });
  gsap.from(".contact-list > div", {
    "--draw": 0,
    duration: 0.9,
    stagger: 0.08,
    ease: EASE.draft,
    scrollTrigger: { trigger: ".contact-list", start: "top 88%", once: true },
  });
  gsap.from(".footer-mark span", {
    yPercent: 105,
    duration: 1.2,
    stagger: 0.05,
    ease: EASE.settle,
    scrollTrigger: { trigger: ".site-footer", start: "top 85%", once: true },
  });
}

function statement() {
  const el = document.querySelector("[data-scrub-words]");
  if (!el) return;
  const words = splitWords(el, { label: false });
  // Words ink in as they are read; the unread grey still holds 3:1 for large text.
  gsap.fromTo(
    words,
    { color: "#85827c" },
    {
      color: "#151515",
      stagger: 0.1,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 55%", scrub: true },
    },
  );
}

export function initMotion() {
  bindAnchors();
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: reduce)", () => {
    document.documentElement.classList.remove("intro-pending");
    heroUpdate(1);
  });

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    initLenis();
    intro();
    ScrollTrigger.create({
      trigger: ".hero",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => heroUpdate(self.progress),
    });
    gsap.to(".frame-top", {
      "--progress": 1,
      ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: true },
    });
    sectionHeads();
    statement();
    method(mm);
    shopFloor();
    quality();
    contact();
    ScrollTrigger.create({
      trigger: ".product-list",
      start: "top 88%",
      once: true,
      onEnter: () => animateProducts(document.querySelector(".product-list")),
    });
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => {
      lenis?.destroy();
      lenis = null;
    };
  });

  // Keyboard focus must never land on content still waiting to be revealed.
  document.addEventListener("focusin", (event) => {
    const target = event.target.closest(".certificate, .rfq-sheet, .shot, .register-list li, .product-row");
    if (!target) return;
    gsap.killTweensOf(target);
    gsap.set(target, { clearProps: "opacity,transform,clipPath" });
  });

  // Legacy page redirects arrive with a hash; land there once layout settles.
  if (location.hash.length > 1) {
    const target = document.getElementById(location.hash.slice(1));
    if (target)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          if (lenis) lenis.scrollTo(target, { immediate: true, offset: -8 });
          else target.scrollIntoView({ block: "start" });
        }),
      );
  }
}
