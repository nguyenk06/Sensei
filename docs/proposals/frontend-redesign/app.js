const root = document.documentElement;
const body = document.body;
const themeControl = document.querySelector('#theme-control');
const themeMirror = document.querySelector('#theme-mirror');
const viewControl = document.querySelector('#view-control');

const params = new URLSearchParams(location.search);
const initialTheme = params.get('theme') || 'novapay';
const initialView = params.get('view') || 'today';

function setTheme(theme) {
  root.dataset.theme = theme;
  themeControl.value = theme;
  themeMirror.value = theme;
}

function setView(view) {
  body.dataset.view = view;
  viewControl.value = view;
  const expanded = view === 'history-expanded';
  document.querySelector('.history-summary').setAttribute('aria-expanded', String(expanded));
}

themeControl.addEventListener('change', (event) => setTheme(event.target.value));
themeMirror.addEventListener('change', (event) => setTheme(event.target.value));
viewControl.addEventListener('change', (event) => setView(event.target.value));
document.querySelector('.history-summary').addEventListener('click', () => {
  setView(body.dataset.view === 'history-expanded' ? 'history-collapsed' : 'history-expanded');
});
document.querySelector('.week-toggle').addEventListener('click', () => setView('week'));
document.querySelector('.activity-button').addEventListener('click', () => setView('activity-panel'));
document.querySelector('.activity-panel .close-review').addEventListener('click', () => setView('history-expanded'));
document.querySelectorAll('.day-rail button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.day-rail button').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  setView('today');
}));

setTheme(initialTheme);
setView(initialView);

if (params.get('chrome') === '0') document.querySelector('.prototype-toolbar').hidden = true;
