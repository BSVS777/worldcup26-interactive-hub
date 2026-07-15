from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1'
ROUTES = ['tour', 'agenda', 'timeline', 'fan-dashboard', 'group-matrix']
REFLOW_VIEWPORTS = [
    ('zoom-200-equivalent', 640, 720),
    ('zoom-400-equivalent', 320, 720),
]

REFLOW_SCRIPT = """
() => {
  const viewportWidth = document.documentElement.clientWidth;
  const allowedScrollable = (element) => {
    for (let node = element; node && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowX)) return true;
      if (node.classList.contains('matrix-table-shell')) return true;
      if (node.classList.contains('route-nav__track')) return true;
    }
    return false;
  };
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && !element.closest('[hidden]');
  };
  const overflowOffenders = [...document.body.querySelectorAll('*')]
    .filter((element) => {
      if (!visible(element) || allowedScrollable(element)) return false;
      const rect = element.getBoundingClientRect();
      return rect.left < -1 || rect.right > viewportWidth + 1;
    })
    .slice(0, 8)
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      id: element.id,
      className: String(element.className || ''),
      text: (element.textContent || '').trim().slice(0, 40),
      left: Math.round(element.getBoundingClientRect().left),
      right: Math.round(element.getBoundingClientRect().right),
      width: Math.round(element.getBoundingClientRect().width)
    }));
  const textControls = [...document.querySelectorAll('button, a, label, select, input, [role="button"]')]
    .filter((element) => visible(element) && !allowedScrollable(element))
    .filter((element) => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
    .slice(0, 8)
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      id: element.id,
      className: String(element.className || ''),
      text: (element.textContent || element.getAttribute('aria-label') || element.getAttribute('value') || '').trim().slice(0, 40),
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight
    }));
  return {
    route: location.hash.replace('#', ''),
    viewportWidth,
    docWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    overflowOffenders,
    textControls,
    activeElementId: document.activeElement?.id || '',
    sessionHidden: document.querySelector('#session-panel')?.hidden,
    h1: document.querySelector('#view-title')?.textContent || ''
  };
}
"""


def sign_in(page):
    page.fill('#email', 'student@example.test')
    page.fill('#password', 'secret')
    page.click('#login-button')
    page.wait_for_selector('#session-panel', state='hidden')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 640, "height": 720})
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

    page.goto(BASE_URL + '#tour')
    page.wait_for_load_state('networkidle')
    sign_in(page)

    checks = []
    for label, width, height in REFLOW_VIEWPORTS:
        page.set_viewport_size({"width": width, "height": height})
        for route in ROUTES:
            page.goto(BASE_URL + '#' + route)
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(250)
            metrics = page.evaluate(REFLOW_SCRIPT)
            if not metrics['sessionHidden']:
                raise AssertionError(f'Session panel visible during {label} {route}: {metrics}')
            if metrics['docWidth'] > metrics['viewportWidth'] + 1 or metrics['bodyWidth'] > metrics['viewportWidth'] + 1:
                raise AssertionError(f'Global reflow overflow during {label} {route}: {metrics}')
            if metrics['overflowOffenders']:
                raise AssertionError(f'Visible elements overflow viewport during {label} {route}: {metrics}')
            if metrics['textControls']:
                raise AssertionError(f'Interactive text clipped during {label} {route}: {metrics}')
            checks.append(f"{label}:{route}:width={metrics['viewportWidth']}:heading={metrics['h1']}")

    if console_errors:
        raise AssertionError('Console errors: ' + ' | '.join(console_errors[:5]))

    for check in checks:
        print(check)
    print(f'ZOOM_REFLOW_AUDIT_PASS zoom_levels=2 routes={len(ROUTES)} checks={len(checks)}')
    browser.close()