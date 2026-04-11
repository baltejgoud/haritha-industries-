import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

window.addEventListener('DOMContentLoaded', () => {
  // Initialize Lenis for Smooth Scrolling
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // ========== CUSTOM CURSOR ==========
  const cursorDot = document.querySelector('.cursor-dot');
  const cursorOutline = document.querySelector('.cursor-outline');

  if (cursorDot && cursorOutline && !('ontouchstart' in window)) {
    // Hide default cursor for standard elements but ensure usability
    const style = document.createElement('style');
    style.innerHTML = `body.hide-cursor, body.hide-cursor a, body.hide-cursor button, body.hide-cursor input, body.hide-cursor textarea { cursor: none !important; }`;
    document.head.appendChild(style);
    document.body.classList.add('hide-cursor');
    
    gsap.set(cursorDot, { xPercent: -50, yPercent: -50 });
    gsap.set(cursorOutline, { xPercent: -50, yPercent: -50 });

    window.addEventListener('mousemove', (e) => {
      gsap.to(cursorDot, { x: e.clientX, y: e.clientY, duration: 0, ease: 'none' });
      gsap.to(cursorOutline, { x: e.clientX, y: e.clientY, duration: 0.15, ease: 'power2.out' });
    });

    const interactives = document.querySelectorAll('a, button, .magnetic, .magnetic-light, .pin-card');
    interactives.forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('hover-magnetic'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('hover-magnetic'));
    });
  }

  // ========== SPLIT TEXT REVEAL ==========
  function splitTextNodes(el) {
    const nodes = Array.from(el.childNodes);
    el.innerHTML = '';
    nodes.forEach(node => {
      if (node.nodeType === 3 && node.nodeValue.trim() !== '') {
        const text = node.nodeValue;
        const fragment = document.createDocumentFragment();
        text.split(/(\s+)/).forEach(part => {
          if (part.trim() === '') {
            fragment.appendChild(document.createTextNode(part));
          } else {
            const wordSpan = document.createElement('span');
            wordSpan.style.display = 'inline-block';
            part.split('').forEach(char => {
              const charSpan = document.createElement('span');
              charSpan.className = 'char';
              charSpan.textContent = char;
              wordSpan.appendChild(charSpan);
            });
            fragment.appendChild(wordSpan);
          }
        });
        el.appendChild(fragment);
      } else if (node.nodeType === 1) {
        if (node.tagName.toLowerCase() !== 'br') {
            splitTextNodes(node);
        }
        el.appendChild(node);
      } else {
        el.appendChild(node);
      }
    });
  }

  gsap.utils.toArray('.split-text-reveal').forEach(el => {
    splitTextNodes(el);
    gsap.to(el.querySelectorAll('.char'), {
      autoAlpha: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.02,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  });

  // ========== COUNTERS ==========
  gsap.utils.toArray('.counter').forEach(counter => {
    const target = parseInt(counter.getAttribute('data-target'), 10);
    if (!isNaN(target)) {
      gsap.to(counter, {
        innerHTML: target,
        duration: 2.5,
        ease: 'power3.out',
        snap: { innerHTML: 1 },
        scrollTrigger: {
          trigger: counter,
          start: 'top 90%',
          toggleActions: 'play none none none'
        }
      });
    }
  });

  // Navbar Dynamic Scroll
  const nav = document.querySelector('nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  // ========== HERO ENTRANCE ==========
  const heroTl = gsap.timeline();
  
  // Fade up basic elements
  gsap.set('.fade-up', { autoAlpha: 0, y: 40 });
  
  heroTl.to('.fade-up:not(.delayed)', {
    autoAlpha: 1,
    y: 0,
    duration: 1,
    stagger: 0.15,
    ease: 'power3.out'
  })
  .to('.delayed', {
    autoAlpha: 1,
    y: 0,
    duration: 1,
    ease: 'power3.out'
  }, "-=0.5");

  // Parallax Hero BG
  gsap.to('.parallax-bg', {
    yPercent: 20,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });
  
  gsap.to('.hero-content', {
    yPercent: 30,
    opacity: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });

  // ========== SCROLL TRIGGERS ==========
  
  // Reveal Up (General)
  gsap.utils.toArray('.reveal-up').forEach((el) => {
    gsap.set(el, { autoAlpha: 0, y: 50 });
    gsap.to(el, {
      autoAlpha: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  });

  // Reveal Scale
  gsap.utils.toArray('.reveal-scale').forEach((el) => {
    gsap.set(el, { autoAlpha: 0, scale: 0.9 });
    gsap.to(el, {
      autoAlpha: 1,
      scale: 1,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  });

  // Staggered Grids (e.g. About Cards, Certifications)
  const staggerSections = ['.about-grid', '.cert-grid'];
  staggerSections.forEach((selector) => {
    const parent = document.querySelector(selector);
    if(parent) {
      const items = parent.querySelectorAll('.reveal-stagger');
      gsap.set(items, { autoAlpha: 0, y: 40 });
      gsap.to(items, {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: parent,
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        }
      });
    }
  });

  // Left / Right Reveals (Financials)
  gsap.utils.toArray('.reveal-left').forEach((el) => {
    gsap.set(el, { autoAlpha: 0, x: -50 });
    gsap.to(el, {
      autoAlpha: 1,
      x: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      }
    });
  });

  gsap.utils.toArray('.reveal-right').forEach((el) => {
    gsap.set(el, { autoAlpha: 0, x: 50 });
    gsap.to(el, {
      autoAlpha: 1,
      x: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      }
    });
  });

  // Image Parallax (About inner image)
  gsap.utils.toArray('.parallax-img').forEach((img) => {
    gsap.to(img, {
      yPercent: 15,
      ease: 'none',
      scrollTrigger: {
        trigger: img.parentElement,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });
  });

  // Document Stack Effect (Financials)
  const docStackTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: '.doc-stack',
      start: 'top 80%',
      toggleActions: 'play none none reverse'
    }
  });
  
  gsap.set(['.doc-primary', '.doc-secondary', '.doc-tertiary'], { y: 60, opacity: 0 });
  docStackTimeline
    .to('.doc-tertiary', { y: 0, opacity: 0.5, duration: 0.6, ease: 'back.out(1.2)' })
    .to('.doc-secondary', { y: 0, opacity: 0.8, duration: 0.6, ease: 'back.out(1.2)' }, "-=0.4")
    .to('.doc-primary', { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.2)' }, "-=0.4");


  // ========== MAGNETIC BUTTONS ==========
  const magneticEls = document.querySelectorAll('.magnetic');
  magneticEls.forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const h = rect.width / 2;
      const w = rect.height / 2;
      const x = e.clientX - rect.left - h;
      const y = e.clientY - rect.top - w;
      
      gsap.to(el, {
        x: x * 0.3,
        y: y * 0.3,
        duration: 0.4,
        ease: 'power3.out'
      });
    });

    el.addEventListener('mouseleave', () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.7,
        ease: 'elastic.out(1, 0.3)'
      });
    });
  });

  // Smooth anchor scrolling
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if(target) {
        lenis.scrollTo(target, { offset: -80 });
      }
    });
  });

  console.log('Premium GSAP Animations Initialized');
});
