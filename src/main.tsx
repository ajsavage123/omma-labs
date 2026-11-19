import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeDevErrorInterceptor } from '@/utils/devErrorInterceptor'
import { registerSW } from 'virtual:pwa-register'

// Initialize developer console error diagnostics listener
initializeDevErrorInterceptor();


// Ensure Service Worker is registered in both dev and production modes for notification support
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.register('/sw-notifications.js', { scope: '/' })
      .then((reg) => console.log('[SW] Notification Service Worker registered in Dev:', reg.scope))
      .catch((err) => console.warn('[SW] Dev registration failed:', err));
  } else {
    const updateSW = registerSW({
      onNeedRefresh() {
        window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: { updateSW } }));
      },
      onOfflineReady() {
        console.log('[PWA] App ready to work offline');
      },
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
