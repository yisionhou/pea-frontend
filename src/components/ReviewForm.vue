<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { Audit, ReviewFormData } from '../types'
import { useSubmission } from '../composables/useSubmission'
import { useUnsaved } from '../composables/useUnsaved'
import { chars, labels } from '../domain/common'
import { reviewPayload } from '../domain/audit'
import ErrorState from './ErrorState.vue'
const props = defineProps<{ audit: Audit }>(),
  emit = defineEmits<{ saved: [] }>(),
  { busy, error, submit } = useSubmission()
const form = reactive<ReviewFormData>({
    action: 'REQUEST_MORE_EVIDENCE',
    final_label: 'SUPPORTED',
    rationale: '',
    evidence_ids: [],
  }),
  validation = ref('')
const hasAssessment = computed(() => props.audit.status === 'SUCCEEDED' && !!props.audit.assessment)
useUnsaved(() => !!form.rationale || form.evidence_ids.length > 0)
async function send() {
  validation.value = ''
  if (!form.rationale.trim() || chars(form.rationale.trim()) > 4000) {
    validation.value = 'Enter a rationale of 1–4,000 characters.'
    return
  }
  if (!props.audit.run_hash) return
  const result = await submit('/v1/reviews', reviewPayload(props.audit, form))
  if (result) {
    form.rationale = ''
    form.evidence_ids = []
    ElMessage.success('Review saved. The system assessment is unchanged.')
    emit('saved')
  } else if (error.value?.code === 'RUN_HASH_MISMATCH') emit('saved')
}
</script>
<template>
  <section class="panel">
    <h2>Human Review</h2>
    <ErrorState :error="error" />
    <p v-if="!audit.run_hash" class="notice">
      A valid run snapshot is required before a review can be submitted.
    </p>
    <el-form label-position="top" @submit.prevent="send"
      ><el-form-item label="Decision"
        ><el-radio-group v-model="form.action" :disabled="busy" aria-label="Review decision"
          ><el-radio value="ACCEPT" :disabled="!hasAssessment">Accept</el-radio
          ><el-radio value="MODIFY" :disabled="!hasAssessment">Modify</el-radio
          ><el-radio value="REQUEST_MORE_EVIDENCE">Request more evidence</el-radio></el-radio-group
        ></el-form-item
      ><el-form-item
        v-if="form.action !== 'REQUEST_MORE_EVIDENCE'"
        label="Final label"
        for="final-label"
        ><el-select
          id="final-label"
          :model-value="form.action === 'ACCEPT' ? audit.assessment?.label : form.final_label"
          :disabled="form.action === 'ACCEPT' || busy"
          @update:model-value="form.final_label = $event"
          ><el-option
            v-for="(label, key) in labels"
            :key="key"
            :value="key"
            :label="label" /></el-select></el-form-item
      ><el-form-item label="Rationale" for="rationale" :error="validation"
        ><el-input
          id="rationale"
          v-model="form.rationale"
          type="textarea"
          :rows="3"
          :disabled="busy"
          placeholder="Explain your decision and any missing context"
        /><small>{{ chars(form.rationale) }} / 4,000 characters</small></el-form-item
      ><el-form-item label="Linked evidence"
        ><el-checkbox-group
          v-model="form.evidence_ids"
          :disabled="busy"
          :max="100"
          aria-label="Linked evidence"
          ><el-checkbox
            v-for="e in audit.case_snapshot.evidence"
            :key="e.evidence_id"
            :value="e.evidence_id"
            ><span class="mono">{{ e.evidence_id }}</span> — {{ e.text.slice(0, 90) }}</el-checkbox
          ></el-checkbox-group
        ><span v-if="!audit.case_snapshot.evidence.length" class="muted"
          >No evidence available to link.</span
        ></el-form-item
      >
      <div class="row wrap">
        <el-button type="primary" native-type="submit" :loading="busy" :disabled="!audit.run_hash"
          >Submit review</el-button
        ><span class="meta">Saves the opinion only; does not start a follow-up.</span>
      </div></el-form
    >
  </section>
</template>
