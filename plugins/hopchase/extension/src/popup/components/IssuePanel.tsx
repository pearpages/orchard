import type { Issue, IssueSeverity } from '../../core/types'
import './IssuePanel.scss'

const SEVERITY_ORDER: IssueSeverity[] = ['error', 'warning', 'info']

interface IssuePanelProps {
  issues: Issue[]
  onSelectHop?: (hopIndex: number) => void
}

export function IssuePanel({ issues, onSelectHop }: IssuePanelProps) {
  if (issues.length === 0) return null
  const sorted = [...issues].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  )
  return (
    <ul className="issue-panel">
      {sorted.map((issue, index) => (
        <li key={index} className={`issue-panel__row issue-panel__row--${issue.severity}`}>
          <span className="issue-panel__dot" aria-hidden="true" />
          <span className="issue-panel__message">{issue.message}</span>
          {issue.hopIndex != null && (
            <button type="button" className="issue-panel__hop" onClick={() => onSelectHop?.(issue.hopIndex!)}>
              hop {issue.hopIndex + 1}
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
