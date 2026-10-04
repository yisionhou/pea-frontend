<script setup lang="ts">
import { computed, shallowRef, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useRecord } from '../composables/useRecord'
import { request, asError, type ApiError } from '../api/client'
import { recordPath, title, time } from '../domain/common'
import { sourceName, stopState, stopActor, agentStage } from '../domain/followup'
import type { Followup, Audit, Evidence } from '../types'
import ErrorState from '../components/ErrorState.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EvidenceCard from '../components/EvidenceCard.vue'
const id = String(useRoute().params.agentRunId)
const { data: run, error, loading, reload } = useRecord<Followup>('followup', id)
const initial = shallowRef<Audit | null>(null), child = shallowRef<Audit | null>(null)
const relatedError = shallowRef<ApiError | null>(null)
let controller: AbortController | undefined
async function loadRelated() {
  controller?.abort()
  const active = new AbortController()
  controller = active
  relatedError.value = null
  if (!run.value) return
  await Promise.all([['initial', run.value.initial_run_id], ['child', run.value.reaudit_run_id]].map(async ([kind, linked]) => {
    if (!linked) { if (kind === 'child') child.value = null; return }
    try {
      const value = await request<Audit>('/v1' + recordPath('audit', linked), { signal: active.signal })
      if (active.signal.aborted) return
      if (kind === 'initial') initial.value = value
      else child.value = value
    } catch (e) { if (!active.signal.aborted) relatedError.value = asError(e) }
  }))
}
watch(() => [run.value?.initial_run_id, run.value?.reaudit_run_id, run.value?.status], loadRelated, { immediate: true })
onBeforeUnmount(() => controller?.abort())
const trace = computed(() => [...(run.value?.trace || [])].sort((a, b) => a.step - b.step))
const latest = computed(() => trace.value.at(-1))
const evidence = computed(() => {
  const map = new Map<string, Evidence>()
  for (const e of child.value?.case_snapshot.evidence || []) if (e.evidence_id) map.set(e.evidence_id, e)
  for (const e of run.value?.new_evidence || []) if (e.evidence_id) map.set(e.evidence_id, e)
  return (run.value?.new_evidence_ids || []).map(id => map.get(id) || { evidence_id: id, text: '' })
})
const missing = (audit: Audit | null) => !audit?.assessment ? 'Not provided'
  : audit.assessment.missing_information.map(g => g.description).join('; ') || 'None identified'
