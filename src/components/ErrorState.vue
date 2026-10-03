<script setup lang="ts">
import type { ApiError } from '../api/client'
import { recordPath } from '../domain/common'
defineProps<{ error: ApiError | null; retry?: boolean }>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <div v-if="error" class="error-state" role="alert">
    <strong>{{ error.message }}</strong>
    <p class="muted">
      {{ error.code
      }}<span v-if="error.data.request_id"> · Request {{ error.data.request_id }}</span>
    </p>
    <ul v-if="Array.isArray(error.data.details)">
      <li v-for="field in error.data.details" :key="field.field">
        {{ field.field.replace(/^body\./, '') }}: {{ field.type }}
      </li>
    </ul>
    <div class="row wrap">
      <router-link v-if="error.data.run_id" :to="recordPath('audit', error.data.run_id)"
        >View this audit</router-link
      ><router-link
        v-if="error.data.agent_run_id"
        :to="recordPath('followup', error.data.agent_run_id)"
        >View this follow-up</router-link
      ><el-button v-if="retry" @click="$emit('retry')">Retry</el-button>
    </div>
  </div>
</template>
