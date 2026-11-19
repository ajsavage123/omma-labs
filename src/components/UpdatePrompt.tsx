import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * UpdatePrompt
 * Shows a small bottom banner when a new version of the PWA is available.
 * The user taps "Update" → the new service worker activates → page reloads.
 */
export function UpdatePrompt() {
  const [visible, setVisible] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      setUpdateSW(() => custom.detail?.updateSW ?? null);
      setVisible(true);
    };

    window.addEventListener('pwa-update-available', handler);
    return () => window.removeEventListener('pwa-update-available', handler);
  }, []);

  const handleUpdate = async () => {
    setRefreshing(true);
    if (updateSW) {
      await updateSW(true); // true = reload the page after activation
    } else {
      window.location.reload();
    }
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 88,           // sits above the mobile nav / chat widget
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'calc(100% - 32px)',
        maxWidth: 420,
        animation: 'update-slide-up 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
    >
      <div style={{
        background: 'linear-gradient(135deg, rgba(15,15,25,0.97), rgba(20,18,35,0.97))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,215,0,0.2)',
        borderRadius: 20,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,215,0,0.08)',
      }}>

        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,107,0,0.1))',
          border: '1px solid rgba(255,215,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RefreshCw
            size={18}
            style={{
              color: '#FFD700',
              animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
            }}
          />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '-0.01em' }}>
            Update Available
          </p>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, marginTop: 1 }}>
            New version of Ooma Labs is ready
          </p>
        </div>

        {/* Update button */}
        <button
          onClick={handleUpdate}
          disabled={refreshing}
          style={{
            background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
            border: 'none',
            borderRadius: 10,
            color: '#0a0f1c',
            fontWeight: 900,
            fontSize: 11,
            letterSpacing: '0.05em',
            padding: '8px 14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            opacity: refreshing ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {refreshing ? 'Updating…' : 'Update App'}
        </button>

        {/* Dismiss */}
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)', padding: 4, flexShrink: 0,
            display: 'flex', alignItems: 'center',
          }}
          aria-label="Dismiss update"
        >
          <X size={16} />
        </button>
      </div>

      <style>{`
        @keyframes update-slide-up {
          from { opacity: 0; transform: translateX(-50%) translateY(24px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
