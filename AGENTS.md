# DPrice UI

This repository is an independent static interface preview. Work only inside this repository.

- Preserve all nine surfaces, three markets, five projects per market, RU/EN/AR display and Arabic RTL layout, local fonts and responsive behavior unless the user requests a redesign.
- Vanilla JavaScript ES modules, CSS and JSON only. No npm, framework or build step.
- Never add a pricing algorithm, forecasts, dynamic recommendations, real authentication, API client, database or backend dependency.
- Keep the two public demo profiles as presentation-only sign-in. Do not imply that their public passwords protect access. Open fixed results automatically after sign-in; never add file uploads.
- All numbers and recommendation examples come from `ui/fixtures/*.json`. Control changes are presentation state only; they must never alter outcomes.
- Keep the visible fixed-example notice and honest preview dialogs. Do not claim that a preview saves real prices or improves pricing outcomes.
- Use relative asset URLs so repository subpath hosting works.
- Keep new text in Russian, English and Arabic in `ui/dict.js`. Code and documentation are English.
- Keep font license files. Do not add external font/CDN requests.
- Use `PYTHONUTF8=1 uv run pytest` for browser verification. Missing browsers must fail, never skip.
- Do not import source-project code, policies, history, credentials or exporters.
