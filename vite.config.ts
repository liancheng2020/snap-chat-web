import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    proxy: {
      // 本地开发时，/api 请求代理到 vercel dev 默认端口 3000
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
