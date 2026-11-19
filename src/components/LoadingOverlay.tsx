import { useEffect, useState } from 'react';

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Processing...' }: LoadingOverlayProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(8,10,20,0.88)', backdropFilter: 'blur(16px)' }}>
      <div className="flex flex-col items-center gap-6 select-none">

        {/* ── Logo animation container ── */}
        <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>

          {/* Outermost slow-rotating gradient ring */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #FFD700, #FF6B00, #FF6B00 30%, transparent 50%, transparent)',
            animation: 'orbit-slow 3s linear infinite',
            filter: 'blur(2px)',
          }} />

          {/* Second ring — reverse spin, gold-orange */}
          <div style={{
            position: 'absolute', inset: 8, borderRadius: '50%',
            background: 'conic-gradient(from 180deg, transparent, transparent 40%, #FFA500 60%, #FFD700)',
            animation: 'orbit-rev 2s linear infinite',
            opacity: 0.7,
          }} />

          {/* White glow inner fill */}
          <div style={{
            position: 'absolute', inset: 14, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,180,0,0.18) 0%, rgba(10,15,28,0.95) 70%)',
          }} />

          {/* Glass logo card */}
          <div style={{
            position: 'relative', zIndex: 10,
            width: 72, height: 72, borderRadius: 18,
            background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,107,0,0.08))',
            border: '1.5px solid rgba(255,215,0,0.35)',
            boxShadow: '0 0 32px rgba(255,180,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'logo-breathe 2.4s ease-in-out infinite',
          }}>
            <svg width="42" height="42" viewBox="-8 -8 116 116" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="lg-splash" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFD700" />
                  <stop offset="50%" stopColor="#FFA500" />
                  <stop offset="100%" stopColor="#FF6B00" />
                </linearGradient>
              </defs>
              <path d="M 35 15 A 40 40 0 1 1 20 35" stroke="url(#lg-splash)" strokeWidth="5" strokeLinecap="round" fill="none" />
            </svg>
          </div>

          {/* Ping ripple effect */}
          <div style={{
            position: 'absolute', inset: -8, borderRadius: '50%',
            border: '1.5px solid rgba(255,215,0,0.25)',
            animation: 'ripple 2.4s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute', inset: -8, borderRadius: '50%',
            border: '1.5px solid rgba(255,150,0,0.15)',
            animation: 'ripple 2.4s ease-out infinite 0.8s',
          }} />
        </div>

        {/* ── Text ── */}
        <div className="text-center">
          <p className="font-black text-white text-lg tracking-tight" style={{ letterSpacing: '-0.01em' }}>
            {message}<span style={{ opacity: 0.5 }}>{dots}</span>
          </p>
          <p className="text-[10px] uppercase tracking-[0.25em] mt-1" style={{ color: 'rgba(255,180,0,0.55)', fontWeight: 700 }}>
            Ooma Labs Workspace
          </p>
        </div>

        {/* ── Progress bar ── */}
        <div style={{
          width: 160, height: 2, borderRadius: 99,
          background: 'rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #FFD700, #FF6B00)',
            borderRadius: 99,
            animation: 'shimmer 1.6s ease-in-out infinite',
          }} />
        </div>
      </div>

      <style>{`
        @keyframes orbit-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes orbit-rev {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes logo-breathe {
          0%, 100% { transform: scale(1);     box-shadow: 0 0 32px rgba(255,180,0,0.3); }
          50%       { transform: scale(1.04);  box-shadow: 0 0 48px rgba(255,180,0,0.55); }
        }
        @keyframes ripple {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
