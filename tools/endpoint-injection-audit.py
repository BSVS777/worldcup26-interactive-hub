from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1&apiBase=https://evil.example#agenda'
MALICIOUS_HOST = 'evil.example'
LOCAL_TEST_HOST = '127.0.0.1:4174'


def sign_in(page):
    page.fill('#email', 'student@example.test')
    page.fill('#password', 'secret')
    page.click('#login-button')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    console_errors = []
    request_urls = []
    response_statuses = []

    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.on('request', lambda request: request_urls.append(request.url))
    page.on('response', lambda response: response_statuses.append((response.url, response.status)) if '/get/' in response.url or '/auth/' in response.url else None)

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    sign_in(page)
    page.wait_for_selector('#session-panel', state='hidden')
    page.wait_for_selector('#agenda-columns .agenda-column:not(.agenda-skeleton)')

    malicious = [
        url for url in request_urls
        if page.evaluate('([url, host]) => new URL(url).host === host', [url, MALICIOUS_HOST])
    ]
    if malicious:
        raise AssertionError('apiBase query injection produced external requests: ' + ' | '.join(malicious[:5]))

    data_requests = [url for url in request_urls if '/get/' in url or '/auth/authenticate' in url]
    if not data_requests:
        raise AssertionError('Expected authenticated data requests in test mode')
    unexpected_hosts = [url for url in data_requests if LOCAL_TEST_HOST not in url]
    if unexpected_hosts:
        raise AssertionError('Expected data requests to use fixed local test API only: ' + ' | '.join(unexpected_hosts[:5]))

    proxy_response = context.request.get(
        'http://127.0.0.1:4173/api/get/games?target=https://evil.example/get/games',
        headers={'Authorization': 'Bearer probe'}
    )
    if proxy_response.status != 404:
        raise AssertionError(f'Expected proxy query target rejection status 404, got {proxy_response.status} {proxy_response.text()}')

    statuses = [status for _, status in response_statuses]
    if statuses.count(200) < 3:
        raise AssertionError(f'Expected auth, games and teams successful responses, got {response_statuses}')
    unexpected_console = [message for message in console_errors if not ('Failed to load resource' in message and '404' in message)]
    if unexpected_console:
        raise AssertionError('Console errors: ' + ' | '.join(unexpected_console[:5]))

    expect(page.locator('#test-mode-badge')).to_be_visible()
    print('ENDPOINT_INJECTION_AUDIT_PASS apiBase=ignored data_host=127.0.0.1:4174 proxy_query=404')
    context.close()
    browser.close()
