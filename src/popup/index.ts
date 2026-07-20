import { installDevMock } from './dev-mock';
import { getActiveTab, getBlockerState, getPomodoroState, onAnyStateChange } from '../shared/storage';
import { initBlocklist, renderBlocklist } from './blocklist';
import { initTabs, renderTabs } from './tabs';
import { initTimer, renderTimer } from './timer';
import { initToggle, renderToggle } from './toggle';

installDevMock();

async function refresh(): Promise<void> {
  const [blocker, pomodoro, activeTab] = await Promise.all([
    getBlockerState(),
    getPomodoroState(),
    getActiveTab(),
  ]);
  renderToggle(blocker);
  renderBlocklist(blocker);
  renderTimer(pomodoro, blocker.settings);
  renderTabs(activeTab);
}

initToggle();
initTabs();
initBlocklist();
initTimer();
onAnyStateChange(() => void refresh());
void refresh();
