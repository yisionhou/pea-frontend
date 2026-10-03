import type { RecordKind } from '../types'
export const labels = {
  SUPPORTED: 'Supported',
  PARTIALLY_SUPPORTED: 'Partially supported',
  UNSUPPORTED: 'Unsupported',
  INSUFFICIENT_INFORMATION: 'Insufficient information',
}
const statuses: Record<string, string> = {
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
  RUNNING: 'Running',
  QUEUED: 'Queued',
  COMPLETED: 'Completed',
  STOPPED: 'Stopped',
  SKIPPED: 'Re-audit not performed',
  NOT_RUN_NO_NEW_EVIDENCE: 'No new evidence; re-audit not performed',
  RELEVANT: 'Relevant',
  IRRELEVANT: 'Irrelevant',
  MIXED: 'Mixed',
  UNDETERMINED: 'Undetermined',
  ADEQUATE: 'Adequate',
  INADEQUATE: 'Inadequate',
  CONTRADICTED: 'Contradicted',
  NOT_SUPPORTED: 'Not supported',
  FULL: 'Full',
  PARTIAL: 'Partial',
  NONE: 'None',
  ACCEPT: 'Accept',
  MODIFY: 'Modify',
  REQUEST_MORE_EVIDENCE: 'Request more evidence',
  OUTSIDE_REVIEW_PERIOD: 'Outside review period',
  RUBRIC_UNCONFIRMED: 'Rubric pending confirmation',
  ...labels,
}
export const title = (value?: string | null) => (value ? statuses[value] || value : 'Not available')
export const chars = (value: string) => Array.from(value).length
export const percent = (value?: number | null) =>
  value == null || !Number.isFinite(value) ? 'Not available' : `${+(value * 100).toFixed(1)}%`
export const cost = (value?: number | null, status?: string) =>
  value == null || status === 'UNKNOWN' || !Number.isFinite(value)
    ? 'Unknown'
    : `$${value.toFixed(value > 0 && value < 0.01 ? 6 : 2)}`
export const time = (value?: string | null) =>
  value ? new Date(value).toLocaleString('en', { timeZoneName: 'short' }) : 'Not available'
export const recordPath = (kind: RecordKind, id: string) =>
  `${{ audit: '/audits', followup: '/follow-ups', evaluation: '/evaluations' }[kind]}/${encodeURIComponent(id)}`
export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string' || /[\\\r\n]/.test(value)) return '/'
  try {
    const decoded = decodeURIComponent(value)
    if (decoded.includes('\\') || decoded.startsWith('//')) return '/'
  } catch {
    return '/'
  }
  return /^\/(?:$|(?:audits|follow-ups|evaluations)\/[^/?#]+(?:[?#].*)?$)/.test(value) ? value : '/'
}
export function createIdempotency() {
  let snapshot = ''
  let key = ''
  return (payload: unknown) => {
    const next = JSON.stringify(payload)
    if (snapshot !== next || !key) {
      snapshot = next
      key = crypto.randomUUID()
    }
    return key
  }
}
