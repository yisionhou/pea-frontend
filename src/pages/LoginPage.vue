<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { asError, type ApiError } from '../api/client'
import { chars, safeRedirect } from '../domain/common'
import ErrorState from '../components/ErrorState.vue'
const auth = useAuthStore(),
  route = useRoute(),
  router = useRouter(),
  username = ref(''),
  password = ref(''),
  busy = ref(false),
  error = ref<ApiError | null>(null),
  validation = ref(''),
  retryAt = ref(0),
  remaining = ref(0)
const timer = setInterval(
  () => (remaining.value = Math.max(0, Math.ceil((retryAt.value - Date.now()) / 1000))),
  250,
)
onBeforeUnmount(() => {
  clearInterval(timer)
  password.value = ''
})
async function login() {
  if (busy.value || remaining.value) return
  validation.value = ''
  if (
    !/^[a-zA-Z0-9_.@-]{1,100}$/.test(username.value) ||
    chars(password.value) < 1 ||
    chars(password.value) > 128
  ) {
    validation.value = 'Enter a valid username and a password of 1–128 characters.'
    return
  }
  busy.value = true
  error.value = null
  try {
    await auth.login(username.value, password.value)
    password.value = ''
    await router.replace(safeRedirect(route.query.redirect))
  } catch (e) {
    error.value = asError(e)
    password.value = ''
    if (error.value.status === 429) {
      retryAt.value = Date.now() + (error.value.data.retry_after_seconds || 60) * 1000
      remaining.value = Math.ceil((retryAt.value - Date.now()) / 1000)
    }
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <main class="login-screen">
    <div class="login-card">
      <div class="login-symbol">
        <el-icon><Document /></el-icon><span>✓</span>
      </div>
      <div class="login-brand">PEA</div>
      <h1>Welcome back</h1>
      <p class="login-subtitle">Performance Evidence Auditor</p>
      <p v-if="route.query.expired" class="notice" role="status">
        Your session expired. Please sign in again.
      </p>
      <ErrorState :error="error" />
      <p v-if="validation" class="field-error" role="alert">{{ validation }}</p>
      <el-form label-position="top" @submit.prevent="login"
        ><el-form-item label="Username" for="username"
          ><el-input
            id="username"
            v-model="username"
            placeholder="Enter your username"
            autocomplete="username"
            :disabled="busy" /></el-form-item
        ><el-form-item label="Password" for="password"
          ><el-input
            id="password"
            v-model="password"
            type="password"
            show-password
            placeholder="Enter your password"
            autocomplete="current-password"
            :disabled="busy" /></el-form-item
        ><el-button
          class="full login-submit"
          type="primary"
          native-type="submit"
          :loading="busy"
          :disabled="remaining > 0"
          >{{ remaining ? `Try again in ${remaining}s` : 'Sign in' }}</el-button
        ></el-form
      >
      <p class="login-note">Use your assigned account to sign in.</p>
    </div>
    <div class="login-footer">PEA · Evidence-informed performance review</div>
  </main>
</template>
