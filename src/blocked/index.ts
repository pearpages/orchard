const FOCUS_LINES = [
  'One thing at a time.',
  'The tab will still be there when the work is done.',
  'It can wait 25 minutes.',
  'Future you says thanks.',
  'Deep work in progress.',
];

const site = new URLSearchParams(location.search).get('site');
const siteEl = document.getElementById('blocked-site');
const lineEl = document.getElementById('focus-line');

if (site && siteEl) {
  siteEl.textContent = site;
  document.title = `${site} — blocked`;
}

if (lineEl) {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  lineEl.textContent = FOCUS_LINES[dayIndex % FOCUS_LINES.length] ?? FOCUS_LINES[0]!;
}
