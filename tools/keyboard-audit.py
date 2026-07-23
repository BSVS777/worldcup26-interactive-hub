from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1'
ROUTES = ['tour', 'agenda', 'timeline', 'fan-dashboard', 'group-matrix']


def active_id(page):
    return page.evaluate("document.activeElement && document.activeElement.id")


def active_tag(page):
    return page.evaluate("document.activeElement && document.activeElement.tagName.toLowerCase()")


def tab_until(page, selector, limit=30):
    for _ in range(limit):
        page.keyboard.press('Tab')
        if page.locator(selector).evaluate("element => element === document.activeElement"):
            return
    raise AssertionError(f'Could not reach {selector} with Tab')


def assert_pointer_target(page, link):
    result = link.evaluate("""
element => {
  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const target = document.elementFromPoint(x, y);
  return {
    x: Math.round(x),
    y: Math.round(y),
    target: target ? `${target.tagName.toLowerCase()}#${target.id}.${target.className}` : 'null',
    matches: target === element || element.contains(target)
  };
}
""")
    if not result['matches']:
        raise AssertionError(
            f"Focused route link is visually covered at {result['x']},{result['y']}: {result['target']}"
        )


def sign_in_with_keyboard(page, wait_for_hidden=True):
    tab_until(page, '#email')
    page.keyboard.type('student@example.test')
    page.keyboard.press('Tab')
    if active_id(page) != 'password':
        raise AssertionError(f'Expected password focus, got {active_id(page)}')
    page.keyboard.type('secret')
    page.keyboard.press('Tab')
    if active_id(page) != 'login-button':
        raise AssertionError(f'Expected login button focus, got {active_id(page)}')
    page.keyboard.press('Enter')
    if wait_for_hidden:
        page.wait_for_selector('#session-panel', state='hidden')
        expect(page.locator('#main-content')).to_be_focused()


def open_mobile_drawer_if_needed(page):
    toggle = page.locator('#route-drawer-toggle')
    if not toggle.is_visible():
        return
    if toggle.get_attribute('aria-expanded') == 'true':
        return
    toggle.focus()
    expect(toggle).to_be_focused()
    page.keyboard.press('Enter')
    expect(toggle).to_have_attribute('aria-expanded', 'true')
    expect(page.locator('#route-nav-track')).to_be_visible()


def activate_route(page, route):
    open_mobile_drawer_if_needed(page)
    link = page.locator(f'[data-route="{route}"]')
    link.focus()
    expect(link).to_be_focused()
    page.keyboard.press('Enter')
    page.wait_for_function("route => location.hash === '#' + route", arg=route)
    expect(link).to_have_attribute('aria-current', 'page')
    page.wait_for_load_state('networkidle')


def verify_route_tab_order(page):
    page.goto('http://127.0.0.1:4173/#tour')
    page.wait_for_load_state('domcontentloaded')
    tab_until(page, '#language-toggle')
    page.keyboard.press('Tab')
    if page.locator('#route-drawer-toggle').is_visible():
        expect(page.locator('#route-drawer-toggle')).to_be_focused()
        page.keyboard.press('Enter')
        expect(page.locator('#route-nav-track')).to_be_visible()
        page.keyboard.press('Tab')

    for index, route in enumerate(ROUTES):
        link = page.locator(f'[data-route="{route}"]')
        expect(link).to_be_focused()
        assert_pointer_target(page, link)
        if index < len(ROUTES) - 1:
            page.keyboard.press('Tab')

    page.keyboard.press('Enter')
    page.wait_for_function("() => location.hash === '#group-matrix'")
    expect(page.locator('[data-route="group-matrix"]')).to_have_attribute('aria-current', 'page')


def verify_module_controls(page):
    activate_route(page, 'tour')
    page.wait_for_selector('[data-venue-id]')
    first_venue = page.locator('[data-venue-id]').first
    first_venue.focus()
    page.keyboard.press('Enter')
    expect(page.locator('#tour-venue-detail h3')).to_be_focused()

    activate_route(page, 'agenda')
    page.wait_for_selector('#agenda-next:not([disabled])')
    before_date = page.locator('#agenda-date-label').inner_text()
    page.locator('#agenda-next').focus()
    page.keyboard.press('Enter')
    page.wait_for_function("previous => document.querySelector('#agenda-date-label')?.textContent !== previous", arg=before_date)
    page.locator('#agenda-prev').focus()
    page.keyboard.press('Enter')
    page.wait_for_function("previous => document.querySelector('#agenda-date-label')?.textContent === previous", arg=before_date)

    activate_route(page, 'timeline')
    page.wait_for_selector('#timeline-load-more:not([hidden])')
    before_count = page.locator('#timeline-list > li').count()
    page.locator('#timeline-load-more').focus()
    page.keyboard.press('Enter')
    page.wait_for_function("count => document.querySelectorAll('#timeline-list > li').length > count", arg=before_count)

    activate_route(page, 'fan-dashboard')
    page.wait_for_function("() => document.querySelectorAll('#fan-team-select option').length > 1")
    selector = page.locator('#fan-team-select')
    selector.focus()
    expect(selector).to_be_focused()
    before_value = selector.input_value()
    page.keyboard.press('ArrowDown')
    page.keyboard.press('Enter')
    page.wait_for_function("previous => document.querySelector('#fan-team-select')?.value !== previous", arg=before_value)

    activate_route(page, 'group-matrix')
    page.wait_for_selector('#matrix-grid table')
    if page.locator('#matrix-grid table').count() != 12:
        raise AssertionError('Expected 12 group matrix tables after keyboard route activation')


def verify_skip_link(page):
    page.keyboard.press('Tab')
    expect(page.locator('.skip-link')).to_be_focused()
    page.keyboard.press('Enter')
    expect(page.locator('#main-content')).to_be_focused()


def verify_expired_modal_trap(browser):
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.route('http://127.0.0.1:4174/get/games', lambda route: route.fulfill(
        status=401,
        content_type='application/json',
        body='{"message":"expired"}'
    ))
    page.goto(BASE_URL + '#tour')
    page.wait_for_load_state('networkidle')
    sign_in_with_keyboard(page, wait_for_hidden=False)
    page.wait_for_selector('#session-panel[role="dialog"]')
    expect(page.locator('#session-panel')).to_have_attribute('aria-modal', 'true')
    expect(page.locator('#email')).to_be_focused()
    page.keyboard.press('Shift+Tab')
    expect(page.locator('#login-button')).to_be_focused()
    page.keyboard.press('Tab')
    expect(page.locator('#email')).to_be_focused()
    page.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

    page.goto('http://127.0.0.1:4173/#tour')
    page.wait_for_load_state('domcontentloaded')
    verify_skip_link(page)
    verify_route_tab_order(page)

    page.goto(BASE_URL + '#tour')
    page.wait_for_load_state('domcontentloaded')
    sign_in_with_keyboard(page)
    verify_module_controls(page)
    verify_expired_modal_trap(browser)

    if console_errors:
        raise AssertionError('Console errors: ' + ' | '.join(console_errors[:5]))

    print(f"KEYBOARD_AUDIT_PASS routes={len(ROUTES)} route_tab_order=verified login=keyboard modal_trap=verified")
    browser.close()
