from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1'
GAMES_URL_PART = '/get/games'
PUBLIC_DATA_PATTERN = '**/get/{stadiums,games,teams,groups}'
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


def assert_no_console_errors(console_errors, label):
    if console_errors:
        raise AssertionError(f'Console errors during {label}: ' + ' | '.join(console_errors[:5]))


def verify_retry_status(browser, status_code, label):
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    statuses = []
    console_errors = []
    attempts = {'count': 0}

    page.on('response', lambda response: statuses.append(response.status) if GAMES_URL_PART in response.url else None)
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' and not msg.text.startswith('Failed to load resource:') else None)

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
    page.goto(BASE_URL + '#timeline')
    page.wait_for_load_state('networkidle')
    sign_in(page)
    expect(page.locator('#timeline-status')).to_contain_text('Retrying in')
    page.wait_for_selector('#timeline-list > li:not(.timeline-skeleton)')
    expect(page.locator('#timeline-status')).to_contain_text('matches shown')
    if status_code not in statuses or 200 not in statuses:
        raise AssertionError(f'Expected {status_code} then 200 for {label}, got {statuses}')
    if attempts['count'] < 2:
        raise AssertionError(f'Expected retry after {status_code}, got {attempts["count"]} attempts')
    assert_no_console_errors(console_errors, label)
    context.close()


def verify_cache_fallback(browser):
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' and 'Failed to load resource' not in msg.text else None)

    page.goto(BASE_URL + '#tour')
    page.wait_for_load_state('networkidle')
    clear_endpoint_cache(page)
    sign_in(page)
    page.wait_for_selector('[data-venue-id]')
    keys = cache_keys(page)
    if CACHE_PREFIX + 'games' not in keys or CACHE_PREFIX + 'stadiums' not in keys:
        raise AssertionError(f'Expected warm endpoint cache after Tour load, got {keys}')

    page.goto(BASE_URL + '#agenda')
    page.wait_for_selector('#agenda-date-label time')
    page.reload(wait_until='networkidle')
    page.route(PUBLIC_DATA_PATTERN, lambda route: route.abort())
    sign_in(page)
    page.goto(BASE_URL + '#agenda')
    page.wait_for_selector('#agenda-date-label time')
    expect(page.locator('#agenda-date-label')).to_contain_text('cached data')
    if page.locator('#agenda-columns .agenda-column:not(.agenda-skeleton)').count() == 0:
        raise AssertionError('Cache fallback rendered no Agenda game columns')
    assert_no_console_errors(console_errors, 'cache fallback')
    context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    verify_retry_status(browser, 429, '429 retry')
    verify_retry_status(browser, 500, '500 retry')
    verify_cache_fallback(browser)
    print('API_RESILIENCE_AUDIT_PASS retry=429,500 cache_fallback=agenda-cached-data')
    browser.close()