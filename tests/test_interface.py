import json
import os
import re

from conftest import sign_in
from pathlib import Path

from playwright.sync_api import expect

ROOT = Path(__file__).resolve().parents[1]
TABS = ("today", "nep", "shelf", "release", "desk", "trend", "comp", "retro")


def tab(page, name):
    page.locator(f'[data-tab="{name}"]').click()
    expect(page.locator(f'[data-tab="{name}"]')).to_have_class("tab on")


def outputs(page):
    return page.locator(".bigres, svg, table, .kpis").evaluate_all(
        "(nodes) => nodes.map(node => node.outerHTML)"
    )


def slider(page, name, value):
    control = page.locator(f'input[data-control="{name}"]')
    control.fill(str(value))
    return control


def test_all_screens_projects_markets_languages(page):
    expect(page.locator('[data-tab="today"]')).to_have_class("tab on")
    expect(page.locator('[data-market="uae"]')).to_have_attribute("aria-pressed", "true")
    expect(page.locator("html")).to_have_attribute("lang", "ru")
    expect(page.locator(".static-notice")).to_contain_text("расчёты отключены")
    assert page.locator('input[type="password"], .login, .role-badge').count() == 0
    for lang in ("ru", "en", "ar"):
        page.locator(f'[data-lang="{lang}"]').click()
        for market in ("uae", "rf", "kz"):
            page.locator(f'[data-market="{market}"]').click()
            projects = page.locator(".plist [data-project]").evaluate_all(
                "(nodes) => nodes.map(node => node.dataset.project)"
            )
            assert len(projects) == 5
            for project in projects:
                page.locator(f'.plist [data-project="{project}"]').click()
                for surface in TABS:
                    tab(page, surface)
                    assert page.locator("#content h1").inner_text().strip(), (lang, market, project, surface)
                    content = page.locator("#content").inner_text()
                    assert "NaN" not in content
                    if lang == "ar":
                        assert not re.search(r"[А-Яа-яЁё]", content), (market, project, surface, content)
                        expect(page.locator("html")).to_have_attribute("dir", "rtl")
                    if surface == "comp":
                        for mode in ("live", "pre"):
                            page.locator(f'[data-value="{mode}"]').click()
                            expect(page.locator(f'[data-value="{mode}"]')).to_have_attribute("aria-pressed", "true")
            page.locator('[data-project="all"]').click()
            assert page.locator("[data-tab]").count() == 0
            # Portfolio lists active projects; the fifth project is completed.
            expect(page.locator("#content [data-open-project]")).to_have_count(4)
            row = page.locator("[data-open-project]").first
            row.focus()
            row.press("Enter")
            expect(page.locator('[data-tab="today"]')).to_have_class("tab on")


def test_control_state_and_fixed_outputs(page):
    tab(page, "nep")
    fixed = outputs(page)
    assert fixed
    cut = slider(page, "cut", 4)
    cut.focus()
    cut.press("ArrowRight")
    cut.press("ArrowRight")
    expect(cut).to_be_focused()
    expect(cut).to_have_value("5")
    plan = page.locator('select[data-control="plan"]')
    choices = plan.locator("option").evaluate_all("(nodes) => nodes.map(n => n.value)")
    selected = next(value for value in choices if value != plan.input_value())
    plan.select_option(selected)
    lever = page.locator('input[data-lever]:not(:disabled)').first
    flag = lever.get_attribute("data-lever")
    checked = not lever.is_checked()
    lever.set_checked(checked)
    assert outputs(page) == fixed
    page.locator('[data-lang="en"]').click()
    expect(page.locator('input[data-control="cut"]')).to_have_value("5")
    expect(page.locator('select[data-control="plan"]')).to_have_value(selected)
    assert page.locator(f'input[data-lever="{flag}"]').is_checked() == checked
    page.locator('[data-lang="ru"]').click()
    tab(page, "today")
    tab(page, "nep")
    assert outputs(page) == fixed
    expect(page.locator('input[data-control="cut"]')).to_have_value("5")
    # Shared rate presentation remains consistent between two surfaces.
    slider(page, "rate", 9)
    tab(page, "release")
    expect(page.locator('input[data-control="rate"]')).to_have_value("9")
    fixed = outputs(page)
    for name, value in (("release_size", 20), ("release_window", 6), ("release_index", 2)):
        slider(page, name, value)
    page.locator('input[value="full"]').check()
    assert outputs(page) == fixed
    tab(page, "today")
    tab(page, "release")
    expect(page.locator('input[data-control="release_index"]')).to_have_value("2")
    expect(page.locator('input[value="full"]')).to_be_checked()
    assert outputs(page) == fixed
    tab(page, "shelf")
    fixed = outputs(page)
    segment = page.locator('[data-segment][aria-pressed="false"]').first
    key = segment.get_attribute("data-segment")
    segment.click()
    expect(page.locator(f'[data-segment="{key}"]')).to_have_attribute("aria-pressed", "true")
    assert outputs(page) == fixed
    tab(page, "today")
    tab(page, "shelf")
    expect(page.locator(f'[data-segment="{key}"]')).to_have_attribute("aria-pressed", "true")
    tab(page, "retro")
    fixed = outputs(page)
    control = page.locator('input[data-control="retro_month"]')
    different = control.get_attribute("min")
    slider(page, "retro_month", different)
    assert outputs(page) == fixed
    tab(page, "today")
    tab(page, "retro")
    expect(page.locator('input[data-control="retro_month"]')).to_have_value(different)
    assert outputs(page) == fixed
    page.locator('[data-reset]').click()
    tab(page, "nep")
    assert page.locator('input[data-control="cut"]').input_value() != "5"
    slider(page, "cut", 5)
    page.reload()
    page.wait_for_selector('.plist [data-project]')
    page.locator('[data-market="uae"]').click()
    tab(page, "nep")
    assert page.locator('input[data-control="cut"]').input_value() != "5"


