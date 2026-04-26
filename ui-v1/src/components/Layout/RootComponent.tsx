import { Outlet } from '@tanstack/react-router';
import { useAuth } from '../../context/AuthContext';

export function RootComponent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0d0d0e]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-2 border-focus-blue border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(35,131,226,0.35)]" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">System Initializing</p>
            <p className="text-[10px] font-bold text-focus-blue uppercase tracking-[0.1em]">Taskinator v2.0</p>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
