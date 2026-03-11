import { OomaLogo } from './OomaLogo';

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Processing...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-[#0A0A0B]/80 backdrop-blur-md z-[100] flex items-center justify-center animate-fade-in">
      <div className="text-center">
        <div className="relative mb-8">
          {/* Animated rings */}
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-[ping_3s_linear_infinite]" />
          <div className="absolute inset-0 rounded-full border-2 border-purple-600/10 animate-[ping_2s_linear_infinite_0.5s]" />
          
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto relative z-10 box-glow-indigo animate-pulse">
            <OomaLogo className="text-indigo-400" size={40} />
          </div>
        </div>
        
        <h3 className="text-white font-black text-xl mb-2 tracking-tight">{message}</h3>
        <p className="text-gray-400 font-bold tracking-[0.2em] text-[10px] uppercase animate-pulse">Optimizing Ooma Workflow</p>
        
        {/* Loading bar */}
        <div className="w-48 h-1 bg-white/5 rounded-full mx-auto mt-6 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 animate-[loading-bar_2s_ease-in-out_infinite]" />
        </div>
      </div>
      
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
