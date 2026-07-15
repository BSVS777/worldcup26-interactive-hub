from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1#timeline'
GAMES_URL_PART = '/get/games'


def sign_in(page):
    page.fill('#email', 'student@example.test')
    page.fill('#password', 'secret')
    page.click('#login-button')


def watch_game_statuses(page):
    statuses = []
    page.on('response', lambda response: statuses.append(response.status) if GAMES_URL_PART in response.url else None)
    return statuses


def assert_no_console_errors(console_errors, label):
    if console_errors:
        raise AssertionError(f'Console errors during {label}: ' + ' | '.join(console_errors[:5]))


def verify_401(browser):
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    statuses = watch_game_statuses(page)
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' and not msg.text.startswith('Failed to load resource:') else None)
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
    assert_no_console_errors(console_errors, '401 recovery')
    context.close()


def verify_retry_status(browser, status_code, label):
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    statuses = watch_game_statuses(page)
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' and not msg.text.startswith('Failed to load resource:') else None)
    attempts = {'count': 0}

    def handle_games(route):
        attempts['count'] += 1
        if attempts['count'] == 1:
            headers = {'Retry-After': '1'} if status_code == 429 else {}
            route.fulfill(
                status=status_code,
                content_type='application/json',
                headers=headers,
                body=f'{{"message":"forced {status_code}"}}'
            )
            return
        route.continue_()

    page.route('**/get/games', handle_games)
    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    sign_in(page)
    expect(page.locator('#timeline-status')).to_contain_text('Retrying in')
    page.wait_for_selector('#timeline-list > li:not(.timeline-skeleton)')
    expect(page.locator('#timeline-status')).to_contain_text('matches shown')
    if status_code not in statuses or 200 not in statuses:
        raise AssertionError(f'Expected {status_code} then 200 /get/games responses for {label}, got {statuses}')
    if attempts['count'] < 2:
        raise AssertionError(f'Expected retry after {status_code}, got {attempts["count"]} attempts')
    assert_no_console_errors(console_errors, label)
    context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    verify_401(browser)
    verify_retry_status(browser, 429, '429 retry')
    verify_retry_status(browser, 500, '500 retry')
    print('FAILURE_AUDIT_PASS network=401,429,500 countdown429=visible retry500=recovered')
    browser.close()
