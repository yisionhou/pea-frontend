<script setup lang="ts">
import { cost } from '../domain/common'
import type { Usage } from '../types'
import { ElMessage } from 'element-plus'
defineProps<{ id: string; usage?: Usage | null; details: unknown }>()
async function copy(id: string) {
  try {
    await navigator.clipboard.writeText(id)
    ElMessage.success('ID copied.')
  } catch {
    ElMessage.info('Copy the ID from the run details below.')
  }
}
</script>
<template>
  <section class="panel">
    <el-collapse
      ><el-collapse-item name="details"
        ><template #title
          ><span class="details-title"
            >Run Details
            <span class="muted"
              >Cost: {{ cost(usage?.api_cost_usd, usage?.cost_status) }}</span
            ></span
          ></template
        >
        <div class="row wrap">
          <code>{{ id }}</code
          ><el-button size="small" @click="copy(id)">Copy ID</el-button>
        </div>
        <pre class="json">{{ JSON.stringify(details, null, 2) }}</pre>
      </el-collapse-item></el-collapse
    >
  </section>
</template>
