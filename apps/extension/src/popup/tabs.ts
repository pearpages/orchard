import { setActiveTab } from '../shared/storage';
import type { TabId } from '../shared/tabs';

export function initTabs(): void {
  const tablist = document.querySelector<HTMLElement>('[role="tablist"]')!;
  tablist.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-tab]');
    if (!button?.dataset.tab) return;
    const tab = button.dataset.tab as TabId;
    renderTabs(tab); // immediate feedback; storage confirms asynchronously
    void setActiveTab(tab);
  });
}

export function renderTabs(active: TabId): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-tab]')) {
    const selected = button.dataset.tab === active;
    button.classList.toggle('tabs__tab--active', selected);
    button.setAttribute('aria-selected', String(selected));
  }
  for (const panel of document.querySelectorAll<HTMLElement>('[data-panel]')) {
    panel.hidden = panel.dataset.panel !== active;
  }
}
