import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElCollapse,
  ElCollapseItem,
  ElConfigProvider,
  ElDatePicker,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElOption,
  ElPagination,
  ElProgress,
  ElRadio,
  ElRadioGroup,
  ElResult,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTooltip,
} from 'element-plus'
import {
  House,
  Document,
  DataAnalysis,
  UserFilled,
  Menu,
  CircleCheckFilled,
  ArrowRight,
  Plus,
  Close,
  WarningFilled,
} from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import './styles/main.css'
import App from './App.vue'
import router from './router'
import { configureAuth } from './api/client'
import { useAuthStore } from './stores/auth'
const app = createApp(App),
  pinia = createPinia()
app.use(pinia)
for (const [name, component] of Object.entries({
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElCollapse,
  ElCollapseItem,
  ElConfigProvider,
  ElDatePicker,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElOption,
  ElPagination,
  ElProgress,
  ElRadio,
  ElRadioGroup,
  ElResult,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTooltip,
}))
  app.component(name, component)
const auth = useAuthStore()
configureAuth(
  () => auth.token,
  () => {
    auth.clear()
    if (router.currentRoute.value.path !== '/login')
      void router.replace({
        path: '/login',
        query: { redirect: router.currentRoute.value.fullPath, expired: '1' },
      })
  },
)
for (const [name, component] of Object.entries({
  House,
  Document,
  DataAnalysis,
  UserFilled,
  Menu,
  CircleCheckFilled,
  ArrowRight,
  Plus,
  Close,
  WarningFilled,
}))
  app.component(name, component)
app.use(router).mount('#app')
