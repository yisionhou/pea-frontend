import type { Followup } from '../types'
export const sourceName = (tool?: string) => ({
  search_goal_updates: 'Goal Updates', search_feedback: 'Feedback',
  search_one_to_one_notes: 'One-to-One Notes',
}[tool || ''] || 'Not provided')
export const stopState = (value: string | null) => value === 'GAPS_ADDRESSED' ? 'SEARCH_COMPLETED' : value
export function stopActor(run: Followup) {
  if (['NO_NEW_EVIDENCE', 'ROUND_LIMIT', 'TOOL_CALL_LIMIT', 'MODEL_CALL_LIMIT', 'EVIDENCE_LIMIT', 'BUDGET_EXCEEDED', 'PLANNING_BUDGET_LIMIT', 'REPEATED_QUERY', 'TIME_LIMIT'].includes(run.stop_reason || '')) return 'Server'
  if (run.error || run.status === 'FAILED' || run.status === 'REJECTED') return 'Not applicable'
  if (['AGENT_STOPPED', 'SEARCH_COMPLETED', 'GAPS_ADDRESSED'].includes(run.stop_reason || '')) return 'Model'
  return 'Not provided'
}
export function agentStage(run: Followup) {
  if (run.status === 'REJECTED' || ['FOLLOWUP_NOT_ELIGIBLE', 'FORBIDDEN', 'SOURCE_FORBIDDEN', 'EVIDENCE_UNAVAILABLE', 'AGENT_NOT_CONFIGURED'].includes(run.error?.error_code || '')) return 'Follow-up blocked'
  if (run.error || run.status === 'FAILED') return 'Technical failure'
  if (run.status === 'RUNNING') {
    if (run.reaudit_run_id) return 'Re-audit running'
    if (run.new_evidence_ids.length) return 'Evidence retrieved'
    return run.trace.length ? 'Searching approved source' : 'Selecting approved source'
  }
  if (run.reaudit_status === 'SUCCEEDED') return 'Re-audit completed'
  if (['BUDGET_EXCEEDED', 'PLANNING_BUDGET_LIMIT'].includes(run.stop_reason || '')) return 'Budget stopped'
  if (['ROUND_LIMIT', 'TOOL_CALL_LIMIT', 'MODEL_CALL_LIMIT', 'EVIDENCE_LIMIT'].includes(run.stop_reason || '')) return 'Search limit stopped'
  if (run.stop_reason === 'REPEATED_QUERY') return 'Duplicate-query stop'
  if (!run.new_evidence_ids.length) return 'No matching evidence retrieved'
  return 'Search completed'
}
