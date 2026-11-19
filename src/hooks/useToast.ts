import React, { useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

let memoryToasts: ToastItem[] = [];
let listeners: Array<(t: ToastItem[]) => void> = [];

const emitChange = () => {
  listeners.forEach(l => l([...memoryToasts]));
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>(memoryToasts);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter(l => l !== setToasts);
    };
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    memoryToasts = [...memoryToasts, { id, message, type }];
    emitChange();
    
    setTimeout(() => {
      memoryToasts = memoryToasts.filter(t => t.id !== id);
      emitChange();
    }, 5000);

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    memoryToasts = memoryToasts.filter(t => t.id !== id);
    emitChange();
  }, []);

  const toast = React.useMemo(() => ({
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info')
  }), [addToast]);

  return { 
    toasts, 
    removeToast,
    toast
  };
}
