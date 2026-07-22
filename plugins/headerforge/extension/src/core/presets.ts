import type { HeaderOperation } from './types'

export interface HeaderPreset {
  label: string
  name: string
  value: string
  operation?: HeaderOperation
}

export const REQUEST_PRESETS: HeaderPreset[] = [
  { label: 'Bearer token', name: 'Authorization', value: 'Bearer <token>' },
  { label: 'Basic auth', name: 'Authorization', value: 'Basic <base64-credentials>' },
  { label: 'JSON content type', name: 'Content-Type', value: 'application/json' },
  { label: 'Accept JSON', name: 'Accept', value: 'application/json' },
  { label: 'Skip caches', name: 'Cache-Control', value: 'no-cache' },
  { label: 'Language', name: 'Accept-Language', value: 'en-US' },
  { label: 'Mark as XHR', name: 'X-Requested-With', value: 'XMLHttpRequest' },
  { label: 'Spoof client IP', name: 'X-Forwarded-For', value: '127.0.0.1' },
  { label: 'Origin', name: 'Origin', value: 'https://example.com' },
  { label: 'Referer', name: 'Referer', value: 'https://example.com/' },
  { label: 'Custom user agent', name: 'User-Agent', value: 'Mozilla/5.0 (custom)' },
  { label: 'Cookie', name: 'Cookie', value: 'name=value' },
]

export const RESPONSE_PRESETS: HeaderPreset[] = [
  { label: 'Allow all origins (CORS)', name: 'Access-Control-Allow-Origin', value: '*' },
  {
    label: 'Allow all methods (CORS)',
    name: 'Access-Control-Allow-Methods',
    value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  },
  { label: 'Allow all headers (CORS)', name: 'Access-Control-Allow-Headers', value: '*' },
  { label: 'Allow credentials (CORS)', name: 'Access-Control-Allow-Credentials', value: 'true' },
  { label: 'Never cache', name: 'Cache-Control', value: 'no-store' },
  { label: 'Strip CSP', name: 'Content-Security-Policy', value: '', operation: 'remove' },
  { label: 'Allow framing', name: 'X-Frame-Options', value: '', operation: 'remove' },
]

export const REQUEST_HEADER_NAMES: string[] = [
  'Accept',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Content-Type',
  'Cookie',
  'Host',
  'If-Modified-Since',
  'If-None-Match',
  'Origin',
  'Pragma',
  'Range',
  'Referer',
  'User-Agent',
  'X-Api-Key',
  'X-Correlation-Id',
  'X-Csrf-Token',
  'X-Forwarded-For',
  'X-Forwarded-Host',
  'X-Forwarded-Proto',
  'X-Request-Id',
  'X-Requested-With',
]

export const RESPONSE_HEADER_NAMES: string[] = [
  'Access-Control-Allow-Credentials',
  'Access-Control-Allow-Headers',
  'Access-Control-Allow-Methods',
  'Access-Control-Allow-Origin',
  'Access-Control-Expose-Headers',
  'Cache-Control',
  'Content-Disposition',
  'Content-Security-Policy',
  'Content-Type',
  'Cross-Origin-Embedder-Policy',
  'Cross-Origin-Opener-Policy',
  'Cross-Origin-Resource-Policy',
  'ETag',
  'Expires',
  'Location',
  'Set-Cookie',
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'X-Frame-Options',
]
