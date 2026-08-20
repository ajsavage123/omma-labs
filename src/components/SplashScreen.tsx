import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let minTimePassed = false;
    let appReady = false;

    const checkReady = () => {
      if (minTimePassed && appReady) {
        setIsVisible(false);
      }
    };

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2200);

    const handleAppReady = () => {
      setIsVisible(false);
    };

    window.addEventListener('app-ready', handleAppReady);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('app-ready', handleAppReady);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
          className="fixed inset-0 z-[9999] bg-[#0a0f1c] flex flex-col items-center justify-center pointer-events-auto"
        >
          {/* Logo Container with pulse animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [0.8, 1.1, 1],
              opacity: 1
            }}
            transition={{ 
              duration: 1.5,
              times: [0, 0.6, 1],
              ease: "easeOut"
            }}
            className="relative flex flex-col items-center justify-center"
          >
            <img 
              src="/ooma-icon.svg" 
              alt="Ooma Workspace Logo" 
              className="w-32 h-32 md:w-40 md:h-40 drop-shadow-[0_0_20px_rgba(255,165,0,0.4)]"
            />
            
            <div className="absolute top-full mt-6 flex flex-col items-center w-max">
              {/* Ooma Workspace Text */}
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-white text-3xl md:text-4xl font-bold tracking-tight"
              >
                Ooma Workspace
              </motion.h1>

              {/* Subtle loading indicator */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="mt-8 flex gap-2"
              >
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                  className="w-2 h-2 rounded-full bg-amber-500"
                />
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                  className="w-2 h-2 rounded-full bg-amber-500"
                />
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                  className="w-2 h-2 rounded-full bg-amber-500"
                />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
