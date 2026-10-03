import { config } from '../config'
export interface ErrorData {
  error_code?: string
  request_id?: string
  run_id?: string
  agent_run_id?: string
  details?: { field: string; type: string }[]
  retry_after_seconds?: number
}
const messages: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect username or password, or account unavailable.',
  LOGIN_RATE_LIMITED: 'Too many sign-in attempts. Please wait before trying again.',
  FORBIDDEN: 'This action or data is outside your authorized scope.',
  INVALID_INPUT: 'Please check the highlighted fields and input limits.',
  RUN_HASH_MISMATCH:
    'The audit snapshot changed. Review the refreshed result before submitting again.',
  RUN_IN_PROGRESS:
    'This request is still processing. Open its record, or retry the unchanged request.',
  IDEMPOTENCY_CONFLICT: 'This submission key has already been used with different content.',
  EVALUATION_HTTP_DISABLED: 'Evaluation submission is disabled in this environment.',
  DATASET_NOT_FROZEN:
    'The holdout dataset, reference labels and rubric must be confirmed and frozen.',
  MODEL_NOT_CONFIGURED: 'The required model is not configured on the server.',
  PRICE_NOT_CONFIGURED: 'Model pricing has not been configured.',
  EVIDENCE_UNAVAILABLE: 'The evidence source is not available.',
  AGENT_NOT_CONFIGURED: 'The follow-up profile or evidence library is not configured.',
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public data: ErrorData = {},
    message?: string,
  ) {
    super(
      messages[code] ||
        message ||
        (status === 404
          ? 'Record not found or not accessible.'
          : status === 403
            ? 'This action or data is outside your authorized scope.'
            : status === 401
              ? 'Your session has expired. Please sign in again.'
              : 'The request could not be completed.'),
    )
    this.name = 'ApiError'
  }
}
let tokenProvider = () => ''
let onUnauthorized = () => {}
const controllers = new Set<AbortController>()
export const configureAuth = (getToken: () => string, unauthorized: () => void) => {
  tokenProvider = getToken
  onUnauthorized = unauthorized
}
export function abortRequests() {
  for (const controller of controllers) controller.abort()
  controllers.clear()
}
export async function request<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    body?: unknown
    signal?: AbortSignal
    timeout?: number
    anonymous?: boolean
  } = {},
): Promise<T> {
  const controller = new AbortController()
  controllers.add(controller)
  const token = options.anonymous ? '' : tokenProvider()
  const abort = () => controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timeout = setTimeout(
    () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
    options.timeout ?? 15000,
  )
  try {
    const response = await fetch(config.apiBase + path, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      cache: 'no-store',
    })
    // HTTP authentication failure is authoritative even if a proxy returns HTML.
    if (response.status === 401 && !options.anonymous && token === tokenProvider()) onUnauthorized()
    let envelope
    try {
      envelope = await response.json()
    } catch {
      throw new ApiError(
        response.status,
        'INVALID_RESPONSE',
        {},
        'The server returned an invalid response. Check the API connection.',
      )
    }
    if (!response.ok) {
      throw new ApiError(
        response.status,
        envelope.data?.error_code || 'HTTP_ERROR',
        envelope.data || {},
      )
    }
    if (!envelope || typeof envelope !== 'object' || !('data' in envelope))
      throw new ApiError(
        response.status,
        'INVALID_RESPONSE',
        {},
        'The server response is missing data.',
      )
    if (controller.signal.aborted) throw controller.signal.reason
    return envelope.data as T
  } catch (e) {
    if (e instanceof ApiError) throw e
    if (controller.signal.aborted && controller.signal.reason?.name !== 'TimeoutError')
      throw new DOMException('Request aborted', 'AbortError')
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      {},
      'Connection interrupted or timed out. The server may still be processing. Retry the unchanged submission to recover it.',
    )
  } finally {
    clearTimeout(timeout)
    controllers.delete(controller)
    options.signal?.removeEventListener('abort', abort)
  }
}
export const asError = (e: unknown) =>
  e instanceof ApiError
    ? e
    : new ApiError(0, 'CLIENT_ERROR', {}, e instanceof Error ? e.message : 'Unexpected error.')
