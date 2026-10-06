# DPrice interface demo

A standalone, public, static preview of the DPrice interface. Sign in with a demo profile to open prepared calculation and recommendation examples immediately. No XLSX upload or setup is needed.

**Live demo:** https://mikhail-safro.github.io/dprice-interface-demo/

## Demo accounts

| Username | Password | Initial language | Initial market |
| --- | --- | --- | --- |
| `demo-ru` | `DPrice-RU-2026` | Russian | Russia |
| `demo-ar` | `DPrice-AR-2026` | Arabic, right to left | UAE |

These credentials are intentionally public. The sign-in screen selects a demonstration profile; it is **not secure authentication or access control**. All JavaScript and JSON examples are publicly readable, including without signing in. Do not put private data or real passwords in this repository. Protected access would require a separate server or authentication service and a different architecture.

A profile selects the initial language and market. RU/EN/AR and all three markets remain available in the workspace. Only the profile name is stored in `sessionStorage` for the current browser tab; no password is stored. Reload restores the profile and its defaults, with all control edits reset. Sign out clears the profile and control state. If browser storage is unavailable, the demo still works until reload.

## What is included

- Nine surfaces: Today, Deal price, Payment forms and promotions, Release, Repricing, Dynamics and forecast, Competitors, Retrospective, and Portfolio analytics.
- Three markets: Russia, UAE and Kazakhstan, with five projects each. Portfolio lists the four active projects; the completed fifth project remains accessible in the rail.
- Fixed synthetic prices, chart points and recommendation examples from `ui/fixtures/*.json`.
- Russian, English and Arabic text, Arabic layout direction, responsive navigation and horizontally scrollable tables.
- Self-hosted Onest, JetBrains Mono and Noto Sans Arabic fonts and their licenses. No external font or CDN requests.

Controls change presentation state only. They never recalculate prices, forecasts or recommendations. Confirmation dialogs explicitly demonstrate an interaction and save nothing. The fixed-example notice remains visible throughout the workspace. The source registry on the Competitors screen describes the prepared example; it does not fetch live market data. Kazakhstan retains the disclosed UAE competitor/source placeholder from the original interface snapshot.

There is no pricing engine, model, backend, API client, database, real authentication, uploader or exporter. Runtime files are vanilla JavaScript ES modules, CSS, JSON, HTML and local fonts. Python is used only for local serving and browser verification. No npm or build step is needed.

## Run locally

```sh
uv run python -m http.server 8080 --bind 127.0.0.1
```

Open http://127.0.0.1:8080. Any static server works. Opening `index.html` with `file://` does not support module/JSON loading. All asset URLs are relative, including font and fixture requests, so repository subpath hosting works.

Examples load automatically after sign-in. During loading the workspace remains navigable. If a fixture request fails, a translated error and Retry button appear; sign out remains available. Signing out during a request prevents the old request from restoring the workspace.

## Edit

- `ui/demo.js`: two public demo profiles and tab-scoped profile selection.
- `ui/app.js`: navigation, loading lifecycle, control state and preview actions.
- `ui/render.js`: sign-in page, workspace and screen renderers.
- `ui/dict.js`: translations, fixture display names and number formatting.
- `ui/styles.css`: layout, responsive behavior and local font declarations.
- `ui/fixtures/*.json`: fixed display examples; see [format](ui/fixtures/README.md).
- `ui/fonts/`: font files and licenses. Noto Sans Arabic comes from the [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/notosansarabic).

Keep display text in the dictionary, and preserve the static boundary in [AGENTS.md](AGENTS.md). Do not reuse real account credentials when changing the demo profiles.

## Verify

```sh
uv sync --locked
uv run playwright install chromium
PYTHONUTF8=1 uv run pytest
```

Missing browsers fail the suite rather than being skipped. Tests use Playwright Chromium or `/usr/bin/google-chrome` as a fallback. `DPRICE_UI_BROWSER` can select another Chromium executable. Set `DPRICE_UI_SCREENSHOTS=/tmp/dprice-ui-screenshots` to capture review images.

Tests cover both root and repository subpath hosting, all screens/projects/languages, Arabic text and layout, both accounts, incorrect credentials, reload and logout, unavailable storage, loading failures and retry, stale requests after logout, keyboard focus, dialogs, controls and fixed outputs. Browser sessions check JavaScript errors, failed requests, external requests, cookies and local-storage writes. No runtime API calls are allowed.

## GitHub Pages

The workflow `.github/workflows/test.yml` runs the browser suite first. For a push to `main`, it then publishes only `index.html`, `ui/` and `.nojekyll` to GitHub Pages. Tests, Python dependencies and development files are excluded from the hosted artifact.

Enable **Settings → Pages → Source → GitHub Actions** in the public repository. Subsequent pushes to `main` are deployed only after successful browser checks. The public demo repository starts with its own snapshot commit and contains no source DPrice history.
