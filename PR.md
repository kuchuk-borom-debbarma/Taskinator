# Pull Request: Frontend Performance & UX Optimizations

## 🚀 Overview
This PR introduces several critical optimizations to the "Perception Engine" (frontend) to ensure a fluid, high-performance experience when exploring complex task graphs. 

We have focused on maintaining a stable **60fps** interaction rate and improving the visual consistency of the graph layout during data expansion.

## 🏗 Key Changes

### ⚙️ Asynchronous Layout (Web Worker)
Offloaded the graph ranking and positioning logic to a background Web Worker ([layoutWorker.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/ui-v1/src/components/Graph/layoutWorker.ts)). This prevents the main thread from blocking during neighborhood discovery, ensuring smooth panning and zooming.

### 📍 Stability-First "Pinning"
Implemented a coordinate caching system in `TaskMap.tsx`. 
- **Goal**: Prevent nodes from jumping or re-centering when "Loading More" tasks.
- **Result**: Existing nodes remain static while new nodes are added to the periphery, providing a much more grounded navigation experience.
- **Manual Reset**: Added a "Reset Pins" button to the UI to allow for a full layout refresh on demand.

### 📦 Code Splitting & Lazy Loading
Configured the [router.tsx](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/ui-v1/src/router.tsx) to lazily load heavy segments:
- `TaskDetailView` and `ProjectTasksIndex` are now separate chunks.
- This reduces the initial bundle size and speeds up the first "Time to Interactive" for the dashboard.

## 🧪 Verification
- **Performance**: Verified zero main-thread jank during layout recalculation.
- **UX**: Confirmed that "Loading Next Layer" preserves the coordinates of already visible tasks.
- **Bundle**: Confirmed lazy-loaded chunks are requested correctly in the network tab.
