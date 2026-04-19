import React from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { Home, AlertTriangle, ArrowLeft, RefreshCw, Construction } from 'lucide-react';

export const NotFoundComponent: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-bg-notion p-8 text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-8 shadow-sm border border-amber-100">
        <Construction size={40} />
      </div>
      
      <h1 className="text-4xl font-bold tracking-tight text-text-notion mb-4">
        Project Not Found
      </h1>
      
      <p className="text-lg text-text-dim max-w-md mb-10 leading-relaxed font-medium">
        We couldn't find the location you're looking for. It might have been moved, deleted, or never existed in this workspace.
      </p>

      <div className="flex items-center gap-4">
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2.5 bg-white border border-border-notion rounded-lg font-bold text-text-notion hover:border-text-dim transition-all flex items-center gap-2 shadow-notion active:scale-95 text-sm"
        >
          <ArrowLeft size={18} />
          Go Back
        </button>
        
        <Link
          to="/"
          className="px-6 py-2.5 bg-focus-blue text-white rounded-lg font-bold hover:shadow-premium transition-all flex items-center gap-2 active:scale-95 text-sm shadow-md"
        >
          <Home size={18} />
          Dashboard
        </Link>
      </div>
    </div>
  );
};

export const GlobalErrorComponent: React.FC<{ error: any; reset: () => void }> = ({ error, reset }) => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-bg-notion p-8 text-center animate-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-8 shadow-sm border border-red-100">
        <AlertTriangle size={40} />
      </div>
      
      <h1 className="text-4xl font-bold tracking-tight text-text-notion mb-4">
        Workspace Incident
      </h1>
      
      <p className="text-lg text-red-600/70 max-w-lg mb-4 font-bold leading-relaxed">
        {error?.message || "An unexpected systemic error occurred."}
      </p>
      
      <p className="text-sm text-text-dim mb-10">
        Don't worry, your data is safe. We just hit a snag in the rendering engine.
      </p>

      <div className="flex items-center gap-4">
        <button
          onClick={() => reset()}
          className="px-8 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all flex items-center gap-2 active:scale-95 shadow-md"
        >
          <RefreshCw size={18} />
          Retry Dashboard
        </button>
        
        <Link
          to="/"
          className="px-8 py-3 bg-white border border-border-notion rounded-xl font-bold text-text-notion hover:border-text-dim transition-all shadow-notion active:scale-95"
        >
          Return to Hub
        </Link>
      </div>

      <div className="mt-12 pt-8 border-t border-border-notion w-full max-w-md opacity-30">
        <p className="text-[10px] font-mono text-text-dim uppercase tracking-widest">
          Error ID: {Math.random().toString(36).substring(7).toUpperCase()}
        </p>
      </div>
    </div>
  );
};
