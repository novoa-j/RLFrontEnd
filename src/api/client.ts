// Thin fetch wrapper around the RocketLab backend (contract: /openapi.json).
//
// Base URL comes from VITE_API_BASE_URL. It defaults to "" (same origin), which
// pairs with the dev proxy in vite.config.ts so requests avoid CORS in dev. In
// production set VITE_API_BASE_URL to the deployed API origin.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

/** How long to wait for the backend before treating the request as timed out. */
export const REQUEST_TIMEOUT_MS = 10_000

/** An error carrying the HTTP status and any parsed error body from the API. */
export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/** The backend did not respond within REQUEST_TIMEOUT_MS. */
export class TimeoutError extends Error {
  constructor() {
    super(`The backend did not respond within ${REQUEST_TIMEOUT_MS / 1000} seconds.`)
    this.name = 'TimeoutError'
  }
}

/** The request never reached the backend (connection refused, DNS, offline…). */
export class NetworkError extends Error {
  constructor() {
    super('Could not reach the backend.')
    this.name = 'NetworkError'
  }
}

/**
 * Map any error thrown by `request` to a user-facing message. Covers every
 * status code the UI can receive from the backend, plus request timeouts and
 * network failures when the backend is unreachable.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof TimeoutError) {
    return `Request timed out — the backend did not respond within ${REQUEST_TIMEOUT_MS / 1000}s. It may be down or overloaded.`
  }
  if (err instanceof NetworkError) {
    return 'Cannot reach the backend — check that the API server is running.'
  }
  if (err instanceof ApiError) {
    const detail = err.message
    switch (err.status) {
      case 400:
        return `Bad request (400): ${detail}`
      case 401:
        return 'Not authenticated (401) — the API rejected the request.'
      case 403:
        return 'Forbidden (403) — the API refused this operation.'
      case 404:
        return `Not found (404): ${detail}`
      case 405:
        return 'Method not allowed (405) — the API does not support this operation.'
      case 409:
        return `Conflict (409): ${detail}`
      case 422:
        return `Validation failed (422): ${detail}`
      case 429:
        return 'Too many requests (429) — wait a moment and try again.'
      case 500:
        return 'Server error (500) — the backend hit an unexpected error.'
      case 502:
        return 'Bad gateway (502) — the backend is unreachable behind its proxy.'
      case 503:
        return 'Service unavailable (503) — the backend is down or restarting.'
      case 504:
        return 'Gateway timeout (504) — the backend took too long to respond.'
      default:
        return err.status >= 500
          ? `Server error (${err.status}): ${detail}`
          : `Request failed (${err.status}): ${detail}`
    }
  }
  return err instanceof Error ? err.message : 'Something went wrong.'
}

interface RequestOptions {
  method?: string
  query?: Record<string, string | number | undefined>
  body?: unknown
  signal?: AbortSignal
  timeoutMs?: number
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${BASE_URL}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** Extract a human-readable message from FastAPI's error envelope. */
function messageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length > 0) {
      // 422 validation errors: [{ loc, msg, type }, ...]
      return detail
        .map((e) =>
          e && typeof e === 'object' && 'msg' in e ? String((e as { msg: unknown }).msg) : String(e),
        )
        .join('; ')
    }
  }
  return fallback
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal, timeoutMs = REQUEST_TIMEOUT_MS } = options

  // Abort the fetch either when the caller aborts or when the timeout fires;
  // `timedOut` disambiguates the two so timeouts surface as TimeoutError.
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const onCallerAbort = () => controller.abort()
  signal?.addEventListener('abort', onCallerAbort)

  let res: Response
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      signal: controller.signal,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (timedOut) throw new TimeoutError()
    if (signal?.aborted) throw err // caller cancelled — propagate as-is
    throw new NetworkError()
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onCallerAbort)
  }

  if (res.status === 204) return undefined as T

  const parsed = await parseBody(res)

  if (!res.ok) {
    throw new ApiError(res.status, messageFromBody(parsed, `Request failed (${res.status})`), parsed)
  }

  return parsed as T
}
