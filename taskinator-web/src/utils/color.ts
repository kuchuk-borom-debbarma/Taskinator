/**
 * Generates a consistent, vibrant HSL color based on a string hash.
 * This ensures that user-defined link labels have a predictable visual identity.
 */
export const getHashColor = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Use the hash to pick a hue (0-360)
  const h = Math.abs(hash) % 360;
  
  // Keep saturation and lightness in a "premium" range
  // Saturation: 60-80% (Vibrant but not neon-cheap)
  // Lightness: 45-65% (Works well in both dark/light contexts)
  const s = 65 + (Math.abs(hash >> 8) % 15);
  const l = 50 + (Math.abs(hash >> 16) % 10);

  return {
    h, s, l,
    css: `hsl(${h}, ${s}%, ${l}%)`,
    bg: `hsla(${h}, ${s}%, ${l}%, 0.1)`,
    border: `hsla(${h}, ${s}%, ${l}%, 0.2)`,
  };
};
