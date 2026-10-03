import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { request, asError, type ApiError } from '../api/client'
import { createPoller } from '../domain/polling'
import { recordPath } from '../domain/common'
import { useAuthStore } from '../stores/auth'
import type { RecordKind } from '../types'
export function useRecord<T extends { status: string }>(kind: RecordKind, id: string) {
  const data = shallowRef<T | null>(null),
    error = shallowRef<ApiError | null>(null),
    loading = ref(true),
    auth = useAuthStore()
  const poll = createPoller(
    (signal) => request<T>('/v1' + recordPath(kind, id), { signal }),
    (value) => {
      data.value = value
      error.value = null
      loading.value = false
      auth.remember(kind, id)
    },
    (e) => {
      error.value = asError(e)
      loading.value = false
    },
  )
  function reload() {
    loading.value = !data.value
    error.value = null
    poll.start()
  }
  function visibility() {
    if (document.hidden) poll.stop()
    else reload()
  }
  onMounted(() => {
    reload()
    document.addEventListener('visibilitychange', visibility)
  })
  onBeforeUnmount(() => {
    poll.stop()
    document.removeEventListener('visibilitychange', visibility)
  })
  return { data, error, loading, reload }
}
