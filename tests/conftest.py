"""Browser checks use only this checkout and a standard-library static server."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import threading
from urllib.parse import quote, urlparse

import pytest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@pytest.fixture(scope="session", params=["root", "subpath"])
def site(request):
    directory = ROOT if request.param == "root" else ROOT.parent
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(directory))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    suffix = "/" if request.param == "root" else f"/{quote(ROOT.name)}/"
    yield f"http://127.0.0.1:{server.server_port}{suffix}"
    server.shutdown()
    server.server_close()
    thread.join()


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as playwright:
        executable = os.getenv("DPRICE_UI_BROWSER")
        if not executable and not Path(playwright.chromium.executable_path).exists():
            fallback = Path("/usr/bin/google-chrome")
            if fallback.exists():
                executable = str(fallback)
        # A missing executable intentionally fails instead of skipping browser checks.
        instance = playwright.chromium.launch(
            executable_path=executable, args=["--no-sandbox"]
        )
        yield instance
        instance.close()


@pytest.fixture
def login_page(browser, site):
    context = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = context.new_page()
    errors, requests, failures = [], [], []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text)
            if message.text.startswith("Missing translation:") else None)
    page.on("request", lambda req: requests.append((req.method, req.url)))
    page.on("requestfailed", lambda req: failures.append(req.url))
    page.on("response", lambda response: failures.append(
        f"{response.status} {response.url}") if response.status >= 400 else None)
    page.goto(site)
    page.wait_for_selector(".demo-entry")
    yield page
    assert not errors, errors
    assert not failures, failures
    origin = urlparse(site).netloc
    for method, url in requests:
        parsed = urlparse(url)
        assert method == "GET", (method, url)
        assert parsed.netloc == origin, url
        assert parsed.path.startswith(urlparse(site).path), url
        assert not any(part in parsed.path for part in ("/api/", "/auth", "/login")), url
    assert page.evaluate("localStorage.length") == 0
    saved = page.evaluate("Object.entries(sessionStorage)")
    assert saved in ([], [["dprice-demo-profile", "demo-ru"]], [["dprice-demo-profile", "demo-ar"]])
    assert context.cookies() == []
    context.close()


@pytest.fixture
def page(login_page):
    sign_in(login_page)
    login_page.locator('[data-market="uae"]').click()
    return login_page


def sign_in(page, login="demo-ru", password="DPrice-RU-2026", wait=True):
    page.locator('[name="username"]').fill(login)
    page.locator('[name="password"]').fill(password)
    page.locator('button[type="submit"]').click()
    if wait:
        page.wait_for_selector('.plist [data-project]')
