import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Todo-StartDay/',
  server: {
    host: 'localhost',  // L8: 仅绑定 localhost，避免暴露到网络
    port: 5173
  }
})
