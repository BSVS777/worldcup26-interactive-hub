import { gsap, ScrollTrigger } from './vendor/gsap-core.js';

const ROUTE_SELECTORS = Object.freeze({
  tour: '.venue-card, .venue-detail',
  agenda: '.agenda-nav, .agenda-column',
  timeline: '.timeline-status, .timeline-list::before, .timeline-item',
  'fan-dashboard': '.fan-toolbar, .fan-summary, .fan-metrics dd, .fan-match',
  'group-matrix': '.matrix-card, .matrix-table tr'
});

const BAR_PALETTE = Object.freeze([
  'var(--pitch)', 'var(--pitch)', 'var(--canopy)', 'var(--pitch)',
  'var(--gold)', 'var(--pitch)', 'var(--pitch)', 'var(--canopy)',
  'var(--ember)', 'var(--pitch)', 'var(--pitch)', 'var(--aqua)'
]);
const SWEEP_MS = 620;
const OPEN_MS = 260;

function elementsFor(document, selector) {
  if (!selector || selector.includes('::')) return [];
  return Array.from(document.querySelectorAll(selector));
}

function easeOutCubicInverse(p) {
  return 1 - (1 - p) ** (1 / 3);
}

export function createMotionSystem(document, window) {
  function isReduceMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
      || document.documentElement.dataset.reduceMotion === 'true';
  }
  const reduceMotion = isReduceMotion();
  const transition = document.getElementById('pitch-transition');
  const bars = transition?.querySelector('.pitch-transition__bars');
  const hero = document.querySelector('.hero');
  const stage = document.querySelector('.module-stage');
  let lastRoute = '';
  let closeTimer = null;

  document.documentElement.classList.add('has-motion-system');
  gsap.registerPlugin(ScrollTrigger);

  function reveal(elements, options = {}) {
    if (isReduceMotion() || elements.length === 0) return;
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
    if (isReduceMotion() || !transition || !bars) return;
    window.clearTimeout(closeTimer);
    transition.classList.add('is-active');

    const width = window.innerWidth || document.documentElement.clientWidth;
    const count = Math.max(12, Math.round(width / 56));
    const barWidth = width / count;
    bars.innerHTML = '';
    const built = [];
    for (let i = 0; i < count; i += 1) {
      const bar = document.createElement('div');
      bar.className = 'pitch-transition__bar';
      bar.style.setProperty('--bar-color', BAR_PALETTE[i % BAR_PALETTE.length]);
      bar.innerHTML =
        '<div class="pitch-transition__bar-half pitch-transition__bar-half--top"></div>' +
        '<div class="pitch-transition__bar-half pitch-transition__bar-half--bottom"></div>';
      const delay = Math.round(easeOutCubicInverse(((i + 0.5) * barWidth) / width) * SWEEP_MS);
      bar.querySelectorAll('.pitch-transition__bar-half').forEach((half) => {
        half.style.transitionDelay = `${delay}ms`;
      });
      bars.appendChild(bar);
      built.push(bar);
    }

    bars.offsetHeight;
    requestAnimationFrame(() => built.forEach((bar) => bar.classList.add('is-open')));
    closeTimer = window.setTimeout(() => transition.classList.remove('is-active'), SWEEP_MS + OPEN_MS + 80);
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
    ScrollTrigger.create({ trigger: stage, onEnter: () => reveal(Array.from(stage.querySelectorAll('.module-stage__header > *, .module-placeholder')), { y: 18, stagger: 0.04 }) });
  }

  document.addEventListener('wc26:route-intent', () => playPartingPitch());
  document.addEventListener('wc26:view-rendered', (event) => animateRoute(event.detail?.route ?? lastRoute));

  return Object.freeze({ animateRoute, playPartingPitch, refresh: ScrollTrigger.refresh });
}
