import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // Check if it's already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      return;
    }

    // Identify Safari/iOS as they don't support beforeinstallprompt
    const isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as any).MSStream;
    const isSafariUA = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
    if (isIOS || isSafariUA) {
      setIsSafari(true);
      // For Safari, we show the prompt after a short delay since we don't get an event
      setTimeout(() => setShowPrompt(true), 3000);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isSafari) {
      alert('To install: Tap the "Share" button and then "Add to Home Screen".');
      setShowPrompt(false);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
       console.log('App accepted');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] sm:bottom-8 sm:right-8 sm:inset-x-auto sm:w-[400px] animate-in slide-in-from-bottom-full duration-500 ease-out p-4">
      <div className="bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/10 rounded-[32px] sm:rounded-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Mobile handle */}
        <div className="flex justify-center pt-3 sm:hidden">
            <div className="h-1.5 w-12 bg-white/10 rounded-full" />
        </div>

        <div className="p-6 sm:p-7">
           <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                 <div className="h-14 w-14 sm:h-12 sm:w-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
                    <Download className="h-7 w-7 sm:h-6 sm:w-6 text-indigo-400" />
                 </div>
                 <div>
                    <h3 className="text-lg sm:text-base font-black text-white uppercase tracking-tight">Ooma Workspace</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Innovation Lab</span>
                        <div className="h-1 w-1 bg-gray-700 rounded-full" />
                        <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Verified PWA</span>
                    </div>
                 </div>
              </div>
              <button onClick={() => setShowPrompt(false)} className="text-gray-500 hover:text-white transition-all bg-white/5 p-2 rounded-full active:scale-90">
                 <X className="h-5 w-5 sm:h-4 sm:w-4" />
              </button>
           </div>
           
           <div className="bg-white/5 rounded-2xl p-4 mb-8">
              <p className="text-sm sm:text-xs text-gray-400 leading-relaxed font-medium">
                {isSafari 
                  ? 'To enjoy the full experience: Tap the "Share" icon in your browser menu and choose "Add to Home Screen".' 
                  : 'Get faster access, a cleaner interface, and premium performance by installing Ooma on your home screen.'}
              </p>
           </div>
           
           {!isSafari && (
              <button 
                onClick={handleInstall}
                className="w-full py-4 sm:py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs sm:text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:brightness-110 active:scale-[0.98] shadow-lg shadow-indigo-600/30 transition-all border border-indigo-400/30"
              >
                 Install Application
              </button>
           )}
           
           {isSafari && (
               <button 
               onClick={() => setShowPrompt(false)}
               className="w-full py-4 sm:py-3.5 bg-white/5 text-white text-xs sm:text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-white/10"
             >
                Got it
             </button>
           )}
        </div>
      </div>
    </div>
  );
}
