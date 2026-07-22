import type {
  AppState,
  ExportFile,
  HeaderEntry,
  HeaderOperation,
  Profile,
  UrlFilter,
  UrlFilterKind,
} from './types'

export type ImportResult = { ok: true; profiles: Profile[] } | { ok: false; error: string }

const HEADER_OPERATIONS: HeaderOperation[] = ['set', 'remove', 'append']
const FILTER_KINDS: UrlFilterKind[] = ['contains', 'regex']

class ImportError extends Error {}

function fail(message: string): never {
  throw new ImportError(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function takeId(value: unknown, usedIds: Set<string>): string {
  let id = typeof value === 'string' && value !== '' ? value : crypto.randomUUID()
  while (usedIds.has(id)) id = crypto.randomUUID()
  usedIds.add(id)
  return id
}

function takeString(record: Record<string, unknown>, key: string, fallback: string, path: string): string {
  const value = record[key]
  if (value === undefined) return fallback
  if (typeof value !== 'string') fail(`${path}.${key} must be a string`)
  return value
}

function takeBoolean(record: Record<string, unknown>, key: string, fallback: boolean, path: string): boolean {
  const value = record[key]
  if (value === undefined) return fallback
  if (typeof value !== 'boolean') fail(`${path}.${key} must be a boolean`)
  return value
}

function parseHeaderEntry(value: unknown, usedIds: Set<string>, path: string): HeaderEntry {
  if (!isRecord(value)) fail(`${path} must be an object`)
  const operation = takeString(value, 'operation', 'set', path)
  if (!HEADER_OPERATIONS.includes(operation as HeaderOperation)) {
    fail(`${path}.operation must be one of ${HEADER_OPERATIONS.join(', ')}`)
  }
  return {
    id: takeId(value.id, usedIds),
    name: takeString(value, 'name', '', path),
    value: takeString(value, 'value', '', path),
    operation: operation as HeaderOperation,
    enabled: takeBoolean(value, 'enabled', true, path),
  }
}

function parseUrlFilter(value: unknown, usedIds: Set<string>, path: string): UrlFilter {
  if (!isRecord(value)) fail(`${path} must be an object`)
  const kind = takeString(value, 'kind', 'contains', path)
  if (!FILTER_KINDS.includes(kind as UrlFilterKind)) {
    fail(`${path}.kind must be one of ${FILTER_KINDS.join(', ')}`)
  }
  return {
    id: takeId(value.id, usedIds),
    kind: kind as UrlFilterKind,
    pattern: takeString(value, 'pattern', '', path),
    enabled: takeBoolean(value, 'enabled', true, path),
  }
}

function parseList<T>(
  value: unknown,
  path: string,
  parseItem: (item: unknown, itemPath: string) => T,
): T[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) fail(`${path} must be an array`)
  return value.map((item, i) => parseItem(item, `${path}[${i}]`))
}

function parseProfile(value: unknown, usedIds: Set<string>, path: string): Profile {
  if (!isRecord(value)) fail(`${path} must be an object`)
  return {
    id: takeId(value.id, usedIds),
    title: takeString(value, 'title', 'Imported profile', path),
    enabled: takeBoolean(value, 'enabled', true, path),
    requestHeaders: parseList(value.requestHeaders, `${path}.requestHeaders`, (item, p) =>
      parseHeaderEntry(item, usedIds, p),
    ),
    responseHeaders: parseList(value.responseHeaders, `${path}.responseHeaders`, (item, p) =>
      parseHeaderEntry(item, usedIds, p),
    ),
    urlFilters: parseList(value.urlFilters, `${path}.urlFilters`, (item, p) =>
      parseUrlFilter(item, usedIds, p),
    ),
  }
}

export function exportState(state: AppState, exportedAt: string): ExportFile {
  return {
    format: 'headerforge',
    version: 1,
    exportedAt,
    profiles: state.profiles,
  }
}

export function serializeExport(state: AppState, exportedAt: string): string {
  return JSON.stringify(exportState(state, exportedAt), null, 2)
}

export function importState(json: string): ImportResult {
  try {
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      fail('File is not valid JSON')
    }
    if (!isRecord(parsed)) fail('File must contain a JSON object')
    if (parsed.format !== 'headerforge') fail('Not a HeaderForge export file')
    if (parsed.version !== 1) fail(`Unsupported export version: ${String(parsed.version)}`)
    if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
      fail('Export file contains no profiles')
    }
    const usedIds = new Set<string>()
    const profiles = parsed.profiles.map((profile, i) =>
      parseProfile(profile, usedIds, `profiles[${i}]`),
    )
    return { ok: true, profiles }
  } catch (error) {
    if (error instanceof ImportError) return { ok: false, error: error.message }
    throw error
  }
}
