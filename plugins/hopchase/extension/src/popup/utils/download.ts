import type { Chain } from '../../core/types'

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function exportFilename(chain: Chain, extension: string): string {
  let host = 'chain'
  const url = chain.finalUrl ?? chain.hops[0]?.url
  if (url) {
    try {
      host = new URL(url).hostname
    } catch {
      // keep the fallback
    }
  }
  const stamp = new Date(chain.startedAt)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .slice(0, 15)
  return `hopchase-${host}-${stamp}.${extension}`
}
