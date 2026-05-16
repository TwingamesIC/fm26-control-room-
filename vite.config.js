import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Forza Vite ad ascoltare tutti gli indirizzi di rete
    strictPort: true,
    // Questo disabilita il controllo dell'host per le versioni precedenti di Vite
    disableHostCheck: true 
  }
})