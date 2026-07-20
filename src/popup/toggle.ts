import { patchBlockerState } from '../shared/storage';
import type { BlockerState } from '../shared/types';

const checkbox = document.querySelector<HTMLInputElement>('#master-toggle')!;
const status = document.querySelector<HTMLParagraphElement>('#toggle-status')!;

export function initToggle(): void {
  checkbox.addEventListener('change', () => {
    void patchBlockerState({ enabled: checkbox.checked });
  });
}

export function renderToggle(state: BlockerState): void {
  checkbox.checked = state.enabled;
  status.textContent = state.enabled ? 'Blocking is on' : 'Blocking is off';
  document.body.classList.toggle('is-off', !state.enabled);
}
