import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// In dev mode — unregister any leftover SWs so we get fresh reloads
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// In production — register the SW and expose a global updater
// so the UpdatePrompt component can trigger the reload
if (!import.meta.env.DEV) {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Fire a custom event that our UpdatePrompt component listens for
      window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: { updateSW } }));
    },
    onOfflineReady() {
      console.log('[PWA] App ready to work offline');
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
