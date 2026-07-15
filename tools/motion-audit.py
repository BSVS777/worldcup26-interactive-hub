from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1#tour'
MAX_REDUCED_MS = 0.011


def parse_duration_ms(value):
    durations = []
    for part in value.split(','):
        token = part.strip()
        if token.endswith('ms'):
            durations.append(float(token[:-2]))
        elif token.endswith('s'):
            durations.append(float(token[:-1]) * 1000)
        elif token:
            durations.append(float(token))
    return max(durations or [0])


REDUCED_MOTION_SCRIPT = """
() => {
  const probe = document.createElement('div');
  probe.style.animationName = 'agenda-skeleton-shimmer';
  probe.style.animationDuration = '1.4s';
  probe.style.animationIterationCount = 'infinite';
  document.body.append(probe);
  const venueCard = document.querySelector('.venue-card');
  const routeLink = document.querySelector('[data-route="agenda"]');
  const probeStyle = getComputedStyle(probe);
  const venueStyle = getComputedStyle(venueCard);
  const routeStyle = getComputedStyle(routeLink);
  const rootStyle = getComputedStyle(document.documentElement);
  const bodyStyle = getComputedStyle(document.body);
  probe.remove();
  return {
    matchesReduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
    rootScrollBehavior: rootStyle.scrollBehavior,
    bodyScrollBehavior: bodyStyle.scrollBehavior,
    venueTransitionDuration: venueStyle.transitionDuration,
    routeTransitionDuration: routeStyle.transitionDuration,
    probeAnimationDuration: probeStyle.getPropertyValue('animation-duration'),
    probeAnimationIterationCount: probeStyle.getPropertyValue('animation-iteration-count')
  };
}
"""

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.emulate_media(reduced_motion='reduce')
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    page.fill('#email', 'student@example.test')
    page.fill('#password', 'secret')
    page.click('#login-button')
    page.wait_for_selector('#session-panel', state='hidden')
    page.wait_for_selector('[data-venue-id]')

    metrics = page.evaluate(REDUCED_MOTION_SCRIPT)
    if not metrics['matchesReduce']:
        raise AssertionError('Browser did not emulate prefers-reduced-motion: reduce')
    if metrics['rootScrollBehavior'] != 'auto' or metrics['bodyScrollBehavior'] != 'auto':
        raise AssertionError(f"Smooth scrolling still enabled: {metrics}")
    for key in ['venueTransitionDuration', 'routeTransitionDuration']:
        if parse_duration_ms(metrics[key]) > MAX_REDUCED_MS:
            raise AssertionError(f"Reduced motion duration too long for {key}: {metrics[key]}")
    if console_errors:
        raise AssertionError('Console errors: ' + ' | '.join(console_errors[:5]))

    print('MOTION_AUDIT_PASS reduced_motion=emulated scroll=auto transitions<=0.01ms')
    browser.close()

