from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1#fan-dashboard'


def inline_theme(page):
    style = page.locator('#fan-dashboard-view').get_attribute('style') or ''
    return style


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    page.fill('#email', 'student@example.test')
    page.fill('#password', 'secret')
    page.click('#login-button')
    page.wait_for_selector('#session-panel', state='hidden')
    page.wait_for_selector('#fan-team-select option:nth-child(2)', state='attached')
    selected_name = page.locator('#fan-team-select option').nth(1).inner_text()
    expect(page.locator('#fan-dashboard-view')).to_have_attribute('data-fan-themed', 'true')

    initial_theme = inline_theme(page)
    if '--fan-primary:' not in initial_theme or '--fan-accent:' not in initial_theme or '--fan-contrast:' not in initial_theme:
        raise AssertionError(f'Missing fan CSS variables: {initial_theme}')

    changed_theme = initial_theme
    option_count = page.locator('#fan-team-select option').count()
    for index in range(1, option_count):
        selected_name = page.locator('#fan-team-select option').nth(index).inner_text()
        page.locator('#fan-team-select').select_option(index=index)
        page.wait_for_load_state('networkidle')
        changed_theme = inline_theme(page)
        if changed_theme != initial_theme:
            expect(page.locator('#fan-summary')).to_contain_text(selected_name)
            break
    if changed_theme == initial_theme:
        raise AssertionError('Favorite team changes did not update fan CSS variables across available teams')

    if console_errors:
        raise AssertionError('Console errors: ' + ' | '.join(console_errors[:5]))

    print('FAN_THEME_AUDIT_PASS themed=true changed_on_select=true source=local-palette')
    browser.close()