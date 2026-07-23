from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1#tour'
ROUTES = ['tour', 'agenda', 'timeline', 'fan-dashboard', 'group-matrix']


def sign_in(page):
    page.fill('#email', 'student@example.test')
    page.fill('#password', 'secret')
    page.click('#login-button')
    page.wait_for_selector('#session-panel', state='hidden')


def assert_hit_targets(page):
    failures = []
    for route in ROUTES:
        link = page.locator(f'[data-route="{route}"]')
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
            failures.append(f"{route}@{result['x']},{result['y']}->{result['target']}")
    if failures:
        raise AssertionError('Drawer links are visually covered: ' + ' | '.join(failures))


def verify_mobile_drawer(browser):
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.goto(BASE_URL)
    page.wait_for_load_state('domcontentloaded')
    sign_in(page)

    toggle = page.locator('#route-drawer-toggle')
    track = page.locator('#route-nav-track')
    expect(toggle).to_be_visible()
    expect(toggle).to_have_attribute('aria-controls', 'route-nav-track')
    expect(toggle).to_have_attribute('aria-expanded', 'false')
    expect(track).to_be_hidden()

    toggle.focus()
    expect(toggle).to_be_focused()
    page.keyboard.press('Enter')
    expect(toggle).to_have_attribute('aria-expanded', 'true')
    expect(track).to_be_visible()
    assert_hit_targets(page)

    page.locator('[data-route="agenda"]').click()
    page.wait_for_url('**#agenda')
    expect(page.locator('[data-route="agenda"]')).to_have_attribute('aria-current', 'page')
    expect(track).to_be_hidden()

    toggle.focus()
    page.keyboard.press('Enter')
    expect(track).to_be_visible()
    page.keyboard.press('Escape')
    expect(toggle).to_have_attribute('aria-expanded', 'false')
    expect(track).to_be_hidden()
    expect(toggle).to_be_focused()

    page.keyboard.press('Enter')
    expect(track).to_be_visible()
    group_link = page.locator('[data-route="group-matrix"]')
    group_link.focus()
    expect(group_link).to_be_focused()
    page.keyboard.press('Enter')
    page.wait_for_url('**#group-matrix')
    expect(group_link).to_have_attribute('aria-current', 'page')
    expect(toggle).to_have_attribute('aria-expanded', 'false')
    expect(track).to_be_hidden()
    page.close()


def verify_desktop_navigation(browser):
    page = browser.new_page(viewport={"width": 1366, "height": 768})
    page.goto(BASE_URL)
    page.wait_for_load_state('domcontentloaded')
    sign_in(page)

    expect(page.locator('#route-drawer-toggle')).to_be_hidden()
    expect(page.locator('#route-nav-track')).to_be_visible()
    page.locator('[data-route="agenda"]').click()
    page.wait_for_url('**#agenda')
    expect(page.locator('[data-route="agenda"]')).to_have_attribute('aria-current', 'page')
    page.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    verify_mobile_drawer(browser)
    verify_desktop_navigation(browser)
    print('MOBILE_DRAWER_AUDIT_PASS mobile=390 hit-testing=all-links click=agenda desktop=1366 escape=restores-focus enter=group-matrix')
    browser.close()
