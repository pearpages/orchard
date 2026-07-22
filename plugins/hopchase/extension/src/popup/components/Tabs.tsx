import './Tabs.scss'

export interface TabDef<T extends string> {
  id: T
  label: string
}

interface TabsProps<T extends string> {
  tabs: TabDef<T>[]
  active: T
  onChange: (id: T) => void
}

export function Tabs<T extends string>({ tabs, active, onChange }: TabsProps<T>) {
  return (
    <nav className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tabs__tab${tab.id === active ? ' tabs__tab--active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
