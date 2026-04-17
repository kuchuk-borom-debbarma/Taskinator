import { create } from 'zustand';

type ModalType = 'CREATE_TASK' | 'CREATE_PROJECT' | 'PROJECT_SETTINGS' | 'CREATE_TEAM' | null;

interface UIState {
  isSidebarOpen: boolean;
  isNotificationPanelOpen: boolean;
  activeModal: ModalType;
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setNotificationPanelOpen: (open: boolean) => void;
  toggleNotificationPanel: () => void;
  setActiveModal: (modal: ModalType) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isNotificationPanelOpen: false,
  activeModal: null,

  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setNotificationPanelOpen: (open) => set({ isNotificationPanelOpen: open }),
  toggleNotificationPanel: () => set((state) => ({ isNotificationPanelOpen: !state.isNotificationPanelOpen })),
  setActiveModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
}));
