// These files are the complete runtime data source. No calculations or persistence.
const markets = ['uae', 'rf', 'kz'];

export async function loadExamples() {
  const entries = await Promise.all(markets.map(async (market) => {
    const response = await fetch(new URL(`./fixtures/${market}.json`, import.meta.url));
    if (!response.ok) throw new Error(`Example unavailable: ${market}`);
    return [market, await response.json()];
  }));
  return Object.fromEntries(entries);
}

// Copy the example before changing control presentation fields.
export function screenExample(examples, state, controls) {
  const market = examples[state.market];
  const project = market.projects[state.project];
  const snapshot = state.surface === 'all'
    ? market.portfolio
    : state.surface === 'comp'
      ? project.comp[controls.competitors_mode || 'pre']
      : project[state.surface];
  const { chrome, data } = structuredClone(snapshot);
  chrome.strategy.key = controls.strategy || 'max';
  const c = data.controls;
  if (state.surface === 'nep') {
    for (const key of ['plan', 'rate', 'coverage', 'cut']) {
      if (controls[key] !== undefined) {
        c[key] = key === 'plan' ? controls[key] : Number(controls[key]) / 100;
      }
    }
    for (const lever of c.levers) {
      if (controls.levers?.[lever.flag] !== undefined) lever.on = controls.levers[lever.flag];
    }
  }
  if (state.surface === 'release' && c) {
    for (const [field, key] of [['size', 'release_size'], ['window', 'release_window'], ['index', 'release_index']]) {
      if (controls[key] !== undefined) c[field].value = Number(controls[key]);
    }
    if (c.rate && controls.rate !== undefined) c.rate.value = Number(controls.rate) / 100;
    if (controls.release_pack !== undefined) c.package.selected = controls.release_pack;
  }
  if (state.surface === 'shelf' && controls.segment !== undefined) {
    for (const segment of data.segments) segment.active = segment.key === controls.segment;
  }
  if (state.surface === 'retro' && controls.retro_month !== undefined) {
    data.control.value = Number(controls.retro_month);
  }
  return { chrome, data };
}
