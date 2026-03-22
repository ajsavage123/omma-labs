import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show our custom prompt
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the PWA install');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-6 right-6 sm:left-auto sm:right-6 sm:w-80 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="bg-[#11111d] border border-indigo-500/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
        <div className="p-5">
           <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                    <Download className="h-5 w-5 text-indigo-400" />
                 </div>
                 <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Install App</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Ooma Labs Workspace</p>
                 </div>
              </div>
              <button onClick={() => setShowPrompt(false)} className="text-gray-600 hover:text-white transition-colors p-1">
                 <X className="h-4 w-4" />
              </button>
           </div>
           
           <p className="text-xs text-gray-400 leading-relaxed mb-5">
              Experience Ooma Labs as a high-performance desktop or mobile application with offline access and standalone mode.
           </p>
           
           <button 
             onClick={handleInstall}
             className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-600/20 transition-all border border-indigo-400/30"
           >
              Download Now
           </button>
        </div>
      </div>
    </div>
  );
}
