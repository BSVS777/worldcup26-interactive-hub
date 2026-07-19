import { gsap, ScrollTrigger } from './vendor/gsap-core.js';

const ROUTE_SELECTORS = Object.freeze({
  tour: '.venue-card, .venue-detail',
  agenda: '.agenda-nav, .agenda-column',
  timeline: '.timeline-status, .timeline-list::before, .timeline-item',
  'fan-dashboard': '.fan-toolbar, .fan-summary, .fan-metrics dd, .fan-match',
  'group-matrix': '.matrix-card, .matrix-table tr'
});

function elementsFor(document, selector) {
  if (!selector || selector.includes('::')) return [];
  return Array.from(document.querySelectorAll(selector));
}

export function createMotionSystem(document, window) {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const transition = document.getElementById('pitch-transition');
  const ball = transition?.querySelector('.pitch-transition__ball');
  const topCurtain = transition?.querySelector('.pitch-transition__curtain--top');
  const bottomCurtain = transition?.querySelector('.pitch-transition__curtain--bottom');
  const line = transition?.querySelector('.pitch-transition__line');
  const hero = document.querySelector('.hero');
  const stage = document.querySelector('.module-stage');
  let lastRoute = '';

  document.documentElement.classList.add('has-motion-system');
  gsap.registerPlugin(ScrollTrigger);

  function reveal(elements, options = {}) {
    if (reduceMotion || elements.length === 0) return;
    gsap.fromTo(elements, {
      opacity: 0,
      y: options.y ?? 18,
      scale: options.scale ?? 0.985
    }, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: options.duration ?? 0.42,
      stagger: options.stagger ?? 0.035
    });
  }

  function playPartingPitch() {
    if (reduceMotion || !transition || !ball || !topCurtain || !bottomCurtain || !line) return;
    transition.classList.add('is-active');
    gsap.set([topCurtain, bottomCurtain], { scaleY: 0 });
    gsap.set(line, { scaleX: 0, opacity: 1 });
    gsap.set(ball, { x: 0, rotate: 0, opacity: 1 });
    const timeline = gsap.timeline();
    timeline
      .to([topCurtain, bottomCurtain], { scaleY: 1, duration: 0.16 })
      .to(line, { scaleX: 1, duration: 0.16 })
      .to(ball, { x: Math.max(0, window.innerWidth - 48), rotate: 760, duration: 0.62 })
      .to([topCurtain, bottomCurtain], { scaleY: 0, duration: 0.18 })
      .to(line, { opacity: 0, duration: 0.08, onComplete: () => transition.classList.remove('is-active') });
  }

  function animateRoute(route, { transition: shouldTransition = false } = {}) {
    document.body.dataset.motionRoute = route;
    if (shouldTransition && route !== lastRoute) playPartingPitch();
    lastRoute = route;
    window.setTimeout(() => {
      const selector = ROUTE_SELECTORS[route];
      reveal(elementsFor(document, selector), { y: 22, stagger: 0.045 });
      if (route === 'timeline') {
        const timelineList = document.querySelector('.timeline-list');
        timelineList?.classList.add('timeline-list--drawn');
      }
      if (route === 'fan-dashboard') {
        reveal(Array.from(document.querySelectorAll('.fan-metrics dd')), { y: 10, scale: 0.94, stagger: 0.05 });
      }
      ScrollTrigger.refresh();
    }, 90);
  }

  if (!reduceMotion) {
    reveal(Array.from(document.querySelectorAll('.brand, .site-header__edition, .route-nav a')), { y: -10, stagger: 0.04 });
    ScrollTrigger.create({ trigger: hero, onEnter: () => reveal(Array.from(document.querySelectorAll('.hero__marker, .hero h1, .hero__description, .hero__scoreboard')), { y: 24, stagger: 0.08 }) });
    ScrollTrigger.create({ trigger: stage, onEnter: () => playPartingPitch() });
    ScrollTrigger.create({ trigger: stage, onEnter: () => reveal(Array.from(stage.querySelectorAll('.module-stage__header > *, .module-placeholder')), { y: 18, stagger: 0.04 }) });
  }

  document.addEventListener('wc26:route-intent', () => playPartingPitch());
  document.addEventListener('wc26:view-rendered', (event) => animateRoute(event.detail?.route ?? lastRoute));

  return Object.freeze({ animateRoute, playPartingPitch, refresh: ScrollTrigger.refresh });
}
