import type { Chain } from '../types'

export function toJson(chain: Chain, exportedAt: string): string {
  return JSON.stringify({ format: 'hopchase', version: 1, exportedAt, chain }, null, 2)
}
