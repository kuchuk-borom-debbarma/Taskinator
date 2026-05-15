# Phase 18 Research: Autopilot UI Visuals

**Target Milestone:** v3.0 Remotion Overhaul & Autopilot Showcase
**Scope:** Design constraints, pixel-coordinates, and animation formulas for `VisualConditionBuilder`, `ActionPipelineEditor`, and `DynamicConfig`.

---

## 📐 Core Structural Dimensions
All visual layouts are bound to standard composition constraints:
- **Canvas Size:** 1280px × 720px
- **Base Padding:** 40px
- **Backdrop Glassmorphism:** 
  - `background: 'rgba(15, 23, 42, 0.35)'`
  - `backdrop-filter: 'blur(40px)'`
  - `border: '1.5px solid rgba(255,255,255,0.08)'`

---

## 🎬 Visual Scene 1: `VisualConditionBuilder.tsx`

### Spatial Layout (Split-Screen Transformation)
- **Title Header Area:** `x: 40, y: 40, w: 1200, h: 80`
- **Gutter Space:** 40px center gap.
- **Left Pane (XYFlow Mock Canvas):**
  - Bounds: `left: 40, top: 140, width: 580, height: 520`
  - Features a dotted grid background `radial-gradient(rgba(255,255,255,0.1) 1px, transparent 0) 20px 20px`.
  - Nodes: Stack of 3 node blocks with port connectors.
- **Right Pane (JSON Code Terminal):**
  - Bounds: `left: 660, top: 140, width: 580, height: 520`
  - Styling: Deep dark terminal `background: '#0f172a'`, border-radius `16px`.
  - Layout: Header tab bar (`json` icon) + ordered line numbers gutter.

### Kinetic Serialization Stream
1. **Time T1 (Nodes Fade In):** left-pane nodes enter via scaling spring (`delay: 45`).
2. **Time T2 (Data Extraction):** Visual glowing circles (packets) emit from node output ports, translating along a quadratic bezier SVG line crossing from `x=500` to `x=700`.
3. **Time T3 (Text Generation):** Code lines fade-in one-by-one (`opacity` interpolation) synchronized with packet arrival.
   - Code sample text:
     ```json
     {
       "id": "cond_92a3f",
       "type": "AND",
       "rules": [...]
     }
     ```

---

## 🎬 Visual Scene 2: `ActionPipelineEditor.tsx`

### Spatial Layout (Latency Race)
- **Top Half (Legacy/Standard Track):**
  - Title: `y: 130` "Standard API Execution"
  - Card Bounds: `left: 60, top: 160, width: 1160, height: 200`
  - Interface: Large grey Toggle Switch.
- **Bottom Half (Optimistic Track):**
  - Title: `y: 410` "Zero-Latency Optimistic Toggle"
  - Card Bounds: `left: 60, top: 440, width: 1160, height: 200`
  - Interface: Large blue/green active Toggle Switch.

### Animation Timeline Comparison
- **T=0:** Viewport registers.
- **T=1.5s:** Cursor click triggers simultaneously on both tracks.
- **Legacy Behavior:**
  - Switch enters static semi-disabled state.
  - SVG buffering circle rotates 360° endlessly (`f * 5 deg`).
  - At **T=5.5s** (4s delay), spinner vanishes, switch flips to Active, green toast pops.
- **Optimistic Behavior:**
  - Instant flip to Active state.
  - Immediate green radial-pulse expanding from switch center.
  - Small monospace tag `[⚡ OPTIMISTIC_RESOLVED]` appears.
  - Subtle "syncing..." text quietly fades out at T=5.5s, matching actual resolver resolution.

---

## 🎬 Visual Scene 3: `DynamicConfig.tsx`

### Spatial Layout (Glassmorphic Modal Pop)
- **Underlay Scene:** Underneath the overlay lies a dummy "Admin Panel" grid containing table rows and charts, heavily blurred using standard Remotion blur interpolation `blur(${interpolate(f, [0, 1], [0, 24])}px)`.
- **Glassmorphic Config Modal:**
  - Anchors: `top: 50%, left: 50%`
  - Dimensions: `width: 640px, height: 480px`
  - Dynamic Position: `transform: translate(-50%, -50%) scale(S)`
  - Scaling: Uses **Elastic Spring** values:
    ```typescript
    spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
    ```

### Config Element Definitions
The Modal renders high-fidelity input items:
1. **Webhook Input:** Monospace text box reading `https://hooks.taskinator.sh/...`
2. **Retry Select Dropdown:** Styled dropdown selector displaying `[ 3 Retries ]` option selected.
3. **Fallback Selector Toggle:** An indented sub-element illustrating cascading settings.

---

## 📊 Quality Enforcement
- All numeric coordinates are static `const` coordinates to guarantee pixel stability across build iterations.
- Dynamic visual toggles and inputs do not use DOM transitions; state transitions are fully driven by clamped numeric hooks (`interpolate`).
