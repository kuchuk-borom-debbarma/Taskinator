# UI Specification: Visual Condition Builder (XYFlow)
**Phase:** 11

## Objective
Implement a world-class, node-based visual editor for defining complex boolean logic trees.

## Core Library: XYFlow (React Flow)
- We will leverage `@xyflow/react` for the canvas and node management.

## Node Types

### 1. `LogicalNode` (AND / OR / NOT)
- **Style**: Pill-shaped with glassmorphism.
- **Colors**:
    - `AND`: Teal accent.
    - `OR`: Purple accent.
    - `NOT`: Red accent.
- **Handles**: 
    - Input (1) - from parent logic.
    - Output (N) - to children nodes.

### 2. `PredicateNode` (The "Leaf")
- **Style**: Rectangular card with dropdowns/inputs.
- **Fields**:
    - **Domain**: Dropdown (`task`, `project`).
    - **Field**: Dropdown (dynamic based on domain).
    - **Operator**: Dropdown (`==`, `!=`, `>`, `<`).
    - **Value**: Dynamic input based on field type.
- **Handles**: 
    - Input (1).
    - Output (0).

## Canvas Interaction
- **Snap to Grid**: Enabled for clean layouts.
- **MiniMap**: Bottom-right corner for navigation in large trees.
- **Controls**: Zoom in/out, fit to screen.
- **Drag & Drop**: Ability to drag nodes from a sidebar onto the canvas.

## Tree Serialization Logic
- **Canvas to JSON**: Recursive traversal of the graph starting from the "Root" node to build the `ConditionTree`.
- **JSON to Canvas**: Automated layout algorithm (e.g., `d3-hierarchy` or simple depth-based offset) to position nodes upon loading.

## UX Enhancements
- **Live Validation**: Highlight nodes with missing connections or invalid predicates (e.g., "Empty Value").
- **Auto-save**: Persist canvas state locally or sync with backend.
