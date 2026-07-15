from playwright.sync_api import sync_playwright

BASE_URL = 'http://127.0.0.1:4173/?testMode=1'
ROUTES = ['tour', 'agenda', 'timeline', 'fan-dashboard', 'group-matrix']
VIEWPORTS = [
    ('mobile-320', 320, 720),
    ('mobile-390', 390, 844),
    ('tablet-768', 768, 1024),
    ('desktop-1366', 1366, 768),
    ('wide-1920', 1920, 1080),
]

RESPONSIVE_SCRIPT = """
() => {
  const viewportWidth = document.documentElement.clientWidth;
  const docWidth = document.documentElement.scrollWidth;
  const bodyWidth = document.body.scrollWidth;
  const allowedScrollable = (element) => {
    for (let node = element; node && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowX)) return true;
      if (node.classList.contains('matrix-table-shell')) return true;
      if (node.classList.contains('route-nav__track')) return true;
    }
    return false;
  };
  const offenders = [...document.body.querySelectorAll('*')]
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      if (element.closest('[hidden]')) return false;
      if (allowedScrollable(element)) return false;
      return rect.left < -1 || rect.right > viewportWidth + 1;
    })
    .slice(0, 8)
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      id: element.id,
      className: String(element.className || ''),
      left: Math.round(element.getBoundingClientRect().left),
      right: Math.round(element.getBoundingClientRect().right),
      width: Math.round(element.getBoundingClientRect().width)
    }));
  return {
    viewportWidth,
    docWidth,
    bodyWidth,
    hasGlobalOverflow: docWidth > viewportWidth + 1 || bodyWidth > viewportWidth + 1,
    offenders,
    activeRoute: location.hash.replace('#', ''),
    currentHeading: document.querySelector('#view-title')?.textContent || '',
    sessionHidden: document.querySelector('#session-panel')?.hidden,
    moduleStageVisible: !!document.querySelector('.module-stage')?.getBoundingClientRect().height,
  };
}
"""

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

    page.goto(BASE_URL + '#tour')
    page.wait_for_load_state('networkidle')
    page.fill('#email', 'student@example.test')
    page.fill('#password', 'secret')
    page.click('#login-button')
    page.wait_for_selector('#session-panel', state='hidden')
    page.wait_for_load_state('networkidle')

    results = []
    for label, width, height in VIEWPORTS:
        page.set_viewport_size({"width": width, "height": height})
        for route in ROUTES:
            page.goto(BASE_URL + '#' + route)
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(250)
            metrics = page.evaluate(RESPONSIVE_SCRIPT)
            if metrics['hasGlobalOverflow'] or metrics['offenders']:
                raise AssertionError(f"Responsive overflow at {label} {route}: {metrics}")
            if not metrics['sessionHidden']:
                raise AssertionError(f"Session panel still visible after login at {label} {route}")
            if not metrics['moduleStageVisible']:
                raise AssertionError(f"Module stage missing at {label} {route}")
            results.append(f"{label}:{route}:doc={metrics['docWidth']}/viewport={metrics['viewportWidth']}:heading={metrics['currentHeading']}")

    if console_errors:
        raise AssertionError('Console errors: ' + ' | '.join(console_errors[:5]))

    for result in results:
        print(result)
    print(f"RESPONSIVE_AUDIT_PASS viewports={len(VIEWPORTS)} routes={len(ROUTES)} checks={len(results)}")
    browser.close()