<script setup lang="ts">
import type { Evidence } from '../types'
defineProps<{ evidence: Evidence; unreviewed?: boolean }>()
</script>
<template>
  <article class="evidence-card" :id="'evidence-' + evidence.evidence_id" tabindex="-1">
    <div class="row wrap">
      <el-icon><Document /></el-icon
      ><strong class="mono">{{ evidence.evidence_id || 'Submitted evidence' }}</strong
      ><span v-if="unreviewed" class="badge">Not re-audited</span>
    </div>
    <p class="prose">{{ evidence.text || 'Evidence text is not available.' }}</p>
    <div class="meta">
      Source: {{ evidence.source_description || evidence.source_type || 'Not specified'
      }}<br />Period:
      {{
        evidence.occurred_start && evidence.occurred_end
          ? `${evidence.occurred_start} to ${evidence.occurred_end}`
          : 'Dates not provided'
      }}
    </div>
  </article>
</template>