def test_market_controls_and_project_retention(page):
    for market in ("uae", "rf", "kz"):
        page.locator(f'[data-market="{market}"]').click()
        tab(page, "nep")
        fixed = outputs(page)
        inputs = page.locator('input[type="range"]')
        for index in range(inputs.count()):
            control = inputs.nth(index)
            control.fill(control.get_attribute("max"))
        assert outputs(page) == fixed
        first_project = page.locator(".plist .on").get_attribute("data-project")
        value = page.locator('[data-control="cut"]').input_value()
        page.locator(".plist .pitem:not(.on)").first.click()
        page.locator(f'.plist [data-project="{first_project}"]').click()
        expect(page.locator('[data-control="cut"]')).to_have_value(value)


def test_preview_commands_modal_focus_and_static_data(page):
    tab(page, "desk")
    fixed = page.locator("#content").inner_text()
    for selector in ('[data-decision="accept"]', '[data-decision="decline"]',
                     '[data-approve-group]:not(:disabled)', '[data-approve-all]',
                     '[data-reason-group]'):
        button = page.locator(selector).first
        expect(button).to_be_enabled()
        button.click()
        expect(page.get_by_role("dialog")).to_be_visible()
        expect(page.locator(".modal-body")).to_contain_text("ничего не сохраняет")
        expect(page.locator(".modal-confirm")).to_be_focused()
        page.keyboard.press("Tab")
        expect(page.locator(".modal-x")).to_be_focused()
        page.keyboard.press("Shift+Tab")
        expect(page.locator(".modal-confirm")).to_be_focused()
        page.keyboard.press("Escape")
        expect(page.get_by_role("dialog")).to_have_count(0)
        expect(button).to_be_focused()
        button.click()
        page.locator(".modal-cancel").click()
        expect(button).to_be_focused()
        button.click()
        page.locator(".modal-confirm").click()
        expect(button).to_be_focused()
        assert page.locator("#content").inner_text() == fixed
        expect(page.locator(".preview-status")).to_contain_text("ничего не сохранено")
    strategy = page.locator('[data-strategy="cash"]')
    strategy.click()
    page.locator(".modal-confirm").click()
    expect(page.locator('[data-strategy="cash"]')).to_have_attribute("aria-pressed", "true")
    assert page.locator("#content").inner_text() == fixed
    tab(page, "release")
    fixed = outputs(page)
    page.locator('[data-save-scenario]').click()
    page.locator(".modal-confirm").click()
    assert outputs(page) == fixed


def test_mobile_and_review_images(page):
    image_dir = os.getenv("DPRICE_UI_SCREENSHOTS")
    if image_dir:
        target = Path(image_dir)
        target.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(target / "desktop-today.png"), full_page=True)
    page.set_viewport_size({"width": 390, "height": 844})
    expect(page.locator(".burger")).to_be_visible()
    page.locator(".burger").click()
    expect(page.locator(".rail")).to_have_class("rail open")
    page.locator(".plist .pitem").nth(1).click()
    expect(page.locator(".rail")).to_have_class("rail")
    page.locator(".burger").click()
    page.keyboard.press("Escape")
    expect(page.locator(".rail")).to_have_class("rail")
    tab(page, "desk")
    tables = page.locator("#content table")
    assert tables.count()
    assert tables.last.evaluate("(table) => table.parentElement.scrollWidth > table.parentElement.clientWidth")
    if image_dir:
        page.screenshot(path=str(Path(image_dir) / "mobile-desk.png"), full_page=True)


def test_fixture_inventory():
    for market in ("uae", "rf", "kz"):
        data = json.loads((ROOT / "ui" / "fixtures" / f"{market}.json").read_text())
        assert len(data["projects"]) == 5
        assert set(data["portfolio"]) == {"chrome", "data"}
        for project in data["projects"].values():
            assert set(project) == set(TABS)
            assert set(project["comp"]) == {"pre", "live"}


