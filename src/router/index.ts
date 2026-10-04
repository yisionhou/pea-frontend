import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/login',
      component: () => import('../pages/LoginPage.vue'),
      meta: { title: 'Sign in', public: true },
    },
    {
      path: '/',
      component: () => import('../layouts/AppLayout.vue'),
      children: [
        {
          path: '',
          component: () => import('../pages/WorkspacePage.vue'),
          meta: { title: 'Workspace' },
        },
        {
          path: 'audits/new',
          component: () => import('../pages/NewAuditPage.vue'),
          meta: { title: 'New Audit', permission: 'audit' },
        },
        {
          path: 'audits/:runId',
          component: () => import('../pages/AuditDetailPage.vue'),
          meta: { title: 'Audit Details' },
        },
        {
          path: 'follow-ups/:agentRunId',
          component: () => import('../pages/FollowupPage.vue'),
          meta: { title: 'Evidence Follow-up' },
        },
        {
          path: 'evaluations/new',
          component: () => import('../pages/NewEvaluationPage.vue'),
          meta: { title: 'New Evaluation', permission: 'evaluate' },
        },
        {
          path: 'evaluations/:experimentId',
          component: () => import('../pages/EvaluationPage.vue'),
          meta: { title: 'Evaluation Report', permission: 'evaluate' },
        },
        {
          path: ':pathMatch(.*)*',
          component: () => import('../pages/NotFoundPage.vue'),
          meta: { title: 'Page not found' },
        },
      ],
    },
  ],
})
router.beforeEach(async (to) => {
  document.title = `${to.meta.title || 'Workspace'} · PEA`
  if (to.meta.public) return
  const auth = useAuthStore()
  if (!auth.token) return { path: '/login', query: { redirect: to.fullPath } }
  try {
    await auth.restore()
  } catch {
    /* App displays a retryable session verification error. */
  }
  if (!auth.token) return { path: '/login', query: { redirect: to.fullPath } }
})
export default router
