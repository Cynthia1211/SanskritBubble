import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Use relative URLs so the build works on GitHub Pages project paths and custom domains.
  base: './',
  plugins: [react()],
  build: {
    // Prevent `vite build` from deleting pre-existing files (e.g. *_bkp.* backups)
    // that the user has placed inside dist/. Default is true when outDir is inside root.
    emptyOutDir: false,
  },
})
