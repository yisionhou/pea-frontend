import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/v1': { target: env.API_PROXY_TARGET || 'http://127.0.0.1:8000', changeOrigin: true },
      },
    },
    preview: { port: 4173 },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('/node_modules/element-plus/') ||
              id.includes('/node_modules/@element-plus/')
            )
              return 'element-plus'
            if (/\/node_modules\/(vue|@vue|vue-router|pinia)\//.test(id)) return 'vue'
          },
        },
      },
    },
  }
})
