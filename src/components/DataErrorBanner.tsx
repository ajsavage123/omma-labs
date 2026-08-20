import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface DataErrorBannerProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const DataErrorBanner: React.FC<DataErrorBannerProps> = ({
  message = 'Failed to connect to database or fetch records.',
  onRetry,
  className = ''
}) => {
  return (
    <div className={`p-4 sm:p-5 bg-red-950/40 border border-red-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-red-200 shadow-lg shadow-red-950/50 my-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-red-400">Connection & Data Error</h4>
          <p className="text-xs font-medium text-red-200/90 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/20 active:scale-95 flex items-center gap-2 shrink-0 self-end sm:self-center"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
};
