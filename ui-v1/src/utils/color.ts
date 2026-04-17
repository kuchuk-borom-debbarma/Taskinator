/**
 * Deterministic color generator based on a string (e.g., link label).
 * Uses HSL for consistent vibrance and legible text contrast.
 */
export const getLinkLabelColor = (label: string = '') => {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use HSL for consistent vibrance and legible text
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 45%)`;
};
