const triggers = [];
let listening = false;
let ticking = false;
let activeWindow = null;

function asElements(targets) {
  if (!targets) return [];
  if (typeof targets === 'string') return Array.from(document.querySelectorAll(targets));
  if (typeof targets.length === 'number' && !targets.nodeType) return Array.from(targets).filter(Boolean);
  return [targets].filter(Boolean);
}

function numericValue(value) {
  if (typeof value === 'number') return value;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function transformFrom(vars) {
  const pieces = [];
  if ('x' in vars) pieces.push(`translateX(${numericValue(vars.x)}px)`);
  if ('y' in vars) pieces.push(`translateY(${numericValue(vars.y)}px)`);
  if ('scale' in vars) pieces.push(`scale(${numericValue(vars.scale)})`);
  if ('scaleX' in vars) pieces.push(`scaleX(${numericValue(vars.scaleX)})`);
  if ('scaleY' in vars) pieces.push(`scaleY(${numericValue(vars.scaleY)})`);
  if ('rotate' in vars) pieces.push(`rotate(${numericValue(vars.rotate)}deg)`);
  return pieces.join(' ');
}

function applyVars(element, vars) {
  const transform = transformFrom(vars);
  if (transform) element.style.transform = transform;
  if ('opacity' in vars) element.style.opacity = String(vars.opacity);
  if ('filter' in vars) element.style.filter = vars.filter;
  if ('visibility' in vars) element.style.visibility = vars.visibility;
}

function animateElement(element, vars) {
  const duration = Math.max(0, numericValue(vars.duration ?? 0.3)) * 1000;
  const delay = Math.max(0, numericValue(vars.delay ?? 0)) * 1000;
  const finalVars = { ...vars };
  delete finalVars.duration;
  delete finalVars.delay;
  delete finalVars.ease;
  delete finalVars.stagger;
  delete finalVars.onComplete;
  const transition = [
    `transform ${duration}ms cubic-bezier(.2,.8,.2,1) ${delay}ms`,
    `opacity ${duration}ms ease ${delay}ms`,
    `filter ${duration}ms ease ${delay}ms`
  ].join(', ');
  element.style.transition = transition;
  requestAnimationFrame(() => applyVars(element, finalVars));
  if (typeof vars.onComplete === 'function') {
    window.setTimeout(vars.onComplete, duration + delay + 20);
  }
}

function scheduleUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    for (const trigger of triggers) trigger.update();
  });
}

function ensureListeners(win) {
  if (listening) return;
  activeWindow = win ?? window;
  activeWindow.addEventListener('scroll', scheduleUpdate, { passive: true });
  activeWindow.addEventListener('resize', scheduleUpdate);
  listening = true;
}

export const gsap = Object.freeze({
  registerPlugin() {},
  set(targets, vars) {
    for (const element of asElements(targets)) applyVars(element, vars);
  },
  to(targets, vars) {
    const elements = asElements(targets);
    const stagger = numericValue(vars.stagger ?? 0);
    elements.forEach((element, index) => animateElement(element, { ...vars, delay: numericValue(vars.delay ?? 0) + (index * stagger) }));
    return { kill() {} };
  },
  fromTo(targets, fromVars, toVars) {
    const elements = asElements(targets);
    for (const element of elements) applyVars(element, fromVars);
    requestAnimationFrame(() => gsap.to(elements, toVars));
    return { kill() {} };
  },
  timeline() {
    let offset = 0;
    return {
      to(targets, vars) {
        gsap.to(targets, { ...vars, delay: offset + numericValue(vars.delay ?? 0) });
        offset += numericValue(vars.duration ?? 0);
        return this;
      },
      fromTo(targets, fromVars, toVars) {
        gsap.set(targets, fromVars);
        gsap.to(targets, { ...toVars, delay: offset + numericValue(toVars.delay ?? 0) });
        offset += numericValue(toVars.duration ?? 0);
        return this;
      }
    };
  },
  utils: Object.freeze({ toArray: asElements })
});

export const ScrollTrigger = Object.freeze({
  create(config) {
    const trigger = typeof config.trigger === 'string' ? document.querySelector(config.trigger) : config.trigger;
    let entered = false;
    const item = {
      update() {
        if (!trigger?.getBoundingClientRect) return;
        const rect = trigger.getBoundingClientRect();
        const threshold = (activeWindow?.innerHeight ?? window.innerHeight) * 0.84;
        const visible = rect.top < threshold && rect.bottom > 0;
        if (visible && !entered) {
          entered = true;
          config.onEnter?.(this);
        }
        if (!visible && entered && rect.top > threshold) {
          entered = false;
          config.onLeaveBack?.(this);
        }
      },
      kill() {
        const index = triggers.indexOf(item);
        if (index >= 0) triggers.splice(index, 1);
      }
    };
    triggers.push(item);
    ensureListeners(window);
    item.update();
    return item;
  },
  refresh() {
    scheduleUpdate();
  }
});
