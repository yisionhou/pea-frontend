export type Label = 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'UNSUPPORTED' | 'INSUFFICIENT_INFORMATION'
export type RecordKind = 'audit' | 'followup' | 'evaluation'
export interface Period {
  start: string
  end: string
}
export interface User {
  principal_id: string
  username: string | null
  display_name: string
  permissions: string[]
  employee_ids: string[]
  case_ids: string[] | null
  review_period: Period | null
  source_types: string[]
  evaluation_profiles: string[]
  expires_at: string | null
}
export interface Evidence {
  evidence_id?: string
  text: string
  occurred_start?: string | null
  occurred_end?: string | null
  source_description?: string
  source_type?: string
  source_id?: string
}
export interface Case {
  case_id: string
  employee_id: string
  criterion: string
  claim: string
  review_period: Period | null
  reference_standard?: string | null
  evidence: Evidence[]
  locale: 'en' | 'zh'
}
export interface AuditInput {
  case: Case
  mode: 'rule' | 'llm'
  model_profile?: string | null
  rubric_version: string
}
export interface Dimension {
  status: string
  reason: string
  evidence_ids: string[]
}
export interface Assessment {
  label: Label
  reason: string
  relevance: Dimension
  specificity: Dimension
  claim_evidence_fit: Dimension
  coverage: Dimension
  missing_information: {
    gap_id: string
    kind: string
    description: string
    affected_claim_part: string
    retrievable: boolean
  }[]
  contradictions: { description: string; evidence_ids: string[] }[]
  cited_evidence_ids: string[]
}
export interface RunError {
  error_code: string
  message?: string
}
export interface Usage {
  api_cost_usd?: number | null
  cost_status?: string
  calls?: unknown[]
  [key: string]: unknown
}
export interface Review {
  review_id: string
  reviewer_id: string
  action: string
  final_label: Label | null
  rationale: string
  reviewed_at: string
  evidence_ids?: string[]
}
export interface Audit {
  followup_eligible?: boolean
  followup_ineligible_reasons?: string[]
  followup_agent_profiles?: string[]
  actionable_missing_information?: Assessment['missing_information']
  run_id: string
  case_id: string
  status: string
  assessment: Assessment | null
  human_review_required: boolean
  human_review_reasons: string[]
  error: RunError | null
  parent_run_id: string | null
  case_snapshot: Case
  excluded_evidence: { evidence: Evidence; reason: string }[]
  versions: Record<string, unknown>
  run_hash: string | null
  human_reviews: Review[]
  started_at: string
  finished_at: string | null
  usage: Usage
}
export interface ReviewFormData {
  action: 'ACCEPT' | 'MODIFY' | 'REQUEST_MORE_EVIDENCE'
  final_label: Label
  rationale: string
  evidence_ids: string[]
}
export interface Trace {
  normalized_search_terms?: string[]
  retrieval_version?: string
  reason?: string
  step: number
  tool_name?: string
  arguments?: { query?: string; limit?: number }
  status?: string
  returned_count?: number
  new_evidence_ids?: string[]
  [key: string]: unknown
}
export interface Followup {
  started_at?: string | null
  finished_at?: string | null
  agent_run_id: string
  initial_run_id: string
  reaudit_run_id: string | null
  final_run_id: string
  status: string
  reaudit_status: string
  stop_reason: string | null
  label_before: Label
  label_after: Label | null
  label_changed: boolean
  error: RunError | null
  new_evidence_ids: string[]
  new_evidence?: Evidence[]
  unreviewed_evidence_ids: string[]
  trace: Trace[]
  human_review_reasons: string[]
  usage: Usage | null
}
export interface ClassMetric {
  count: number
  predicted_count: number
  precision: number
  recall: number
  f1: number
}
export interface GroupMetric {
  name: string
  case_count: number
  completed_count: number
  correct_count: number
  failed_count: number
  accuracy: number | null
  execution_success_rate: number | null
  macro_f1: number
  macro_f1_definition: string
  per_class: Record<string, ClassMetric>
  confusion_matrix: Record<string, Record<string, number>>
  false_support: {
    count: number
    denominator: number
    rate: number | null
    denominator_definition: string
    by_gold_label: Record<string, { count: number; denominator: number }>
  }
  api_cost_usd: number | null
  cost_status: string
  duration_seconds: { total: number; mean: number | null; p95: number | null }
}
export interface EvaluationResult {
  case_id: string
  group: string
  run_id: string | null
  gold_label: Label
  predicted_label: Label | null
  error: RunError | null
  duration_seconds: number | null
  api_cost_usd: number | null
  cost_status: string
  agent?: Followup
  reaudit_gold_label?: Label | null
}
export interface EvaluationSummary {
  dataset_version?: string
  rubric_version?: string
  case_count?: number
  groups?: GroupMetric[]
  scenario_count?: number
  followup_count?: number
  failed_count?: number
  retrieved_evidence_count?: number
  reaudit_count?: number
  label_change_count?: number
  stop_reasons?: Record<string, number>
  reaudit_accuracy?: number | null
  reaudit_accuracy_denominator?: number
  reaudit_accuracy_definition?: string
  api_cost_usd?: number | null
  cost_status?: string
}
export interface Evaluation {
  experiment_id: string
  evaluation_profile: string
  status: string
  created_at: string
  progress: { completed_tasks: number; total_tasks: number }
  summary: EvaluationSummary | null
  error: RunError | null
  finished_at: string | null
  results: EvaluationResult[]
}
