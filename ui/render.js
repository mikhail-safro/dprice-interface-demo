// Static screen renderers: formatting and chart geometry only.
import { LANGS, localeFor, nf, pct, ppt, sgn, t, tf, tp, pick, MONTH_NAMES } from './dict.js';

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) {
        continue;
      }
      if (k === 'class') {
        node.className = v;
      } else {
        node.setAttribute(k, v);
      }
    }
  }
  for (const child of children || []) {
    if (child == null) {
      continue;
    }
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}
const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs, children) {
  if (tag === 'svg') attrs = { dir: 'ltr', direction: 'ltr', ...attrs };
  if (tag === 'text' && (children || []).some(text => /[\u0600-\u06ff]/.test(String(text)))) {
    // Keep the chart's physical anchors while shaping Arabic text right to left.
    const anchor = attrs?.['text-anchor'] || 'start';
    attrs = { ...attrs, direction: 'rtl', 'text-anchor': { start: 'end', end: 'start', middle: 'middle' }[anchor] };
  }
  const node = document.createElementNS
    ? document.createElementNS(SVG_NS, tag)
    : document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) {
        continue;
      }
      node.setAttribute(k, String(v));
    }
  }
  for (const child of children || []) {
    if (child == null) {
      continue;
    }
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}
function buildBrand(lang) {
  const wordmark = el('span', { class: 'wordmark' }, [
    el('span', { class: 'slash', 'aria-hidden': 'true' }, []),
    'dprice',
  ]);
  return el('div', { class: 'brand' }, [
    wordmark,
    el('small', null, [t('brand_sub', lang)]),
  ]);
}
function buildLangSwitcher(lang, onLang) {
  const buttons = LANGS.map((code) =>
    el(
      'button',
      {
        type: 'button',
        class: code === lang ? 'on' : null,
        'aria-pressed': code === lang ? 'true' : 'false',
        'data-lang': code,
      },
      [code.toUpperCase()],
    ),
  );
  const box = el('div', { class: 'langsw', role: 'group', 'aria-label': t('ui_language', lang) }, buttons);
  box.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-lang]');
    if (target) {
      onLang(target.getAttribute('data-lang'));
    }
  });
  return box;
}
const TAB_ORDER = [
  'today',
  'nep',
  'shelf',
  'release',
  'desk',
  'trend',
  'comp',
  'retro',
];
const MARKETS = ['rf', 'uae', 'kz'];
const DEMO_CHIP = { uae: 'demo_uae', rf: 'demo_rf', kz: 'demo_kz' };
const MARKET_LABEL = { uae: 'mk_uae', rf: 'mk_rf', kz: 'mk_kz' };
const PORTFOLIO_ID = 'all';
const FIRST_TAB = 'today';
function initial(name) {
  return String(name).slice(0, 1);
}
function buildRailProject(item, lang, onProject) {
  const name = pick(item.name, lang);
  const children = [
    el('span', { class: 'pav' }, [initial(name)]),
    el('span', { class: 'pmid' }, [
      el('span', { class: 'pnm' }, [name]),
      el('span', { class: 'psub' }, [
        `${pick(item.area, lang)} · ${t(`st_${item.status}`, lang)}`,
      ]),
    ]),
  ];
  if (item.badge) {
    children.push(el('span', { class: 'pbadge' }, [String(item.badge)]));
  }
  const btn = el(
    'button',
    {
      type: 'button',
      class: item.active ? 'pitem on' : 'pitem',
      'data-project': item.id,
    },
    children,
  );
  btn.addEventListener('click', () => onProject(item.id));
  return btn;
}
function buildRail(chrome, state, handlers) {
  const { lang } = state;
  const projects = (chrome.rail || []).map((item) =>
    buildRailProject(item, lang, handlers.onProject),
  );
  const railAll = chrome.rail_all || {};
  const allChildren = [
    el('span', { class: 'pav ico' }, ['∑']),
    el('span', { class: 'pmid' }, [
      el('span', { class: 'pnm' }, [t('nav_all', lang)]),
      el('span', { class: 'psub' }, [t(railAll.label_key || 'rail_all', lang)]),
    ]),
  ];
  const allBtn = el(
    'button',
    {
      type: 'button',
      class: railAll.active ? 'pitem allitem on' : 'pitem allitem',
      'data-project': railAll.id || 'all',
    },
    allChildren,
  );
  allBtn.addEventListener('click', () => handlers.onProject(railAll.id || 'all'));

  return el('aside', { class: 'rail', id: 'rail' }, [
    buildBrand(lang),
    el('div', { class: 'railsec' }, [t('rail_proj', lang)]),
    el('div', { class: 'plist' }, projects),
    el('div', { class: 'allwrap' }, [allBtn]),
    el('div', { class: 'railfoot' }, [
      el('b', null, [t('rf_title', lang)]),
      t('rf_sub', lang),
    ]),
  ]);
}
function buildMarketSwitcher(state, handlers) {
  const buttons = MARKETS.map((mk) =>
    el(
      'button',
      {
        type: 'button',
        class: mk === state.market ? 'on' : null,
        'aria-pressed': mk === state.market ? 'true' : 'false',
        'data-market': mk,
      },
      [t(MARKET_LABEL[mk], state.lang)],
    ),
  );
  const box = el(
    'div',
    { class: 'mksw', role: 'group', 'aria-label': t('ui_market', state.lang) },
    buttons,
  );
  box.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-market]');
    if (target) {
      handlers.onMarket(target.getAttribute('data-market'));
    }
  });
  return box;
}
function buildTopBar(state, chrome, handlers) {
  const { lang } = state;
  const crumb = chrome.breadcrumb || {};
  const format = chrome.format || {};
  const preview = chrome.preview || null;
  const projectName = crumb.project ? pick(crumb.project, lang) : null;
  const crumbs = el('div', { class: 'crumbs' }, [
    projectName ? projectName : null,
    projectName ? ' / ' : null,
    el('b', null, [t(`nav_${crumb.tab || state.surface}`, lang)]),
    preview
      ? el('span', { class: 'tag t-nt preview-tag' }, [t(preview.tag_key, lang)])
      : null,
  ]);
  const demoChipKey = format.demo_chip_key || DEMO_CHIP[state.market] || 'demo_uae';
  const burger = el(
    'button',
    { type: 'button', class: 'burger', 'aria-label': t('ui_menu', lang) },
    ['☰'],
  );
  burger.addEventListener('click', () => handlers.onToggleRail());

  return el('header', { class: 'top' }, [
    burger,
    crumbs,
    el('span', { class: 'spacer' }, []),
    buildMarketSwitcher(state, handlers),
    el('span', { class: 'chip' }, [t(demoChipKey, lang)]),
    buildLangSwitcher(lang, handlers.onLang),
  ]);
}
function buildPreviewBanner(chrome, lang) {
  const preview = chrome.preview || null;
  if (!preview) {
    return null;
  }
  return el('div', { class: 'note w preview-banner', role: 'status' }, [
    t(preview.banner_key, lang),
  ]);
}
function buildTabs(state, handlers) {
  const buttons = TAB_ORDER.map((surface) =>
    el(
      'button',
      {
        type: 'button',
        class: surface === state.surface ? 'tab on' : 'tab',
        'aria-current': surface === state.surface ? 'page' : null,
        'data-tab': surface,
      },
      [t(`nav_${surface}`, state.lang)],
    ),
  );
  const box = el('nav', { class: 'tabs', 'aria-label': t('nav_sec', state.lang) }, buttons);
  box.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-tab]');
    if (target) {
      handlers.onTab(target.getAttribute('data-tab'));
    }
  });
  return box;
}
function buildStrategyBar(chrome, state) {
  const strat = chrome.strategy || {};
  const pills = ['max', 'cash', 'cov'].map((key) => {
    const attrs = {
      type: 'button',
      class: strat.key === key ? 'pill on' : 'pill',
      'data-strategy': key,
      'aria-pressed': strat.key === key ? 'true' : 'false',
      disabled: state.phase === 'ready' ? null : 'disabled',
    };
    return el('button', attrs, [t(`sg_${key}`, state.lang)]);
  });
  const noteKey = strat.key ? `sg_${strat.key}_d` : null;
  return el('div', { class: 'stratbar', role: 'group', 'aria-label': t('st_h', state.lang) }, [
    el('span', { class: 'mini-lb' }, [t('st_h', state.lang)]),
    ...pills,
    noteKey ? el('span', { class: 'stratnote' }, [t(noteKey, state.lang)]) : null,
  ]);
}
function buildSurfaceFrame(state) {
  const renderer = SURFACE_RENDERERS[state.surface];
  const body =
    renderer && state.surfaceData
      ? renderer(state, state.surfaceData)
      : el('section', { class: 'panel empty-state' }, [
          el('h1', { class: 'surface-title' }, [t(`nav_${state.surface}`, state.lang)]),
          el('p', { role: state.phase === 'error' ? 'alert' : 'status' }, [
            t(state.phase === 'loading' ? 'ui_loading_examples'
              : state.phase === 'error' ? 'ui_load_error' : 'ui_empty_body', state.lang),
          ]),
          state.phase === 'error' ? el('button', {
            type: 'button', class: 'btn pri', 'data-load-examples': 'true',
            disabled: state.phase === 'loading' ? 'disabled' : null,
          }, [t('x_retry', state.lang)]) : null,
        ]);
  return el('div', {
    class: 'content', id: 'content', 'aria-busy': String(state.phase === 'loading'),
  }, [
    el(
      'div',
      { class: 'status-slot', 'aria-live': 'polite', 'aria-atomic': 'true' },
      [],
    ),
    body,
  ]);
}
export function renderShell(state, chrome, handlers) {
  const inPortfolioScope = state.surface === PORTFOLIO_ID;
  return el('div', { class: 'shell' }, [
    buildRail(chrome, state, handlers),
    el('div', { class: 'main' }, [
      buildTopBar(state, chrome, handlers),
      inPortfolioScope ? null : buildTabs(state, handlers),
      buildStrategyBar(chrome, state),
      buildPreviewBanner(chrome, state.lang),
      buildSurfaceFrame(state),
    ]),
  ]);
}
const EM_DASH = '—';
function priceUnitLabel(state) {
  const fmt = (state.chrome && state.chrome.format) || {};
  return fmt.price_unit_key ? t(fmt.price_unit_key, state.lang) : '';
}
function areaUnitLabel(state) {
  const fmt = (state.chrome && state.chrome.format) || {};
  return fmt.area_unit_key ? t(fmt.area_unit_key, state.lang) : '';
}
function fmtMoney(state, value) {
  const fmt = (state.chrome && state.chrome.format) || {};
  const symbol = fmt.currency || '';
  const number = nf(Math.round(value), state.lang, 0);
  if (!symbol) {
    return number;
  }
  return fmt.placement === 'prefix' ? `${symbol} ${number}` : `${number} ${symbol}`;
}
function buildKpi(label, value, unit, detail, valueClass) {
  return el('div', { class: 'kpi' }, [
    el('div', { class: 'lb' }, [label]),
    el('div', { class: valueClass ? `v ${valueClass}` : 'v' }, [value]),
    unit ? el('div', { class: 'u' }, [unit]) : null,
    detail ? el('div', { class: 'd' }, [detail]) : null,
  ]);
}
function buildBigCol(label, number, sub, numClass, subClass) {
  return el('div', { class: 'b' }, [
    el('div', { class: 'l' }, [label]),
    el('div', { class: numClass ? `n ${numClass}` : 'n' }, [number]),
    sub != null ? el('div', { class: subClass ? `s ${subClass}` : 's' }, [sub]) : null,
  ]);
}

function todayTaskArgs(state, item) {
  const { lang } = state;
  const args = item.args || [];
  if (item.key === 'op_band') {
    return [nf(args[0], lang, 0), (args[1] || []).map(name => pick(name, lang)).join(', ')];
  }
  if (item.key === 'op_rel') {
    return [nf(args[0] * 100, lang, 0)];
  }
  if (item.key === 'op_pace') {
    return [pct(args[0], lang, 0)];
  }
  if (item.key === 'th_comp') {
    return [nf(args[0], lang, 0)];
  }
  if (item.key === 'th_frame_kz') {
    return [pct(args[0], lang, 0)];
  }
  if (item.key === 'th_gar_kz') {
    return [pct(args[0], lang, 1)];
  }
  if (args.length) {
    return [nf(args[0], lang, 0)];
  }
  return [];
}

function todayTaskText(state, item) {
  return tf(item.key, state.lang, ...todayTaskArgs(state, item));
}

