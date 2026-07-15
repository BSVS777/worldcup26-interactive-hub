from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1#tour'
GAMES_URL_PART = '/get/games'


def sign_in(page):
    page.fill('#email', 'student@example.test')
    page.fill('#password', 'secret')
    page.click('#login-button')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    games_statuses = []
    console_errors = []

    page.on('response', lambda response: games_statuses.append(response.status) if GAMES_URL_PART in response.url else None)
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' and not msg.text.startswith('Failed to load resource:') else None)
    page.route('**/get/games', lambda route: route.fulfill(
        status=500,
        content_type='application/json',
        body='{"message":"forced games outage"}'
    ))

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    sign_in(page)
    page.wait_for_selector('#session-panel', state='hidden')
    page.wait_for_selector('[data-venue-id]')

    venue_buttons = page.locator('[data-venue-id]')
    count = venue_buttons.count()
    if count < 2:
        raise AssertionError(f'Expected at least two venue cards after games outage, got {count}')

    first = venue_buttons.nth(0)
    second = venue_buttons.nth(1)
    expect(first).to_be_enabled()
    expect(second).to_be_enabled()
    expect(first.locator('.venue-card__games')).to_contain_text('Match data unavailable')
    expect(second.locator('.venue-card__games')).to_contain_text('Match data unavailable')

    first_name = first.locator('.venue-card__name').evaluate('element => element.textContent')
    second_name = second.locator('.venue-card__name').evaluate('element => element.textContent')

    first.click()
    expect(first).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('#tour-venue-detail [role="alert"]')).to_contain_text(f'Match data for {first_name} is unavailable')

    second.click()
    expect(second).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('#tour-venue-detail [role="alert"]')).to_contain_text(f'Match data for {second_name} is unavailable')

    if 500 not in games_statuses:
        raise AssertionError(f'Expected forced /get/games 500 response, got {games_statuses}')
    if console_errors:
        raise AssertionError('Console errors: ' + ' | '.join(console_errors[:5]))

    print(f'TOUR_PARTIAL_FAILURE_AUDIT_PASS venues={count} games_status=500 clickable=2 local_errors=2')
    context.close()
    browser.close()
