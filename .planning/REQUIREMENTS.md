# Requirements Specification — Milestone v4.0 (Autopilot Integrated Hook)

## 🎯 Objective
Introduce the newly built **Project Autopilot System** into the opening "Hook" composition of our video suite (`FeatureShowcase`). As our ultimate system capability, it must be featured directly after "Orchestration Links" to demonstrate the platform's self-managing capability.

---

## 📋 Technical Requirements

### 1. Hook Timeline Expansion
- **[REQ-401]**: Extend the `FeatureShowcase` main simulation sequence duration to accommodate a dedicated 4-5 second Autopilot showcase segment.
- **[REQ-402]**: Introduce a new `ProgressIndicator` entry: **"Activating Autopilot Engine..."** occurring after the orchestration link creation phase.

### 2. Visual Autopilot Mechanics
- **[REQ-403]**: Create a reusable **`AutopilotNode`** or high-fidelity pulsating "A.I. Engine" node inside `components/Nodes.tsx`.
- **[REQ-404]**: Display the `AutopilotNode` materializing and radiating a visual "trigger pulse" towards a task link (e.g., the "Unlocks" or "Triggers" boundary).
- **[REQ-405]**: Program an automatic "State Shift" for downstream TaskNodes, showing them changing color to Emerald/Success to clearly represent programmatic automated completion.

### 3. Timeline Recalibration
- **[REQ-406]**: Update `Root.tsx` registry with the expanded `FeatureShowcase` composition duration.
- **[REQ-407]**: Re-verify overall `MasterPresentation` integration to ensure perfect crossfading over the newly extended boundary.

---

## 📈 Out of Scope
- Making modifications to the 17 downstream compositions.
- Altering the underlying Autopilot engine backend logic or UI v1 code. This milestone focuses strictly on upgrading the opening hook visual.
