<script setup lang="ts">
import { computed, shallowRef, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useRecord } from '../composables/useRecord'
import { request, asError, type ApiError } from '../api/client'
import { recordPath, title } from '../domain/common'
import type { Followup, Audit, Evidence } from '../types'
import ErrorState from '../components/ErrorState.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EvidenceCard from '../components/EvidenceCard.vue'
import RunDetails from '../components/RunDetails.vue'
const id = String(useRoute().params.agentRunId),
  { data: run, error, loading, reload } = useRecord<Followup>('followup', id),
  reaudit = shallowRef<Audit | null>(null),
  relatedError = shallowRef<ApiError | null>(null)
let controller: AbortController | undefined
async function loadRelated() {
  controller?.abort()
  reaudit.value = null
  relatedError.value = null
  const linked = run.value?.reaudit_run_id
  if (!linked) return
  controller = new AbortController()
  try {
    reaudit.value = await request<Audit>('/v1' + recordPath('audit', linked), {
      signal: controller.signal,
    })
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) relatedError.value = asError(e)
  }
}
watch(() => run.value?.reaudit_run_id, loadRelated)
onBeforeUnmount(() => controller?.abort())
const evidence = computed(() => {
  const map = new Map<string, Evidence>()
  for (const e of reaudit.value?.case_snapshot.evidence || [])
    if (e.evidence_id) map.set(e.evidence_id, e)
  for (const e of run.value?.new_evidence || []) if (e.evidence_id) map.set(e.evidence_id, e)
  return (run.value?.new_evidence_ids || []).map(
    (id) => map.get(id) || { evidence_id: id, text: '' },
  )
})
const trace = computed(() => [...(run.value?.trace || [])].sort((a, b) => a.step - b.step))
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>Follow-up Details</h1>
      <p class="mono">{{ id }} <StatusBadge v-if="run" :value="run.status" /></p>
    </div>
    <div v-if="run" class="row wrap">
      <el-button @click="$router.push(recordPath('audit', run.initial_run_id))"
        >View initial audit</el-button
      ><el-button
        v-if="run.reaudit_run_id"
        type="primary"
        @click="$router.push(recordPath('audit', run.reaudit_run_id))"
        >View re-audit</el-button
      >
    </div>
  </div>
  <ErrorState :error="error" retry @retry="reload" /><el-skeleton
    v-if="loading"
    :rows="8"
    animated
  /><template v-if="run"
    ><section class="dark-panel">
      <h2>Result Change</h2>
      <div class="result-change">
        <div>
          <p>Initial result</p>
          <StatusBadge :value="run.label_before" />
        </div>
        <div>
          <div class="change-arrow">
            {{ run.new_evidence_ids.length }} new evidence
            {{ run.new_evidence_ids.length === 1 ? 'item' : 'items' }}
          </div>
          <strong>{{ title(run.reaudit_status) }}</strong>
        </div>
        <div>
          <p>Re-audit result</p>
          <StatusBadge v-if="run.label_after" :value="run.label_after" /><strong v-else
            >No re-audit result</strong
          >
        </div>
      </div>
      <p v-if="run.error" class="dark-notice">
        Execution error: {{ run.error.error_code }}<br />{{ run.error.message }}
      </p>
    </section>
    <div class="grid two">
      <section class="panel flush">
        <div class="section-bar"><h2>Execution Trace</h2></div>
        <div class="panel-body">
          <ol v-if="trace.length" class="trace-list">
            <li v-for="(step, index) in trace" :key="index">
              <span class="step-number">{{ String(step.step).padStart(2, '0') }}</span>
              <h3>{{ step.tool_name?.replaceAll('_', ' ') || 'Execution step' }}</h3>
              <div class="trace-content">
                <p v-if="step.arguments?.query">Query: {{ step.arguments.query }}</p>
                <p v-if="step.arguments?.limit != null">Limit: {{ step.arguments.limit }}</p>
                <p>Status: {{ title(step.status) }}</p>
                <p>
                  Returned: {{ step.returned_count ?? 'Not provided' }} / New:
                  {{ step.new_evidence_ids?.length ?? 'Not provided' }}
                </p>
                <p v-if="step.new_evidence_ids?.length" class="mono">
                  {{ step.new_evidence_ids.join(', ') }}
                </p>
              </div>
            </li>
          </ol>
          <el-empty v-else description="No execution trace available" />
          <hr />
          <p><strong>Stop reason:</strong> {{ title(run.stop_reason) }}</p>
        </div>
      </section>
      <section class="panel flush">
        <div class="section-bar"><h2>New Evidence</h2></div>
        <div class="panel-body">
          <ErrorState :error="relatedError" retry @retry="loadRelated" /><EvidenceCard
            v-for="item in evidence"
            :key="item.evidence_id"
            :evidence="item"
            :unreviewed="run.unreviewed_evidence_ids.includes(item.evidence_id!)"
          /><el-empty v-if="!evidence.length" description="No new evidence found" />
          <p v-if="run.unreviewed_evidence_ids.length" class="notice">
            Not yet re-audited: {{ run.unreviewed_evidence_ids.join(', ') }}
          </p>
        </div>
      </section>
    </div>
    <section class="dark-panel">
      <h2>Re-audit Summary</h2>
      <p class="prose">{{ reaudit?.assessment?.reason || title(run.reaudit_status) }}</p>
      <p v-if="run.label_changed" class="dark-notice">
        The label changed. Please review the result.
      </p>
      <p v-for="reason in run.human_review_reasons" :key="reason" class="dark-notice">
        {{ title(reason) }}
      </p>
      <router-link
        v-if="run.final_run_id !== run.initial_run_id && run.final_run_id !== run.reaudit_run_id"
        :to="recordPath('audit', run.final_run_id)"
        >View final audit</router-link
      >
    </section>
    <RunDetails
      :id="id"
      :usage="run.usage"
      :details="{
        initial_run_id: run.initial_run_id,
        reaudit_run_id: run.reaudit_run_id,
        final_run_id: run.final_run_id,
        reaudit_status: run.reaudit_status,
        stop_reason: run.stop_reason,
        usage: run.usage,
        error: run.error,
      }"
  /></template>
</template>
