from playwright.sync_api import sync_playwright

BASE_URL = 'http://127.0.0.1:4173/?testMode=1#timeline'

OBSERVER_HOOK = """
(() => {
  const NativeIntersectionObserver = window.IntersectionObserver;
  window.__timelineObserverAudit = {
    observeCount: 0,
    disconnectCount: 0,
    observedIds: [],
    instances: []
  };
  window.IntersectionObserver = class AuditIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.targets = [];
      window.__timelineObserverAudit.instances.push(this);
    }
    observe(target) {
      this.targets.push(target);
      window.__timelineObserverAudit.observeCount += 1;
      window.__timelineObserverAudit.observedIds.push(target.id || target.className || target.tagName);
    }
    unobserve(target) {
      this.targets = this.targets.filter((entry) => entry !== target);
    }
    disconnect() {
      window.__timelineObserverAudit.disconnectCount += 1;
      this.targets = [];
    }
    takeRecords() {
      return [];
    }
    trigger(target) {
      this.callback([{ isIntersecting: true, target, intersectionRatio: 1 }], this);
    }
  };
  window.__timelineObserverAudit.NativeIntersectionObserver = NativeIntersectionObserver;
})();
"""

TRIGGER_SENTINEL = """
() => {
  const audit = window.__timelineObserverAudit;
  const sentinel = document.querySelector('#timeline-sentinel');
  if (!audit || !sentinel || audit.instances.length === 0) {
    return { ok: false, reason: 'missing audit hook, sentinel, or observer instance' };
  }
  const latest = audit.instances[audit.instances.length - 1];
  latest.trigger(sentinel);
  return {
    ok: true,
    observeCount: audit.observeCount,
    disconnectCount: audit.disconnectCount,
    observedIds: audit.observedIds
  };
}
"""

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

    page.add_init_script(OBSERVER_HOOK)
    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    page.fill('#email', 'student@example.test')
    page.fill('#password', 'secret')
    page.click('#login-button')
    page.wait_for_selector('#session-panel', state='hidden')
    page.wait_for_selector('#timeline-list > li:not(.timeline-skeleton)')
    page.wait_for_function("document.querySelectorAll('#timeline-list > li:not(.timeline-skeleton)').length === 10")

    before_count = page.locator('#timeline-list > li:not(.timeline-skeleton)').count()
    load_more_was_visible = page.locator('#timeline-load-more').is_visible()
    audit_before = page.evaluate("window.__timelineObserverAudit")
    if before_count != 10:
        raise AssertionError(f'Expected first Timeline batch of 10 rows, got {before_count}')
    if not load_more_was_visible:
        raise AssertionError('Expected fallback load-more button to remain available before observer trigger')
    if audit_before['observeCount'] < 1 or 'timeline-sentinel' not in audit_before['observedIds']:
        raise AssertionError(f"IntersectionObserver did not observe the sentinel: {audit_before}")

    trigger_result = page.evaluate(TRIGGER_SENTINEL)
    if not trigger_result['ok']:
        raise AssertionError(f"Could not trigger observer: {trigger_result}")

    page.wait_for_function("document.querySelectorAll('#timeline-list > li:not(.timeline-skeleton)').length === 20")
    after_count = page.locator('#timeline-list > li:not(.timeline-skeleton)').count()
    status = page.locator('#timeline-status').inner_text()
    games_requests = page.evaluate("""
      performance.getEntriesByType('resource')
        .filter((entry) => entry.name.includes('/get/games')).length
    """)
    audit_after = page.evaluate("window.__timelineObserverAudit")

    if after_count != 20:
        raise AssertionError(f'Expected observer to reveal 20 rows, got {after_count}')
    if '20 of 24 matches shown' not in status.lower():
        raise AssertionError(f'Unexpected Timeline status after observer trigger: {status}')
    if games_requests != 1:
        raise AssertionError(f'Observer reveal should not refetch games; saw {games_requests} games requests')
    if audit_after['observeCount'] < 2:
        raise AssertionError(f'Expected observer to resubscribe while more rows remain: {audit_after}')
    if console_errors:
        raise AssertionError('Console errors: ' + ' | '.join(console_errors[:5]))

    print(
        'TIMELINE_OBSERVER_AUDIT_PASS '
        f'before={before_count} after={after_count} games_requests={games_requests} '
        f'observe_count={audit_after["observeCount"]} status="{status}"'
    )
    browser.close()
