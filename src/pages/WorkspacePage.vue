<script setup lang="ts">
import { ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { config } from '../config'
import { recordPath, time } from '../domain/common'
import type { RecordKind } from '../types'
const auth = useAuthStore(),
  router = useRouter(),
  kind = ref<RecordKind>('audit'),
  id = ref('')
const followupDialog = ref(false), initialId = ref('')
function openInitial() {
  if (initialId.value.trim()) void router.push(recordPath('audit', initialId.value.trim()))
}
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
  <div class="grid shortcuts agent-shortcuts">
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
    <section v-if="auth.can('followup')" class="dark-panel shortcut">
      <div class="feature-icon"><el-icon><Search /></el-icon></div>
      <div><h2>Evidence Follow-up Agent</h2>
        <p>Retrieve missing facts from approved HR sources and re-audit the claim.</p>
      </div>
      <el-button @click="followupDialog = true">Open follow-up</el-button>
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
  <el-dialog v-model="followupDialog" title="Open evidence follow-up" width="520px">
    <p>Follow-up begins with an eligible initial audit. Open its result to review the missing facts.</p>
    <form @submit.prevent="openInitial">
      <el-input v-model="initialId" aria-label="Initial audit ID" placeholder="Enter an initial audit ID" />
      <el-button type="primary" native-type="submit" :disabled="!initialId.trim()">Open initial audit</el-button>
    </form>
    <p>Not started yet? <router-link to="/audits/new">Create an audit</router-link>.</p>
    <p v-for="record in auth.recent.filter(r => r.kind === 'followup').slice(0, 3)" :key="record.id">
      <router-link :to="recordPath('followup', record.id)">Open {{ record.id }}</router-link>
    </p>
  </el-dialog>
</template>
