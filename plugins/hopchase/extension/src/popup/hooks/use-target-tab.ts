import { useEffect, useState } from 'react'

/**
 * The tab whose chain the popup shows. A `?tab=<id>` query override comes first —
 * that is what makes e2e (and debugging the popup in a full tab) possible, because
 * a popup page opened as a tab IS the active tab.
 */
export function useTargetTab(): number | null {
  const [tabId, setTabId] = useState<number | null>(() => {
    const param = new URLSearchParams(window.location.search).get('tab')
    return param !== null && param !== '' ? Number(param) : null
  })

  useEffect(() => {
    if (tabId !== null) return
    void chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      setTabId(tabs[0]?.id ?? null)
    })
  }, [tabId])

  return tabId
}
