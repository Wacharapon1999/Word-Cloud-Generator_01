export const CANVAS_CONFIG = {
  width: 2500, // Greatly increased width to support full sentences/phrases on one line
  height: 1500,
  fontFamily: 'Kanit, Figtree, sans-serif',
};

export const STOP_WORDS = new Set([
  // Stop words are generally not removed when in "Whole Phrase" mode, 
  // but keeping the list in case logic reverts.
]);

// Theme Colors: Green #007947, Red #F40000
export const COLORS = [
  '#007947', // Theme Green
  '#F40000', // Theme Red
  '#005F37', // Darker Green variation
  '#D00000', // Darker Red variation
  '#004628', // Deep Green
  '#B30000', // Deep Red
];