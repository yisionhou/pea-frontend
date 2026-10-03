import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { request, abortRequests } from '../api/client'
import type { RecordKind, User } from '../types'
interface Recent {
  kind: RecordKind
  id: string
  viewedAt: string
}
const read = () => {
  try {
    return JSON.parse(sessionStorage.getItem('pea.session') || 'null')
  } catch {
    return null
  }
}
export const useAuthStore = defineStore('auth', () => {
  const saved = read()
  const token = ref<string>(saved?.token || '')
  const expiresAt = ref<string>(saved?.expiresAt || '')
  const user = ref<User | null>(null),
    verified = ref(false),
    recent = ref<Recent[]>([])
  const displayName = computed(
    () => user.value?.display_name || user.value?.username || user.value?.principal_id || '',
  )
  let generation = 0
  let restoring: Promise<void> | null = null
  function persist() {
    sessionStorage.setItem(
      'pea.session',
      JSON.stringify({
        token: token.value,
        expiresAt: expiresAt.value,
        principalId: user.value?.principal_id,
        recent: recent.value,
      }),
    )
  }
  function clear() {
    generation++
    abortRequests()
    token.value = ''
    user.value = null
    recent.value = []
    expiresAt.value = ''
    verified.value = false
    sessionStorage.removeItem('pea.session')
    restoring = null
  }
  function can(permission: string) {
    return user.value?.permissions.includes(permission) ?? false
  }
  async function login(username: string, password: string) {
    // A new login starts a new identity epoch, including while /me is pending.
    clear()
    const epoch = generation
    const result = await request<{ access_token: string; expires_at: string; user: User }>(
      '/v1/auth/login',
      { method: 'POST', body: { username, password }, anonymous: true },
    )
    if (epoch !== generation) return
    token.value = result.access_token
    expiresAt.value = result.expires_at
    user.value = result.user
    recent.value = []
    verified.value = true
    persist()
  }
  async function restore() {
    if (verified.value || !token.value) return
    if (restoring) return restoring
    if (expiresAt.value && Date.parse(expiresAt.value) <= Date.now()) {
      clear()
      return
    }
    const epoch = generation
    restoring = (async () => {
      const info = await request<User>('/v1/auth/me')
      if (epoch !== generation) return
      user.value = info
      verified.value = true
      const previous = read()
      recent.value =
        previous?.principalId === info.principal_id && Array.isArray(previous.recent)
          ? previous.recent
              .slice(0, 20)
              .filter(
                (r: Recent) =>
                  ['audit', 'followup', 'evaluation'].includes(r.kind) && typeof r.id === 'string',
              )
          : []
      persist()
    })().finally(() => {
      if (epoch === generation) restoring = null
    })
    return restoring
  }
  async function logout() {
    try {
      await request('/v1/auth/logout', { method: 'POST' })
    } finally {
      clear()
    }
  }
  function remember(kind: RecordKind, id: string) {
    if (!user.value) return
    recent.value = [
      { kind, id, viewedAt: new Date().toISOString() },
      ...recent.value.filter((r) => r.kind !== kind || r.id !== id),
    ].slice(0, 20)
    persist()
  }
  return {
    token,
    expiresAt,
    user,
    verified,
    recent,
    displayName,
    can,
    clear,
    login,
    restore,
    logout,
    remember,
  }
})
