import { getBlockerState, getPomodoroState, setPomodoroState } from '../shared/storage';
import type { PomodoroPhase } from '../shared/types';
import { badgeViewOf, nextPhase } from './pomodoro-logic';

const END_ALARM = 'pomodoro-end';
const TICK_ALARM = 'pomodoro-tick';

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
  const next = nextPhase(state.phase);
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
  const badge = badgeViewOf(state, Date.now());
  if (badge.color) await chrome.action.setBadgeBackgroundColor({ color: badge.color });
  await chrome.action.setBadgeText({ text: badge.text });
}

async function clearAlarms(): Promise<void> {
  await chrome.alarms.clear(END_ALARM);
  await chrome.alarms.clear(TICK_ALARM);
}
