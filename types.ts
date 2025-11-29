
export interface Word {
  word: string;
  start: number;
  end: number;
  probability: number;
  line_number: number;
}

export interface Segment {
  id: string;
  start: number;
  end: number;
  text: string;
  words: Word[];
}

export interface LyricData {
  createdAt?: string;
  segments: Segment[];
}

export interface AudioVisualizerData {
  bass: number;
  mid: number;
  high: number;
  raw: Uint8Array;
}

export interface RenderStatus {
  state: 'idle' | 'analyzing' | 'rendering' | 'encoding' | 'done';
  progress: number;
  totalFrames?: number;
}

export type AnimationStyle = 'fade' | 'slide' | 'slam' | 'zoom' | 'typewriter';
export type ActiveStyle = 'pulse' | 'jitter' | 'bounce' | 'neon';
export type ParticleShape = 'circle' | 'square' | 'star';

export interface RendererConfig {
  id: string;
  name: string;
  colors: {
    background: string; // Hex or 'gradient' logic
    text: string;
    active: string;
    secondary: string; // Used for shadows/accents
  };
  animation: {
    entrance: AnimationStyle;
    active: ActiveStyle;
    exit: AnimationStyle;
  };
  effects: {
    glow: number; // 0 to 1 intensity
    blur: boolean;
    chromaticAberration: boolean; // Glitch effect
    vignette: boolean;
    scanlines: boolean;
    filmGrain: boolean;
  };
  particles: {
    enabled: boolean;
    count: number;
    speed: number;
    shape: ParticleShape;
    color: string[]; // Palette
  };
  camera: {
    shake: boolean;
    zoomBeat: boolean;
    rotate: boolean;
  };
}
