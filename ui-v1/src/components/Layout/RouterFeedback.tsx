import React from 'react';
import { Link } from '@tanstack/react-router';
import { Home, AlertTriangle, ArrowLeft, RefreshCw, Construction } from 'lucide-react';
import { SurfaceCardStrong } from '../shared/workspace';

export const NotFoundComponent: React.FC = () => {
  return (
    <div className="mesh-backdrop flex min-h-screen items-center justify-center bg-app-bg p-6">
      <SurfaceCardStrong className="max-w-2xl px-8 py-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-app-accent/12 text-app-accent">
          <Construction size={38} />
        </div>
        <p className="eyebrow mb-3">Missing route</p>
        <h1 className="text-4xl font-semibold tracking-[-0.03em] text-app-ink">That page is off the map</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-app-muted">
          The destination you opened no longer exists in this workspace, or the URL no longer matches the new navigation flow.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
          >
            <ArrowLeft size={16} />
            Go back
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90"
          >
            <Home size={16} />
            Open workspace
          </Link>
        </div>
      </SurfaceCardStrong>
    </div>
  );
};

export const GlobalErrorComponent: React.FC<{ error: any; reset: () => void }> = ({ error, reset }) => {
  return (
    <div className="mesh-backdrop flex min-h-screen items-center justify-center bg-app-bg p-6">
      <SurfaceCardStrong className="max-w-2xl px-8 py-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-app-danger/12 text-app-danger">
          <AlertTriangle size={38} />
        </div>
        <p className="eyebrow mb-3">Something broke</p>
        <h1 className="text-4xl font-semibold tracking-[-0.03em] text-app-ink">The workspace hit an unexpected error</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-app-muted">
          {error?.message || 'An unexpected rendering issue interrupted the current screen.'}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-full bg-app-danger px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-danger/90"
          >
            <RefreshCw size={16} />
            Retry screen
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
          >
            <Home size={16} />
            Return home
          </Link>
        </div>
      </SurfaceCardStrong>
    </div>
  );
};
