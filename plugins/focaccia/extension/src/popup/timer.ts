import { dialViewOf } from '../shared/dial-view';
import { sendCommand } from '../shared/messages';
import { patchBlockerState } from '../shared/storage';
import { formatClock } from '../shared/time';
import type { PomodoroState, Settings } from '../shared/types';

const CIRCUMFERENCE = 2 * Math.PI * 45; // dial progress circle, r=45 in the 120-unit viewBox

const dial = document.querySelector<SVGSVGElement>('#dial')!;
const ticks = document.querySelector<SVGGElement>('#dial-ticks')!;
const progress = document.querySelector<SVGCircleElement>('#dial-progress')!;
const time = document.querySelector<HTMLSpanElement>('#dial-time')!;
const phaseLabel = document.querySelector<HTMLSpanElement>('#dial-phase')!;
const controls = document.querySelector<HTMLDivElement>('#pomodoro-controls')!;
const focusInput = document.querySelector<HTMLInputElement>('#focus-minutes')!;
const breakInput = document.querySelector<HTMLInputElement>('#break-minutes')!;

let current: PomodoroState = { status: 'idle' };
let settings: Settings = { focusMinutes: 25, breakMinutes: 5 };

export function initTimer(): void {
  buildTicks();
  controls.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (button?.dataset.action) void runAction(button.dataset.action);
  });
  for (const input of [focusInput, breakInput]) {
    input.addEventListener('change', () => void saveSettings());
  }
  window.setInterval(paint, 500);
}

export function renderTimer(state: PomodoroState, nextSettings: Settings): void {
  current = state;
  settings = nextSettings;
  syncSettingsInputs();
  renderControls();
  paint();
}

function runAction(action: string): Promise<unknown> {
  switch (action) {
    case 'start-focus':
      return sendCommand({ type: 'pomodoro/start', phase: 'focus' });
    case 'start-break':
      return sendCommand({ type: 'pomodoro/start', phase: 'break' });
    case 'pause':
      return sendCommand({ type: 'pomodoro/pause' });
    case 'resume':
      return sendCommand({ type: 'pomodoro/resume' });
    default:
      return sendCommand({ type: 'pomodoro/stop' });
  }
}

async function saveSettings(): Promise<void> {
  await patchBlockerState({
    settings: {
      focusMinutes: readMinutes(focusInput, settings.focusMinutes),
      breakMinutes: readMinutes(breakInput, settings.breakMinutes),
    },
  });
}

function readMinutes(input: HTMLInputElement, fallback: number): number {
  const value = Number.parseInt(input.value, 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), 180) : fallback;
}

function syncSettingsInputs(): void {
  if (document.activeElement !== focusInput) focusInput.value = String(settings.focusMinutes);
  if (document.activeElement !== breakInput) breakInput.value = String(settings.breakMinutes);
}

function renderControls(): void {
  const buttons: Record<PomodoroState['status'], string[]> = {
    idle: [button('start-focus', 'Start focus', true), button('start-break', 'Start break', false)],
    running: [button('pause', 'Pause', true), button('stop', 'Reset', false)],
    paused: [button('resume', 'Resume', true), button('stop', 'Reset', false)],
  };
  controls.innerHTML = buttons[current.status].join('');
}

function button(action: string, label: string, primary: boolean): string {
  const variant = primary ? 'button--primary' : 'button--ghost';
  return `<button class="button ${variant}" type="button" data-action="${action}">${label}</button>`;
}

function paint(): void {
  const view = dialViewOf(current, settings, Date.now());
  time.textContent = formatClock(view.remainingMs);
  phaseLabel.textContent = view.label;
  progress.style.strokeDasharray = String(CIRCUMFERENCE);
  progress.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - view.fraction));
  dial.classList.toggle('dial--break', view.phase === 'break');
  dial.classList.toggle('dial--paused', current.status === 'paused');
  dial.classList.toggle('dial--idle', current.status === 'idle');
}

function buildTicks(): void {
  const lines: string[] = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * 2 * Math.PI;
    const major = i % 5 === 0;
    const inner = major ? 52.5 : 55;
    const outer = 58;
    const x1 = (60 + Math.sin(angle) * inner).toFixed(2);
    const y1 = (60 - Math.cos(angle) * inner).toFixed(2);
    const x2 = (60 + Math.sin(angle) * outer).toFixed(2);
    const y2 = (60 - Math.cos(angle) * outer).toFixed(2);
    const modifier = major ? ' dial__tick--major' : '';
    lines.push(`<line class="dial__tick${modifier}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
  }
  ticks.innerHTML = lines.join('');
}
