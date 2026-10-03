<script setup lang="ts">
import { ElMessage } from 'element-plus'
defineProps<{ ids: string[]; available: string[] }>()
function focus(id: string) {
  const target = document.getElementById('evidence-' + id)
  if (!target) {
    ElMessage.info('Cited evidence is not provided.')
    return
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.focus({ preventScroll: true })
  target.classList.add('highlight')
  setTimeout(() => target.classList.remove('highlight'), 1800)
}
</script>
<template>
  <div class="citations">
    <template v-for="id in ids" :key="id"
      ><button v-if="available.includes(id)" class="text-link mono" @click="focus(id)">
        [{{ id }}]</button
      ><span v-else class="meta">{{ id }} · Cited evidence is not provided.</span></template
    >
  </div>
</template>
