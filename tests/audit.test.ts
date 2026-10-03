import { describe, expect, it } from 'vitest'
import { validateAudit, followupBlock, reviewPayload } from '../src/domain/audit'
const user: any = {
  permissions: ['audit', 'followup', 'review'],
  employee_ids: ['E1'],
  case_ids: null,
  review_period: null,
}
const payload: any = {
  case: {
    case_id: 'case1',
    employee_id: 'E1',
    criterion: 'Target',
    claim: 'Met target',
    evidence: [],
    locale: 'en',
    review_period: null,
  },
  mode: 'rule',
  rubric_version: 'v0.4',
}
describe('audit validation', () => {
  it('accepts empty evidence and counts Unicode code points', () => {
    expect(validateAudit(payload, user)).toEqual({})
    expect(
      validateAudit(
        { ...payload, case: { ...payload.case, evidence: [{ text: '😀'.repeat(4000) }] } },
        user,
      ),
    ).toEqual({})
    expect(
      validateAudit(
        { ...payload, case: { ...payload.case, evidence: [{ text: '😀'.repeat(4001) }] } },
        user,
      ),
    ).toHaveProperty('case.evidence.0.text')
  })
  it('validates total limits, blank added cards, paired dates and account scope', () => {
    expect(
      validateAudit({ ...payload, case: { ...payload.case, evidence: [{ text: '' }] } }, user),
    ).toHaveProperty('case.evidence.0.text')
    expect(
      validateAudit(
        {
          ...payload,
          case: {
            ...payload.case,
            evidence: Array.from({ length: 7 }, () => ({ text: 'a'.repeat(4000) })),
          },
        },
        user,
      ),
    ).toHaveProperty('case.evidence')
    expect(
      validateAudit(
        {
          ...payload,
          case: { ...payload.case, evidence: [{ text: 'a', occurred_start: '2026-01-01' }] },
        },
        user,
      ),
    ).toHaveProperty('case.evidence.0.dates')
    expect(
      validateAudit({ ...payload, case: { ...payload.case, employee_id: 'E2' } }, user),
    ).toHaveProperty('case.employee_id')
    expect(
      validateAudit(payload, {
        ...user,
        review_period: { start: '2026-01-01', end: '2026-12-31' },
      }),
    ).toHaveProperty('case.review_period')
  })
})
describe('review and follow-up semantics', () => {
  const audit: any = {
    run_id: 'r1',
    status: 'SUCCEEDED',
    run_hash: 'a'.repeat(64),
    parent_run_id: null,
    case_snapshot: { review_period: { start: '2026-01-01', end: '2026-04-01' }, evidence: [] },
    assessment: { label: 'INSUFFICIENT_INFORMATION', missing_information: [{ retrievable: true }] },
  }
  it('requires the original successful run, a retrievable gap and complete dates', () => {
    expect(followupBlock(audit, user, false)).toBe('')
    expect(followupBlock({ ...audit, parent_run_id: 'parent' }, user, false)).toBeTruthy()
    expect(followupBlock({ ...audit, status: 'FAILED' }, user, false)).toBeTruthy()
    expect(
      followupBlock(
        { ...audit, assessment: { ...audit.assessment, label: 'PARTIALLY_SUPPORTED' } },
        user,
        false,
      ),
    ).toBeTruthy()
  })
  it('sends original label for accept, chosen label for modify and null for request-more', () => {
    const form: any = {
      action: 'ACCEPT',
      final_label: 'SUPPORTED',
      rationale: 'Explanation',
      evidence_ids: [],
    }
    expect(reviewPayload(audit, form).final_label).toBe('INSUFFICIENT_INFORMATION')
    expect(reviewPayload(audit, { ...form, action: 'MODIFY' }).final_label).toBe('SUPPORTED')
    expect(
      reviewPayload(audit, { ...form, action: 'REQUEST_MORE_EVIDENCE' }).final_label,
    ).toBeNull()
    expect(reviewPayload(audit, form).expected_run_hash).toBe(audit.run_hash)
  })
})
