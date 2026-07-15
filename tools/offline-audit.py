from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1'
CACHE_PREFIX = 'wc26:cache:v1:'


def sign_in(page):
    page.fill('#email', 'student@example.test')
    page.fill('#password', 'secret')
    page.click('#login-button')
    page.wait_for_selector('#session-panel', state='hidden')


def cache_keys(page):
    return page.evaluate("""
() => Object.keys(localStorage).filter((key) => key.startsWith('wc26:cache:v1:')).sort()
""")


def clear_endpoint_cache(page):
    page.evaluate("""
() => {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('wc26:cache:v1:')) localStorage.removeItem(key);
  }
}
""")


def verify_offline_with_cache(browser):
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' and 'ERR_INTERNET_DISCONNECTED' not in msg.text else None)

    page.goto(BASE_URL + '#tour')
    page.wait_for_load_state('networkidle')
    sign_in(page)
    page.wait_for_selector('[data-venue-id]')
    keys = cache_keys(page)
    if CACHE_PREFIX + 'games' not in keys:
        raise AssertionError(f'Expected games cache after online tour load, got {keys}')

    context.set_offline(True)
    page.goto(BASE_URL + '#agenda')
    page.wait_for_selector('#agenda-date-label time')
    expect(page.locator('#agenda-date-label')).to_contain_text('cached data')
    if page.locator('#agenda-columns .agenda-column:not(.agenda-skeleton)').count() == 0:
        raise AssertionError('Offline cached agenda rendered no game columns')
    if console_errors:
        raise AssertionError('Console errors with cache: ' + ' | '.join(console_errors[:5]))
    context.close()


def verify_offline_without_cache(browser):
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' and 'ERR_INTERNET_DISCONNECTED' not in msg.text else None)

    page.goto(BASE_URL + '#tour')
    page.wait_for_load_state('networkidle')
    sign_in(page)
    page.wait_for_selector('[data-venue-id]')
    clear_endpoint_cache(page)
    if cache_keys(page):
        raise AssertionError(f'Endpoint cache was not cleared: {cache_keys(page)}')

    context.set_offline(True)
    page.goto(BASE_URL + '#timeline')
    expect(page.locator('#timeline-status')).to_have_text('Match timeline unavailable. Retry when the API is reachable.')
    expect(page.locator('#timeline-retry')).to_be_visible()
    expect(page.locator('#timeline-retry')).to_be_enabled()
    if page.locator('#timeline-list > li:not(.timeline-skeleton)').count() != 0:
        raise AssertionError('Offline no-cache timeline rendered data rows unexpectedly')
    if console_errors:
        raise AssertionError('Console errors without cache: ' + ' | '.join(console_errors[:5]))
    context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    verify_offline_with_cache(browser)
    verify_offline_without_cache(browser)
    print('OFFLINE_AUDIT_PASS with_cache=agenda-cached-data without_cache=timeline-retry')
    browser.close()

