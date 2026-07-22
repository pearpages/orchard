import type { Command } from '../shared/messages';
import { syncBlockingRules } from './blocking';
import {
  handleAlarm,
  pausePomodoro,
  refreshBadge,
  resumePomodoro,
  startPhase,
  stopPomodoro,
} from './pomodoro';

chrome.runtime.onInstalled.addListener(() => {
  void syncBlockingRules();
  void refreshBadge();
});

chrome.runtime.onStartup.addListener(() => {
  void syncBlockingRules();
  void refreshBadge();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes['enabled'] || changes['sites'])) {
    void syncBlockingRules();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  void handleAlarm(alarm.name);
});

chrome.runtime.onMessage.addListener((message: Command, _sender, sendResponse) => {
  void dispatch(message).then(() => sendResponse({ ok: true }));
  return true;
});

async function dispatch(command: Command): Promise<void> {
  switch (command.type) {
    case 'pomodoro/start':
      return startPhase(command.phase);
    case 'pomodoro/pause':
      return pausePomodoro();
    case 'pomodoro/resume':
      return resumePomodoro();
    case 'pomodoro/stop':
      return stopPomodoro();
  }
}