function buildTodayKpis(state, data) {
  const { lang } = state;
  const k = data.kpis;
  const market = k.market || {};
  let marketKpi;
  if (market.kind === 'coverage') {
    marketKpi = buildKpi(
      t(market.label_key, lang),
      pct(market.coverage || 0, lang, 0),
      '',
      `${t(market.rate_key, lang)} ${market.rate == null ? EM_DASH : pct(market.rate, lang, 2)}`,
    );
  } else if (market.kind === 'scheme') {
    marketKpi = buildKpi(
      t(market.label_key, lang),
      t(market.scheme_key, lang),
      '',
      `${t(market.detail_key, lang)} ${pct(market.wacc, lang, 0)}`,
    );
  } else {
    marketKpi = buildKpi(
      t(market.label_key || 'w_rate', lang),
      market.rate == null ? EM_DASH : pct(market.rate, lang, 1),
      '',
      '',
    );
  }
  return el('div', { class: 'grid g4', style: 'margin-bottom:14px' }, [
    buildKpi(
      t(k.list.label_key, lang),
      nf(k.list.value, lang, 0),
      priceUnitLabel(state),
      tf(k.list.detail_key, lang, nf(k.list.detail_value, lang, 0)),
    ),
    buildKpi(
      t(k.gap.label_key, lang),
      pct(k.gap.value, lang, 1),
      '',
      `${fmtMillions(state, k.gap.leak_abs)} ${t(k.gap.detail_key, lang)}`,
      'wrn',
    ),
    buildKpi(
      t(k.remaining.label_key, lang),
      nf(k.remaining.value, lang, 0),
      t(k.remaining.unit_key, lang),
      `${pct(k.remaining.sold_pct, lang, 0)} ${t(k.remaining.detail_key, lang)}`,
    ),
    marketKpi,
  ]);
}

function buildTodayTaskRow(state, item, tone, primary) {
  return el('div', { class: 'task' }, [
    el('div', { class: `tdot ${tone}` }, []),
    el('div', { class: 'ttxt' }, [todayTaskText(state, item)]),
    el(
      'button',
      {
        type: 'button',
        class: primary ? 'btn sm pri' : 'btn sm',
        'data-open-surface': item.go,
      },
      [t('td_open', state.lang)],
    ),
  ]);
}

function buildTodayFeeds(state, data) {
  const { lang } = state;
  const feed = data.feed || {};
  const ops = feed.ops || [];
  const think = feed.think || [];
  return el('div', { class: 'grid g23' }, [
    el('div', { class: 'panel' }, [
      el('h2', null, [
        t('td_ops', lang),
        ' ',
        el('span', { class: `tag ${ops.length ? 't-wr' : 't-ok'}` }, [nf(ops.length, lang, 0)]),
      ]),
      el('p', { class: 'sub' }, [t('td_ops_s', lang)]),
      ops.length
        ? el(
            'div',
            { class: 'tasks' },
            ops.map((item) =>
              buildTodayTaskRow(state, item, item.weight >= 3 ? 'hi' : '', true),
            ),
          )
        : el('div', { class: 'note' }, [t(feed.quiet_key || 'td_ops_none', lang)]),
    ]),
    el('div', { class: 'panel' }, [
      el('h2', null, [t('td_think', lang)]),
      el('p', { class: 'sub' }, [t('td_think_s', lang)]),
      el(
        'div',
        { class: 'tasks' },
        think.map((item) => buildTodayTaskRow(state, item, 'lo', false)),
      ),
    ]),
  ]);
}

function buildTodayPrice(state, data) {
  const { lang } = state;
  const price = data.price || {};
  const strip = price.strip || {};
  const unit = priceUnitLabel(state);
  const was = strip.was || {};
  const now = strip.now || {};
  const forecast = strip.forecast || {};
  const nep = strip.nep || {};
  return el('div', { class: 'panel' }, [
    el('h2', null, [t(price.title_key || 'td_price', lang)]),
    el('div', { class: 'bigres' }, [
      buildBigCol(
        t(was.label_key || 'td_was', lang),
        nf(was.value || 0, lang, 0),
        trendMonthLabel(lang, was.offset || -12),
      ),
      el('div', { class: 'arrow' }, ['→']),
      buildBigCol(
        t(now.label_key || 'td_now', lang),
        nf(now.value || 0, lang, 0),
        ppt(now.change || 0, lang, 1),
        'pos',
      ),
      el('div', { class: 'arrow' }, ['→']),
      buildBigCol(
        t(forecast.label_key || 'td_fwd', lang),
        nf(forecast.value || 0, lang, 0),
        `${ppt(forecast.change || 0, lang, 1)} · ${trendMonthLabel(lang, forecast.offset || 0)}`,
      ),
      buildBigCol(
        t(nep.label_key || 'w_nep', lang),
        nf(nep.value || 0, lang, 0),
        unit,
      ),
    ]),
    buildTrendChart(state, {
      bare: true,
      title_key: price.title_key || 'td_price',
      months: price.months,
      split: price.split,
      height: 190,
      series: (price.series || []).map((line) => ({
        name: pick(line.name, state.lang),
        values: line.values,
        color: TREND_PALETTE[line.index % TREND_PALETTE.length],
      })),
    }),
  ]);
}

