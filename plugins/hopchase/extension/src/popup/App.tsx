import { useState } from 'react'
import { ChainView } from './components/ChainView'
import { HistoryTab } from './components/HistoryTab'
import { Tabs } from './components/Tabs'
import { TracerTab } from './components/TracerTab'
import { useTargetTab } from './hooks/use-target-tab'
import { useTrackerState } from './hooks/use-tracker-state'
import './App.scss'
import pearIcon from '@browser-plugins/assets/pearpages-icon.png'

type TabId = 'current' | 'tracer' | 'history'

const TABS: { id: TabId; label: string }[] = [
  { id: 'current', label: 'Current' },
  { id: 'tracer', label: 'Tracer' },
  { id: 'history', label: 'History' },
]

function CurrentTab() {
  const tabId = useTargetTab()
  const state = useTrackerState()
  const chain = tabId != null ? state?.tabs[tabId]?.chain : undefined

  if (!chain) {
    return (
      <p className="app__empty">
        No navigation captured for this tab yet — reload the page to record its redirect chain.
      </p>
    )
  }
  return <ChainView chain={chain} />
}

export function App() {
  const [active, setActive] = useState<TabId>('current')

  return (
    <main className="app">
      <header className="app__header">
        <div className="app__brand">
          <img className="app__mark" src="/icons/icon.svg" alt="" width="26" height="26" />
          <div className="app__titles">
            <h1 className="app__title">HopChase</h1>
            <p className="app__tagline">Redirect inspector</p>
          </div>
        </div>
        <Tabs tabs={TABS} active={active} onChange={setActive} />
      </header>
      {active === 'current' && <CurrentTab />}
      {active === 'tracer' && <TracerTab />}
      {active === 'history' && <HistoryTab />}
      <footer className="credit">
        <img className="credit__icon" src={pearIcon} alt="" width="16" height="16" />
        Made by{' '}
        <a href="https://pearpages.com" target="_blank" rel="noopener">
          pearpages
        </a>
      </footer>
    </main>
  )
}