</script>
<template>
  <div class="page-heading">
    <div><h1>Evidence Follow-up</h1><p>Search approved HR sources for missing factual context and re-audit the claim.</p>
      <p class="mono">{{ id }}</p>
      <p v-if="initial" class="meta">Case {{ initial.case_snapshot.case_id }} · Employee {{ initial.case_snapshot.employee_id }}</p>
      <p v-if="run?.started_at" class="meta">Created {{ time(run.started_at) }}</p>
    </div><StatusBadge v-if="run" :value="run.status" />
  </div>
  <ErrorState :error="error" retry @retry="reload" /><el-skeleton v-if="loading" :rows="8" animated />
  <template v-if="run">
    <div class="agent-story" aria-label="Follow-up workflow"><span>01 · Initial audit</span><span>02 · Agent search</span><span>03 · Retrieved evidence</span><span>04 · Re-audit</span></div>
    <ErrorState :error="relatedError" retry @retry="loadRelated" />
    <section class="panel">
      <div class="row spread wrap"><h2>Initial Audit</h2><span class="badge">Preserved historical record</span></div>
      <StatusBadge :value="initial?.assessment?.label || run.label_before" />
      <dl class="key-values">
        <dt>Manager Claim</dt><dd class="prose">{{ initial?.case_snapshot.claim || 'Not provided' }}</dd>
        <dt>Performance Criterion</dt><dd class="prose">{{ initial?.case_snapshot.criterion || 'Not provided' }}</dd>
        <dt>Review Period</dt><dd>{{ initial?.case_snapshot.review_period ? `${initial.case_snapshot.review_period.start} to ${initial.case_snapshot.review_period.end}` : 'Not provided' }}</dd>
        <dt>Initial Evidence Count</dt><dd>{{ initial?.case_snapshot.evidence.length ?? 'Not provided' }}</dd>
        <dt>Missing Information</dt><dd class="prose">{{ missing(initial) }}</dd>
      </dl><router-link :to="recordPath('audit', run.initial_run_id)">View initial audit</router-link>
    </section>
    <section class="dark-panel">
      <span class="eyebrow">Optional extension</span><h2>Agent Search</h2>
      <p class="agent-stage" role="status">{{ agentStage(run) }}</p>
      <p>Retrieval addresses missing facts, without seeking a more positive judgment.</p>
      <dl class="key-values">
        <dt>Approved source</dt><dd>{{ sourceName(latest?.tool_name) }}</dd>
        <dt>Agent Reason</dt><dd class="prose">{{ latest?.reason || 'Not provided' }}</dd>
        <dt>Search Query</dt><dd class="prose">{{ latest?.arguments?.query || 'Not provided' }}</dd>
        <dt>Records Found</dt><dd>{{ latest?.returned_count ?? 'Not provided' }}</dd>
        <dt>Stop state</dt><dd>{{ stopState(run.stop_reason) || 'Not provided' }}</dd>
        <dt>Stop actor</dt><dd>{{ stopActor(run) }}</dd>
      </dl>
      <p v-if="run.stop_reason === 'NO_NEW_EVIDENCE' && !run.error">Consecutive searches added no new evidence. The server stopped the search.</p>
      <p v-if="run.error" class="dark-notice">Execution error: {{ run.error.error_code }}<br />{{ run.error.message }}</p>
    </section>
    <section class="panel">
      <h2>Retrieved Evidence</h2><p class="muted">New records from approved sources, separate from the initial submitted evidence.</p>
      <EvidenceCard v-for="item in evidence" :key="item.evidence_id" :evidence="item" retrieved :unreviewed="run.unreviewed_evidence_ids.includes(item.evidence_id!)" />
      <el-empty v-if="!evidence.length" :description="run.status === 'RUNNING' ? 'No evidence retrieved yet' : 'No evidence added'" />
      <p v-if="run.unreviewed_evidence_ids.length" class="notice">Retrieved evidence has not completed re-audit.</p>
    </section>
    <section class="panel">
      <h2>Re-audit Comparison</h2><p class="muted">The initial audit is preserved. Re-audit creates a new child record.</p>
      <div class="agent-comparison">
        <article><h3>Initial Audit</h3><StatusBadge :value="initial?.assessment?.label || run.label_before" />
          <p>Evidence: {{ initial?.case_snapshot.evidence.length ?? 'Not provided' }}</p><p class="prose">Missing: {{ missing(initial) }}</p>
          <p class="mono">Initial audit ID: {{ run.initial_run_id }}</p>
        </article>
        <article><h3>Re-audit</h3>
          <StatusBadge v-if="run.reaudit_status === 'SUCCEEDED' && run.label_after" :value="run.label_after" /><p v-else>No re-audit result</p>
          <p v-if="!run.reaudit_run_id && !run.error && run.status !== 'RUNNING' && !run.new_evidence_ids.length">No matching evidence was retrieved. The original audit is unchanged. The missing information remains unresolved.</p>
          <p>Evidence: {{ child?.case_snapshot.evidence.length ?? 'Not provided' }}</p><p class="prose">Missing: {{ missing(child) }}</p>
          <p class="prose">{{ child?.assessment?.reason || title(run.reaudit_status) }}</p>
          <p class="mono">Child audit ID: {{ run.reaudit_run_id || 'Not provided' }}</p><p class="mono">Parent audit ID: {{ child?.parent_run_id || 'Not provided' }}</p>
          <router-link v-if="run.reaudit_run_id" :to="recordPath('audit', run.reaudit_run_id)">View re-audit</router-link>
        </article>
      </div>
    </section>
    <section class="panel"><details><summary>Agent Trace · {{ trace.length }} tool calls</summary>
      <ol class="trace-list"><li v-for="step in trace" :key="step.step"><h3>Step {{ step.step }}</h3>
        <dl class="key-values"><dt>Tool</dt><dd>{{ step.tool_name || 'Not provided' }}</dd><dt>Source</dt><dd>{{ sourceName(step.tool_name) }}</dd>
          <dt>Reason</dt><dd class="prose">{{ step.reason || 'Not provided' }}</dd><dt>Query</dt><dd class="prose">{{ step.arguments?.query || 'Not provided' }}</dd>
          <dt>Results</dt><dd>{{ step.returned_count ?? 'Not provided' }}</dd><dt>Evidence added</dt><dd class="mono">{{ step.new_evidence_ids?.join(', ') || 'None' }}</dd>
          <dt>Normalized search terms</dt><dd class="prose">{{ step.normalized_search_terms?.join(', ') || 'Not provided' }}</dd>
        </dl></li></ol>
      <p>Stop state: {{ stopState(run.stop_reason) || 'Not provided' }}</p>
      <p>Estimated cost: {{ run.usage?.api_cost_usd == null ? 'Not provided' : `$${Number(run.usage.api_cost_usd).toFixed(6)}` }}</p>
    </details></section>
  </template>
</template>