export function renderTodaySurface(state, data) {
  const { lang } = state;
  const sub = data.sub || {};
  const name = pick(sub.project, lang);
  return el('div', null, [
    el('div', { class: 'h' }, [
      el('h1', null, [t(data.heading_key || 'td_h1', lang)]),
      el('p', { class: 'sub' }, [
        [name, sub.strategy_key ? t(sub.strategy_key, lang) : null]
          .filter(Boolean)
          .join(' · '),
      ]),
    ]),
    buildTodayKpis(state, data),
    buildTodayFeeds(state, data),
    buildTodayPrice(state, data),
  ]);
}
function buildNepBigRes(state, result) {
  const { lang } = state;
  const unit = priceUnitLabel(state);
  const bench = result.benchmark || {};
  const delta = bench.delta;
  return el('div', { class: 'bigres' }, [
    buildBigCol(t('w_list', lang), nf(result.list_psf, lang, 0), unit),
    el('div', { class: 'arrow' }, ['→']),
    buildBigCol(t('w_nep', lang), nf(result.nep_psf, lang, 0), unit, 'pos'),
    buildBigCol(t('n_disc', lang), pct(result.gap, lang, 1), t('n_disc_s', lang), 'wrn'),
    buildBigCol(
      t(bench.label_key, lang),
      nf(bench.psf, lang, 0),
      `${sgn(delta, lang, 0)} ${unit}`,
      null,
      delta > 0 ? 'pos' : 'neg',
    ),
  ]);
}
function buildNepLadder(state, waterfall) {
  const { lang } = state;
  const unit = priceUnitLabel(state);
  const segs = [
    { cls: 'lad-nep', psf: waterfall.nep_psf, label: t('n_seg_nep', lang) },
  ];
  for (const comp of waterfall.components) {
    segs.push({ cls: comp.class, psf: comp.psf, label: t(comp.seg_key, lang) });
  }
  if (waterfall.grouped) {
    const items = waterfall.grouped.items
      .map((it) => `${t(it.seg_key, lang)} ${nf(it.psf, lang, 0)}`)
      .join(' · ');
    segs.push({
      cls: 'lad-c2',
      psf: waterfall.grouped.psf,
      label: t('n_seg_other', lang),
      title: items,
    });
  }
  const cut = waterfall.components.find((c) => c.key === 'cut');
  const premium = cut ? Math.max(0, -cut.psf) : 0;
  const total = waterfall.list_psf + premium;
  const drawn = segs.filter((s) => s.psf > 0);
  const bars = drawn.map((s) => {
    const width = total ? (s.psf / total) * 100 : 0;
    return el(
      'div',
      { class: `lad ${s.cls}`, style: `width:${width}%`, title: s.title || s.label },
      width > 7 ? [el('span', null, [nf(s.psf, lang, 0)])] : [],
    );
  });
  const bench = waterfall.benchmark || {};
  if (bench.psf != null) {
    const left = Math.min(99, (bench.psf / total) * 100);
    bars.push(
      el(
        'div',
        {
          class: 'bench',
          'data-l': `${t(bench.label_key, lang)} ${nf(bench.psf, lang, 0)}`,
          style: `left:${left}%`,
        },
        [],
      ),
    );
  }
  const legend = el(
    'div',
    { class: 'legend' },
    drawn.map((s) =>
      el('div', { title: s.title || null }, [
        el('i', { class: s.cls }, []),
        `${s.label} `,
        el('b', null, [nf(s.psf, lang, 0)]),
      ]),
    ),
  );
  return el('div', { class: 'ladwrap' }, [
    el('div', { class: 'ladscale' }, [
      el('span', null, ['0']),
      el('span', null, [`${nf(total, lang, 0)} ${unit}`]),
    ]),
    el('div', { class: 'ladder' }, bars),
    legend,
  ]);
}
function buildCommitteeNote(state, data) {
  const { lang } = state;
  const note = data.committee_note;
  const unit = priceUnitLabel(state);
  const params = (note.params || []).map((p) => `${nf(p, lang, 0)} ${unit}`);
  const positive = note.key === 'n_note_ok';
  return el('div', { class: positive ? 'note' : 'note w', style: 'margin-top:12px' }, [
    el('b', null, [`${t('w_committee', lang)}.`]),
    ` ${tf(note.key, lang, ...params)}`,
  ]);
}
function buildBreakEvenNote(state, data) {
  const { lang } = state;
  const be = data.break_even;
  const body = be
    ? tf(
        'n_be_txt',
        lang,
        pct(be.rate, lang, 1),
        be.current_rate != null ? pct(be.current_rate, lang, 1) : EM_DASH,
      )
    : EM_DASH;
  return el('div', { class: 'note', style: 'margin-top:9px' }, [
    el('b', null, [`${t('n_be', lang)}.`]),
    ` ${body}`,
  ]);
}
function buildNepResult(state, data) {
  return el('div', { class: 'panel' }, [
    el('h2', null, [t('n_res', state.lang)]),
    buildNepBigRes(state, data.result),
    buildNepLadder(state, data.waterfall),
    buildCommitteeNote(state, data),
    buildBreakEvenNote(state, data),
  ]);
}
function buildPlanSelect(state, data) {
  const { lang } = state;
  const selected = data.controls.plan;
  const options = data.plans.map((p) =>
    el(
      'option',
      { value: p.key, selected: p.key === selected ? 'selected' : null },
      [t(p.name_key, lang)],
    ),
  );
  return el(
    'select',
    { class: 'projsel', style: 'width:100%;margin-bottom:12px', 'data-control': 'plan' },
    options,
  );
}
function buildSlider(control, label, valueText, min, max, step, value) {
  return el('div', { class: 'sl' }, [
    el('label', null, [label]),
    el('b', null, [valueText]),
    el(
      'input',
      {
        type: 'range',
        min: String(min),
        max: String(max),
        step: String(step),
        value: String(value),
        'data-control': control,
      },
      [],
    ),
  ]);
}
function buildLevers(state, levers, unit) {
  const { lang } = state;
  const rows = levers.map((lv) => {
    const on = lv.on && !lv.disabled;
    const attrs = { class: on ? 'tgi on' : 'tgi', 'data-lever': lv.flag };
    if (lv.disabled) {
      attrs.style = 'opacity:.5';
    }
    const inputAttrs = { type: 'checkbox', 'data-lever': lv.flag };
    if (on) {
      inputAttrs.checked = 'checked';
    }
    if (lv.disabled) {
      inputAttrs.disabled = 'disabled';
    }
    return el('label', attrs, [
      el('input', inputAttrs, []),
      el('div', null, [
        el('div', { class: 'nm' }, [t(lv.name_key, lang)]),
        el('div', { class: 'ds' }, [t(lv.desc_key, lang)]),
      ]),
      el('div', { class: 'cost' }, [
        lv.disabled ? EM_DASH : nf(lv.cost_psf, lang, 0),
        el('span', null, [unit]),
      ]),
    ]);
  });
  return el('div', { class: 'tg' }, rows);
}
function buildNepControls(state, data) {
  const { lang } = state;
  const controls = data.controls;
  const unit = priceUnitLabel(state);
  const areaUnit = areaUnitLabel(state);
  const unitName = pick(data.unit.name, lang);
  const children = [
    el('h2', null, [t('n_ctrl', lang)]),
    el('div', { class: 'mini-lb' }, [t('n_unit', lang)]),
    el('div', { class: 'fx wrap', style: 'margin-bottom:12px' }, [
      `${unitName} · ${nf(data.unit.sqft, lang, 0)} ${areaUnit} · ${fmtMoney(state, data.unit.list_abs)}`,
    ]),
    el('div', { class: 'mini-lb' }, [t('w_plan', lang)]),
    buildPlanSelect(state, data),
  ];
  if (controls.rate_kind === 'coverage' && controls.coverage != null) {
    children.push(
      buildSlider(
        'coverage',
        t('n_esc_cov', lang),
        pct(controls.coverage, lang, 0),
        0,
        110,
        1,
        controls.coverage * 100,
      ),
    );
  } else if (controls.rate_kind === 'rate' && controls.rate != null) {
    children.push(
      buildSlider(
        'rate',
        t('w_rate', lang),
        pct(controls.rate, lang, 1),
        5,
        16,
        0.5,
        controls.rate * 100,
      ),
    );
  }
  children.push(
    buildSlider('cut', t('w_cut', lang), pct(controls.cut, lang, 1), 0, 10, 0.5, controls.cut * 100),
  );
  children.push(el('div', { class: 'mini-lb', style: 'margin-top:14px' }, [t('n_lev', lang)]));
  children.push(buildLevers(state, controls.levers, unit));
  return el('div', { class: 'panel' }, children);
}
function buildNepFinancing(state, data) {
  const { lang } = state;
  const financing = data.financing;
  const unit = priceUnitLabel(state);
  if (financing.kind === 'escrow') {
    const pf = financing.pf;
    const bump = financing.r_bump
      ? `${t('st_bump', lang)} +${nf(financing.r_bump * 100, lang, 0)} ${t('u_pp', lang)}`
      : '';
    return el('div', { class: 'panel' }, [
      el('h2', null, [t('n_esc', lang)]),
      el('div', { class: 'grid g3', style: 'gap:9px' }, [
        buildKpi(
          t('n_esc_base', lang),
          pf ? pct(pf.base, lang, 2) : EM_DASH,
          '',
          tf('n_esc_key', lang, nf((financing.margin || 0) * 100, lang, 1)),
        ),
        buildKpi(t('n_esc_spec', lang), pf ? pct(pf.spec, lang, 2) : EM_DASH, '', ''),
        buildKpi(t('n_esc_eff', lang), pf ? pct(pf.eff, lang, 2) : EM_DASH, '', bump, 'pos'),
      ]),
      el('div', { class: 'fx', style: 'margin-top:10px' }, [t('n_esc_fx', lang)]),
      el('div', { class: 'src' }, [t('n_esc_note', lang)]),
    ]);
  }
  if (financing.kind === 'scheme') {
    const scheme = financing.scheme;
    const descParam =
      scheme === 'gar'
        ? pct(financing.gar_fee, lang, 1)
        : scheme === 'bank'
          ? pct(financing.wacc, lang, 0)
          : pct(financing.frame_at, lang, 0);
    const costKpi = financing.gar_fee
      ? buildKpi(
          t('n_garfee', lang),
          pct(financing.gar_fee, lang, 1),
          '',
          `${nf(financing.gar_psf, lang, 0)} ${unit}`,
        )
      : buildKpi(
          t('n_frame', lang),
          pct(financing.frame_at, lang, 0),
          '',
          `${nf(financing.lock_psf, lang, 0)} ${unit}`,
        );
    return el('div', { class: 'panel' }, [
      el('h2', null, [t('n_fin_kz', lang)]),
      el('div', { class: 'grid g3', style: 'gap:9px' }, [
        buildKpi(
          t('n_scheme', lang),
          t(`sch_${scheme}`, lang),
          '',
          tf(`sch_${scheme}_d`, lang, descParam),
        ),
        buildKpi(t('n_capital', lang), pct(financing.wacc, lang, 0), '', ''),
        costKpi,
      ]),
    ]);
  }
  if (financing.kind === 'flat') {
    return el('div', { class: 'panel' }, [
      el('h2', null, [t('n_fin_uae', lang)]),
      el('div', { class: 'grid g3', style: 'gap:9px' }, [
        buildKpi(t('n_capital', lang), pct(financing.r_eff, lang, 1), '', t('n_fin_uae_s', lang)),
      ]),
    ]);
  }
  return null;
}
function buildNepPace(state, data) {
  const pace = data.pace;
  if (!pace) {
    return null;
  }
  const { lang } = state;
  const header = [el('h2', null, [t('n_pace', lang)])];
  if (pace.full) {
    header.push(el('div', { class: 'note' }, [t('n_pace_full', lang)]));
    return el('div', { class: 'panel', style: 'border-inline-start:3px solid var(--green)' }, header);
  }
  const moUnit = t('u_mo', lang);
  header.push(
    el('div', { class: 'grid g2', style: 'gap:10px;margin-bottom:10px' }, [
      buildKpi(t('n_pace_v', lang), fmtMoney(state, pace.saved), '', ''),
      buildKpi(t('n_pace_p', lang), `+${pct(pace.share, lang, 1)}`, '', '', 'pos'),
    ]),
    el('div', { class: 'note' }, [
      tf(
        'n_pace_txt',
        lang,
        fmtMoney(state, pace.nep_abs),
        ppt(pace.dk, lang, 2),
        ppt(-pace.dr, lang, 2),
        `${nf(pace.months, lang, 0)} ${moUnit}`,
        fmtMoney(state, pace.saved),
        `+${pct(pace.share, lang, 1)}`,
      ),
    ]),
  );
  return el('div', { class: 'panel', style: 'border-inline-start:3px solid var(--green)' }, header);
}
export function renderNepSurface(state, data) {
  const { lang } = state;
  return el('div', null, [
    el('div', { class: 'h' }, [el('h1', null, [t('n_h1', lang)])]),
    el('div', { class: 'grid g32' }, [
      el('div', null, [buildNepControls(state, data), buildNepFinancing(state, data)].filter(Boolean)),
      el('div', null, [buildNepResult(state, data), buildNepPace(state, data)].filter(Boolean)),
    ]),
  ]);
}
function fmtMillions(state, value) {
  const fmt = (state.chrome && state.chrome.format) || {};
  const symbol = fmt.currency || '';
  const number = nf(value / 1e6, state.lang, 1);
  const token = t('ui_million', state.lang);
  if (!symbol) {
    return `${number} ${token}`;
  }
  return state.lang !== 'en' ? `${number} ${token} ${symbol}` : `${symbol} ${number}${token}`;
}
function buildBar(fraction, cls) {
  const width = Math.max(2, Math.min(100, fraction * 100));
  return el('div', { class: 'bar' }, [
    el('i', { class: cls || null, style: `width:${width}%` }, []),
  ]);
}
function buildShelfForms(state, forms) {
  const { lang } = state;
  const unit = priceUnitLabel(state);
  const head = el('tr', null, [
    el('th', null, [t('th_planname', lang)]),
    el('th', { class: 'num' }, [t('th_dp', lang)]),
    el('th', { class: 'num' }, [t('th_mk', lang)]),
    el('th', { class: 'num' }, [t('th_cx', lang)]),
    el('th', { class: 'num' }, [t('th_in', lang)]),
    el('th', { class: 'num' }, [t('th_vsref', lang)]),
  ]);
  const rows = forms.rows.map((r) => {
    const mkClass = r.mk > 0 ? 'num pos' : r.mk < 0 ? 'num neg' : 'num';
    const deltaClass = r.delta < 0 ? 'num neg' : r.delta > 0 ? 'num pos' : 'num';
    const nameCell = el('td', null, [
      el('b', null, [t(r.name_key, lang)]),
      r.is_ref ? el('span', { class: 'tag t-ok', style: 'margin-inline-start:6px' }, [t('fm_ref', lang)]) : null,
    ]);
    const rowAttrs = r.is_ref
      ? { style: 'background:#F5FBF6;box-shadow:inset 2px 0 0 var(--green)' }
      : null;
    return el('tr', rowAttrs, [
      nameCell,
      el('td', { class: 'num' }, [pct(r.dp, lang, 0)]),
      el('td', { class: mkClass }, [r.mk ? `${sgn(r.mk * 100, lang, 1)}%` : EM_DASH]),
      el('td', { class: r.cx >= 0.05 ? 'num neg' : 'num' }, [pct(r.cx, lang, 1)]),
      el('td', { class: 'num' }, [el('b', null, [nf(r.nep_psf, lang, 0)])]),
      el('td', { class: deltaClass }, [
        r.is_ref ? EM_DASH : `${sgn(r.delta, lang, 0)} ${unit}`,
      ]),
    ]);
  });
  const worst = forms.worst;
  const markup = worst.mk ? `${sgn(worst.mk * 100, lang, 1)}%` : '0%';
  const note = el('div', { class: 'note w', style: 'margin-top:11px' }, [
    el('b', null, [
      tf(worst.note_key, lang, t(worst.name_key, lang), markup, `${nf(-worst.delta, lang, 0)} ${unit}`),
    ]),
    ` ${tf(worst.mix_note_key, lang, pct(worst.mix_share, lang, 0), fmtMillions(state, worst.mix_impact_abs))}`,
  ]);
  return el('div', { class: 'panel' }, [
    el('h2', null, [t('fm_h', lang)]),
    el('div', { style: 'overflow-x:auto' }, [
      el('table', null, [el('thead', null, [head]), el('tbody', null, rows)]),
    ]),
    note,
  ]);
}
function buildShelfSegments(state, segments) {
  const { lang } = state;
  const pills = segments.map((s) =>
    el(
      'button',
      {
        type: 'button',
        class: s.active ? 'btn pri' : 'btn',
        'aria-pressed': s.active ? 'true' : 'false',
        'data-control': 'segment',
        'data-segment': s.key,
      },
      [t(s.name_key, lang)],
    ),
  );
  return el(
    'div',
    { class: 'panel', style: 'display:flex;align-items:center;gap:14px;flex-wrap:wrap' },
    [el('div', { class: 'mini-lb', style: 'margin:0' }, [t('w_seg', lang)]), ...pills],
  );
}
const SHELF_VERDICT = {
  first: ['t-ok', 'v_first'],
  ok: ['t-nt', 'v_ok'],
  last: ['t-wr', 'v_last'],
  na: ['t-nt', 'v_na'],
};
function buildShelfLevers(state, levers) {
  const { lang } = state;
  const head = el('tr', null, [
    el('th', null, [t('th_lever', lang)]),
    el('th', { class: 'num' }, [t('th_cost', lang)]),
    el('th', { class: 'num' }, [t('th_val', lang)]),
    el('th', { style: 'width:150px' }, []),
    el('th', { class: 'num' }, [t('th_eff', lang)]),
    el('th', null, [t('th_verdict', lang)]),
  ]);
  const rows = levers.rows.map((r) => {
    const [tagClass, tagKey] = SHELF_VERDICT[r.verdict] || SHELF_VERDICT.na;
    const barClass = r.eff >= 1.35 ? '' : r.eff >= 1.05 ? 's' : 'w';
    return el('tr', r.na ? { style: 'opacity:.5' } : null, [
      el('td', null, [
        el('b', null, [t(r.name_key, lang)]),
        el('div', { style: 'font-size:11.3px;color:var(--muted);line-height:1.35' }, [
          t(r.desc_key, lang),
        ]),
      ]),
      el('td', { class: 'num' }, [r.na ? EM_DASH : nf(r.cost_psf, lang, 0)]),
      el('td', { class: 'num' }, [r.na ? EM_DASH : nf(r.val_psf, lang, 0)]),
      el('td', null, [buildBar(levers.max_eff ? r.eff / levers.max_eff : 0, barClass)]),
      el('td', { class: 'num' }, [el('b', null, [nf(r.eff, lang, 2)])]),
      el('td', null, [el('span', { class: `tag ${tagClass}` }, [t(tagKey, lang)])]),
    ]);
  });
  return el('div', { class: 'panel' }, [
    el('h2', null, [t('s_tbl', lang)]),
    el('div', { style: 'overflow-x:auto' }, [
      el('table', null, [el('thead', null, [head]), el('tbody', null, rows)]),
    ]),
    el('div', { class: 'src' }, [t(levers.source_note_key, lang)]),
  ]);
}
function buildShelfPackage(state, pkg) {
  const { lang } = state;
  const unit = priceUnitLabel(state);
  const items = pkg.picked.map((x) =>
    el('li', null, [
      `${t(x.name_key, lang)} — ${nf(x.cost_psf, lang, 0)} → ${nf(x.val_psf, lang, 0)} ${unit} (${nf(x.eff, lang, 2)})`,
    ]),
  );
  const left = el('div', { class: 'panel' }, [
    el('h2', null, [`${t('s_pack', lang)} — ${t(pkg.name_key, lang)}`]),
    el('ul', { class: 'tight' }, items),
  ]);
  const note = pkg.saved_note;
  const right = el('div', { class: 'panel' }, [
    el('h2', null, [t('s_equiv', lang)]),
    el('div', { class: 'grid g2', style: 'gap:10px' }, [
      buildKpi(t('s_target', lang), nf(pkg.acc_value, lang, 0), unit, ''),
      buildKpi(t('s_costs', lang), nf(pkg.acc_cost, lang, 0), unit, ''),
    ]),
    el('div', { class: 'note', style: 'margin-top:11px' }, [
      el('b', null, [`${t('s_saved', lang)}: ${nf(pkg.saved, lang, 0)} ${unit}.`]),
      ` ${tf(note.key, lang, fmtMoney(state, note.params[0]), fmtMillions(state, note.params[1]))}`,
    ]),
  ]);
  return el('div', { class: 'grid g2' }, [left, right]);
}
export function renderShelfSurface(state, data) {
  const { lang } = state;
  return el('div', null, [
    el('div', { class: 'h' }, [
      el('h1', null, [t('s_h1', lang)]),
      el('p', { class: 'sub' }, [t('s_sub', lang)]),
    ]),
    buildShelfForms(state, data.forms),
    buildShelfSegments(state, data.segments),
    buildShelfLevers(state, data.levers),
    buildShelfPackage(state, data.package),
  ]);
}
function buildDeskThreshold(state, panel) {
  const { lang } = state;
  const noteParams = (panel.note_params || []).map((p, i) => {
    if (panel.kind === 'fm') {
      return i === 1 ? nf(p, lang, 0) : fmtMillions(state, p);
    }
    return i === 0 ? nf(p, lang, 0) : fmtMillions(state, p);
  });
  const note = panel.note_params && panel.note_params.length
    ? tf(panel.note_key, lang, ...noteParams)
    : t(panel.note_key, lang);
  return el('div', { class: 'panel', style: 'border-inline-start:3px solid var(--green)' }, [
    el('h2', null, [t(panel.title_key, lang)]),
    el('div', { class: 'grid g3', style: 'gap:9px' }, [
      buildKpi(t(panel.count_key, lang), String(panel.count), t(panel.count_unit_key, lang), ''),
      buildKpi(t(panel.act_key, lang), fmtMoney(state, panel.threshold), '', ''),
      buildKpi(t('th_popt', lang), fmtMoney(state, panel.target), '', '', 'pos'),
    ]),
    el('div', { class: panel.count ? 'note' : 'note w', style: 'margin-top:10px' }, [note]),
  ]);
}
function buildDeskRow(state, row, canonical = true) {
  const { lang } = state;
  const devClass = row.deviation > 0 ? 'num pos' : row.deviation < 0 ? 'num neg' : 'num';
  let action;
  if (row.manual) {
    action = el('span', { class: 'tag t-wr' }, [t('mn_tag', lang)]);
  } else if (row.decided) {
    const cls = row.decided === 'accepted' ? 't-ok' : 't-nt';
    action = el('span', { class: `tag ${cls}` }, [
      t(row.decided === 'accepted' ? 'w_accept' : 'w_reject', lang),
    ]);
  } else if (row.pending) {
    const raise = row.act === 'raise';
    const recoTag = el('span', { class: `tag ${raise ? 't-ok' : 't-wr'}` }, [
      `${t(raise ? 'w_raise' : 'w_lower', lang)} → ${nf(row.target, lang, 0)}`,
    ]);
    const children = [recoTag];
    if (!canonical) {
    } else {
      children.push(
        el(
          'button',
          { type: 'button', class: 'btn pri', 'data-decision': 'accept', 'data-unit': row.id },
          [t('d_accept', lang)],
        ),
        el(
          'button',
          { type: 'button', class: 'btn', 'data-decision': 'decline', 'data-unit': row.id },
          [t('d_declbtn', lang)],
        ),
      );
    }
    action = el('div', { class: 'fx wrap', style: 'gap:6px;background:none;border:0;padding:0' }, children);
  } else {
    action = el('span', { class: 'tag t-nt' }, [t('w_hold', lang)]);
  }
  return el('tr', null, [
    el('td', null, [el('b', null, [row.id])]),
    el('td', null, [t(row.type, lang)]),
    el('td', { class: 'num' }, [String(row.floor)]),
    el('td', null, [t(row.view, lang)]),
    el('td', { class: 'num' }, [nf(row.area, lang, 0)]),
    el('td', { class: 'num' }, [fmtMoney(state, row.price)]),
    el('td', { class: 'num' }, [nf(row.ppsf, lang, 0)]),
    el('td', { class: 'num' }, [nf(row.optimal, lang, 0)]),
    el('td', { class: devClass }, [pct(row.deviation, lang, 1)]),
    el('td', { class: 'num' }, [String(row.dom)]),
    el('td', null, [t(row.reason_key, lang)]),
    el('td', null, [action]),
  ]);
}
function buildDeskTable(state, data) {
  const { lang } = state;
  const head = el('tr', null, [
    el('th', null, [t('th_unit', lang)]),
    el('th', null, [t('th_type', lang)]),
    el('th', { class: 'num' }, [t('th_floor', lang)]),
    el('th', null, [t('th_view', lang)]),
    el('th', { class: 'num' }, [t('th_sqft', lang)]),
    el('th', { class: 'num' }, [t('th_price', lang)]),
    el('th', { class: 'num' }, [t('th_ppsf', lang)]),
    el('th', { class: 'num' }, [t('th_popt', lang)]),
    el('th', { class: 'num' }, [t('th_dev', lang)]),
    el('th', { class: 'num' }, [t('th_dom', lang)]),
    el('th', null, [t('th_reason', lang)]),
    el('th', null, [t('th_act', lang)]),
  ]);
  const seenPending = new Set();
  const rows = data.table.rows.map((row) => {
    let canonical = true;
    if (row.pending) {
      canonical = !seenPending.has(row.id);
      seenPending.add(row.id);
    }
    return buildDeskRow(state, row, canonical);
  });
  return el('div', { class: 'panel' }, [
    el('h2', null, [t('d_tbl', lang)]),
    el('div', { style: 'overflow-x:auto' }, [
      el('table', null, [el('thead', null, [head]), el('tbody', null, rows)]),
    ]),
  ]);
}
function buildDeskGroups(state, data, pendingByType) {
  const { lang } = state;
  const unit = priceUnitLabel(state);
  const cards = data.groups.map((g) => {
    const pending = pendingByType[g.type] || 0;
    const stats = [
      `${t('th_pgcnt', lang)}: ${nf(g.count, lang)}`,
      `${t('th_pgfree', lang)}: ${nf(g.free, lang)}`,
      `${t('th_popt', lang)}: ${nf(g.optimal_avg, lang, 0)}`,
      `${t('th_dev', lang)}: ${pct(g.deviation, lang, 1)}`,
    ].join(' · ');
    const children = [
      el('div', { class: 'kpi' }, [
        el('div', { class: 'lb' }, [t(g.type, lang)]),
        el('div', { class: 'v' }, [nf(g.price_avg, lang, 0)]),
        el('div', { class: 'u' }, [unit]),
        el('div', { class: 'd' }, [stats]),
      ]),
      el(
        'button',
        { type: 'button', class: 'btn', 'data-reason-group': g.type },
        [t('ap_reason', lang)],
      ),
    ];
    const approveAttrs = {
      type: 'button',
      class: 'btn pri',
      'data-approve-group': g.type,
    };
    if (!pending) {
      approveAttrs.disabled = 'disabled';
      approveAttrs['aria-disabled'] = 'true';
    }
    children.push(el('button', approveAttrs, [t('cmd_group_approval', lang)]));
    return el('div', { class: 'panel', style: 'display:flex;gap:12px;align-items:center' }, children);
  });
  return el('div', null, [
    el('h2', null, [t('ap_h', lang)]),
    ...cards,
  ]);
}
function buildJournalEntry(state, entry) {
  const { lang } = state;
  const p = entry.params || {};
  const time = String(entry.utc || '').slice(11, 16);
  const puf = (value) => `${nf(value, lang, 0)} ${priceUnitLabel(state)}`.trim();
  let text;
  if (entry.kind === 'd_appr') {
    text = tf('d_appr', lang, p.unit, puf(p.from), puf(p.to));
  } else if (entry.kind === 'd_decl') {
    text = tf('d_decl', lang, p.unit, puf(p.kept));
  } else if (entry.kind === 'd_strat') {
    text = tf('d_strat', lang, t(`sg_${p.old}`, lang), t(`sg_${p.new}`, lang));
  } else if (entry.kind === 'd_scen') {
    text = tf(
      'd_scen', lang, nf(p.size, lang), nf(p.win, lang), `${sgn(p.index, lang, 1)}%`,
    );
  } else {
    text = t(entry.kind, lang);
  }
  const actor = entry.by || '';
  return el('div', null, [
    el('b', null, [`${time} ${text}`]),
    el('div', { class: 'sub' }, [actor]),
  ]);
}

