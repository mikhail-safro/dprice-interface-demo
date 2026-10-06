import { renderShell, renderLogin, openConfirmModal } from './render.js';
import { loadExamples, screenExample } from './fixtures.js';
import { t, nf, sgn } from './dict.js';
import { demoProfile, restoreProfile, rememberProfile } from './demo.js';

const root = document.querySelector('#app');
const state = { lang: 'ru', market: 'rf', project: null, surface: 'today', phase: 'empty', profile: null };
const edits = new Map();
let examples;
let railOpen = false;
let loadVersion = 0;

function setDocumentLanguage() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
  document.title = `DPrice · ${t('ui_demo_title', state.lang)}`;
}

function enter(profile) {
  Object.assign(state, { profile, lang: profile.lang, market: profile.market, project: null, surface: 'today', phase: 'empty' });
  rememberProfile(profile);
  showExamples();
}

function logout() {
  railOpen = false;
  loadVersion += 1;
  rememberProfile(null);
  examples = null;
  edits.clear();
  Object.assign(state, { profile: null, project: null, surface: 'today', phase: 'empty' });
  paint();
  root.querySelector('[name="username"]').focus();
}

function controls() {
  const key = `${state.market}/${state.project}`;
  if (!edits.has(key)) edits.set(key, {});
  return edits.get(key);
}

function project(id) {
  state.project = String(id);
  if (id === 'all') state.surface = 'all';
  else if (state.surface === 'all') state.surface = 'today';
  railOpen = false;
  paint();
}

const handlers = {
  onLang(lang) { state.lang = lang; paint(); },
  onMarket(market) {
    state.market = market;
    state.project = examples ? Object.keys(examples[market].projects)[0] : null;
    if (state.surface === 'all') state.surface = 'today';
    railOpen = false;
    paint();
  },
  onProject: project,
  onTab(surface) { state.surface = surface; paint(); },
  onToggleRail() {
    railOpen = !railOpen;
    root.querySelector('.rail').classList.toggle('open', railOpen);
    root.querySelector('.rail-mask').classList.toggle('open', railOpen);
    root.querySelector('.burger').setAttribute('aria-expanded', String(railOpen));
  },
};

function paint() {
  setDocumentLanguage();
  if (!state.profile) {
    root.replaceChildren(renderLogin(state, {
      onLang: handlers.onLang,
      onSubmit(login, password) {
        const profile = demoProfile(login, password);
        if (profile) { enter(profile); return; }
        root.querySelector('#login-error').textContent = t('ui_login_error', state.lang);
        const input = root.querySelector('[name="password"]');
        input.setAttribute('aria-invalid', 'true');
        input.value = '';
        input.focus();
      },
    }));
    return;
  }
  const snapshot = state.phase === 'ready'
    ? screenExample(examples, state, controls())
    : { chrome: {}, data: null };
  state.chrome = snapshot.chrome;
  state.surfaceData = snapshot.data;
  const shell = renderShell(state, snapshot.chrome, handlers);
  const notice = document.createElement('div');
  notice.className = 'static-notice';
  const label = document.createElement('span');
  label.textContent = t('ui_notice', state.lang);
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'btn';
  reset.dataset.reset = 'true';
  reset.textContent = t('ui_reset', state.lang);
  notice.append(label);
  const actions = document.createElement('div');
  actions.className = 'demo-actions';
  const account = document.createElement('bdi');
  account.className = 'demo-account';
  account.textContent = state.profile.login;
  const exit = document.createElement('button');
  exit.type = 'button';
  exit.className = 'btn';
  exit.dataset.logout = 'true';
  exit.textContent = t('ui_logout', state.lang);
  actions.append(account);
  if (state.phase === 'ready') actions.append(reset);
  actions.append(exit);
  notice.append(actions);
  shell.querySelector('.top').after(notice);
  const status = document.createElement('div');
  status.className = 'preview-status';
  status.setAttribute('role', 'status');
  notice.after(status);
  const mask = document.createElement('div');
  mask.className = 'rail-mask';
  mask.addEventListener('click', handlers.onToggleRail);
  shell.append(mask);
  root.replaceChildren(shell);
  root.querySelector('.burger').setAttribute('aria-expanded', 'false');
  root.querySelector('.burger').setAttribute('aria-controls', 'rail');
  railOpen = false;
  annotateRanges();
}

