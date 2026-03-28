import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['ooma-icon.png', 'ooma-icon.svg'],

      manifest: {
        name: 'Ooma Labs Workspace',
        short_name: 'Ooma Workspace',
        description: 'Your centralized innovation lab for Ooma projects.',
        theme_color: '#0a0f1c',
        background_color: '#0a0f1c',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 2000, // Increase warning limit to 2MB
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Put third-party dependencies into their own chunks
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three-vendor';
            }
            if (id.includes('lucide')) {
              return 'lucide-vendor';
            }
            if (id.includes('supabase') || id.includes('realtime-js')) {
              return 'supabase-vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
