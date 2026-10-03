<script setup lang="ts">
import { title } from '../domain/common'
defineProps<{ value?: string | null }>()
</script>
<template>
  <span class="badge" :data-status="value">{{ title(value) }}</span>
</template>
