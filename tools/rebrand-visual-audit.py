from pathlib import Path
from playwright.sync_api import sync_playwright

ROUTES = ["tour", "agenda", "timeline", "fan-dashboard", "group-matrix"]
VIEW_SELECTORS = {
    "tour": ".venue-card, .venue-detail__error, .venue-detail__hint",
    "agenda": ".agenda-column, .agenda-skeleton",
    "timeline": ".timeline-item, .timeline-status",
    "fan-dashboard": ".fan-metrics dd, .fan-match, .status-banner",
    "group-matrix": ".matrix-card, .matrix-skeleton, .empty-state",
}
OUT = Path(r"C:\tmp\wc26-rebrand-audit")
OUT.mkdir(parents=True, exist_ok=True)

def inspect_view(page, route, width, height):
    page.set_viewport_size({"width": width, "height": height})
    page.goto(f"http://127.0.0.1:4173/#{route}", wait_until="networkidle")
    page.wait_for_timeout(900)
    selector = VIEW_SELECTORS[route]
    count = page.locator(selector).count()
    doc_width = page.evaluate("document.documentElement.scrollWidth")
    viewport = page.evaluate("window.innerWidth")
    active = page.locator(f'[data-route="{route}"][aria-current="page"]').count()
    heading = page.locator("#view-title").inner_text()
    path = OUT / f"{route}-{width}.png"
    page.screenshot(path=str(path), full_page=True)
    return f"{width}:{route}:doc={doc_width}:viewport={viewport}:items={count}:active={active}:heading={heading}"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    errors = []
    page.on("console", lambda msg: errors.append(f"console:{msg.type}:{msg.text}") if msg.type in ["error", "warning"] else None)
    page.on("pageerror", lambda err: errors.append(f"pageerror:{err}"))
    lines = []
    for route in ROUTES:
        lines.append(inspect_view(page, route, 1366, 900))
    for route in ROUTES:
        lines.append(inspect_view(page, route, 390, 844))
    browser.close()

for line in lines:
    print(line)
for error in errors[:20]:
    print(error)
if errors:
    raise SystemExit(1)
print(f"REBRAND_VISUAL_AUDIT_PASS screenshots={OUT}")