def test_today_shortcuts(page):
    for market in ("uae", "rf", "kz"):
        page.locator(f'[data-market="{market}"]').click()
        tab(page, "today")
        destinations = page.locator('[data-open-surface]').evaluate_all(
            '(nodes) => [...new Set(nodes.map(node => node.dataset.openSurface))]'
        )
        assert destinations
        for destination in destinations:
            page.locator(f'[data-open-surface="{destination}"]').first.click()
            expect(page.locator(f'[data-tab="{destination}"]')).to_have_class("tab on")
            assert page.locator('#content h1').inner_text().strip()
            tab(page, "today")


def test_english_dialog_close_and_mobile_mask(page):
    page.locator('[data-lang="en"]').click()
    tab(page, "release")
    button = page.locator('[data-save-scenario]')
    button.click()
    expect(page.get_by_role('dialog')).to_contain_text('This action saves nothing.')
    page.locator('.modal-x').click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    expect(button).to_be_focused()
    button.click()
    page.locator('.modal-mask').click(position={'x': 5, 'y': 5})
    expect(page.get_by_role('dialog')).to_have_count(0)
    expect(button).to_be_focused()
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('.burger').click()
    expect(page.locator('.burger')).to_have_attribute('aria-expanded', 'true')
    page.locator('.rail-mask').click(position={'x': 380, 'y': 400})
    expect(page.locator('.rail')).to_have_class('rail')
    expect(page.locator('.burger')).to_have_attribute('aria-expanded', 'false')


def test_missing_example_has_clear_error(browser, site):
    # Use a separate context because this test intentionally causes a failed request.
    context = browser.new_context()
    page = context.new_page()
    page.route('**/fixtures/uae.json', lambda route: route.fulfill(status=404, body='Missing'))
    page.goto(site)
    sign_in(page, wait=False)
    expect(page.get_by_role('alert')).to_contain_text('Не удалось загрузить примеры')
    expect(page.locator('.shell')).to_be_visible()
    expect(page.locator('[data-load-examples]')).to_be_enabled()
    expect(page.locator('#content')).to_have_attribute('aria-busy', 'false')
    page.locator('[data-lang="en"]').click()
    expect(page.get_by_role('alert')).to_contain_text('Could not load examples')
    page.unroute('**/fixtures/uae.json')
    page.get_by_role('button', name='Retry', exact=True).click()
    expect(page.locator('.plist [data-project]')).to_have_count(5)
    expect(page.locator('.empty-state')).to_have_count(0)
    context.close()



def test_login_accounts_reload_and_logout(login_page):
    page = login_page
    requests = []
    page.on('request', lambda request: requests.append(request.url))
    page.reload()
    expect(page.locator('.demo-entry')).to_be_visible()
    expect(page.locator('.shell, input[type="file"]')).to_have_count(0)
    assert not any('/fixtures/' in url for url in requests)
    sign_in(page, password='incorrect', wait=False)
    expect(page.get_by_role('alert')).to_contain_text('Неверный логин')
    expect(page.locator('[name="password"]')).to_be_focused()
    expect(page.locator('.shell')).to_have_count(0)
    image_dir = os.getenv('DPRICE_UI_SCREENSHOTS')
    if image_dir:
        Path(image_dir).mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(Path(image_dir) / 'desktop-login.png'), full_page=True)
    sign_in(page)
    expect(page.locator('html')).to_have_attribute('lang', 'ru')
    expect(page.locator('[data-market="rf"]')).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('#content h1')).to_be_focused()
    expect(page.locator('[data-load-examples], [data-empty], input[type="file"]')).to_have_count(0)
    tab(page, 'nep')
    slider(page, 'cut', 5)
    page.locator('[data-logout]').click()
    expect(page.locator('[name="username"]')).to_be_focused()
    assert page.evaluate('sessionStorage.length') == 0
    sign_in(page, 'demo-ar', 'DPrice-AR-2026')
    expect(page.locator('html')).to_have_attribute('lang', 'ar')
    expect(page.locator('html')).to_have_attribute('dir', 'rtl')
    expect(page.locator('[data-market="uae"]')).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('#content h1')).to_have_text('ما يجب فعله اليوم')
    tab(page, 'nep')
    assert page.locator('[data-control="cut"]').input_value() != '5'
    page.reload()
    expect(page.locator('.plist [data-project]')).to_have_count(5)
    expect(page.locator('html')).to_have_attribute('lang', 'ar')
    expect(page.locator('[data-tab="today"]')).to_have_class('tab on')
    page.locator('[data-logout]').click()
    page.reload()
    expect(page.locator('.demo-entry')).to_be_visible()


