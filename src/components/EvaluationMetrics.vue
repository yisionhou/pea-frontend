<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EvaluationSummary } from '../types'
import { cost, percent, title, labels } from '../domain/common'
const props = defineProps<{ summary: EvaluationSummary }>(),
  tab = ref('overview')
const groups = computed(() => props.summary.groups || [])
const totalCost = computed(() => {
  if (!groups.value.length) return cost(props.summary.api_cost_usd, props.summary.cost_status)
  return groups.value.some((g) => g.api_cost_usd == null || g.cost_status === 'UNKNOWN')
    ? 'Unknown'
    : cost(groups.value.reduce((s, g) => s + g.api_cost_usd!, 0))
})
const agentFields = [
  ['scenario_count', 'Scenarios'],
  ['followup_count', 'Follow-ups'],
  ['retrieved_evidence_count', 'New evidence'],
  ['reaudit_count', 'Successful re-audits'],
  ['label_change_count', 'Label changes'],
  ['failed_count', 'Failures'],
] as const
const matrixColumns = [...Object.keys(labels), 'FAILED']
</script>
<template>
  <template v-if="groups.length"
    ><el-tabs v-model="tab"
      ><el-tab-pane label="Overview" name="overview"
        ><div class="grid three metric-grid">
          <section v-for="group in groups" :key="group.name" class="dark-panel metric-card">
            <div class="feature-icon">
              {{ group.name === 'rule' ? 'R' : group.name.slice(0, 1).toUpperCase() }}
            </div>
            <div>
              <h3>{{ group.name === 'rule' ? 'Rule-based' : group.name }}</h3>
              <p>Accuracy</p>
              <div class="metric-number">{{ percent(group.accuracy) }}</div>
            </div>
          </section>
        </div>
        <div class="comparison-layout">
          <section class="panel">
            <h2>Method Comparison</h2>
            <div
              class="bar-chart"
              role="img"
              aria-label="Accuracy comparison. Exact values are in the method metrics table below."
            >
              <div v-for="group in groups" :key="group.name" class="bar-column">
                <strong>{{ percent(group.accuracy) }}</strong>
                <div
                  class="bar"
                  :style="{ height: `${Math.max(0, Math.min(100, (group.accuracy ?? 0) * 100))}%` }"
                ></div>
                <span>{{ group.name }}</span>
              </div>
            </div>
          </section>
          <section class="dark-panel">
            <h2>Cost &amp; Methodology</h2>
            <div class="dark-notice">
              <span>Cost (USD)</span>
              <div class="cost-total">{{ totalCost }}</div>
            </div>
            <hr />
            <h3>{{ summary.case_count ?? 'Unknown' }} cases · {{ groups.length }} methods</h3>
            <p>
              Failed tasks are included in metrics. Unfinished tasks are not part of
              completed-result denominators.
            </p>
            <small style="color: #bbb"
              >Dataset: {{ summary.dataset_version || 'Not provided' }}<br />Rubric:
              {{ summary.rubric_version || 'Not provided' }}</small
            >
          </section>
        </div>
        <section class="panel">
          <h2>Method Metrics</h2>
          <div class="table-scroll">
            <table class="metric-table matrix">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Completed</th>
                  <th>Correct</th>
                  <th>Failed</th>
                  <th>Accuracy</th>
                  <th>Macro F1</th>
                  <th>Execution success</th>
                  <th>False support</th>
                  <th>Mean / p95</th>
                  <th>Cost (USD)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="g in groups" :key="g.name">
                  <td>{{ g.name }}</td>
                  <td>{{ g.completed_count }}</td>
                  <td>{{ g.correct_count }}</td>
                  <td>{{ g.failed_count }}</td>
                  <td>{{ percent(g.accuracy) }}</td>
                  <td>{{ g.macro_f1?.toFixed(3) ?? 'Not available' }}</td>
                  <td>{{ percent(g.execution_success_rate) }}</td>
                  <td>
                    {{ percent(g.false_support?.rate) }} ({{ g.false_support?.count ?? '—' }} /
                    {{ g.false_support?.denominator ?? '—' }})
                  </td>
                  <td>
                    {{ g.duration_seconds?.mean?.toFixed(2) ?? '—' }}s /
                    {{ g.duration_seconds?.p95?.toFixed(2) ?? '—' }}s
                  </td>
                  <td>{{ cost(g.api_cost_usd, g.cost_status) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="meta" style="margin-top: 15px">
            Macro F1 is the unweighted mean across all four labels, including absent classes. Failed
            tasks count as false negatives. False support uses all non-SUPPORTED reference cases,
            including execution failures.
          </p>
        </section></el-tab-pane
      ><el-tab-pane label="Class metrics" name="classes"
        ><section v-for="g in groups" :key="g.name" class="panel">
          <h2>{{ g.name }}</h2>
          <div class="table-scroll">
            <table class="metric-table">
              <thead>
                <tr>
                  <th>Reference label</th>
                  <th>Support</th>
                  <th>Predicted</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>F1</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(metric, label) in g.per_class" :key="label">
                  <td>{{ title(String(label)) }}</td>
                  <td>{{ metric.count }}</td>
                  <td>{{ metric.predicted_count }}</td>
                  <td>{{ percent(metric.precision) }}</td>
                  <td>{{ percent(metric.recall) }}</td>
                  <td>{{ metric.f1.toFixed(3) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="meta">{{ g.macro_f1_definition }}</p>
          <h3 class="metric-section">False support by reference label</h3>
          <div class="table-scroll">
            <table class="metric-table">
              <thead>
                <tr>
                  <th>Reference label</th>
                  <th>Predicted supported</th>
                  <th>Denominator</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(metric, label) in g.false_support?.by_gold_label" :key="label">
                  <td>{{ title(String(label)) }}</td>
                  <td>{{ metric.count }}</td>
                  <td>{{ metric.denominator }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="meta">{{ g.false_support?.denominator_definition }}</p>
        </section></el-tab-pane
      ><el-tab-pane label="Confusion matrix" name="matrix"
        ><section v-for="g in groups" :key="g.name" class="panel">
          <h2>{{ g.name }}</h2>
          <p class="muted">
            Rows: reference labels. Columns: predictions, including execution failures.
          </p>
          <div class="table-scroll">
            <table class="metric-table matrix">
              <thead>
                <tr>
                  <th>Reference / prediction</th>
                  <th v-for="label in matrixColumns" :key="label">{{ title(label) }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(values, label) in g.confusion_matrix" :key="label">
                  <th>{{ title(String(label)) }}</th>
                  <td
                    v-for="prediction in matrixColumns"
                    :key="prediction"
                    :style="{ background: values[prediction] ? '#dedede' : '' }"
                  >
                    {{ values[prediction] ?? '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section></el-tab-pane
      ></el-tabs
    ></template
  ><template v-else
    ><section class="panel">
      <h2>Follow-up Evaluation Metrics</h2>
      <div class="agent-metrics">
        <div v-for="[key, label] in agentFields" :key="key">
          <span>{{ label }}</span
          ><strong>{{ summary[key] ?? 'Not available' }}</strong>
        </div>
      </div>
      <div class="notice">
        <strong>Re-audit accuracy: {{ percent(summary.reaudit_accuracy) }}</strong>
        <p>
          Denominator: {{ summary.reaudit_accuracy_denominator ?? 'Not available' }} attempted
          re-audits with independent reference labels. Failed attempts count as incorrect.
        </p>
      </div>
      <p style="margin-top: 20px">
        Cost (USD): <strong>{{ totalCost }}</strong>
      </p>
      <h3>Stop reasons</h3>
      <table class="metric-table">
        <thead>
          <tr>
            <th>Reason</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(count, reason) in summary.stop_reasons" :key="reason">
            <td>{{ reason }}</td>
            <td>{{ count }}</td>
          </tr>
        </tbody>
      </table>
      <p class="meta">
        Dataset: {{ summary.dataset_version || 'Not provided' }} · Rubric:
        {{ summary.rubric_version || 'Not provided' }}
      </p>
    </section></template
  >
</template>
