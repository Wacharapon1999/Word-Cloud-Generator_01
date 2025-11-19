export interface WordCloudEntry {
  id?: number;
  user_name: string;
  input_text: string;
  image_url?: string | null;
  created_at?: string;
}

export interface WordFrequency {
  text: string;
  count: number;
  size: number;
  color: string;
  x?: number;
  y?: number;
  rotate?: number;
}

export interface GenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export interface CanvasConfig {
  width: number;
  height: number;
  fontFamily: string;
}