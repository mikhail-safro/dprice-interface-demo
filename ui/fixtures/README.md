# Fixed display examples

These JSON files are synthetic display snapshots dated 2026-10-01, using the manager display and default `max` strategy. They contain prepared examples only, with no pricing implementation, source-project history, credentials or exporter.

Each of `uae.json`, `rf.json` and `kz.json` contains:

- `projects`: five project IDs, each holding Today, NEP, Shelf, Release, Desk, Trend and Retro snapshots, plus `comp.pre` and `comp.live`.
- `portfolio`: one market-wide Portfolio snapshot.
- Each snapshot contains `chrome` (rail, breadcrumbs, formatting labels and strategy display) and `data` (the screen's fixed values, table rows and chart points).

There are 138 snapshots: 15 projects × 9 display variants, plus 3 portfolios. Authentication, permission and term-set envelopes were excluded. These are examples, not current market information.

## Hand-editing

Open the relevant JSON file in an editor. Change a number, proper name, chart point or existing message key, save, and reload. Keep field names and array structure expected by `ui/render.js`. Add new translated labels to `ui/dict.js` in `[Russian, English, Arabic]` order. Existing snapshot name pairs remain `[Russian, English]`; Arabic display-name translations are in `ui/dict.js`. Charts only lay out the stored points; they do not create forecasts.

For example, change a project's `today.data` KPI value to update that display. If the same example appears on several screens, edit each snapshot intentionally: they are independent snapshots, not calculated views. Rail/project labels are also repeated in each snapshot's `chrome`.

Control defaults are inside each snapshot's `data.controls`, shelf `segments[].active`, competitor `mode.value`, and retro `control.value`. `ui/fixtures.js` copies each selected snapshot and overlays only edited control presentation fields. It never updates outcome values.

Run the browser suite after changing fixtures. No access to the original repository or its Python packages is needed.
