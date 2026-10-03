<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { asError, ApiError } from '../api/client'
import ErrorState from '../components/ErrorState.vue'
const auth = useAuthStore(),
  route = useRoute(),
  router = useRouter(),
  open = ref(false),
  signingOut = ref(false),
  sessionError = ref<ApiError | null>(null)
const forbidden = computed(
  () => !!route.meta.permission && !auth.can(String(route.meta.permission)),
)
async function verify() {
  sessionError.value = null
  try {
    await auth.restore()
  } catch (e) {
    sessionError.value = asError(e)
  }
}
async function logout() {
  if (signingOut.value) return
  signingOut.value = true
  try {
    await auth.logout()
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 401))
      ElMessage.warning('Signed out locally. Server session revocation could not be confirmed.')
  } finally {
    signingOut.value = false
    await router.replace('/login')
  }
}
</script>
<template>
  <div class="app-shell">
    <a class="skip-link" href="#main">Skip to content</a>
    <div v-if="open" class="nav-backdrop" @click="open = false"></div>
    <aside class="sidebar" :class="{ 'is-open': open }">
      <router-link class="brand" to="/" @click="open = false"
        ><b>PEA</b><span>Evidence Auditor</span></router-link
      >
      <nav aria-label="Main navigation">
        <router-link
          to="/"
          :class="{
            active:
              route.path === '/' ||
              route.path.startsWith('/follow-ups/') ||
              (route.path.startsWith('/audits/') && route.path !== '/audits/new'),
          }"
          @click="open = false"
          ><el-icon><House /></el-icon>Workspace</router-link
        ><router-link
          v-if="auth.can('audit')"
          to="/audits/new"
          :class="{ active: route.path === '/audits/new' }"
          @click="open = false"
          ><el-icon><Document /></el-icon>New Audit</router-link
        ><router-link
          v-if="auth.can('evaluate')"
          to="/evaluations/new"
          :class="{ active: route.path.startsWith('/evaluations') }"
          @click="open = false"
          ><el-icon><DataAnalysis /></el-icon>Evaluations</router-link
        >
      </nav>
      <div class="sidebar-footer">
        Performance Evidence Auditor<br /><span>Evidence. Context. Judgment.</span>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <button
          class="menu-toggle"
          aria-label="Toggle navigation"
          :aria-expanded="open"
          @click="open = !open"
        >
          <el-icon><Menu /></el-icon>
        </button>
        <div class="breadcrumb">
          <router-link to="/">Workspace</router-link><span v-if="route.path !== '/'">/</span
          ><strong v-if="route.path !== '/'">{{ route.meta.title }}</strong>
        </div>
        <div class="user-area">
          <span class="avatar"
            ><el-icon><UserFilled /></el-icon></span
          ><span class="user-name">{{ auth.displayName }}</span
          ><button class="signout" :disabled="signingOut" @click="logout">Sign out</button>
        </div>
      </header>
      <main id="main" tabindex="-1">
        <section v-if="!auth.verified" class="panel">
          <h1>Verify your session</h1>
          <p>Could not verify your session. Check the connection and try again.</p>
          <ErrorState :error="sessionError" /><el-button type="primary" @click="verify"
            >Retry verification</el-button
          >
        </section>
        <el-result
          v-else-if="forbidden"
          title="Access unavailable"
          sub-title="Your account does not have permission for this action."
          ><template #extra
            ><el-button @click="router.push('/')">Return to workspace</el-button></template
          ></el-result
        ><router-view v-else :key="route.fullPath" />
      </main>
      <footer class="app-footer">PEA <span>Performance Evidence Auditor</span></footer>
    </div>
  </div>
</template>