async function showExamples() {
  if (!state.profile) return;
  if (state.phase === 'loading' || state.phase === 'ready') return;
  const version = ++loadVersion;
  state.phase = 'loading';
  paint();
  try {
    const loaded = await loadExamples();
    if (version !== loadVersion) return;
    examples = loaded;
    state.project = state.surface === 'all'
      ? 'all'
      : Object.keys(examples[state.market].projects)[0];
    state.phase = 'ready';
  } catch (error) {
    if (version !== loadVersion) return;
    state.phase = 'error';
    console.error(error);
  }
  paint();
  const target = root.querySelector('[data-load-examples], #content h1');
  if (target?.tagName === 'H1') target.setAttribute('tabindex', '-1');
  target?.focus({ preventScroll: true });
}

// Keep the slider node alive during dragging so pointer/keyboard interaction
// stays continuous. Only its visible control readout changes.
function rangeLabel(input) {
  const key = input.dataset.control;
  const value = Number(input.value);
  if (key === 'release_index') return `${sgn(value, state.lang, 1)}%`;
  if (['rate', 'cut'].includes(key)) return `${nf(value, state.lang, 1)}%`;
  if (key === 'coverage') return `${nf(value, state.lang, 0)}%`;
  return nf(value, state.lang, 0);
}

function annotateRanges() {
  for (const input of root.querySelectorAll('input[type="range"]')) {
    const label = input.closest('.sl')?.querySelector('label');
    if (label) input.setAttribute('aria-label', label.textContent);
    if (input.dataset.control === 'retro_month') {
      const output = document.createElement('div');
      output.className = 'src control-position';
      input.after(output);
      updateRange(input);
    }
  }
}

function updateRange(input) {
  const label = input.closest('.sl')?.querySelector('b');
  if (label) label.textContent = rangeLabel(input);
  const position = input.parentElement.querySelector('.control-position');
  if (position) position.textContent = `${t('ui_retro_position', state.lang)}: ${rangeLabel(input)}`;
}

function changeControl(input) {
  if (input.dataset.lever) {
    controls().levers ||= {};
    controls().levers[input.dataset.lever] = input.checked;
    input.closest('.tgi').classList.toggle('on', input.checked);
  } else {
    controls()[input.dataset.control] = input.value;
    if (input.type === 'range') updateRange(input);
    if (input.type === 'radio') {
      for (const radio of root.querySelectorAll('input[type="radio"]')) {
        radio.closest('.tgi').classList.toggle('on', radio.checked);
      }
    }
  }
}

root.addEventListener('input', (event) => {
  if (event.target.matches('input[type="range"][data-control]')) changeControl(event.target);
});
root.addEventListener('change', (event) => {
  if (event.target.matches('select[data-control], input[data-control], input[data-lever]')) {
    changeControl(event.target);
  }
});

function preview(button) {
  openConfirmModal(state, {
    titleKey: 'ui_preview_title',
    body: `${button.textContent.trim()}. ${t('ui_preview_body', state.lang)}`,
    confirmKey: 'ui_preview_confirm',
    onConfirm() {
      if (button.dataset.strategy) {
        controls().strategy = button.dataset.strategy;
        paint();
        root.querySelector(`[data-strategy="${button.dataset.strategy}"]`).focus();
      }
      root.querySelector('.preview-status').textContent = t('ui_preview_done', state.lang);
    },
  });
}

root.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button?.disabled) return;
  if (button?.dataset.loadExamples) { showExamples(); return; }
  if (button?.dataset.logout) { logout(); return; }
  if (button?.dataset.reset) { edits.clear(); paint(); return; }
  if (button?.dataset.segment || button?.dataset.value) {
    controls()[button.dataset.control] = button.dataset.segment || button.dataset.value;
    const selector = button.dataset.segment
      ? `[data-segment="${button.dataset.segment}"]`
      : `[data-control="${button.dataset.control}"][data-value="${button.dataset.value}"]`;
    paint();
    root.querySelector(selector)?.focus();
    return;
  }
  if (button?.dataset.openSurface) { handlers.onTab(button.dataset.openSurface); return; }
  const row = event.target.closest('[data-open-project]');
  if (row) { project(row.dataset.openProject); return; }
  if (button?.matches('[data-decision], [data-approve-group], [data-approve-all], [data-save-scenario], [data-strategy], [data-reason-group]')) preview(button);
});
root.addEventListener('keydown', (event) => {
  const row = event.target.closest('[data-open-project]');
  if (row && ['Enter', ' '].includes(event.key)) {
    event.preventDefault();
    project(row.dataset.openProject);
  }
  if (event.key === 'Escape' && railOpen) {
    handlers.onToggleRail();
    root.querySelector('.burger').focus();
  }
});

const restored = restoreProfile();
if (restored) enter(restored);
else paint();