export function buildJournal(state, entries) {
  const { lang } = state;
  const list = entries || [];
  if (!list.length) {
    return el('div', { class: 'panel' }, [
      el('h2', null, [t('d_shadow', lang)]),
      el('div', { class: 'note' }, [t('d_journal_empty', lang)]),
    ]);
  }
  return el('div', { class: 'panel' }, [
    el('h2', null, [t('d_shadow', lang)]),
    el('div', { class: 'log' }, list.map((entry) => buildJournalEntry(state, entry))),
  ]);
}
function buildApproveAll(state, data) {
  const { lang } = state;
  const attrs = { type: 'button', class: 'btn-primary', 'data-approve-all': '1' };
  if (!data.pending) {
    attrs.disabled = 'disabled';
    attrs['aria-disabled'] = 'true';
  }
  return el('div', { class: 'fx wrap', style: 'gap:10px;background:none;border:0;padding:0' }, [
    el('span', { class: 'mini-lb', style: 'margin:0' }, [
      `${t('ap_pending', lang)}: ${data.pending}`,
    ]),
    el('button', attrs, [t('ap_all', lang)]),
  ]);
}
function deskPendingByType(data) {
  const counts = {};
  const seen = new Set();
  for (const row of data.table.rows) {
    if (!row.pending) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    counts[row.type] = (counts[row.type] || 0) + 1;
  }
  return counts;
}
export function renderDeskSurface(state, data) {
  const { lang } = state;
  const pendingByType = deskPendingByType(data);
  return el('div', { class: 'desk' }, [
    el('div', { class: 'h' }, [
      el('h1', null, [t('d_h1', lang)]),
      el('p', { class: 'sub' }, [t('d_sub', lang)]),
    ]),
    el('div', { class: 'cmd-note', 'aria-live': 'polite', 'aria-atomic': 'true' }, []),
    buildDeskThreshold(state, data.threshold),
    buildApproveAll(state, data),
    buildDeskGroups(state, data, pendingByType),
    buildDeskTable(state, data),
    buildJournal(state, data.journal),
  ]);
}
const FAN_COLORS = {
  band: 'rgba(47,184,77,.16)',
  median: '#2FB84D',
  stock: '#2B3A34',
  target: '#D9962B',
  grid: '#EFF4F1',
  axis: '#5C6B64',
};
function buildReleaseControls(state, data) {
  const { lang } = state;
  const c = data.controls;
  const children = [
    el('h2', null, [t('r_ctrl', lang)]),
    buildSlider(
      'release_size', t('r_size', lang), nf(c.size.value, lang),
      c.size.min, c.size.max, c.size.step, c.size.value,
    ),
    buildSlider(
      'release_window', t('r_win', lang), nf(c.window.value, lang),
      c.window.min, c.window.max, c.window.step, c.window.value,
    ),
    buildSlider(
      'release_index', t('r_price', lang), `${sgn(c.index.value, lang, 1)}%`,
      c.index.min, c.index.max, c.index.step, c.index.value,
    ),
  ];
  if (c.rate) {
    children.push(
      buildSlider('rate', t('w_rate', lang), pct(c.rate.value, lang, 1), 5, 16, 0.5, c.rate.value * 100),
    );
  }
  const radios = c.package.options.map((opt) => {
    const on = opt.key === c.package.selected;
    return el('label', { class: on ? 'tgi on' : 'tgi' }, [
      el('input', {
        type: 'radio',
        name: 'release_pack',
        value: opt.key,
        'data-control': 'release_pack',
        checked: on ? 'checked' : null,
      }, []),
      el('div', { class: 'nm' }, [t(opt.label_key, lang)]),
    ]);
  });
  children.push(
    el('div', { class: 'mini-lb', style: 'margin-top:12px' }, [t('r_pack', lang)]),
    el('div', { class: 'tg' }, radios),
  );
  if (data.cov_plan) {
    const cp = data.cov_plan;
    children.push(
      el('div', { class: 'note', style: 'margin-top:11px' }, [
        tf(
          cp.note_key, lang,
          fmtMillions(state, cp.target_abs),
          cp.months != null ? nf(cp.months, lang) : EM_DASH,
        ),
      ]),
    );
  }
  return el('div', { class: 'panel' }, children);
}
function buildReleaseFan(state, data) {
  const { lang } = state;
  const fan = data.fan;
  const result = data.result;
  const band = fan.band;
  const months = fan.months;
  const W = 640;
  const Hh = 210;
  const pad = 34;
  const mx = months || 1;
  const my = Math.max(fan.stock, fan.p90) * 1.05 || 1;
  const X = (i) => pad + ((W - pad - 10) * i) / mx;
  const Y = (v) => Hh - 24 - ((Hh - 40) * v) / my;
  let up = '';
  let dn = '';
  let mid = '';
  band.forEach((b, i) => {
    up += (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(b[2]).toFixed(1);
  });
  for (let i = band.length - 1; i >= 0; i -= 1) {
    dn += 'L' + X(i).toFixed(1) + ',' + Y(band[i][0]).toFixed(1);
  }
  band.forEach((b, i) => {
    mid += (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(b[1]).toFixed(1);
  });
  const kids = [];
  for (let g = 0; g <= 4; g += 1) {
    const v = (my * g) / 4;
    kids.push(
      svgEl('line', { x1: pad, x2: W - 10, y1: Y(v), y2: Y(v), stroke: FAN_COLORS.grid }, []),
      svgEl(
        'text',
        { x: pad - 6, y: Y(v) + 3.5, 'text-anchor': 'end', 'font-size': 9, fill: FAN_COLORS.axis, 'font-family': 'monospace' },
        [nf(v, lang, 0)],
      ),
    );
  }
  kids.push(
    svgEl('path', { d: up + dn + 'Z', fill: FAN_COLORS.band }, []),
    svgEl('path', { d: mid, fill: 'none', stroke: FAN_COLORS.median, 'stroke-width': 2 }, []),
  );
  kids.push(
    svgEl(
      'line',
      { x1: pad, x2: W - 10, y1: Y(fan.stock), y2: Y(fan.stock), stroke: FAN_COLORS.stock, 'stroke-width': 1, 'stroke-dasharray': '4 3' },
      [],
    ),
    svgEl(
      'text',
      { x: W - 12, y: Y(fan.stock) - 5, 'text-anchor': 'end', 'font-size': 9.5, fill: FAN_COLORS.stock },
      [`${t('r_size', lang)} ${nf(fan.stock, lang)}`],
    ),
    svgEl(
      'line',
      { x1: pad, x2: W - 10, y1: Y(fan.target), y2: Y(fan.target), stroke: FAN_COLORS.target, 'stroke-width': 1, 'stroke-dasharray': '2 3' },
      [],
    ),
  );
  const stepX = Math.max(1, Math.round(mx / 6));
  for (let g = 0; g <= mx; g += stepX) {
    kids.push(
      svgEl(
        'text',
        { x: X(g), y: Hh - 13, 'text-anchor': 'middle', 'font-size': 9, fill: FAN_COLORS.axis, 'font-family': 'monospace' },
        [String(g)],
      ),
    );
  }
  kids.push(
    svgEl(
      'text',
      { x: W / 2, y: Hh - 2, 'text-anchor': 'middle', 'font-size': 9, fill: FAN_COLORS.axis },
      [t('r_chart_x', lang)],
    ),
  );
  const svg = svgEl(
    'svg',
    { viewBox: `0 0 ${W} ${Hh}`, style: 'width:100%;height:auto;display:block', role: 'img', 'aria-label': t('r_out', lang) },
    kids,
  );
  const targetLabel =
    result.target_kind === 'cov' ? t('r_plan', lang) : t(`r_tgt_${result.target_kind}`, lang);
  const kpis = el('div', { class: 'grid g4', style: 'gap:9px;margin-bottom:12px' }, [
    buildKpi(t('r_p10', lang), nf(fan.p10, lang), t('u_units', lang), ''),
    buildKpi(t('r_p50', lang), nf(fan.p50, lang), t('u_units', lang), ''),
    buildKpi(t('r_p90', lang), nf(fan.p90, lang), t('u_units', lang), ''),
    buildKpi(
      t('r_hit', lang),
      `${nf(result.hit * 100, lang, 0)}%`,
      '',
      `${targetLabel}: ${nf(result.target, lang)} ${t('u_units', lang)}`,
      result.severity,
    ),
  ]);
  const legend = el('div', { class: 'legend' }, [
    el('div', null, [
      el('i', { style: `background:${FAN_COLORS.band};border:1px solid ${FAN_COLORS.median}` }, []),
      `${t('r_p10', lang)} – ${t('r_p90', lang)}`,
    ]),
    el('div', null, [el('i', { style: `background:${FAN_COLORS.median}` }, []), t('r_p50', lang)]),
    el('div', null, [
      el('i', { style: `background:${FAN_COLORS.stock}` }, []),
      `${t('r_size', lang)} `,
      el('b', null, [nf(fan.stock, lang)]),
    ]),
    el('div', null, [
      el('i', { style: `background:${FAN_COLORS.target}` }, []),
      `${targetLabel} `,
      el('b', null, [nf(fan.target, lang)]),
    ]),
  ]);
  const committee = el(
    'div',
    { class: result.note_warn ? 'note w' : 'note', style: 'margin-top:10px' },
    [
      el('b', null, [`${t(result.committee_key, lang)}.`]),
      ` ${tf(result.note_key, lang, nf(result.note_params[0] * 100, lang, 0))}`,
    ],
  );
  return el('div', { class: 'panel' }, [
    el('h2', null, [t('r_out', lang)]),
    kpis,
    svg,
    legend,
    committee,
  ]);
}
function buildReleaseBigRes(state, data) {
  const { lang } = state;
  const result = data.result;
  const unit = priceUnitLabel(state);
  const frac = result.vs_bench_frac;
  return el('div', { class: 'grid g2', style: 'gap:10px;margin-top:12px' }, [
    buildKpi(t('r_rev', lang), fmtMillions(state, result.revenue_p50), '', ''),
    buildKpi(
      `${t('w_nep', lang)} / ${t('w_bench', lang)}`,
      frac != null ? ppt(frac, lang, 1) : EM_DASH,
      '',
      `${nf(result.nep_psf, lang, 0)} / ${nf(result.benchmark_psf, lang, 0)} ${unit}`,
      result.nep_psf >= result.benchmark_psf ? 'pos' : 'neg',
    ),
  ]);
}
function buildReleaseEscrow(state, note) {
  const { lang } = state;
  return el('div', { class: 'panel', style: 'margin-top:14px' }, [
    el('h2', null, [t('r_esc', lang)]),
    el('div', { class: 'note' }, [
      tf(
        note.note_key, lang,
        pct(note.cov, lang, 0),
        pct(note.cov2, lang, 0),
        pct(note.eff, lang, 2),
        pct(note.eff2, lang, 2),
      ),
    ]),
  ]);
}
function buildReleaseSave(state) {
  const { lang } = state;
  const attrs = { type: 'button', class: 'btn-primary', 'data-save-scenario': '1' };
  return el('div', { class: 'panel', style: 'margin-top:14px' }, [
    el('div', { class: 'cmd-note', 'aria-live': 'polite', 'aria-atomic': 'true' }, []),
    el('div', { class: 'fx wrap', style: 'gap:10px;background:none;border:0;padding:0' }, [
      el('button', attrs, [t('r_save', lang)]),
    ]),
  ]);
}
export function renderReleaseSurface(state, data) {
  const { lang } = state;
  const header = el('div', { class: 'h' }, [
    el('h1', null, [t('r_h1', lang)]),
    el('p', { class: 'sub' }, [t('r_sub', lang)]),
  ]);
  if (data.state === 'empty') {
    return el('div', null, [
      header,
      el('div', { class: 'panel' }, [el('div', { class: 'note w' }, [t(data.note_key, lang)])]),
    ]);
  }
  const escrow = data.escrow_note ? buildReleaseEscrow(state, data.escrow_note) : null;
  return el('div', null, [
    header,
    el('div', { class: 'grid g32' }, [
      buildReleaseControls(state, data),
      el('div', null, [
        buildReleaseFan(state, data),
        buildReleaseBigRes(state, data),
        escrow,
        buildReleaseSave(state),
      ].filter(Boolean)),
    ]),
  ]);
}
const TREND_PALETTE = ['#2FB84D', '#2B6FB8', '#B8632F', '#7A4FB8', '#B82F6B'];
const TREND_COLORS = {
  sold: '#2FB84D',
  all: '#2B3A34',
  esc: '#2FB84D',
  rate: '#B8632F',
  band: 'rgba(47,184,77,.14)',
  grid: '#EFF4F1',
  axis: '#5C6B64',
  split: '#C9D8CF',
};
function trendMonthLabel(lang, offset) {
  const now = new Date();
  const names = MONTH_NAMES[lang] || MONTH_NAMES.en;
  let month = now.getMonth() + offset;
  let year = now.getFullYear();
  while (month < 0) {
    month += 12;
    year -= 1;
  }
  while (month > 11) {
    month -= 12;
    year += 1;
  }
  return `${names[month]} ${String(year).slice(2)}`;
}

function monthPointLabel(lang, point) {
  const names = MONTH_NAMES[lang] || MONTH_NAMES.en;
  const month = Number(point?.month);
  const year = Number(point?.year);
  if (!Number.isInteger(month) || month < 0 || month > 11 || !Number.isFinite(year)) {
    return EM_DASH;
  }
  return `${names[month]} ${year}`;
}
function buildTrendChart(state, opts) {
  const { lang } = state;
  const W = 660;
  const H = opts.height || 220;
  const padL = 48;
  const padR = 14;
  const padT = 16;
  const padB = 28;
  const n = opts.months;
  const split = opts.split;
  const all = [];
  opts.series.forEach((s) => s.values.forEach((v) => {
    if (v !== null && v !== undefined) all.push(v);
  }));
  if (opts.band) {
    opts.band.lo.forEach((v) => v !== null && v !== undefined && all.push(v));
    opts.band.hi.forEach((v) => v !== null && v !== undefined && all.push(v));
  }
  let mn = opts.min !== undefined ? opts.min : Math.min(...all);
  let mx = opts.max !== undefined ? opts.max : Math.max(...all);
  if (mx === mn) mx = mn + 1;
  if (opts.min === undefined && opts.max === undefined) {
    const pad = (mx - mn) * 0.1;
    mn -= pad;
    mx += pad;
  }
  if (opts.floor0) mn = Math.max(0, mn);
  const X = (i) => padL + ((W - padL - padR) * i) / Math.max(1, n - 1);
  const Y = (v) => H - padB - ((H - padT - padB) * (v - mn)) / (mx - mn);
  const kids = [];
  for (let g = 0; g <= 4; g += 1) {
    const v = mn + ((mx - mn) * g) / 4;
    kids.push(
      svgEl('line', { x1: padL, x2: W - padR, y1: Y(v), y2: Y(v), stroke: TREND_COLORS.grid }, []),
      svgEl(
        'text',
        { x: padL - 6, y: Y(v) + 3.4, 'text-anchor': 'end', 'font-size': 9, fill: TREND_COLORS.axis, 'font-family': 'monospace' },
        [nf(v, lang, 0)],
      ),
    );
  }
  if (split !== undefined && split > 0) {
    kids.push(
      svgEl('line', { x1: X(split), x2: X(split), y1: padT, y2: H - padB, stroke: TREND_COLORS.split, 'stroke-dasharray': '3 3' }, []),
      svgEl('text', { x: X(split) - 4, y: padT + 8, 'text-anchor': 'end', 'font-size': 9, fill: TREND_COLORS.axis }, [t('w_fact', lang)]),
      svgEl('text', { x: X(split) + 4, y: padT + 8, 'font-size': 9, fill: TREND_COLORS.axis }, [t('w_fcst', lang)]),
    );
  }
  if (opts.band) {
    const { lo, hi } = opts.band;
    let up = '';
    let dn = '';
    lo.forEach((v, i) => {
      if (v === null || v === undefined) return;
      up += (up ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(hi[i]).toFixed(1);
    });
    for (let i = lo.length - 1; i >= 0; i -= 1) {
      if (lo[i] === null || lo[i] === undefined) continue;
      dn += 'L' + X(i).toFixed(1) + ',' + Y(lo[i]).toFixed(1);
    }
    if (up) kids.push(svgEl('path', { d: up + dn + 'Z', fill: opts.band.color || TREND_COLORS.band }, []));
  }
  opts.series.forEach((s) => {
    let d = '';
    let started = false;
    s.values.forEach((v, i) => {
      if (v === null || v === undefined) {
        started = false;
        return;
      }
      d += (started ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1);
      started = true;
    });
    const attrs = { d, fill: 'none', stroke: s.color, 'stroke-width': s.width || 1.8 };
    if (s.dash) attrs['stroke-dasharray'] = s.dash;
    kids.push(svgEl('path', attrs, []));
  });
  const step = Math.max(1, Math.round(n / 6));
  for (let i = 0; i < n; i += step) {
    kids.push(
      svgEl(
        'text',
        { x: X(i), y: H - 10, 'text-anchor': 'middle', 'font-size': 8.6, fill: TREND_COLORS.axis },
        [split !== undefined ? trendMonthLabel(lang, i - split) : String(i)],
      ),
    );
  }
  const svg = svgEl(
    'svg',
    { viewBox: `0 0 ${W} ${H}`, style: 'width:100%;height:auto;display:block', role: 'img', 'aria-label': t(opts.title_key, lang) },
    kids,
  );
  const legend = el(
    'div',
    { class: 'legend', style: 'margin-top:2px' },
    opts.series
      .filter((s) => s.name)
      .map((s) => el('div', null, [el('i', { style: `background:${s.color}` }, []), s.name])),
  );
  if (opts.bare) {
    return el('div', null, [svg, legend]);
  }
  return el('div', { class: 'panel' }, [el('h2', null, [t(opts.title_key, lang)]), svg, legend]);
}
function buildTrendPrice(state, data) {
  const price = data.price;
  return buildTrendChart(state, {
    title_key: price.title_key,
    months: price.months,
    split: price.split,
    series: price.series.map((line) => ({
      name: pick(line.name, state.lang),
      values: line.values,
      color: TREND_PALETTE[line.index % TREND_PALETTE.length],
    })),
  });
}
function buildTrendSales(state, data) {
  const { lang } = state;
  const sales = data.sales;
  return buildTrendChart(state, {
    title_key: sales.title_key,
    months: sales.months,
    split: sales.split,
    floor0: true,
    height: 210,
    band: { lo: sales.lo, hi: sales.hi },
    series: [
      { name: t(sales.sold_key, lang), values: sales.sold, color: TREND_COLORS.sold },
      {
        name: t(sales.all_key, lang),
        values: sales.sold.map(() => sales.total_stock),
        color: TREND_COLORS.all,
        width: 1,
        dash: '4 3',
      },
    ],
  });
}
function buildTrendWashout(state, data) {
  const { lang } = state;
  const washout = data.washout;
  const verdictTag = {
    ok: ['t-ok', 'tr_v_ok'],
    wr: ['t-wr', 'tr_v_wr'],
    bd: ['t-bd', 'tr_v_bd'],
  };
  const head = el('thead', null, [
    el('tr', null, [
      el('th', null, [t('th_pgname', lang)]),
      el('th', { class: 'num' }, [t('tr_free', lang)]),
      el('th', { class: 'num' }, [t('tr_pace', lang)]),
      el('th', { class: 'num' }, [t('tr_mo', lang)]),
      el('th', null, [t('tr_verdict', lang)]),
    ]),
  ]);
  const rows = washout.rows.map((r) => {
    const [cls, key] = verdictTag[r.verdict] || verdictTag.bd;
    return el('tr', null, [
      el('td', null, [el('b', null, [pick(r.name, lang)])]),
      el('td', { class: 'num' }, [nf(r.free, lang)]),
      el('td', { class: 'num' }, [nf(r.pace, lang, 1)]),
      el('td', { class: 'num' }, [r.months === null ? EM_DASH : nf(r.months, lang, 1)]),
      el('td', null, [el('span', { class: `tag ${cls}` }, [t(key, lang)])]),
    ]);
  });
  return el('div', { class: 'panel' }, [
    el('h2', null, [t(washout.title_key, lang)]),
    el('div', { style: 'overflow-x:auto' }, [
      el('table', null, [head, el('tbody', null, rows)]),
    ]),
    el('div', { class: 'src' }, [tf(washout.note_key, lang, nf(washout.horizon, lang))]),
  ]);
}
function buildTrendComparison(state, data) {
  const { lang } = state;
  const cmp = data.comparison;
  const head = el('thead', null, [
    el('tr', null, [
      el('th', null, [t('st_h', lang)]),
      el('th', { class: 'num' }, [t('w_nep', lang)]),
      el('th', { class: 'num' }, [t('th_gap', lang)]),
      el('th', { class: 'num' }, [t('tr_updn', lang)]),
      el('th', { class: 'num' }, [t('r_target', lang)]),
      el('th', { class: 'num' }, [t('r_hit', lang)]),
    ]),
  ]);
  const rows = cmp.rows.map((r) => {
    const on = r.strat === cmp.active;
    const attrs = on
      ? { style: 'background:#F5FBF6;box-shadow:inset 2px 0 0 var(--green)' }
      : null;
    return el('tr', attrs, [
      el('td', null, [el('b', null, [t(`sg_${r.strat}`, lang)])]),
      el('td', { class: 'num' }, [nf(r.nep_psf, lang, 0)]),
      el('td', { class: 'num' }, [pct(r.gap, lang, 1)]),
      el('td', { class: 'num' }, [`${nf(r.up, lang)} / ${nf(r.dn, lang)}`]),
      el('td', { class: 'num' }, [`${nf(r.target, lang)} ${t('u_units', lang)}`]),
      el('td', { class: 'num' }, [`${nf(r.hit * 100, lang, 0)}%`]),
    ]);
  });
  return el('div', { class: 'panel' }, [
    el('h2', null, [t(cmp.title_key, lang)]),
    el('div', { style: 'overflow-x:auto' }, [
      el('table', null, [head, el('tbody', null, rows)]),
    ]),
  ]);
}
function buildTrendEscrow(state, data) {
  const { lang } = state;
  const esc = data.escrow;
  const chart = buildTrendChart(state, {
    title_key: esc.title_key || 'tr_esc',
    months: esc.months,
    split: esc.split,
    floor0: true,
    height: 200,
    min: 0,
    max: Math.max(120, Math.max(...esc.esc)),
    series: [
      { name: t(esc.esc_key, lang), values: esc.esc, color: TREND_COLORS.esc },
      { name: `${t(esc.rate_key, lang)}, %`, values: esc.rate, color: TREND_COLORS.rate },
    ],
  });
  chart.append(el('div', { class: 'src' }, [t(esc.note_key, lang)]));
  return chart;
}
export function renderTrendSurface(state, data) {
  const { lang } = state;
  const header = el('div', { class: 'h' }, [
    el('h1', null, [t(data.heading_key, lang)]),
    el('p', { class: 'sub' }, [t(data.sub_key, lang)]),
  ]);
  const salesWashout = el('div', { class: 'grid g23' }, [
    buildTrendSales(state, data),
    buildTrendWashout(state, data),
  ]);
  return el('div', null, [
    header,
    buildTrendPrice(state, data),
    salesWashout,
    data.escrow ? buildTrendEscrow(state, data) : null,
    buildTrendComparison(state, data),
  ].filter(Boolean));
}

function portfolioFinancingText(state, financing) {
  const { lang } = state;
  if (!financing) {
    return EM_DASH;
  }
  if (financing.kind === 'coverage') {
    const coverage = financing.coverage == null ? EM_DASH : pct(financing.coverage, lang, 0);
    const rate = financing.rate == null ? EM_DASH : pct(financing.rate, lang, 2);
    return `${t(financing.label_key, lang)} ${coverage} · ${t(financing.rate_key, lang)} ${rate}`;
  }
  if (financing.kind === 'scheme') {
    return `${t(financing.scheme_key, lang)} · ${t('n_capital', lang)} ${pct(financing.wacc, lang, 0)}`;
  }
  return financing.rate == null
    ? EM_DASH
    : `${t(financing.label_key || 'w_rate', lang)} ${pct(financing.rate, lang, 1)}`;
}

function buildPortfolioKpis(state, data) {
  const { lang } = state;
  const k = data.kpis;
  return el('div', { class: 'grid g4', style: 'margin-bottom:14px' }, [
    buildKpi(
      t(k.projects.label_key, lang),
      nf(k.projects.value, lang, 0),
      '',
      `${nf(k.projects.stock, lang, 0)} ${t(k.projects.stock_unit_key, lang)}`,
    ),
    buildKpi(
      t(k.revenue.label_key, lang),
      fmtMillions(state, k.revenue.value),
      '',
      t(k.revenue.detail_key, lang),
    ),
    buildKpi(
      t(k.leak.label_key, lang),
      fmtMillions(state, k.leak.value),
      '',
      pct(k.leak.share, lang, 1),
      'wrn',
    ),
    buildKpi(
      t(k.ops.label_key, lang),
      nf(k.ops.value, lang, 0),
      '',
      t(k.ops.detail_key, lang),
    ),
  ]);
}

function portfolioProbTag(state, probability) {
  const tagClass = {
    ok: 't-ok',
    warn: 't-wr',
    bad: 't-bd',
  }[probability.severity] || 't-nt';
  return el('span', { class: `tag ${tagClass}` }, [
    `${nf((probability.prob || 0) * 100, state.lang, 0)}%`,
  ]);
}

function buildPortfolioTable(state, data) {
  const { lang } = state;
  const table = data.table || {};
  const rows = table.rows || [];
  const head = el('thead', null, [
    el('tr', null, [
      el('th', null, [t('th_proj', lang)]),
      el('th', { class: 'num' }, [t('th_rem', lang)]),
      el('th', { class: 'num' }, [t(table.handover_label_key || 'th_hand', lang)]),
      el('th', null, [t('w_fin', lang)]),
      el('th', { class: 'num' }, [t('th_list', lang)]),
      el('th', { class: 'num' }, [t('th_nep', lang)]),
      el('th', { class: 'num' }, [t('th_gap', lang)]),
      el('th', { class: 'num' }, [t('th_loss', lang)]),
      el('th', null, [t('th_pace', lang)]),
      el('th', null, [t('th_prob', lang)]),
      el('th', { class: 'num' }, [t('al_th_ops', lang)]),
    ]),
  ]);
  const bodyRows = rows.map((row) => {
    const paceClass = row.pace < 0.85 ? 'w' : '';
    return el(
      'tr',
      {
        'data-open-project': row.id,
        tabindex: '0',
        role: 'button',
        style: 'cursor:pointer',
      },
      [
        el('td', null, [
          el('b', null, [pick(row.name, lang)]),
          el('div', { class: 'src' }, [pick(row.area, lang)]),
          row.start_here
            ? el('span', { class: 'tag t-wr' }, [t('pr_first', lang)])
            : null,
        ]),
        el('td', { class: 'num' }, [`${nf(row.stock, lang)} ${t('u_units', lang)}`]),
        el('td', { class: 'num' }, [`${nf(row.handover_months, lang)} ${t('u_mo', lang)}`]),
        el('td', null, [portfolioFinancingText(state, row.financing)]),
        el('td', { class: 'num' }, [nf(row.list_psf, lang, 0)]),
        el('td', { class: 'num' }, [nf(row.nep_psf, lang, 0)]),
        el('td', { class: 'num' }, [pct(row.gap, lang, 1)]),
        el('td', { class: 'num' }, [fmtMillions(state, row.leak_abs)]),
        el('td', null, [
          el('div', { class: 'miniflex' }, [
            buildBar(Math.min(1, row.pace), paceClass),
            el('span', { class: 'pct' }, [pct(row.pace, lang, 0)]),
          ]),
        ]),
        el('td', null, [
          portfolioProbTag(state, row.probability || {}),
          el('div', { class: 'src' }, [
            `P50 ${nf((row.probability || {}).p50 || 0, lang, 0)} / ${nf(row.stock, lang, 0)}`,
          ]),
        ]),
        el('td', { class: 'num' }, [nf(row.ops, lang, 0)]),
      ],
    );
  });
  return el('div', { class: 'panel' }, [
    el('h2', null, [t(table.title_key || 'al_tbl', lang)]),
    el('div', { style: 'overflow-x:auto' }, [
      el('table', null, [head, el('tbody', null, bodyRows)]),
    ]),
  ]);
}

function buildPortfolioLadder(state, data) {
  const { lang } = state;
  const ladder = data.ladder || {};
  const components = ladder.components || [];
  const scale = Math.max(
    1,
    ...components.map((component) => Math.abs(component.value || 0)),
  );
  const classByKey = {
    tvm: 'lad-tvm',
    financing: 'lad-esc',
    cancellation: 'lad-cx',
    cut: 'lad-cut',
    concessions: 'lad-c',
  };
  const bars = components.map((component) =>
    el(
      'div',
      {
        class: `lad ${classByKey[component.key] || 'lad-c2'}`,
        style: `width:${Math.max(4, (Math.abs(component.value || 0) / scale) * 100)}%`,
      },
      [el('span', null, [fmtMillions(state, component.value || 0)])],
    ),
  );
  const legend = components.map((component) =>
    el('div', null, [
      el('i', { class: classByKey[component.key] || 'lad-c2' }, []),
      `${t(component.label_key, lang)} `,
      el('b', null, [fmtMillions(state, component.value || 0)]),
    ]),
  );
  return el('div', { class: 'panel' }, [
    el('h2', null, [t(ladder.title_key || 'al_loss', lang)]),
    el('div', { class: 'bigres' }, [
      buildBigCol(t('th_loss', lang), fmtMillions(state, ladder.total || 0), '', 'wrn'),
    ]),
    el('div', { class: 'ladder' }, bars),
    el('div', { class: 'legend' }, legend),
  ]);
}

function buildPortfolioComparison(state, data) {
  const { lang } = state;
  const cmp = data.comparison || {};
  const head = el('thead', null, [
    el('tr', null, [
      el('th', null, [t('st_h', lang)]),
      el('th', { class: 'num' }, [t('al_k2', lang)]),
      el('th', { class: 'num' }, [t('th_loss', lang)]),
      el('th', { class: 'num' }, [t('th_gap', lang)]),
    ]),
  ]);
  const rows = (cmp.rows || []).map((row) => {
    const on = row.strat === cmp.active;
    const attrs = on
      ? { style: 'background:#F5FBF6;box-shadow:inset 2px 0 0 var(--green)' }
      : null;
    return el('tr', attrs, [
      el('td', null, [el('b', null, [t(`sg_${row.strat}`, lang)])]),
      el('td', { class: 'num' }, [fmtMillions(state, row.revenue)]),
      el('td', { class: 'num' }, [fmtMillions(state, row.leak)]),
      el('td', { class: 'num' }, [pct(row.gap, lang, 1)]),
    ]);
  });
  return el('div', { class: 'panel' }, [
    el('h2', null, [t(cmp.title_key || 'al_strat', lang)]),
    el('div', { style: 'overflow-x:auto' }, [
      el('table', null, [head, el('tbody', null, rows)]),
    ]),
  ]);
}

export function renderPortfolioSurface(state, data) {
  const { lang } = state;
  const header = el('div', { class: 'h' }, [
    el('h1', null, [t(data.heading_key, lang)]),
    el('p', { class: 'sub' }, [t(data.sub_key, lang)]),
  ]);
  return el('div', null, [
    header,
    buildPortfolioKpis(state, data),
    buildPortfolioTable(state, data),
    el('div', { class: 'grid g23' }, [
      buildPortfolioLadder(state, data),
      buildPortfolioComparison(state, data),
    ]),
  ]);
}

function buildCompModeControl(state, mode) {
  const { lang } = state;
  const options = mode.options || [];
  const buttons = options.map((option) =>
    el(
      'button',
      {
        type: 'button',
        class: option.value === mode.value ? 'pill on' : 'pill',
        'aria-pressed': option.value === mode.value ? 'true' : 'false',
        'data-control': 'competitors_mode',
        'data-value': option.value,
      },
      [t(option.label_key, lang)],
    ),
  );
  return el('div', { class: 'seg', role: 'group', 'aria-label': t(mode.label_key, lang) }, [
    el('span', { class: 'mini-lb' }, [t(mode.label_key, lang)]),
    ...buttons,
  ]);
}

function compKpiValue(state, key, kpi) {
  if (key === 'average_price') {
    return `${fmtMoney(state, kpi.value)} / ${priceUnitLabel(state)}`;
  }
  if (key === 'share') {
    return pct(kpi.value, state.lang, 1);
  }
  if (key === 'raised') {
    return `${nf(kpi.value, state.lang, 0)} / ${nf(kpi.total, state.lang, 0)}`;
  }
  return nf(kpi.value, state.lang, 0);
}

function compKpiDetail(state, key, kpi) {
  const { lang } = state;
  if (!kpi.detail_key) {
    return '';
  }
  if (key === 'absorption') {
    return tf(kpi.detail_key, lang, pct(kpi.share || 0, lang, 1));
  }
  if (key === 'average_price') {
    return tf(kpi.detail_key, lang, signedPct(kpi.own_delta || 0, lang, 1));
  }
  return t(kpi.detail_key, lang);
}

function signedPct(value, lang, digits = 1) {
  return `${value > 0 ? '+' : ''}${pct(value, lang, digits)}`;
}

function buildCompKpis(state, kpis) {
  const { lang } = state;
  const tiles = Object.entries(kpis || {}).map(([key, kpi]) =>
    buildKpi(
      t(kpi.label_key, lang),
      compKpiValue(state, key, kpi),
      kpi.unit_key ? t(kpi.unit_key, lang) : '',
      compKpiDetail(state, key, kpi),
      key === 'average_price' && (kpi.own_delta || 0) < 0 ? 'pos' : '',
    ),
  );
  return el('div', { class: 'kpis' }, tiles);
}

function buildCompTable(state, table) {
  const { lang } = state;
  const own = table.own || {};
  const head = el('tr', null, [
    el('th', null, [t('cp_th_name', lang)]),
    el('th', null, [t('cp_th_ready', lang)]),
    el('th', { class: 'num' }, [t('cp_th_supply', lang)]),
    el('th', { class: 'num' }, [t('cp_th_left', lang)]),
    el('th', { class: 'num' }, [t('cp_th_price', lang)]),
    el('th', { class: 'num' }, [t('cp_th_pace', lang)]),
    el('th', { class: 'num' }, [t('cp_th_mo', lang)]),
    el('th', null, [t('cp_th_src', lang)]),
  ]);
  const ownRow = el('tr', { style: 'background:#F5FBF6;box-shadow:inset 2px 0 0 var(--green)' }, [
    el('td', null, [el('b', null, [pick(own.name, lang)]), el('span', { class: 'tag t-ok', style: 'margin-inline-start:6px' }, [t('cp_me', lang)])]),
    el('td', null, [EM_DASH]),
    el('td', { class: 'num' }, [nf(own.units || own.stock || 0, lang, 0)]),
    el('td', { class: 'num' }, [nf(own.stock || 0, lang, 0)]),
    el('td', { class: 'num' }, [`${fmtMoney(state, own.price || 0)} / ${priceUnitLabel(state)}`]),
    el('td', { class: 'num' }, [nf(own.pace || 0, lang, 1)]),
    el('td', { class: 'num' }, [nf(own.months || 0, lang, 1)]),
    el('td', null, [EM_DASH]),
  ]);
  const rows = (table.rows || []).map((row) =>
    el('tr', null, [
      el('td', null, [el('b', null, [pick(row.name, lang)]), el('div', { class: 'src' }, [pick(row.developer, lang)])]),
      el('td', null, [`${pick(row.class, lang)} / ${nf(row.readiness, lang, 0)}%`]),
      el('td', { class: 'num' }, [nf(row.supply, lang, 0)]),
      el('td', { class: 'num' }, [nf(row.left, lang, 0)]),
      el('td', { class: 'num' }, [`${fmtMoney(state, row.price)} / ${priceUnitLabel(state)}`]),
      el('td', { class: 'num' }, [nf(row.pace, lang, 1)]),
      el('td', { class: 'num' }, [nf(row.months, lang, 1)]),
      el('td', null, [t(row.source_key, lang)]),
    ]),
  );
  return el('div', { class: 'panel' }, [
    el('h2', null, [t(table.title_key, lang)]),
    el('div', { style: 'overflow-x:auto' }, [el('table', null, [el('thead', null, [head]), el('tbody', null, [ownRow, ...rows])])]),
  ]);
}

function buildCompMap(state, map) {
  const points = map.points || [];
  const prices = points.map((p) => p.price);
  const months = points.map((p) => p.months);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minMonth = Math.min(...months);
  const maxMonth = Math.max(...months);
  const scale = (value, lo, hi, a, b) => (hi === lo ? (a + b) / 2 : a + ((value - lo) / (hi - lo)) * (b - a));
  const circles = points.map((point) =>
    svgEl('circle', {
      cx: scale(point.price, minPrice, maxPrice, 48, 360),
      cy: scale(point.months, minMonth, maxMonth, 160, 34),
      r: Math.max(5, Math.min(18, point.radius || 5)),
      fill: point.color,
      opacity: point.own ? '0.95' : '0.70',
      'data-own': point.own ? 'true' : 'false',
    }, []),
  );
  return el('div', { class: 'panel' }, [
    el('h2', null, [t(map.title_key, state.lang)]),
    map.sub_key ? el('div', { class: 'src' }, [t(map.sub_key, state.lang)]) : null,
    svgEl('svg', { viewBox: '0 0 408 190', role: 'img', 'aria-label': t(map.title_key, state.lang) }, [
      svgEl('line', { x1: 36, y1: 166, x2: 372, y2: 166, stroke: '#DFE6E8' }, []),
      svgEl('line', { x1: 36, y1: 166, x2: 36, y2: 24, stroke: '#DFE6E8' }, []),
      ...circles,
    ]),
  ]);
}

function buildCompCorridor(state, corridor) {
  const { lang } = state;
  return el('div', { class: 'panel', style: 'border-inline-start:3px solid var(--amber)' }, [
    el('h2', null, [t(corridor.title_key, lang)]),
    el('div', { class: 'bigres' }, [
      buildBigCol(t(corridor.low_label_key, lang), fmtMoney(state, corridor.low), priceUnitLabel(state)),
      buildBigCol(t(corridor.high_label_key, lang), fmtMoney(state, corridor.high), priceUnitLabel(state)),
      buildBigCol(
        t(corridor.share_label_key, lang),
        pct(corridor.share || 0, lang, 1),
        tf(corridor.share_detail_key, lang, nf(corridor.own_pace || 0, lang, 1)),
        'wrn',
      ),
    ]),
    el('div', { class: 'src' }, [
      tf(
        corridor.note_key,
        lang,
        `${fmtMoney(state, corridor.low)}-${fmtMoney(state, corridor.high)}`,
        nf(corridor.capacity || 0, lang, 1),
      ),
    ]),
  ]);
}

function buildCompDynamics(state, dynamics) {
  const all = (dynamics.series || []).flatMap((line) => line.values || []);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const x = (i) => 28 + (i / Math.max(1, (dynamics.months || 1) - 1)) * 342;
  const y = (v) => (max === min ? 90 : 160 - ((v - min) / (max - min)) * 120);
  const lines = (dynamics.series || []).map((line) =>
    svgEl('polyline', {
      points: (line.values || []).map((value, index) => `${x(index)},${y(value)}`).join(' '),
      fill: 'none',
      stroke: line.color,
      'stroke-width': 3,
      'stroke-dasharray': line.dash || null,
    }, []),
  );
  const legend = (dynamics.series || []).map((line) =>
    el('span', { class: 'tag' }, [t(line.name_key, state.lang)]),
  );
  return el('div', { class: 'panel' }, [
    el('h2', null, [t(dynamics.title_key, state.lang)]),
    svgEl('svg', { viewBox: '0 0 400 180', role: 'img', 'aria-label': t(dynamics.title_key, state.lang) }, [
      svgEl('line', { x1: 28, y1: 160, x2: 370, y2: 160, stroke: '#DFE6E8' }, []),
      ...lines,
    ]),
    el('div', { class: 'legend' }, legend),
  ]);
}

function buildCompMovers(state, movers) {
  const { lang } = state;
  const rows = (movers.rows || []).map((row) =>
    el('tr', null, [
      el('td', null, [el('b', null, [pick(row.name, lang)]), el('div', { class: 'src' }, [pick(row.developer, lang)])]),
      el('td', { class: 'num' }, [`${fmtMoney(state, row.price)} / ${priceUnitLabel(state)}`]),
      el('td', { class: row.delta_price >= 0 ? 'num pos' : 'num neg' }, [sgn(row.delta_price, lang, 1)]),
      el('td', { class: 'num' }, [nf(row.left, lang, 0)]),
    ]),
  );
  return el('div', { class: 'panel' }, [
    el('h2', null, [t(movers.title_key, lang)]),
    el('div', { style: 'overflow-x:auto' }, [
      el('table', null, [
        el('thead', null, [el('tr', null, [
          el('th', null, [t('cp_th_name', lang)]),
          el('th', { class: 'num' }, [t('cp_th_price', lang)]),
          el('th', { class: 'num' }, [t('cp_th_d', lang)]),
          el('th', { class: 'num' }, [t('cp_th_left', lang)]),
        ])]),
        el('tbody', null, rows),
      ]),
    ]),
    el('div', { class: movers.note_warn ? 'note w' : 'note note-hint' }, [
      tf(movers.note_key, lang, nf(movers.raised, lang, 0), nf(movers.total, lang, 0), signedPct(movers.own_delta || 0, lang, 1)),
    ]),
  ]);
}

function buildCompRegistry(state, registry) {
  const { lang } = state;
  const rows = (registry.rows || []).map((row) =>
    el('tr', null, [
      el('td', null, [t(row.source_key, lang)]),
      el('td', null, [t(row.provides_key, lang)]),
      el('td', null, [t(row.access_key, lang)]),
    ]),
  );
  return el('div', { class: 'panel' }, [
    el('h2', null, [t(registry.title_key, lang)]),
    registry.accepted_defect_key ? el('div', { class: 'note w' }, [t(registry.accepted_defect_key, lang)]) : null,
    el('div', { style: 'overflow-x:auto' }, [
      el('table', null, [
        el('thead', null, [el('tr', null, [
          el('th', null, [t(registry.source_header_key, lang)]),
          el('th', null, [t(registry.provides_header_key, lang)]),
          el('th', null, [t(registry.access_header_key, lang)]),
        ])]),
        el('tbody', null, rows),
      ]),
    ]),
  ]);
}

export function renderCompetitorsSurface(state, data) {
  const { lang } = state;
  const body = data.mode.value === 'live'
    ? [
        buildCompKpis(state, data.live.kpis),
        buildCompDynamics(state, data.live.dynamics),
        buildCompMovers(state, data.live.movers),
      ]
    : [
        buildCompKpis(state, data.prelaunch.kpis),
        buildCompTable(state, data.prelaunch.table),
        el('div', { class: 'grid g23' }, [
          buildCompMap(state, data.prelaunch.map),
          buildCompCorridor(state, data.prelaunch.corridor),
        ]),
      ];
  return el('div', null, [
    el('div', { class: 'h' }, [
      el('h1', null, [t(data.heading_key, lang)]),
      el('p', { class: 'sub' }, [t(data.sub_key, lang)]),
      buildCompModeControl(state, data.mode),
    ]),
    ...body,
    buildCompRegistry(state, data.registry),
  ]);
}

function buildRetroControl(state, control) {
  return el('div', { class: 'panel' }, [
    el('div', { class: 'lb' }, [t(control.label_key, state.lang)]),
    el('input', {
      type: 'range',
      min: control.min,
      max: control.max,
      step: control.step,
      value: control.value,
      'data-control': 'retro_month',
      'aria-label': t(control.month_label_key, state.lang),
    }, []),
    el('div', { class: 'src' }, [
      `${t(control.month_label_key, state.lang)}: ${monthPointLabel(state.lang, control.month_point)}`,
    ]),
  ]);
}

function buildRetroKpis(state, point) {
  const { lang } = state;
  const k = point.kpis || {};
  return el('div', { class: 'kpis' }, [
    buildKpi(t(k.sold.label_key, lang), nf(k.sold.value, lang, 0), t(k.sold.unit_key, lang), pct(k.sold.share, lang, 0)),
    buildKpi(t(k.actual.label_key, lang), `${fmtMoney(state, k.actual.value)} / ${priceUnitLabel(state)}`, '', ''),
    buildKpi(t(k.optimal.label_key, lang), `${fmtMoney(state, k.optimal.value)} / ${priceUnitLabel(state)}`, '', sgn(k.optimal.delta, lang, 1), k.optimal.delta >= 0 ? 'pos' : 'neg'),
    buildKpi(t(k.deviation.label_key, lang), fmtMillions(state, k.deviation.value), '', pct(k.deviation.share, lang, 1), 'wrn'),
  ]);
}

function buildRetroChart(state, chart) {
  const months = chart.months || 0;
  const values = [...(chart.actual || []), ...(chart.optimal || [])];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const maxSold = Math.max(...(chart.sales || [1]));
  const x = (i) => 28 + (i / Math.max(1, months - 1)) * 342;
  const y = (v) => (max === min ? 76 : 134 - ((v - min) / (max - min)) * 108);
  const actual = (chart.actual || []).reduce((path, value, index) => {
    const px = x(index);
    const py = y(value);
    if (index === 0) {
      return `M ${px} ${py}`;
    }
    return `${path} H ${px} V ${py}`;
  }, '');
  const optimal = (chart.optimal || []).map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const bars = (chart.sales || []).map((sold, index) =>
    svgEl('rect', {
      x: x(index) - 4,
      y: 164 - (sold / maxSold) * 34,
      width: 6,
      height: (sold / maxSold) * 34,
      fill: '#B8C6CC',
      opacity: '0.85',
    }, []),
  );
  const markerX = x(chart.marker.month);
  return el('div', { class: 'panel' }, [
    el('h2', null, [t(chart.title_key, state.lang)]),
    svgEl('svg', { viewBox: '0 0 400 190', role: 'img', 'aria-label': t(chart.title_key, state.lang) }, [
      ...bars,
      svgEl('path', { d: actual, fill: 'none', stroke: '#263238', 'stroke-width': 3, 'stroke-linejoin': 'round' }, []),
      svgEl('polyline', { points: optimal, fill: 'none', stroke: '#2FB84D', 'stroke-width': 3, 'stroke-dasharray': '6 4' }, []),
      svgEl('line', { x1: markerX, y1: 18, x2: markerX, y2: 176, stroke: chart.marker.color, 'stroke-width': 2 }, []),
    ]),
    el('div', { class: 'legend' }, [
      el('span', { class: 'tag' }, [t(chart.actual_key, state.lang)]),
      el('span', { class: 'tag t-ok' }, [t(chart.optimal_key, state.lang)]),
      el('span', { class: 'tag t-w' }, [monthPointLabel(state.lang, chart.marker.month_point)]),
    ]),
  ]);
}

function buildRetroTotals(state, totals) {
  const { lang } = state;
  return el('div', { class: 'panel' }, [
    el('h2', null, [t(totals.title_key, lang)]),
    el('div', { class: 'bigres' }, [
      buildBigCol(t(totals.revenue.label_key, lang), fmtMillions(state, totals.revenue.value), `${fmtMoney(state, totals.revenue.psf)} / ${priceUnitLabel(state)}`),
      buildBigCol(t(totals.lost_to_lag.label_key, lang), fmtMillions(state, totals.lost_to_lag.value), pct(totals.lost_to_lag.share, lang, 1), 'wrn'),
      buildBigCol(t(totals.lost_to_forms.label_key, lang), fmtMillions(state, totals.lost_to_forms.value), pct(totals.lost_to_forms.share, lang, 1), 'wrn'),
    ]),
    el('div', { class: 'note note-hint' }, [t(totals.honesty_key, lang)]),
  ]);
}

function buildRetroForms(state, forms) {
  const shares = forms.installment_share || [];
  const max = Math.max(0, ...shares);
  const width = (value) => (max > 0 ? Math.max(2, (value / max) * 100) : 2);
  const bars = shares.map((value, index) =>
    el('div', { class: 'bar', title: `${monthPointLabel(state.lang, forms.labels[index])}: ${pct(value, state.lang, 0)}` }, [
      el('i', { style: `width:${width(value)}%` }, []),
      index % 6 === 0 ? el('span', null, [monthPointLabel(state.lang, forms.labels[index])]) : null,
    ]),
  );
  return el('div', { class: 'panel' }, [
    el('h2', null, [t(forms.title_key, state.lang)]),
    forms.sub_key ? el('div', { class: 'src' }, [t(forms.sub_key, state.lang)]) : null,
    el('div', { class: 'ladder' }, bars),
  ]);
}

export function renderRetroSurface(state, data) {
  const { lang } = state;
  return el('div', null, [
    el('div', { class: 'h' }, [
      el('h1', null, [t(data.heading_key, lang)]),
      el('p', { class: 'sub' }, [t(data.sub_key, lang)]),
    ]),
    el('div', { class: 'grid g23' }, [
      buildRetroControl(state, data.control),
      buildRetroKpis(state, data.point),
    ]),
    buildRetroChart(state, data.chart),
    el('div', { class: 'grid g23' }, [
      buildRetroTotals(state, data.totals),
      buildRetroForms(state, data.forms),
    ]),
    el('div', { class: 'panel' }, [
      el('h2', null, [t(data.why.title_key, lang)]),
      el('div', { class: 'src' }, [t(data.why.sub_key, lang)]),
    ]),
  ]);
}
const SURFACE_RENDERERS = {
  today: renderTodaySurface,
  nep: renderNepSurface,
  shelf: renderShelfSurface,
  desk: renderDeskSurface,
  release: renderReleaseSurface,
  trend: renderTrendSurface,
  comp: renderCompetitorsSurface,
  retro: renderRetroSurface,
  all: renderPortfolioSurface,
};


export function openConfirmModal(state, opts) {
  const options = opts || {};
  if (typeof document !== 'undefined' && document.querySelector('.modal-mask')) {
    return null;
  }
  const invoker =
    typeof document !== 'undefined' ? document.activeElement : null;
  const lang = (state && state.lang) || 'ru';

  function restoreFocus() {
    if (invoker && typeof invoker.focus === 'function') {
      invoker.focus();
    }
  }

  let onKeydown = null;
  function close() {
    if (onKeydown) {
      document.removeEventListener('keydown', onKeydown);
    }
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    restoreFocus();
  }

  const confirmBtn = el(
    'button',
    { type: 'button', class: 'btn-primary modal-confirm' },
    [t(options.confirmKey || 'w_confirm', lang)],
  );
  confirmBtn.addEventListener('click', () => {
    close();
    if (options.onConfirm) {
      options.onConfirm();
    }
  });
  const cancelBtn = el(
    'button',
    { type: 'button', class: 'btn modal-cancel' },
    [t('w_cancel', lang)],
  );
  cancelBtn.addEventListener('click', close);
  const closeX = el(
    'button',
    { type: 'button', class: 'modal-x', 'aria-label': t('w_cancel', lang) },
    ['×'],
  );
  closeX.addEventListener('click', close);
  const body =
    options.body != null
      ? options.body
      : options.bodyKey
        ? tp(options.bodyKey, lang, options.params || {})
        : '';
  const dialog = el(
    'div',
    { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'preview-modal-title' },
    [
      closeX,
      options.titleKey
        ? el('h2', { class: 'modal-title', id: 'preview-modal-title' }, [t(options.titleKey, lang)])
        : null,
      body ? el('p', { class: 'modal-body' }, [body]) : null,
      el('div', { class: 'modal-actions' }, [cancelBtn, confirmBtn]),
    ],
  );
  const overlay = el('div', { class: 'modal-mask' }, [dialog]);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  const focusable = [closeX, cancelBtn, confirmBtn];
  onKeydown = (event) => {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key === 'Tab') {
      const active = document.activeElement;
      let index = focusable.indexOf(active);
      if (index === -1) {
        index = focusable.length - 1;
      }
      const next = event.shiftKey
        ? (index - 1 + focusable.length) % focusable.length
        : (index + 1) % focusable.length;
      event.preventDefault();
      focusable[next].focus();
    }
  };
  document.addEventListener('keydown', onKeydown);

  document.body.append(overlay);
  confirmBtn.focus();
  return overlay;
}


export function renderLogin(state, handlers) {
  const { lang } = state;
  const username = el('input', {
    class: 'input', name: 'username', id: 'demo-username', type: 'text', dir: 'ltr',
    required: '', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false',
  });
  const password = el('input', {
    class: 'input', name: 'password', id: 'demo-password', type: 'password', dir: 'ltr',
    required: '', autocomplete: 'current-password', 'aria-describedby': 'login-error',
  });
  const form = el('form', { class: 'demo-form' }, [
    el('label', { class: 'field', for: 'demo-username' }, [
      el('span', { class: 'label' }, [t('ui_username', lang)]), username,
    ]),
    el('label', { class: 'field', for: 'demo-password' }, [
      el('span', { class: 'label' }, [t('ui_password', lang)]), password,
    ]),
    el('p', { id: 'login-error', class: 'login-error', role: 'alert' }, []),
    el('button', { class: 'btn-primary', type: 'submit' }, [t('ui_signin', lang)]),
  ]);
  form.addEventListener('submit', event => {
    event.preventDefault();
    handlers.onSubmit(username.value, password.value);
  });
  return el('main', { class: 'demo-entry' }, [
    el('section', { class: 'demo-intro' }, [
      buildBrand(lang),
      el('div', { class: 'demo-intro-copy' }, [
        el('span', { class: 'demo-eyebrow' }, [t('ui_demo_title', lang)]),
        el('h1', null, [t('ui_login_headline', lang)]),
        el('p', null, [t('ui_login_intro', lang)]),
        el('div', { class: 'demo-capabilities' }, [
          el('span', null, [t('nav_desk', lang)]),
          el('span', null, [t('nav_release', lang)]),
          el('span', null, [t('nav_comp', lang)]),
        ]),
      ]),
      el('small', null, [t('rf_title', lang)]),
    ]),
    el('section', { class: 'demo-entry-panel', 'aria-labelledby': 'login-title' }, [
      buildLangSwitcher(lang, handlers.onLang),
      el('div', { class: 'demo-login-card' }, [
        el('h2', { id: 'login-title' }, [t('ui_login_title', lang)]),
        el('p', { class: 'demo-login-sub' }, [t('ui_login_sub', lang)]),
        form,
        el('p', { class: 'demo-public-note' }, [t('ui_public_note', lang)]),
      ]),
      el('p', { class: 'demo-entry-footer' }, [t('ui_notice', lang)]),
    ]),
  ]);
}
