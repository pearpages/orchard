import type { Hop } from '../types'

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

export function toCurl(hop: Hop): string {
  const lines = [`curl -i -X ${hop.method} ${shellQuote(hop.url)}`]
  for (const header of hop.requestHeaders) {
    lines.push(`  -H ${shellQuote(`${header.name}: ${header.value}`)}`)
  }
  return lines.join(' \\\n')
}
