<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRecord } from '../composables/useRecord'
import { config } from '../config'
import type { Evaluation } from '../types'
import { cost, recordPath, time } from '../domain/common'
import ErrorState from '../components/ErrorState.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EvaluationMetrics from '../components/EvaluationMetrics.vue'
const id = String(useRoute().params.experimentId),
  { data: run, error, loading, reload } = useRecord<Evaluation>('evaluation', id)
const query = ref(''),
  group = ref(''),
  failuresOnly = ref(false),
  page = ref(1),
  pageSize = ref(10)
const progress = computed(() =>
  run.value?.progress.total_tasks
    ? Math.min(
        100,
        Math.round((run.value.progress.completed_tasks / run.value.progress.total_tasks) * 100),
      )
    : 0,
)
const groups = computed(() => [...new Set(run.value?.results.map((r) => r.group) || [])])
const filtered = computed(
  () =>
    run.value?.results.filter(
      (r) =>
        (!query.value || r.case_id.toLowerCase().includes(query.value.toLowerCase())) &&
        (!group.value || r.group === group.value) &&
        (!failuresOnly.value || !!r.error),
    ) || [],
)
const visible = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
)
watch([query, group, failuresOnly, pageSize], () => (page.value = 1))
</script>
<template>
  <div class="page-heading report-header">
    <div>
      <div class="row wrap">
        <h1>Evaluation Report</h1>
        <StatusBadge v-if="run" :value="run.status" />
      </div>
      <p class="mono">
        {{ id }}<span v-if="run"> · {{ run.evaluation_profile }}</span>
      </p>
    </div>
    <el-button :loading="loading" @click="reload">Refresh</el-button>
  </div>
  <ErrorState :error="error" retry @retry="reload" /><el-skeleton
    v-if="loading"
    :rows="8"
    animated
  /><template v-if="run"
    ><p v-if="!config.labelsConfirmed" class="notice report-notice">
      Reference labels are synthetic draft and pending human confirmation. Results are not validated
      business accuracy.
    </p>
    <p v-if="run.error" class="error-state" role="alert">
      <strong>Experiment {{ run.status.toLowerCase() }}: {{ run.error.error_code }}</strong
      ><br />{{ run.error.message }}<br />Available partial results are shown below.
    </p>
    <section class="panel">
      <div class="progress-label">
        <strong
          >{{ run.progress.completed_tasks }} / {{ run.progress.total_tasks }} tasks
          completed</strong
        ><span>{{ progress }}%</span>
      </div>
      <el-progress
        :percentage="progress"
        :show-text="false"
        :stroke-width="12"
        color="#292929"
      /><small v-if="['QUEUED', 'RUNNING'].includes(run.status)" style="margin-top: 12px"
        >Updates every 3 seconds while this page is visible.</small
      >
    </section>
    <EvaluationMetrics v-if="run.summary" :summary="run.summary" />
    <section v-else class="panel">
      <el-empty description="Summary metrics are not available yet" />
    </section>
    <section class="panel flush case-results">
      <div class="section-bar"><h2>Case Results</h2></div>
      <div class="panel-body">
        <div class="case-toolbar">
          <el-input
            v-model="query"
            placeholder="Filter by case ID"
            aria-label="Filter by case ID"
            clearable
          /><el-select
            v-model="group"
            placeholder="All methods"
            aria-label="Filter by method"
            clearable
            ><el-option v-for="method in groups" :key="method" :value="method" /></el-select
          ><el-checkbox v-model="failuresOnly">Failures only</el-checkbox>
        </div>
        <el-table :data="visible" empty-text="No case results available"
          ><el-table-column
            prop="case_id"
            label="Case ID"
            min-width="150"
            sortable
          /><el-table-column prop="group" label="Method" min-width="110" /><el-table-column
            label="Reference label"
            min-width="150"
            ><template #default="{ row }"
              ><StatusBadge :value="row.gold_label" /></template></el-table-column
          ><el-table-column label="Predicted label" min-width="160"
            ><template #default="{ row }"
              ><StatusBadge v-if="row.predicted_label" :value="row.predicted_label" /><span v-else
                >No valid prediction</span
              ></template
            ></el-table-column
          ><el-table-column label="Execution error" min-width="150"
            ><template #default="{ row }">{{
              row.error?.error_code || 'None'
            }}</template></el-table-column
          ><el-table-column label="Duration" min-width="105"
            ><template #default="{ row }">{{
              row.duration_seconds == null ? 'Unknown' : `${row.duration_seconds.toFixed(2)}s`
            }}</template></el-table-column
          ><el-table-column label="Cost (USD)" min-width="100"
            ><template #default="{ row }">{{
              cost(row.api_cost_usd, row.cost_status)
            }}</template></el-table-column
          ><el-table-column label="Action" min-width="125"
            ><template #default="{ row }"
              ><div class="citations">
                <router-link v-if="row.run_id" :to="recordPath('audit', row.run_id)"
                  >View audit</router-link
                ><router-link
                  v-if="row.agent?.agent_run_id"
                  :to="recordPath('followup', row.agent.agent_run_id)"
                  >Follow-up</router-link
                ><span v-if="!row.run_id && !row.agent?.agent_run_id">Unavailable</span>
              </div></template
            ></el-table-column
          ></el-table
        >
        <div class="pagination">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="filtered.length"
            :page-sizes="[10, 25, 50]"
            layout="total, prev, pager, next, sizes"
          />
        </div>
      </div>
    </section>
    <section class="panel">
      <el-collapse
        ><el-collapse-item title="Experiment details"
          ><dl class="key-values">
            <dt>Created</dt>
            <dd>{{ time(run.created_at) }}</dd>
            <dt>Finished</dt>
            <dd>{{ time(run.finished_at) }}</dd>
            <dt>Profile</dt>
            <dd>{{ run.evaluation_profile }}</dd>
          </dl></el-collapse-item
        ></el-collapse
      >
    </section></template
  >
</template>
