const env = import.meta.env
const list = (value: string | undefined, fallback: string) =>
  (value ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
const positive = (value: string | undefined, fallback: number) =>
  Number(value) > 0 ? Math.floor(Number(value)) : fallback
export const config = {
  apiBase: (env.VITE_API_BASE_URL || '').replace(/\/$/, ''),
  evaluationEnabled: env.VITE_ENABLE_EVALUATION_SUBMIT === 'true',
  allowPartialFollowup: env.VITE_ALLOW_PARTIAL_FOLLOWUP === 'true',
  holdoutFrozen: env.VITE_HOLDOUT_FROZEN === 'true',
  labelsConfirmed: env.VITE_LABELS_CONFIRMED === 'true',
  rubricConfirmed: env.VITE_RUBRIC_CONFIRMED === 'true',
  rubricVersion: env.VITE_RUBRIC_VERSION || 'v0.4',
  modelProfiles: list(env.VITE_MODEL_PROFILES, 'deepseek,claude'),
  evaluationProfiles: list(env.VITE_EVALUATION_PROFILES, 'core_dev,core_holdout,agent_eval'),
  agentProfile: env.VITE_AGENT_PROFILE || 'tiny',
  maxEvidence: positive(env.VITE_MAX_EVIDENCE, 30),
  maxItemChars: Math.min(4000, positive(env.VITE_MAX_EVIDENCE_ITEM_CHARS, 4000)),
  maxEvidenceChars: positive(env.VITE_MAX_EVIDENCE_CHARS, 24000),
}
