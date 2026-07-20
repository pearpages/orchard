import { phaseEndView } from '../shared/phase-end-view';

export function initPhaseEnd(search: string): void {
  const view = phaseEndView(new URLSearchParams(search));
  document.querySelector<HTMLElement>('.sign')!.classList.toggle('sign--break', view.nextPhase === 'break');
  document.querySelector<HTMLHeadingElement>('#phase-title')!.textContent = view.title;
  document.querySelector<HTMLParagraphElement>('#phase-detail')!.textContent = view.detail;
  document.title = `${view.title} — Site Blocker`;
  document.querySelector<HTMLButtonElement>('#carry-on')!.addEventListener('click', () => window.close());
}
