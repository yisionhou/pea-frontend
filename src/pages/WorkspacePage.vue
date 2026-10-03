<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { config } from '../config'
import { recordPath, time } from '../domain/common'
import type { RecordKind } from '../types'
const auth = useAuthStore(),
  router = useRouter(),
  kind = ref<RecordKind>('audit'),
  id = ref('')
const names = { audit: 'Audit', followup: 'Follow-up', evaluation: 'Experiment' }
function open() {
  if (id.value.trim()) void router.push(recordPath(kind.value, id.value.trim()))
}
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>Workspace</h1>
      <p>Review evidence, inspect findings, and record decisions.</p>
    </div>
    <span class="welcome">Welcome, {{ auth.displayName }}</span>
  </div>
  <div class="grid two shortcuts">
    <section v-if="auth.can('audit')" class="dark-panel shortcut">
      <div class="feature-icon">
        <el-icon><Document /></el-icon>
      </div>
      <div>
        <h2>New Audit</h2>
        <p>Submit a claim and supporting evidence.</p>
      </div>
      <el-button @click="router.push('/audits/new')">Create audit</el-button>
    </section>
    <section v-if="auth.can('evaluate')" class="dark-panel shortcut">
      <div class="feature-icon">
        <el-icon><DataAnalysis /></el-icon>
      </div>
      <div>
        <h2>Evaluations</h2>
        <p>View evaluation plans and reports.</p>
        <span v-if="!config.evaluationEnabled" class="badge">Submission disabled</span>
      </div>
      <el-button @click="router.push('/evaluations/new')">View evaluations</el-button>
    </section>
  </div>
  <section class="panel">
    <h2>Find by ID</h2>
    <form class="lookup" @submit.prevent="open">
      <el-radio-group v-model="kind" aria-label="Record type"
        ><el-radio value="audit">Audit</el-radio><el-radio value="followup">Follow-up</el-radio
        ><el-radio v-if="auth.can('evaluate')" value="evaluation"
          >Experiment</el-radio
        ></el-radio-group
      ><el-input
        v-model="id"
        aria-label="Record ID"
        placeholder="Enter a run ID"
        clearable
      /><el-button type="primary" native-type="submit" :disabled="!id.trim()">Open</el-button>
    </form>
  </section>
  <section class="panel">
    <h2>Recently viewed in this session</h2>
    <p class="muted">Only records opened in this browser tab.</p>
    <el-empty v-if="!auth.recent.length" description="No records viewed yet"
      ><p class="muted">Submit an audit or open a record by ID to get started.</p></el-empty
    ><el-table v-else :data="auth.recent" border
      ><el-table-column label="Type" width="145"
        ><template #default="{ row }">{{
          names[row.kind as RecordKind]
        }}</template></el-table-column
      ><el-table-column prop="id" label="ID" min-width="230" /><el-table-column
        label="Viewed at"
        min-width="230"
        ><template #default="{ row }">{{ time(row.viewedAt) }}</template></el-table-column
      ><el-table-column label="Action" width="95"
        ><template #default="{ row }"
          ><router-link :to="recordPath(row.kind, row.id)">View</router-link></template
        ></el-table-column
      ></el-table
    >
  </section>
</template>
