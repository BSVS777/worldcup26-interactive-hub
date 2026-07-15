from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1#timeline'
GAMES_URL_PART = '/get/games'


def sign_in(page):
    page.fill('#email', 'student@example.test')
    page.fill('#password', 'secret')
    page.click('#login-button')


def is_expected_401_console_error(message):
    return 'Failed to load resource' in message and '401' in message


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    statuses = []
    console_errors = []

    page.on('response', lambda response: statuses.append(response.status) if GAMES_URL_PART in response.url else None)
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.route('**/get/games', lambda route: route.fulfill(
        status=401,
        content_type='application/json',
        body='{"message":"expired"}'
    ))

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    sign_in(page)
    page.wait_for_selector('#session-panel[role="dialog"]')

    expect(page.locator('#session-panel')).to_have_attribute('aria-modal', 'true')
    expect(page.locator('#email')).to_be_focused()

    if 401 not in statuses:
        raise AssertionError(f'Expected a 401 /get/games response, got {statuses}')

    browser_401_errors = [message for message in console_errors if is_expected_401_console_error(message)]
    unexpected_errors = [message for message in console_errors if not is_expected_401_console_error(message)]
    if not browser_401_errors:
        raise AssertionError('Expected Chromium console to report the failed 401 resource')
    if unexpected_errors:
        raise AssertionError('Unexpected console errors: ' + ' | '.join(unexpected_errors[:5]))

    print('CONSOLE_401_AUDIT_PASS console=failed-resource-401 network=401 modal=recovery')
    context.close()
    browser.close()
