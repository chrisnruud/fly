import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base './' keeps asset paths relative so the build works under any
// GitHub Pages sub-path (e.g. https://user.github.io/fly/).
export default defineConfig({
  base: './',
  plugins: [vue()],
})
