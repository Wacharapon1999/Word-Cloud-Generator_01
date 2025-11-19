import { CANVAS_CONFIG, COLORS } from '../constants';
import { WordFrequency } from '../types';

// Internal interface for collision detection with dimensions
interface PlacedWord extends WordFrequency {
  width: number;
  height: number;
  x: number;
  y: number;
}

/**
 * Processes input entries as whole phrases.
 * Does not split by space. Trims whitespace and counts exact phrase matches.
 */
const processPhrases = (entries: string[]): WordFrequency[] => {
  const frequencyMap: Record<string, number> = {};
  let maxCount = 0;

  entries.forEach(entry => {
    const cleanEntry = entry.trim(); 
    // Only count if not empty. 
    // We treat the entire line as one token (phrase mode).
    if (cleanEntry.length > 0) {
      frequencyMap[cleanEntry] = (frequencyMap[cleanEntry] || 0) + 1;
      maxCount = Math.max(maxCount, frequencyMap[cleanEntry]);
    }
  });

  // Convert to array and sort
  return Object.entries(frequencyMap)
    .map(([text, count]) => ({
      text,
      count,
      size: 0, // To be calculated
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 120); // Slightly reduced limit to prevent overcrowding with huge fonts
};

/**
 * Checks if two words intersect based on their bounding boxes.
 */
const intersect = (word: PlacedWord, otherWord: PlacedWord): boolean => {
  // Expand bounding box slightly (padding) for better visual separation
  const padding = 15; // Increased padding for big text
  
  return !(word.x + word.width / 2 + padding < otherWord.x - otherWord.width / 2 - padding ||
           word.x - word.width / 2 - padding > otherWord.x + otherWord.width / 2 + padding ||
           word.y + word.height / 2 + padding < otherWord.y - otherWord.height / 2 - padding ||
           word.y - word.height / 2 - padding > otherWord.y + otherWord.height / 2 + padding);
};

/**
 * Generates the Word Cloud on a canvas and returns a Blob.
 * Accepts an array of raw text entries (phrases).
 */
export const generateWordCloudBlob = (entries: string[]): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const words = processPhrases(entries);
    
    // If no words found
    if (words.length === 0) {
      console.warn("No valid phrases found to generate cloud");
      resolve(null);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_CONFIG.width;
    canvas.height = CANVAS_CONFIG.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve(null);
      return;
    }

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculation config
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // Huge font sizes for event display
    const maxFontSize = 550; 
    const minFontSize = 80;  
    
    const maxCount = words[0]?.count || 1;
    const minCount = words[words.length - 1]?.count || 1;

    const placedWords: PlacedWord[] = [];

    words.forEach((word) => {
      // Calculate font size based on frequency
      const scale = maxCount === minCount ? 1 : (word.count - minCount) / (maxCount - minCount);
      // Linear interpolation
      word.size = Math.floor(minFontSize + scale * (maxFontSize - minFontSize));
      
      // Setup font to measure accurately
      ctx.font = `bold ${word.size}px ${CANVAS_CONFIG.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      
      let metrics = ctx.measureText(word.text);
      let width = metrics.width;
      
      // Safety: If a long sentence is wider than the canvas, scale it down
      // Allow up to 95% of canvas width
      if (width > canvas.width * 0.95) {
          const scaleFactor = (canvas.width * 0.95) / width;
          word.size = Math.floor(word.size * scaleFactor);
          // Re-measure with new size
          ctx.font = `bold ${word.size}px ${CANVAS_CONFIG.fontFamily}`;
          metrics = ctx.measureText(word.text);
          width = metrics.width;
      }

      const height = word.size * 1.1; // Slightly more height for line spacing

      const candidate: PlacedWord = {
        ...word,
        width,
        height,
        x: centerX,
        y: centerY
      };
      
      // Spiral placement algorithm
      let angle = 0;
      let radius = 0;
      const angleStep = 0.5;
      const radiusStep = 20; // Larger step for larger fonts
      
      const maxIterations = 3000;
      let iterations = 0;

      while (iterations < maxIterations) {
        candidate.x = centerX + (radius * Math.cos(angle));
        candidate.y = centerY + (radius * Math.sin(angle));

        // Check collision
        let collision = false;
        
        // 1. Boundary Check
        if (candidate.x - width/2 < 0 || candidate.x + width/2 > canvas.width || 
            candidate.y - height/2 < 0 || candidate.y + height/2 > canvas.height) {
             // If spiraled out of canvas bounds
             if (radius > Math.max(canvas.width, canvas.height)) {
                collision = true;
                break;
             }
             collision = true;
        }

        // 2. Word Collision Check
        if (!collision) {
            for (const other of placedWords) {
            if (intersect(candidate, other)) {
                collision = true;
                break;
            }
            }
        }

        if (!collision) {
          placedWords.push({ ...candidate });
          ctx.fillStyle = word.color;
          ctx.fillText(word.text, candidate.x, candidate.y);
          break;
        }

        angle += angleStep;
        radius += radiusStep;
        iterations++;
      }
    });

    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
};