import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages 部署配置
  base: process.env.NODE_ENV === 'production' ? '/inventory-management-system/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 确保构建输出适合静态部署
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  // 开发服务器配置
  server: {
    port: 5173,
    host: true
  }
})