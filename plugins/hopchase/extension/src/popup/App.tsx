import { useState } from 'react'
import { ChainView } from './components/ChainView'
import { HistoryTab } from './components/HistoryTab'
import { Tabs } from './components/Tabs'
import { TracerTab } from './components/TracerTab'
import { useTargetTab } from './hooks/use-target-tab'
import { useTrackerState } from './hooks/use-tracker-state'
import './App.scss'

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
        <h1 className="app__title">HopChase</h1>
        <Tabs tabs={TABS} active={active} onChange={setActive} />
      </header>
      {active === 'current' && <CurrentTab />}
      {active === 'tracer' && <TracerTab />}
      {active === 'history' && <HistoryTab />}
    </main>
  )
}
