import React, { createContext, useContext, useState, useEffect } from 'react';

interface LayoutContextType {
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  isCreateProjectModalOpen: boolean;
  setCreateProjectModalOpen: (open: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('taskinator_sidebar_collapsed');
    return saved === 'true';
  });

  const [isCreateProjectModalOpen, setCreateProjectModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('taskinator_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  return (
    <LayoutContext.Provider value={{
      isSidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
      isCreateProjectModalOpen,
      setCreateProjectModalOpen
    }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
