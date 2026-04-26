import { Outlet } from '@tanstack/react-router';
import { useAuth } from '../../context/AuthContext';
import { LoadingPane } from '../shared/workspace';

export function RootComponent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="mesh-backdrop min-h-screen bg-app-bg px-6">
        <LoadingPane
          title="Preparing your workspace"
          message="Syncing projects, permissions, and the latest task state."
        />
      </div>
    );
  }

  return <Outlet />;
}
