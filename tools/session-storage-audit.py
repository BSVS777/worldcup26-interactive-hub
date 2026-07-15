from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1#fan-dashboard'
FORBIDDEN_FRAGMENTS = ['bearer', 'authorization', 'password', 'test.', '.signature', 'jwt', 'token']
ALLOWED_KEY_PREFIXES = (
    'wc26:cache:v1:',
    'wc26:cache:v2:',
    'wc26:favorite-team:',
    'wc26:fan-snapshot:',
    'wc26:a11y-preferences:'
)


def sign_in(page):
    page.fill('#email', 'student@example.test')
    page.fill('#password', 'secret')
    page.click('#login-button')


def storage_snapshot(page):
    return page.evaluate("""
    () => ({
      local: Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index);
        return [key, localStorage.getItem(key)];
      })),
      session: Object.fromEntries(Array.from({ length: sessionStorage.length }, (_, index) => {
        const key = sessionStorage.key(index);
        return [key, sessionStorage.getItem(key)];
      }))
    })
    """)


def assert_no_sensitive_storage(snapshot):
    unexpected_keys = []
    sensitive_values = []
    for area_name in ['local', 'session']:
        for key, value in snapshot[area_name].items():
            key_lower = key.lower()
            value_lower = str(value).lower()
            if area_name == 'local' and key.startswith(ALLOWED_KEY_PREFIXES):
                pass
            elif key:
                unexpected_keys.append(f'{area_name}:{key}')
            for fragment in FORBIDDEN_FRAGMENTS:
                if fragment in key_lower or fragment in value_lower:
                    sensitive_values.append(f'{area_name}:{key}')
                    break
    if unexpected_keys:
        raise AssertionError('Unexpected storage keys after login: ' + ', '.join(unexpected_keys))
    if sensitive_values:
        raise AssertionError('Sensitive token-like values persisted in storage: ' + ', '.join(sensitive_values))


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    console_errors = []
    auth_statuses = []

    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.on('response', lambda response: auth_statuses.append(response.status) if '/auth/authenticate' in response.url else None)

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    sign_in(page)
    page.wait_for_selector('#session-panel', state='hidden')
    page.wait_for_selector('#fan-dashboard-view[data-fan-themed="true"]')

    snapshot = storage_snapshot(page)
    assert_no_sensitive_storage(snapshot)

    page.reload()
    page.wait_for_load_state('networkidle')
    expect(page.locator('#session-panel')).to_be_visible()
    expect(page.locator('#email')).to_be_visible()

    if 200 not in auth_statuses:
        raise AssertionError(f'Expected successful auth response before storage audit, got {auth_statuses}')
    if console_errors:
        raise AssertionError('Console errors: ' + ' | '.join(console_errors[:5]))

    print('SESSION_STORAGE_AUDIT_PASS token=memory-only storage=no-sensitive-values reload=requires-login')
    context.close()
    browser.close()
