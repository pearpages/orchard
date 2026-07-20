import { getBlockerState, getPomodoroState, setPomodoroState } from '../shared/storage';
import type { PomodoroPhase } from '../shared/types';

const END_ALARM = 'pomodoro-end';
const TICK_ALARM = 'pomodoro-tick';

const BADGE_COLOR: Record<PomodoroPhase, string> = {
  focus: '#b93a1f',
  break: '#5b8c51',
};

export async function startPhase(phase: PomodoroPhase): Promise<void> {
  const { settings } = await getBlockerState();
  const minutes = phase === 'focus' ? settings.focusMinutes : settings.breakMinutes;
  const totalMs = minutes * 60_000;
  const endsAt = Date.now() + totalMs;
  await setPomodoroState({ status: 'running', phase, endsAt, totalMs });
  await chrome.alarms.create(END_ALARM, { when: endsAt });
  await chrome.alarms.create(TICK_ALARM, { periodInMinutes: 0.5 });
  await refreshBadge();
}

export async function pausePomodoro(): Promise<void> {
  const state = await getPomodoroState();
  if (state.status !== 'running') return;
  await clearAlarms();
  await setPomodoroState({
    status: 'paused',
    phase: state.phase,
    remainingMs: Math.max(0, state.endsAt - Date.now()),
    totalMs: state.totalMs,
  });
  await refreshBadge();
}

export async function resumePomodoro(): Promise<void> {
  const state = await getPomodoroState();
  if (state.status !== 'paused') return;
  const endsAt = Date.now() + state.remainingMs;
  await setPomodoroState({ status: 'running', phase: state.phase, endsAt, totalMs: state.totalMs });
  await chrome.alarms.create(END_ALARM, { when: endsAt });
  await chrome.alarms.create(TICK_ALARM, { periodInMinutes: 0.5 });
  await refreshBadge();
}

export async function stopPomodoro(): Promise<void> {
  await clearAlarms();
  await setPomodoroState({ status: 'idle' });
  await refreshBadge();
}

export async function handleAlarm(name: string): Promise<void> {
  if (name === TICK_ALARM) {
    await refreshBadge();
    return;
  }
  if (name !== END_ALARM) return;
  const state = await getPomodoroState();
  if (state.status !== 'running') return;
  const next: PomodoroPhase = state.phase === 'focus' ? 'break' : 'focus';
  notifyPhaseEnd(state.phase, next);
  await startPhase(next);
}

function notifyPhaseEnd(finished: PomodoroPhase, next: PomodoroPhase): void {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: finished === 'focus' ? 'Focus session complete' : 'Break is over',
    message:
      next === 'break'
        ? 'Nice work. Break starts now.'
        : 'Back to it — a new focus session just started.',
    priority: 2,
  });
}

export async function refreshBadge(): Promise<void> {
  const state = await getPomodoroState();
  if (state.status === 'idle') {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }
  const remaining = state.status === 'running' ? state.endsAt - Date.now() : state.remainingMs;
  const minutes = Math.max(1, Math.ceil(remaining / 60_000));
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR[state.phase] });
  await chrome.action.setBadgeText({ text: state.status === 'paused' ? '⏸' : `${minutes}m` });
}

async function clearAlarms(): Promise<void> {
  await chrome.alarms.clear(END_ALARM);
  await chrome.alarms.clear(TICK_ALARM);
}
