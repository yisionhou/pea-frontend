import { onBeforeUnmount, onMounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'
export function useUnsaved(dirty: () => boolean) {
  const auth = useAuthStore()
  const warn = (e: BeforeUnloadEvent) => {
    if (dirty() && auth.token) {
      e.preventDefault()
      e.returnValue = ''
    }
  }
  onMounted(() => window.addEventListener('beforeunload', warn))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', warn))
  onBeforeRouteLeave(async (to) => {
    if (to.path === '/login' || !auth.token || !dirty()) return true
    try {
      await ElMessageBox.confirm(
        'Leave this page? Unsaved input will be lost. A submitted request may still be running on the server.',
        'Unsaved changes',
        { confirmButtonText: 'Leave page', cancelButtonText: 'Keep editing' },
      )
      return true
    } catch {
      return false
    }
  })
}
