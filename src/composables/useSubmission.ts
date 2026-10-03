import { ref, shallowRef, onBeforeUnmount } from 'vue'
import { request, asError, type ApiError } from '../api/client'
import { createIdempotency } from '../domain/common'
export function useSubmission() {
  const busy = ref(false),
    error = shallowRef<ApiError | null>(null)
  const key = createIdempotency()
  let controller: AbortController | undefined
  onBeforeUnmount(() => controller?.abort())
  async function submit<T>(path: string, payload: object, timeout = 30000): Promise<T | undefined> {
    if (busy.value) return
    busy.value = true
    error.value = null
    controller = new AbortController()
    try {
      return await request<T>(path, {
        method: 'POST',
        body: { ...payload, idempotency_key: key({ path, payload }) },
        timeout,
        signal: controller.signal,
      })
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) error.value = asError(e)
    } finally {
      busy.value = false
    }
  }
  return { busy, error, submit }
}
