import type { AuditInput, User, Audit, ReviewFormData } from '../types'
import { chars, labels } from './common'
import { config } from '../config'
export function validateAudit(input: AuditInput, user: User | null): Record<string, string> {
  const errors: Record<string, string> = {}
  const c = input.case
  const text = (path: string, value: string | undefined | null, max: number, optional = false) => {
    const length = chars(value?.trim() || '')
    if ((!optional && !length) || length > max)
      errors[path] = `Use ${optional ? '0' : '1'}–${max.toLocaleString()} characters.`
  }
  text('case.case_id', c.case_id, 200)
  text('case.employee_id', c.employee_id, 200)
  text('case.criterion', c.criterion, 4000)
  text('case.claim', c.claim, 4000)
  text('case.reference_standard', c.reference_standard, 4000, true)
  if (Object.keys(labels).some((l) => c.case_id.toUpperCase().startsWith(l)))
    errors['case.case_id'] = 'Case ID must not begin with an outcome label.'
  if (user && !user.employee_ids.includes('*') && !user.employee_ids.includes(c.employee_id))
    errors['case.employee_id'] = 'Select an authorized employee ID.'
  if (user?.case_ids && !user.case_ids.includes('*') && !user.case_ids.includes(c.case_id))
    errors['case.case_id'] = 'Select an authorized case ID.'
  const validPair = (start?: string | null, end?: string | null) =>
    (!start && !end) || (!!start && !!end && start <= end)
  if (
    c.review_period &&
    (!c.review_period.start ||
      !c.review_period.end ||
      !validPair(c.review_period.start, c.review_period.end))
  )
    errors['case.review_period'] = 'Provide both dates in chronological order.'
  if (
    user?.review_period &&
    (!c.review_period ||
      c.review_period.start < user.review_period.start ||
      c.review_period.end > user.review_period.end)
  )
    errors['case.review_period'] = 'Review period must be within your authorized date range.'
  if (
    c.evidence.length > config.maxEvidence ||
    c.evidence.reduce((sum, e) => sum + chars(e.text.trim()), 0) > config.maxEvidenceChars
  )
    errors['case.evidence'] =
      `Use at most ${config.maxEvidence} items and ${config.maxEvidenceChars.toLocaleString()} characters total.`
  c.evidence.forEach((e, i) => {
    text(`case.evidence.${i}.text`, e.text, config.maxItemChars)
    text(`case.evidence.${i}.source_description`, e.source_description, 1000, true)
    if (!validPair(e.occurred_start, e.occurred_end))
      errors[`case.evidence.${i}.dates`] = 'Provide both dates in chronological order.'
  })
  if (input.mode === 'llm' && !input.model_profile) errors.model_profile = 'Select a model profile.'
  return errors
}
export function followupBlock(audit: Audit): string {
  return audit.followup_eligible ? '' : 'Follow-up is unavailable for this audit.'
}
export function reviewPayload(audit: Audit, form: ReviewFormData) {
  return {
    run_id: audit.run_id,
    action: form.action,
    final_label:
      form.action === 'REQUEST_MORE_EVIDENCE'
        ? null
        : form.action === 'ACCEPT'
          ? audit.assessment?.label
          : form.final_label,
    rationale: form.rationale.trim(),
    evidence_ids: form.evidence_ids,
    expected_run_hash: audit.run_hash,
  }
}
