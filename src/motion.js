import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
const canAnimate = () =>
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let motionContext;

// Interaction motion is brief; reading motion is slower and plays only once.
export function animateProducts(grid, force = false) {
  if (
    !canAnimate() ||
    (!force && grid.getBoundingClientRect().top > innerHeight)
  )
    return;
  gsap.fromTo(
    grid.querySelectorAll(".product-card"),
    { opacity: 0, y: 24 },
    {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.06,
      ease: "power3.out",
      clearProps: "transform,opacity",
      overwrite: true,
    },
  );
}

export function animateDialog(dialog) {
  if (!canAnimate()) return;
  gsap.fromTo(
    dialog,
    { opacity: 0, y: 18 },
    {
      opacity: 1,
      y: 0,
      duration: 0.35,
      ease: "power3.out",
      clearProps: "transform,opacity",
      overwrite: true,
    },
  );
}

export function animateMedia(image) {
  if (!canAnimate()) return;
  gsap.fromTo(
    image,
    { opacity: 0.4 },
    {
      opacity: 1,
      duration: 0.35,
      ease: "power2.out",
      clearProps: "opacity",
      overwrite: true,
    },
  );
}

export function animateEnquiry(result) {
  if (!canAnimate()) return;
  gsap.fromTo(
    result.children,
    { opacity: 0, y: 14 },
    {
      opacity: 1,
      y: 0,
      duration: 0.4,
      stagger: 0.05,
      ease: "power2.out",
      clearProps: "transform,opacity",
      overwrite: true,
    },
  );
}

// Fades a group in once when its trigger scrolls into view.
function reveal(targets, trigger, options = {}) {
  if (!document.querySelector(trigger)) return;
  gsap.from(targets, {
    opacity: 0,
    y: 20,
    duration: 0.7,
    stagger: 0.08,
    ease: "power3.out",
    scrollTrigger: { trigger, start: "top 88%", once: true },
    clearProps: "transform,opacity",
    ...options,
  });
}

export function initMotion() {
  const progress = document.createElement("div");
  progress.className = "reading-progress";
  progress.setAttribute("aria-hidden", "true");
  document.querySelector(".site-header").append(progress);

  motionContext = gsap.matchMedia();
  motionContext.add("(prefers-reduced-motion: no-preference)", () => {
    gsap
      .timeline({ defaults: { ease: "power3.out" } })
      .from(
        ".hero-media",
        { clipPath: "inset(0 0 0 100%)", duration: 1.2, ease: "power3.inOut" },
        0,
      )
      .from(
        ".hero-media img",
        { scale: 1.12, duration: 1.6, ease: "power2.out" },
        0,
      )
      .from(".eyebrow", { opacity: 0, y: 10, duration: 0.6 }, 0.1)
      .from(
        ".hero-line > span",
        { yPercent: 105, duration: 0.95, stagger: 0.1 },
        0.15,
      )
      .from(
        ".hero-lead, .hero-actions > *, .hero-credentials",
        { opacity: 0, y: 14, duration: 0.6, stagger: 0.07 },
        0.6,
      )
      .from(
        ".hero-media figcaption",
        { opacity: 0, duration: 0.5 },
        1.1,
      )
      .from(
        ".category-bar a",
        { opacity: 0, y: 12, duration: 0.5, stagger: 0.06 },
        0.8,
      )
      .eventCallback("onComplete", () =>
        gsap.set(
          ".hero-media, .hero-media img, .hero-media figcaption, .category-bar a",
          { clearProps: "all" },
        ),
      );

    gsap.fromTo(
      progress,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: "main",
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      },
    );

    document.querySelectorAll(".section").forEach((section) => {
      gsap.from(section.querySelectorAll(".section-head > *"), {
        opacity: 0,
        y: 22,
        duration: 0.75,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: section, start: "top 84%", once: true },
        clearProps: "transform,opacity",
      });
    });

    ScrollTrigger.create({
      trigger: "#product-grid",
      start: "top 90%",
      once: true,
      onEnter: () =>
        animateProducts(document.querySelector("#product-grid"), true),
    });
    reveal(".about-grid > *", ".about-grid");
    reveal(".process-step", ".process-steps", { stagger: 0.1 });
    reveal(".certificate", ".certificate-grid");
    reveal(".resource-links a", ".resource-links");
    reveal(".contact-list > div", ".contact-list", { stagger: 0.06 });
    reveal(".enquiry-card", ".enquiry-card", { y: 30, duration: 0.9 });

    document.querySelectorAll(".gallery-item").forEach((item, index) => {
      gsap
        .timeline({
          scrollTrigger: { trigger: item, start: "top 90%", once: true },
        })
        .from(item, {
          clipPath: "inset(0% 0% 100% 0%)",
          duration: 1,
          ease: "power3.inOut",
          delay: index * 0.06,
          clearProps: "clipPath",
        })
        .from(
          item.querySelector("img"),
          {
            scale: 1.1,
            duration: 1.15,
            ease: "power2.out",
            clearProps: "transform",
          },
          0,
        );
    });

    document.fonts.ready.then(() => ScrollTrigger.refresh());
  });

  // Keyboard navigation must never land on content still waiting to reveal.
  const revealOnFocus = (event) => {
    const target = event.target.closest(
      ".product-card, .enquiry-card, .certificate, .gallery-item, .process-step, .resource-links a",
    );
    if (!target) return;
    gsap.killTweensOf(target);
    gsap.set(target, { opacity: 1, y: 0, clearProps: "clipPath" });
  };
  document.addEventListener("focusin", revealOnFocus);
  if (import.meta.hot)
    import.meta.hot.dispose(() => {
      motionContext.revert();
      progress.remove();
      document.removeEventListener("focusin", revealOnFocus);
    });
}
