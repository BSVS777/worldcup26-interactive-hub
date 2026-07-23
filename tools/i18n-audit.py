from playwright.sync_api import expect, sync_playwright

BASE_URL = 'http://127.0.0.1:4173/#tour'
LOCALE_KEY = 'wc26:locale:v1'


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    requests = []
    page.on('request', lambda request: requests.append(request.url) if '/get/' in request.url else None)

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    expect(page.locator('html')).to_have_attribute('lang', 'es')
    expect(page.locator('#view-title')).to_have_text('Recorrido virtual por sedes')
    language_toggle = page.locator('#language-toggle')
    expect(language_toggle).to_have_attribute('role', 'switch')
    expect(language_toggle).to_have_attribute('aria-checked', 'false')

    page.click('[data-route="agenda"]')
    page.wait_for_load_state('networkidle')
    expect(page.locator('#app-status')).to_have_text('Vista Agenda seleccionada.')

    language_toggle.focus()
    expect(language_toggle).to_be_focused()
    route_before = page.evaluate('location.hash')
    request_count_before = len(requests)
    for locale, heading, checked in [
        ('en', 'Simultaneous agenda', 'true'),
        ('es', 'Agenda simultánea', 'false'),
        ('en', 'Simultaneous agenda', 'true'),
    ]:
        page.keyboard.press('Enter')
        expect(language_toggle).to_be_focused()
        expect(page.locator('html')).to_have_attribute('lang', locale)
        expect(page.locator('#view-title')).to_have_text(heading)
        expect(language_toggle).to_have_attribute('aria-checked', checked)
        expect(page.locator('#app-status')).to_have_text('')
        assert page.evaluate('location.hash') == route_before
        assert len(requests) == request_count_before
        assert page.evaluate(f"localStorage.getItem('{LOCALE_KEY}')") == locale

    page.reload()
    page.wait_for_load_state('networkidle')
    expect(page.locator('html')).to_have_attribute('lang', 'en')
    expect(page.locator('#view-title')).to_have_text('Simultaneous agenda')

    page.evaluate(f"localStorage.setItem('{LOCALE_KEY}', 'invalid')")
    page.reload()
    page.wait_for_load_state('networkidle')
    expect(page.locator('html')).to_have_attribute('lang', 'es')

    page.locator('#language-toggle').focus()
    page.keyboard.press('Tab')
    if page.locator('#route-drawer-toggle').is_visible():
        expect(page.locator('#route-drawer-toggle')).to_be_focused()
    else:
        expect(page.locator('[data-route="tour"]')).to_be_focused()

    feedback_page = context.new_page()
    feedback_page.route(
        '**/auth/authenticate',
        lambda route: route.fulfill(
            status=401,
            content_type='application/json',
            body='{"message":"Rejected test credentials"}'
        )
    )
    feedback_page.goto('http://127.0.0.1:4173/?testMode=1#tour')
    feedback_page.wait_for_load_state('networkidle')
    feedback_page.fill('#email', 'student@example.test')
    feedback_page.fill('#password', 'incorrect')
    feedback_page.click('#login-button')
    expect(feedback_page.locator('#login-status')).to_have_text(
        'El correo electrónico o la contraseña no fueron aceptados. Revisa ambos campos e inténtalo de nuevo.'
    )
    feedback_page.click('#language-toggle')
    expect(feedback_page.locator('#login-status')).to_have_text(
        'Email or password was not accepted. Check both fields and try again.'
    )

    print('I18N_AUDIT_PASS default=es repeated-toggle=en-es-en persistence=verified focus=preserved no-refetch=verified login-feedback=retranslated')
    feedback_page.close()
    context.close()
    browser.close()