def test_workspace_stays_usable_during_loading(login_page):
    page = login_page
    pending = []
    page.route('**/fixtures/uae.json', lambda route: pending.append(route))
    sign_in(page, wait=False)
    expect(page.locator('#content')).to_have_attribute('aria-busy', 'true')
    expect(page.get_by_role('status').filter(has_text='Загрузка демоданных')).to_be_visible()
    page.locator('[data-market="rf"]').click()
    page.locator('[data-lang="ar"]').click()
    tab(page, 'comp')
    assert len(pending) == 1
    pending[0].fulfill(path=str(ROOT / 'ui/fixtures/uae.json'), content_type='application/json')
    expect(page.locator('.empty-state')).to_have_count(0)
    expect(page.locator('.plist [data-project]')).to_have_count(5)
    expect(page.locator('[data-market="rf"]')).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('[data-tab="comp"]')).to_have_class('tab on')
    expect(page.locator('html')).to_have_attribute('lang', 'ar')
    expect(page.locator('#content')).to_have_attribute('aria-busy', 'false')


def test_logout_ignores_an_old_pending_load(login_page):
    page = login_page
    pending = []

    def hold_first(route):
        if pending:
            route.continue_()
        else:
            pending.append(route)

    page.route('**/fixtures/uae.json', hold_first)
    sign_in(page, wait=False)
    expect(page.locator('#content')).to_have_attribute('aria-busy', 'true')
    page.locator('[data-logout]').click()
    sign_in(page, 'demo-ar', 'DPrice-AR-2026')
    second = page.locator('.plist .pitem').nth(1)
    project_id = second.get_attribute('data-project')
    second.click()
    with page.expect_response('**/fixtures/uae.json'):
        pending[0].fulfill(path=str(ROOT / 'ui/fixtures/uae.json'), content_type='application/json')
    tab(page, 'comp')
    expect(page.locator('.demo-account')).to_have_text('demo-ar')
    expect(page.locator('html')).to_have_attribute('lang', 'ar')
    expect(page.locator(f'.plist [data-project="{project_id}"]')).to_have_class('pitem on')


def test_arabic_layout_controls_and_dialog(login_page):
    page = login_page
    page.locator('[data-lang="ar"]').click()
    sign_in(page, 'demo-ar', 'wrong', wait=False)
    expect(page.get_by_role('alert')).to_contain_text('غير صحيحة')
    sign_in(page, 'demo-ar', 'DPrice-AR-2026')
    rail = page.locator('.rail').bounding_box()
    content = page.locator('.main').bounding_box()
    assert rail['x'] >= content['x'] + content['width'] - 1
    tab(page, 'nep')
    fixed = outputs(page)
    slider(page, 'cut', 5)
    assert outputs(page) == fixed
    tab(page, 'release')
    page.locator('[data-save-scenario]').click()
    expect(page.get_by_role('dialog')).to_contain_text('لا يحفظ أي شيء')
    page.keyboard.press('Escape')
    expect(page.locator('[data-save-scenario]')).to_be_focused()
    image_dir = os.getenv('DPRICE_UI_SCREENSHOTS')
    if image_dir:
        page.screenshot(path=str(Path(image_dir) / 'desktop-arabic.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.locator('.burger').click()
    rail = page.locator('.rail')
    expect(rail).to_have_class('rail open')
    # Wait for the drawer transition before checking its physical position.
    expect(rail).to_have_css('inset-inline-start', '0px')
    page.locator('.plist .pitem').nth(1).click()
    expect(rail).to_have_class('rail')
    tab(page, 'desk')
    assert page.locator('#content table').last.evaluate('(table) => table.parentElement.scrollWidth > table.parentElement.clientWidth')
    if image_dir:
        page.screenshot(path=str(Path(image_dir) / 'mobile-arabic.png'), full_page=True)
    page.locator('[data-logout]').click()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    if image_dir:
        page.screenshot(path=str(Path(image_dir) / 'mobile-arabic-login.png'), full_page=True)


def test_login_without_storage(browser, site):
    context = browser.new_context()
    context.add_init_script("Object.defineProperty(window, 'sessionStorage', {get() {throw new Error('Disabled');}})")
    page = context.new_page()
    page.goto(site)
    sign_in(page, 'demo-ar', 'DPrice-AR-2026')
    expect(page.locator('html')).to_have_attribute('lang', 'ar')
    page.locator('[data-logout]').click()
    expect(page.locator('.demo-entry')).to_be_visible()
    context.close()


def test_invalid_saved_profile_does_not_open_workspace(login_page):
    page = login_page
    page.evaluate("sessionStorage.setItem('dprice-demo-profile', 'unknown')")
    page.reload()
    expect(page.locator('.demo-entry')).to_be_visible()
    expect(page.locator('.shell')).to_have_count(0)
    page.evaluate('sessionStorage.clear()')
