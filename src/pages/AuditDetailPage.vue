<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Audit, Followup } from '../types'
import { useRecord } from '../composables/useRecord'
import { useSubmission } from '../composables/useSubmission'
import { useAuthStore } from '../stores/auth'
import { config } from '../config'
import { followupBlock } from '../domain/audit'
import { recordPath, time, title } from '../domain/common'
import ErrorState from '../components/ErrorState.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EvidenceCard from '../components/EvidenceCard.vue'
import Citations from '../components/Citations.vue'
import ReviewForm from '../components/ReviewForm.vue'
import RunDetails from '../components/RunDetails.vue'
const route = useRoute(),
  router = useRouter(),
  auth = useAuthStore(),
  id = String(route.params.runId)
const { data: audit, error, loading, reload } = useRecord<Audit>('audit', id),
  followup = useSubmission(),
  dialog = ref(false)
const blocked = computed(() =>
  audit.value
    ? followupBlock(audit.value, auth.user, config.allowPartialFollowup)
    : 'Loading audit.',
)
const evidenceIds = computed(
  () =>
    audit.value?.case_snapshot.evidence.flatMap((e) => (e.evidence_id ? [e.evidence_id] : [])) ||
    [],
)
const dimensions = [
  ['relevance', 'Relevance'],
  ['specificity', 'Specificity'],
  ['claim_evidence_fit', 'Claim–evidence fit'],
  ['coverage', 'Coverage'],
] as const
async function start() {
  if (blocked.value) return
  const result = await followup.submit<Followup>(
    `/v1/audits/${encodeURIComponent(id)}/follow-ups`,
    { agent_profile: config.agentProfile },
    120000,
  )
  if (result) {
    dialog.value = false
    await router.push(recordPath('followup', result.agent_run_id))
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>Audit Details</h1>
      <p class="mono">
        {{ id }}<span v-if="audit"> · {{ audit.case_snapshot.employee_id }}</span>
      </p>
    </div>
    <el-tooltip
      v-if="auth.can('followup')"
      :content="blocked || 'Retrieve additional evidence and re-audit'"
      placement="bottom"
      ><span
        ><el-button type="primary" :disabled="!!blocked" @click="dialog = true"
          >Request follow-up</el-button
        ></span
      ></el-tooltip
    >
  </div>
  <ErrorState :error="error" retry @retry="reload" /><el-skeleton
    v-if="loading"
    :rows="8"
    animated
  /><template v-if="audit"
    ><router-link
      v-if="audit.parent_run_id"
      :to="recordPath('audit', audit.parent_run_id)"
      class="back-link"
      >← Return to initial audit</router-link
    >
    <section class="dark-panel result-summary">
      <div>
        <div class="row wrap">
          <h2>Audit Result</h2>
          <span class="badge inverted">Run {{ title(audit.status).toLowerCase() }}</span
          ><StatusBadge v-if="audit.assessment" :value="audit.assessment.label" />
        </div>
        <p class="prose">
          {{ audit.assessment?.reason || 'This run did not produce a valid assessment.' }}
        </p>
        <p v-if="audit.error" class="dark-notice">
          Execution error: {{ audit.error.error_code }}<br />{{ audit.error.message }}
        </p>
      </div>
      <div v-if="audit.human_review_required" class="dark-notice">
        <strong
          ><el-icon><WarningFilled /></el-icon> Human review required</strong
        >
        <p v-for="reason in audit.human_review_reasons" :key="reason">{{ title(reason) }}</p>
      </div>
    </section>
    <div class="grid two">
      <section class="panel">
        <h2>Case &amp; Evidence</h2>
        <dl class="key-values">
          <dt>Case ID</dt>
          <dd>{{ audit.case_snapshot.case_id }}</dd>
          <dt>Criterion</dt>
          <dd class="prose">{{ audit.case_snapshot.criterion }}</dd>
          <dt>Claim</dt>
          <dd class="prose">{{ audit.case_snapshot.claim }}</dd>
          <dt>Review period</dt>
          <dd>
            {{
              audit.case_snapshot.review_period
                ? `${audit.case_snapshot.review_period.start} to ${audit.case_snapshot.review_period.end}`
                : 'Not provided'
            }}
          </dd>
          <dt>Reference standard</dt>
          <dd class="prose">{{ audit.case_snapshot.reference_standard || 'Not provided' }}</dd>
        </dl>
        <hr />
        <h3>Evidence</h3>
        <EvidenceCard
          v-for="e in audit.case_snapshot.evidence"
          :key="e.evidence_id"
          :evidence="e"
        /><el-empty
          v-if="!audit.case_snapshot.evidence.length"
          description="No included evidence"
        />
      </section>
      <section class="panel flush">
        <div class="section-bar"><h2>Evidence Analysis</h2></div>
        <div class="panel-body">
          <template v-if="audit.assessment"
            ><div v-for="[key, label] in dimensions" :key="key" class="dimension">
              <div class="row spread wrap">
                <strong>{{ label }}</strong
                ><StatusBadge :value="audit.assessment[key].status" />
              </div>
              <p class="prose">{{ audit.assessment[key].reason }}</p>
              <Citations :ids="audit.assessment[key].evidence_ids" :available="evidenceIds" />
            </div>
            <h3>Summary</h3>
            <p class="prose">{{ audit.assessment.reason }}</p>
            <Citations :ids="audit.assessment.cited_evidence_ids" :available="evidenceIds" />
            <article
              v-for="gap in audit.assessment.missing_information"
              :key="gap.gap_id"
              class="notice"
            >
              <div class="row spread wrap">
                <strong>Information gap · {{ gap.kind }}</strong
                ><span class="badge">{{
                  gap.retrievable ? 'Retrievable' : 'Not retrievable'
                }}</span>
              </div>
              <p class="prose">{{ gap.description }}</p>
              <small>Affected claim: {{ gap.affected_claim_part }}</small>
            </article>
            <article v-for="(item, i) in audit.assessment.contradictions" :key="i" class="notice">
              <strong>Contradiction</strong>
              <p class="prose">{{ item.description }}</p>
              <Citations :ids="item.evidence_ids" :available="evidenceIds" /></article></template
          ><el-empty v-else description="No valid assessment available" />
        </div>
      </section>
    </div>
    <section v-if="audit.excluded_evidence.length" class="panel">
      <h2>Excluded Evidence</h2>
      <div v-for="item in audit.excluded_evidence" :key="item.evidence.evidence_id">
        <p>{{ title(item.reason) }}</p>
        <EvidenceCard :evidence="item.evidence" />
      </div>
    </section>
    <ReviewForm v-if="auth.can('review')" :audit="audit" @saved="reload" />
    <section class="panel">
      <h2>Review History</h2>
      <p class="muted">Human opinions are recorded separately from the system assessment.</p>
      <el-empty v-if="!audit.human_reviews.length" description="No reviews submitted" />
      <article v-for="review in audit.human_reviews" :key="review.review_id" class="review-entry">
        <div class="row wrap">
          <strong>{{ title(review.action) }}</strong
          ><StatusBadge v-if="review.final_label" :value="review.final_label" />
        </div>
        <p class="prose">{{ review.rationale }}</p>
        <Citations :ids="review.evidence_ids || []" :available="evidenceIds" /><small
          >{{ review.reviewer_id }} · {{ time(review.reviewed_at) }}</small
        >
      </article>
    </section>
    <RunDetails
      :id="id"
      :usage="audit.usage"
      :details="{
        run_hash: audit.run_hash,
        versions: audit.versions,
        started_at: time(audit.started_at),
        finished_at: time(audit.finished_at),
        usage: audit.usage,
        error: audit.error,
      }" /></template
  ><el-dialog
    v-model="dialog"
    title="Request follow-up"
    width="520px"
    :close-on-click-modal="!followup.busy.value"
    :show-close="!followup.busy.value"
    :close-on-press-escape="!followup.busy.value"
    ><p>Search authorized sources for missing evidence, then re-audit if new material is found.</p>
    <p>
      Profile: <strong>{{ config.agentProfile }}</strong>
    </p>
    <p class="notice">
      This operation may incur model API costs. The request can take up to two minutes.
    </p>
    <ErrorState :error="followup.error.value" /><template #footer
      ><el-button :disabled="followup.busy.value" @click="dialog = false">Close</el-button
      ><el-button type="primary" :loading="followup.busy.value" @click="start"
        >Start follow-up</el-button
      ></template
    ></el-dialog
  >
</template>
