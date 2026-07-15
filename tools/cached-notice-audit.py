from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1'
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


def wait_for_cached_text(locator, label):
    expect(locator).to_contain_text('cached data', timeout=5000, ignore_case=True)
    return locator.inner_text()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' and 'Failed to load resource' not in msg.text else None)

    page.goto(BASE_URL + '#tour')
    page.wait_for_load_state('networkidle')
    clear_endpoint_cache(page)
    sign_in(page)

    # Populate every public endpoint cache through the real app client.
    page.wait_for_selector('[data-venue-id]')
    page.goto(BASE_URL + '#group-matrix')
    page.wait_for_selector('.matrix-table')
    keys = cache_keys(page)
    expected_keys = {CACHE_PREFIX + endpoint for endpoint in ['stadiums', 'games', 'teams', 'groups']}
    missing = expected_keys.difference(keys)
    if missing:
        raise AssertionError(f'Expected endpoint cache keys missing after online warmup: {sorted(missing)} from {keys}')

    # Recreate app state so each module must load through cache fallback, not previous in-memory state.
    page.goto(BASE_URL + '#tour')
    page.wait_for_load_state('networkidle')
    page.reload(wait_until='networkidle')
    page.route(PUBLIC_DATA_PATTERN, lambda route: route.abort())
    sign_in(page)

    results = {}

    page.goto(BASE_URL + '#tour')
    page.wait_for_selector('[data-venue-id]')
    page.locator('[data-venue-id]').first.click()
    results['tour'] = wait_for_cached_text(page.locator('#tour-venue-detail h3'), 'tour')

    page.goto(BASE_URL + '#agenda')
    page.wait_for_selector('#agenda-date-label time')
    results['agenda'] = wait_for_cached_text(page.locator('#agenda-date-label'), 'agenda')
    if page.locator('#agenda-columns .agenda-column:not(.agenda-skeleton)').count() == 0:
        raise AssertionError('Cached agenda rendered no game columns')

    page.goto(BASE_URL + '#timeline')
    page.wait_for_selector('#timeline-list > li:not(.timeline-skeleton)')
    results['timeline'] = wait_for_cached_text(page.locator('#timeline-status'), 'timeline')
    if page.locator('#timeline-list > li:not(.timeline-skeleton)').count() != 10:
        raise AssertionError('Cached timeline did not render the first batch of 10 rows')

    page.goto(BASE_URL + '#fan-dashboard')
    expect(page.locator('#fan-team-select option')).to_have_count(48)
    results['fan-dashboard'] = wait_for_cached_text(page.locator('#fan-status'), 'fan-dashboard')
    if page.locator('#fan-metrics dd').count() == 0:
        raise AssertionError('Cached fan dashboard rendered no metrics')

    page.goto(BASE_URL + '#group-matrix')
    page.wait_for_selector('.matrix-table')
    results['group-matrix'] = wait_for_cached_text(page.locator('#matrix-status'), 'group-matrix')
    if page.locator('.matrix-table').count() != 12:
        raise AssertionError('Cached matrix did not render 12 group tables')

    if console_errors:
        raise AssertionError('Console errors during cached notice audit: ' + ' | '.join(console_errors[:5]))

    for route, text in results.items():
        print(f'{route}: {text}')
    print('CACHED_NOTICE_AUDIT_PASS routes=5 cache_keys=4 blocked_network=get-endpoints')
    browser.close()
