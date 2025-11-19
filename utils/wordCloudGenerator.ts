import { CANVAS_CONFIG, STOP_WORDS, COLORS } from '../constants';
import { WordFrequency } from '../types';

// Internal interface for collision detection with dimensions
interface PlacedWord extends WordFrequency {
  width: number;
  height: number;
  x: number;
  y: number;
}

/**
 * Tokenizes text, removes stop words, and counts frequency.
 * Supports international text segmentation (like Thai) if browser supports Intl.Segmenter.
 */
const processText = (text: string): WordFrequency[] => {
  let words: string[] = [];

  // Use Intl.Segmenter if available for better word splitting (especially for Thai/no-space languages)
  // @ts-ignore - Intl.Segmenter is available in most modern browsers
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      // @ts-ignore
      const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
      // @ts-ignore
      const segments = segmenter.segment(text.toLowerCase());
      for (const { segment, isWordLike } of segments) {
        if (isWordLike) {
          words.push(segment);
        }
      }
    } catch (err) {
      console.warn("Intl.Segmenter failed, falling back to regex split", err);
      // Fallback regex that supports unicode letters/numbers
      const cleanText = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '');
      words = cleanText.split(/\s+/);
    }
  } else {
    // Fallback for browsers without Intl.Segmenter or older environments
    // \p{L} matches any unicode letter, \p{N} matches any number
    const cleanText = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '');
    words = cleanText.split(/\s+/);
  }
  
  const frequencyMap: Record<string, number> = {};
  let maxCount = 0;

  words.forEach(word => {
    // Basic filtering: length > 1 and not in English stop words list
    if (word.length > 1 && !STOP_WORDS.has(word)) {
      frequencyMap[word] = (frequencyMap[word] || 0) + 1;
      maxCount = Math.max(maxCount, frequencyMap[word]);
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
    .slice(0, 100); // Limit to top 100 words
};

/**
 * Checks if two words intersect based on their bounding boxes.
 */
const intersect = (word: PlacedWord, otherWord: PlacedWord): boolean => {
  // Expand bounding box slightly (padding) for better visual separation
  const padding = 4;
  
  return !(word.x + word.width / 2 + padding < otherWord.x - otherWord.width / 2 - padding ||
           word.x - word.width / 2 - padding > otherWord.x + otherWord.width / 2 + padding ||
           word.y + word.height / 2 + padding < otherWord.y - otherWord.height / 2 - padding ||
           word.y - word.height / 2 - padding > otherWord.y + otherWord.height / 2 + padding);
};

/**
 * Generates the Word Cloud on a canvas and returns a Blob.
 */
export const generateWordCloudBlob = (text: string): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const words = processText(text);
    
    // If no words found (e.g. only stop words or symbols), return null
    if (words.length === 0) {
      console.warn("No valid words found to generate cloud");
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
    const maxFontSize = 100;
    const minFontSize = 16;
    
    const maxCount = words[0]?.count || 1;
    const minCount = words[words.length - 1]?.count || 1;

    const placedWords: PlacedWord[] = [];

    words.forEach((word) => {
      // Calculate font size based on frequency
      const scale = maxCount === minCount ? 1 : (word.count - minCount) / (maxCount - minCount);
      word.size = Math.floor(minFontSize + scale * (maxFontSize - minFontSize));
      
      // Setup font to measure accurately
      ctx.font = `bold ${word.size}px ${CANVAS_CONFIG.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      
      const metrics = ctx.measureText(word.text);
      const width = metrics.width;
      // Height approximation usually works well for simple layouts
      const height = word.size * 0.85; 

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
      const radiusStep = 6;
      
      // Max iterations to prevent infinite loops
      const maxIterations = 1500;
      let iterations = 0;

      while (iterations < maxIterations) {
        candidate.x = centerX + (radius * Math.cos(angle));
        candidate.y = centerY + (radius * Math.sin(angle));

        // Check collision
        let collision = false;
        
        // 1. Boundary Check (center point + half dimension)
        if (candidate.x - width/2 < 0 || candidate.x + width/2 > canvas.width || 
            candidate.y - height/2 < 0 || candidate.y + height/2 > canvas.height) {
             // If we go out of bounds, we continue spiraling hoping to find a gap,
             // but if radius is too large, we break.
             if (radius > Math.max(canvas.width, canvas.height)) {
                collision = true; // Stop trying
                break;
             }
             // Treat out of bounds as collision to skip drawing here
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
          // Found a spot!
          placedWords.push({ ...candidate });
          
          // Draw immediately
          ctx.fillStyle = word.color;
          ctx.fillText(word.text, candidate.x, candidate.y);
          break;
        }

        angle += angleStep;
        radius += radiusStep;
        iterations++;
      }
    });

    // Convert to Blob
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
};