<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { config } from '../config'
import { useAuthStore } from '../stores/auth'
import { useSubmission } from '../composables/useSubmission'
import { recordPath } from '../domain/common'
import ErrorState from '../components/ErrorState.vue'
const auth = useAuthStore(),
  router = useRouter(),
  { busy, error, submit } = useSubmission(),
  id = ref('')
const catalog: Record<string, { name: string; description: string; dataset: string }> = {
  core_dev: {
    name: 'Development Set Comparison',
    description: 'Compare rule-based and model results on development cases.',
    dataset: 'Development set (configured)',
  },
  core_holdout: {
    name: 'Holdout Evaluation',
    description: 'Evaluate methods on the frozen holdout set.',
    dataset: 'Holdout set (configured)',
  },
  agent_eval: {
    name: 'Follow-up Evaluation',
    description: 'Evaluate retrieval and re-auditing.',
    dataset: 'Follow-up scenarios (configured)',
  },
}
const profiles = computed(() =>
  config.evaluationProfiles.filter(
    (p) =>
      auth.user?.evaluation_profiles.includes('*') || auth.user?.evaluation_profiles.includes(p),
  ),
)
const selected = ref(profiles.value[0] || ''),
  plan = computed(
    () =>
      catalog[selected.value] || {
        name: selected.value,
        description: 'Server-configured evaluation profile.',
        dataset: 'Configured on the server',
      },
  )
const disabledReason = computed(() =>
  !profiles.value.includes(selected.value)
    ? 'No authorized evaluation plan is selected.'
    : !config.evaluationEnabled
      ? 'Evaluation submission is disabled in this environment.'
      : selected.value === 'core_holdout' &&
          (!config.holdoutFrozen || !config.labelsConfirmed || !config.rubricConfirmed)
        ? 'The holdout dataset, labels and rubric must be confirmed and frozen.'
        : '',
)
async function send() {
  if (disabledReason.value) return
  const result = await submit<{ experiment_id: string }>('/v1/evaluations', {
    evaluation_profile: selected.value,
  })
  if (result) await router.push(recordPath('evaluation', result.experiment_id))
}
function open() {
  if (id.value.trim()) void router.push(recordPath('evaluation', id.value.trim()))
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>New Evaluation</h1>
      <p>Choose a configured evaluation plan.</p>
    </div>
  </div>
  <div v-if="!config.evaluationEnabled" class="dark-panel row">
    <el-icon :size="24"><WarningFilled /></el-icon>
    <div>
      <strong>Evaluation submission is disabled in this environment</strong>
      <p style="margin: 6px 0 0; font-size: 13px">
        Contact your deployment administrator to enable it.
      </p>
    </div>
  </div>
  <ErrorState :error="error" />
  <div class="grid three plan-grid" role="radiogroup" aria-label="Evaluation plan">
    <button
      v-for="profile in profiles"
      :key="profile"
      role="radio"
      :aria-checked="selected === profile"
      class="plan-card"
      :class="{ selected: selected === profile }"
      :disabled="busy"
      @click="selected = profile"
    >
      <span class="plan-dot"></span>
      <div>
        <h3>{{ catalog[profile]?.name || profile }}</h3>
        <span class="mono">{{ profile }}</span>
        <p>{{ catalog[profile]?.description }}</p>
        <span v-if="profile === 'core_holdout' && !config.holdoutFrozen" class="badge"
          >Not frozen</span
        >
      </div>
    </button>
  </div>
  <el-empty
    v-if="!profiles.length"
    description="No evaluation profiles authorized for this account"
  />
  <div v-else class="grid two">
    <section class="panel flush">
      <div class="section-bar"><h2>Plan Details</h2></div>
      <div class="panel-body">
        <dl class="key-values">
          <dt>Selected plan</dt>
          <dd>
            <strong>{{ plan.name }}</strong>
          </dd>
          <dt>Profile</dt>
          <dd>{{ selected }}</dd>
          <dt>Description</dt>
          <dd>{{ plan.description }}</dd>
          <dt>Dataset</dt>
          <dd>{{ plan.dataset }}</dd>
          <dt>Reference labels</dt>
          <dd>
            {{
              config.labelsConfirmed
                ? 'Confirmed by deployment configuration.'
                : 'Synthetic draft; pending human confirmation.'
            }}
          </dd>
          <dt>Methods</dt>
          <dd>Configured on the server.</dd>
        </dl>
      </div>
    </section>
    <section class="panel flush">
      <div class="section-bar"><h2>Prerequisites</h2></div>
      <div class="panel-body">
        <div class="prerequisite">
          <el-icon :size="23"><CircleCheckFilled /></el-icon>
          <div>
            <strong>User authorization</strong>
            <p>This profile is within your permitted scope.</p>
          </div>
          <span class="badge">Ready</span>
        </div>
        <div class="prerequisite">
          <el-icon :size="23"><WarningFilled /></el-icon>
          <div>
            <strong>Submission {{ config.evaluationEnabled ? 'enabled' : 'disabled' }}</strong>
            <p>Server configuration remains authoritative.</p>
          </div>
          <span class="badge">{{ config.evaluationEnabled ? 'Enabled' : 'Disabled' }}</span>
        </div>
        <div class="prerequisite">
          <el-icon :size="23"><WarningFilled /></el-icon>
          <div>
            <strong>Model configuration</strong>
            <p>Required models and budgets are checked on submission.</p>
          </div>
          <span class="badge">Unverified</span>
        </div>
        <div class="prerequisite">
          <el-icon :size="23"><WarningFilled /></el-icon>
          <div>
            <strong>Label confirmation</strong>
            <p>
              {{
                config.labelsConfirmed
                  ? 'Labels marked as confirmed.'
                  : 'Reference labels are synthetic draft and pending human confirmation.'
              }}
            </p>
          </div>
          <span class="badge">{{ config.labelsConfirmed ? 'Confirmed' : 'Pending' }}</span>
        </div>
      </div>
    </section>
  </div>
  <div class="evaluation-submit">
    <el-button
      class="full"
      type="primary"
      :disabled="!!disabledReason"
      :loading="busy"
      @click="send"
      >Start evaluation</el-button
    >
    <p v-if="disabledReason" class="meta" style="margin: 8px 0">{{ disabledReason }}</p>
  </div>
  <section class="panel flush">
    <div class="section-bar"><h2>Existing Experiment</h2></div>
    <form class="panel-body lookup" @submit.prevent="open">
      <label for="experiment-id">Experiment ID</label
      ><el-input id="experiment-id" v-model="id" placeholder="Enter an experiment ID" /><el-button
        native-type="submit"
        :disabled="!id.trim()"
        >Open report</el-button
      >
    </form>
  </section>
</template>
