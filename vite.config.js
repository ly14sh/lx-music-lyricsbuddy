import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  build: { target: 'es2015' },
  plugins: [
    vue(),
    legacy({
      targets: ['Android >= 5', 'Chrome >= 40'],
      modernPolyfills: true,
      renderLegacyChunks: false
    })
  ],
  base: './',
  server: { host: '0.0.0.0', port: 5173 }
})
