<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSubmission } from '../composables/useSubmission'
import { useUnsaved } from '../composables/useUnsaved'
import { config } from '../config'
import { chars, recordPath } from '../domain/common'
import { validateAudit } from '../domain/audit'
import type { AuditInput, Audit } from '../types'
import ErrorState from '../components/ErrorState.vue'
const auth = useAuthStore(),
  router = useRouter(),
  { busy, error, submit } = useSubmission()
const form = reactive<AuditInput>({
  case: {
    case_id: '',
    employee_id: '',
    criterion: '',
    claim: '',
    review_period: null,
    reference_standard: '',
    evidence: [],
    locale: 'en',
  },
  mode: 'rule',
  model_profile: config.modelProfiles[0] || '',
  rubric_version: config.rubricVersion,
})
const reviewDates = ref<[string, string] | null>(null),
  evidenceDates = ref<([string, string] | null)[]>([]),
  errors = ref<Record<string, string>>({}),
  done = ref(false)
const initial = JSON.stringify(form)
useUnsaved(() => !done.value && (JSON.stringify(form) !== initial || !!reviewDates.value))
const total = computed(() => form.case.evidence.reduce((sum, e) => sum + chars(e.text), 0))
const employeeOptions = computed(() => auth.user?.employee_ids.filter((id) => id !== '*') || [])
const caseOptions = computed(() => auth.user?.case_ids?.filter((id) => id !== '*') || [])
function add() {
  form.case.evidence.push({ text: '', source_description: '' })
  evidenceDates.value.push(null)
}
function remove(index: number) {
  form.case.evidence.splice(index, 1)
  evidenceDates.value.splice(index, 1)
}
function outside(index: number) {
  const dates = evidenceDates.value[index]
  return !!(
    dates &&
    reviewDates.value &&
    (dates[0] < reviewDates.value[0] || dates[1] > reviewDates.value[1])
  )
}
async function send() {
  const payload: AuditInput = {
    ...form,
    model_profile: form.mode === 'llm' ? form.model_profile : null,
    case: {
      ...form.case,
      case_id: form.case.case_id.trim(),
      employee_id: form.case.employee_id.trim(),
      reference_standard: form.case.reference_standard?.trim() || null,
      review_period: reviewDates.value
        ? { start: reviewDates.value[0], end: reviewDates.value[1] }
        : null,
      evidence: form.case.evidence.map((e, i) => ({
        ...e,
        occurred_start: evidenceDates.value[i]?.[0] || null,
        occurred_end: evidenceDates.value[i]?.[1] || null,
      })),
    },
  }
  errors.value = validateAudit(payload, auth.user)
  if (Object.keys(errors.value).length) return
  const result = await submit<Audit>('/v1/audits', payload, 75000)
  if (result) {
    done.value = true
    await router.push(recordPath('audit', result.run_id))
  } else if (error.value?.data.details)
    for (const field of error.value.data.details) {
      errors.value[field.field.replace(/^body\./, '')] = `Invalid value (${field.type}).`
    }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>New Audit</h1>
      <p>Enter case details and verifiable evidence.</p>
    </div>
  </div>
  <ErrorState :error="error" />
  <p v-if="Object.keys(errors).length" class="error-state" role="alert">
    Please correct the fields below before submitting.
  </p>
  <el-form label-position="top" @submit.prevent="send"
    ><fieldset :disabled="busy" class="form-reset">
      <div class="audit-form-layout">
        <div>
          <section class="panel flush">
            <div class="section-bar"><h2>Case Details</h2></div>
            <div class="panel-body">
              <div class="grid two">
                <el-form-item label="Case ID" for="case-id" :error="errors['case.case_id']"
                  ><el-select
                    v-if="auth.user?.case_ids && !auth.user.case_ids.includes('*')"
                    id="case-id"
                    v-model="form.case.case_id"
                    filterable
                    placeholder="Select case ID"
                    ><el-option v-for="id in caseOptions" :key="id" :value="id" /></el-select
                  ><el-input
                    v-else
                    id="case-id"
                    v-model="form.case.case_id"
                    placeholder="Enter case ID" /></el-form-item
                ><el-form-item
                  label="Employee ID"
                  for="employee-id"
                  :error="errors['case.employee_id']"
                  ><el-select
                    v-if="!auth.user?.employee_ids.includes('*')"
                    id="employee-id"
                    v-model="form.case.employee_id"
                    filterable
                    placeholder="Select employee ID"
                    ><el-option v-for="id in employeeOptions" :key="id" :value="id" /></el-select
                  ><el-input
                    v-else
                    id="employee-id"
                    v-model="form.case.employee_id"
                    placeholder="Enter employee ID"
                /></el-form-item>
              </div>
              <div class="grid two">
                <el-form-item
                  label="Review period"
                  for="review-period"
                  :error="errors['case.review_period']"
                  ><el-date-picker
                    :id="['review-period', 'review-period-end']"
                    v-model="reviewDates"
                    type="daterange"
                    value-format="YYYY-MM-DD"
                    format="YYYY-MM-DD"
                    start-placeholder="Start date"
                    end-placeholder="End date"
                    range-separator="to"
                  /><small
                    >Required for a follow-up.<span v-if="auth.user?.review_period">
                      Authorized: {{ auth.user.review_period.start }} to
                      {{ auth.user.review_period.end }}.</span
                    ></small
                  ></el-form-item
                ><el-form-item
                  label="Audit criterion"
                  for="criterion"
                  :error="errors['case.criterion']"
                  ><el-input
                    id="criterion"
                    v-model="form.case.criterion"
                    type="textarea"
                    :rows="2"
                    placeholder="What performance criterion is being reviewed?"
                /></el-form-item>
              </div>
              <el-form-item label="Claim" for="claim" :error="errors['case.claim']"
                ><el-input
                  id="claim"
                  v-model="form.case.claim"
                  type="textarea"
                  :rows="3"
                  placeholder="Enter the performance statement to verify" /></el-form-item
              ><el-form-item
                label="Reference standard (optional)"
                for="standard"
                :error="errors['case.reference_standard']"
                ><el-input
                  id="standard"
                  v-model="form.case.reference_standard"
                  type="textarea"
                  :rows="2"
                  placeholder="Enter the target or benchmark, if available"
              /></el-form-item>
            </div>
          </section>
          <section class="panel flush">
            <div class="section-bar wrap">
              <h2>Submitted Evidence</h2>
              <span>{{ form.case.evidence.length }} / {{ config.maxEvidence }} items</span
              ><el-button
                :disabled="busy || form.case.evidence.length >= config.maxEvidence"
                @click="add"
                ><el-icon><Plus /></el-icon>Add evidence</el-button
              >
            </div>
            <div class="panel-body">
              <p class="meta">
                Up to {{ config.maxItemChars.toLocaleString() }} characters per item;
                {{ config.maxEvidenceChars.toLocaleString() }} total. Current total:
                {{ total.toLocaleString() }}.
              </p>
              <p v-if="errors['case.evidence']" class="field-error">
                {{ errors['case.evidence'] }}
              </p>
              <el-empty v-if="!form.case.evidence.length" description="No evidence added"
                ><p class="muted">
                  You can submit without evidence, or add supporting material.
                </p></el-empty
              >
              <article
                v-for="(e, index) in form.case.evidence"
                :key="index"
                class="evidence-editor"
              >
                <div class="row spread">
                  <h3>Evidence {{ String(index + 1).padStart(2, '0') }}</h3>
                  <el-button
                    size="small"
                    :aria-label="`Remove evidence ${index + 1}`"
                    @click="remove(index)"
                    >Remove</el-button
                  >
                </div>
                <div class="grid two">
                  <el-form-item
                    :label="`Evidence ${index + 1} text`"
                    :for="`evidence-text-${index}`"
                    :error="errors[`case.evidence.${index}.text`]"
                    ><el-input
                      :id="`evidence-text-${index}`"
                      v-model="e.text"
                      type="textarea"
                      :rows="5"
                      placeholder="Paste the evidence as plain text"
                    /><small
                      >{{ chars(e.text) }} / {{ config.maxItemChars }} characters</small
                    ></el-form-item
                  >
                  <div>
                    <el-form-item
                      label="Date range"
                      :for="`evidence-dates-${index}`"
                      :error="errors[`case.evidence.${index}.dates`]"
                      ><el-date-picker
                        :id="[`evidence-dates-${index}`, `evidence-dates-end-${index}`]"
                        v-model="evidenceDates[index]"
                        type="daterange"
                        value-format="YYYY-MM-DD"
                        range-separator="to"
                        start-placeholder="Start date"
                        end-placeholder="End date" /></el-form-item
                    ><el-form-item
                      label="Source description"
                      :for="`evidence-source-${index}`"
                      :error="errors[`case.evidence.${index}.source_description`]"
                      ><el-input
                        :id="`evidence-source-${index}`"
                        v-model="e.source_description"
                        placeholder="Describe the source (optional)"
                    /></el-form-item>
                  </div>
                </div>
                <p v-if="outside(index)" class="notice">
                  This evidence falls outside the review period and may be excluded, including
                  partial overlaps.
                </p>
              </article>
            </div>
          </section>
        </div>
        <aside class="dark-panel audit-settings">
          <h2>Audit Settings</h2>
          <el-form-item label="Audit mode"
            ><el-radio-group v-model="form.mode" aria-label="Audit mode"
              ><el-radio value="rule">Rule-based</el-radio
              ><el-radio value="llm">Model-based</el-radio></el-radio-group
            ></el-form-item
          ><el-form-item
            v-if="form.mode === 'llm'"
            label="Model profile"
            for="model-profile"
            :error="errors.model_profile"
            ><el-select id="model-profile" v-model="form.model_profile"
              ><el-option
                v-for="profile in config.modelProfiles"
                :key="profile"
                :label="profile === 'claude' ? 'Claude Sonnet 5' : profile"
                :value="profile" /></el-select></el-form-item
          ><el-form-item label="Language" for="locale"
            ><el-select id="locale" v-model="form.case.locale"
              ><el-option value="en" label="English" /><el-option
                value="zh"
                label="Chinese" /></el-select></el-form-item
          ><el-form-item label="Rubric version" for="rubric"
            ><el-select id="rubric" v-model="form.rubric_version"
              ><el-option :value="config.rubricVersion" /></el-select
          ></el-form-item>
          <div v-if="!config.rubricConfirmed" class="dark-notice">
            <strong>Rubric pending confirmation</strong>
            <p>Results will be flagged for human review.</p>
          </div>
          <div class="settings-submit">
            <el-button class="full" native-type="submit" :loading="busy">{{
              busy ? 'Auditing…' : 'Submit audit'
            }}</el-button>
            <p>
              {{
                form.mode === 'rule'
                  ? 'This run uses rule-based auditing.'
                  : 'Model-based auditing may incur API costs.'
              }}
            </p>
            <small v-if="error">Retry unchanged input to recover the same request.</small>
          </div>
        </aside>
      </div>
    </fieldset></el-form
  >
</template>
