import React from 'react';
import { SearchX, ArrowLeft, Home } from 'lucide-react';

interface NotFoundScreenProps {
  onNavigate: (route: string) => void;
}

export const NotFoundScreen: React.FC<NotFoundScreenProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-surface-container-low rounded-full flex items-center justify-center mb-6 border border-outline-variant/30">
        <SearchX className="w-12 h-12 text-on-surface-variant" />
      </div>
      
      <h1 className="text-4xl font-semibold text-on-surface mb-3">
        Page Not Found
      </h1>
      
      <p className="text-on-surface-variant max-w-md mb-8">
        The page you are looking for doesn't exist, has been removed, or you don't have permission to view it.
      </p>
      
      <div className="flex items-center gap-4">
        <button
          onClick={() => window.history.length > 1 ? window.history.back() : onNavigate('/dashboard')}
          className="px-6 py-2.5 rounded-xl border border-outline-variant hover:border-primary text-on-surface text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
        
        <button
          onClick={() => onNavigate('/dashboard')}
          className="px-6 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </button>
      </div>
    </div>
  );
};
