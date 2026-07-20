import { installDevMock } from './dev-mock';
import { getBlockerState, getPomodoroState, onAnyStateChange } from '../shared/storage';
import { initBlocklist, renderBlocklist } from './blocklist';
import { initTimer, renderTimer } from './timer';
import { initToggle, renderToggle } from './toggle';

installDevMock();

async function refresh(): Promise<void> {
  const [blocker, pomodoro] = await Promise.all([getBlockerState(), getPomodoroState()]);
  renderToggle(blocker);
  renderBlocklist(blocker);
  renderTimer(pomodoro, blocker.settings);
}

initToggle();
initBlocklist();
initTimer();
onAnyStateChange(() => void refresh());
void refresh();
