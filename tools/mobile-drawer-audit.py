from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1#tour'


def sign_in(page):
    page.fill('#email', 'student@example.test')
    page.fill('#password', 'secret')
    page.click('#login-button')
    page.wait_for_selector('#session-panel', state='hidden')


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
    print('MOBILE_DRAWER_AUDIT_PASS mobile=390 desktop=1366 escape=restores-focus route=group-matrix')
    browser.close()

