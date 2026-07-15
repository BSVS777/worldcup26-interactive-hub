from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://127.0.0.1:4173/?testMode=1#agenda'


def sign_in(page):
    page.fill('#email', 'student@example.test')
    page.fill('#password', 'secret')
    page.click('#login-button')


def column_metrics(page):
    return page.locator('#agenda-columns .agenda-column:not(.agenda-skeleton)').evaluate_all("""
    columns => columns.map((column) => {
      const rect = column.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: column.textContent.trim()
      };
    })
    """)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1366, "height": 768})
    page = context.new_page()
    console_errors = []
    data_statuses = []

    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.on('response', lambda response: data_statuses.append((response.url, response.status)) if '/get/' in response.url else None)

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    sign_in(page)
    page.wait_for_selector('#session-panel', state='hidden')
    page.wait_for_selector('#agenda-columns .agenda-column:not(.agenda-skeleton)')

    date_label = page.locator('#agenda-date-label time')
    expect(date_label).to_have_attribute('datetime', '2026-06-12')
    expect(page.locator('#agenda-prev')).to_be_disabled()
    expect(page.locator('#agenda-next')).to_be_enabled()

    metrics = column_metrics(page)
    if len(metrics) != 2:
        raise AssertionError(f'Expected two simultaneous match columns on first retained date, got {metrics}')
    if len({item['left'] for item in metrics}) != 2:
        raise AssertionError(f'Expected columns to occupy separate horizontal tracks, got {metrics}')
    if any(item['width'] < 180 or item['height'] < 60 for item in metrics):
        raise AssertionError(f'Agenda columns are not visibly sized: {metrics}')
    if not all('Test Team' in item['text'] for item in metrics):
        raise AssertionError(f'Expected resolved team names in agenda columns, got {metrics}')

    page.locator('#agenda-next').click()
    expect(page.locator('#agenda-date-label time')).to_have_attribute('datetime', '2026-06-13')
    next_metrics = column_metrics(page)
    if len(next_metrics) != 2:
        raise AssertionError(f'Expected two columns after navigating to next retained date, got {next_metrics}')

    statuses = [status for _, status in data_statuses]
    if statuses.count(200) < 2:
        raise AssertionError(f'Expected successful games and teams data responses, got {data_statuses}')
    if console_errors:
        raise AssertionError('Console errors: ' + ' | '.join(console_errors[:5]))

    print('AGENDA_LAYOUT_AUDIT_PASS date=2026-06-12 columns=2 next=2026-06-13 grid=separate-tracks')
    context.close()
    browser.close()
