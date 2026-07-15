from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173'
HEADER_PATHS = ['/', '/css/styles.css', '/js/app.js', '/api/not-allowed']


def assert_security_headers(url, headers):
    csp = headers.get('content-security-policy')
    x_frame = headers.get('x-frame-options')
    referrer = headers.get('referrer-policy')
    nosniff = headers.get('x-content-type-options')

    if not csp or "frame-ancestors 'none'" not in csp:
        raise AssertionError(f'Missing frame-ancestors on {url}: {csp}')
    if "default-src 'self'" not in csp or "base-uri 'self'" not in csp or "form-action 'self'" not in csp:
        raise AssertionError(f'CSP missing core self restrictions on {url}: {csp}')
    if x_frame != 'DENY':
        raise AssertionError(f'Expected X-Frame-Options DENY on {url}, got {x_frame}')
    if referrer != 'strict-origin-when-cross-origin':
        raise AssertionError(f'Expected strict referrer policy on {url}, got {referrer}')
    if nosniff != 'nosniff':
        raise AssertionError(f'Expected nosniff on {url}, got {nosniff}')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    console_errors = []

    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    response = page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    expect(page.locator('#main-content')).to_be_visible()
    assert_security_headers(BASE_URL, response.headers)

    for path in HEADER_PATHS[1:]:
        url = f'{BASE_URL}{path}'
        check = context.request.get(url)
        assert_security_headers(url, check.headers)

    unexpected_console = [
        message for message in console_errors
        if 'Failed to load resource' not in message
    ]
    if unexpected_console:
        raise AssertionError('Console errors: ' + ' | '.join(unexpected_console[:5]))

    print('SECURITY_HEADERS_AUDIT_PASS paths=4 frame_ancestors=none x_frame=DENY')
    context.close()
    browser.close()