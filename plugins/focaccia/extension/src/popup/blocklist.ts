import { normalizeSite } from '../shared/sites';
import { getBlockerState, patchBlockerState } from '../shared/storage';
import { siteCountBadge } from '../shared/tabs';
import type { BlockerState } from '../shared/types';

const form = document.querySelector<HTMLFormElement>('#blocklist-form')!;
const input = document.querySelector<HTMLInputElement>('#blocklist-input')!;
const error = document.querySelector<HTMLParagraphElement>('#blocklist-error')!;
const list = document.querySelector<HTMLUListElement>('#blocklist-items')!;
const tabCount = document.querySelector<HTMLSpanElement>('#tab-blocklist-count')!;

export function initBlocklist(): void {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void addSite();
  });
  input.addEventListener('input', () => showError(null));
  list.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-site]');
    if (button?.dataset.site) void removeSite(button.dataset.site);
  });
}

export function renderBlocklist(state: BlockerState): void {
  const badge = siteCountBadge(state.sites.length);
  tabCount.hidden = !badge.visible;
  tabCount.textContent = badge.text;

  if (state.sites.length === 0) {
    list.innerHTML = '<li class="blocklist__empty">Nothing is blocked yet. Add a site above to get started.</li>';
    return;
  }
  // Sites are normalized to [a-z0-9.-], so they are safe to interpolate.
  list.innerHTML = state.sites
    .map(
      (site) => `
        <li class="blocklist__item">
          <span class="blocklist__site">${site}</span>
          <button class="blocklist__remove" type="button" data-site="${site}" aria-label="Unblock ${site}">&times;</button>
        </li>`,
    )
    .join('');
}

async function addSite(): Promise<void> {
  const site = normalizeSite(input.value);
  if (!site) {
    showError('Enter a domain like example.com');
    return;
  }
  const { sites } = await getBlockerState();
  if (sites.includes(site)) {
    showError(`${site} is already on the list`);
    return;
  }
  await patchBlockerState({ sites: [...sites, site].sort() });
  input.value = '';
}

async function removeSite(site: string): Promise<void> {
  const { sites } = await getBlockerState();
  await patchBlockerState({ sites: sites.filter((entry) => entry !== site) });
}

function showError(message: string | null): void {
  error.hidden = !message;
  error.textContent = message ?? '';
}
