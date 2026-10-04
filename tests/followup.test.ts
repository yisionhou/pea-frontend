import { expect, it } from 'vitest'
import { agentStage, stopState, stopActor, sourceName } from '../src/domain/followup'
import { followup } from './fixtures'
it('keeps failure, budget and business labels separate', () => {
  const run: any = { ...followup, new_evidence_ids: [], stop_reason: 'AGENT_STOPPED' }
  expect(agentStage(run)).toBe('No matching evidence retrieved')
  expect(agentStage({ ...run, status: 'REJECTED', error: { error_code: 'FORBIDDEN' } })).toBe('Follow-up blocked')
  expect(agentStage({ ...run, error: { error_code: 'PROVIDER_ERROR' } })).toBe('Technical failure')
  expect(agentStage({ ...run, stop_reason: 'PLANNING_BUDGET_LIMIT' })).toBe('Budget stopped')
  for (const stop_reason of ['ROUND_LIMIT', 'TOOL_CALL_LIMIT', 'MODEL_CALL_LIMIT'])
    expect(agentStage({ ...run, stop_reason })).toBe('Search limit stopped')
  expect(agentStage({ ...run, stop_reason: 'NO_NEW_EVIDENCE' })).toBe('No matching evidence retrieved')
  expect(stopActor({ ...run, stop_reason: 'NO_NEW_EVIDENCE' })).toBe('Server')
  expect(stopActor({ ...run, stop_reason: 'ROUND_LIMIT' })).toBe('Server')
  expect(stopActor(run)).toBe('Model')
  expect(stopActor({ ...run, status: 'FAILED', stop_reason: 'INVALID_MODEL_OUTPUT', error: { error_code: 'INVALID_MODEL_OUTPUT' } })).toBe('Not applicable')
  expect(agentStage({ ...run, stop_reason: 'REPEATED_QUERY' })).toBe('Duplicate-query stop')
  expect(agentStage({ ...run, reaudit_status: 'SUCCEEDED', label_after: 'UNSUPPORTED' })).toBe('Re-audit completed')
  expect(agentStage({ ...run, status: 'RUNNING', reaudit_run_id: 'child' })).toBe('Re-audit running')
})
it('renders neutral legacy state and missing source without inventing metadata', () => {
  expect(stopState('GAPS_ADDRESSED')).toBe('SEARCH_COMPLETED')
  expect(sourceName()).toBe('Not provided')
  expect(sourceName('search_one_to_one_notes')).toBe('One-to-One Notes')
})
