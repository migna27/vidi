

export interface Word {
  word: string;
  start: number;
  end: number;
  probability: number;
  line_number: number;
}

export type SectionType = 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro';

export interface Segment {
  id: string;
  start: number;
  end: number;
  text: string;
  section: SectionType;
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

export type AnimationStyle = 'fade' | 'slide' | 'slam' | 'zoom' | 'typewriter' | 'spin' | 'blur' | 'glitch';
export type ActiveStyle = 'pulse' | 'jitter' | 'bounce' | 'neon' | 'wave' | 'rotate';
export type ParticleShape = 'circle' | 'square' | 'star' | 'hexagon' | 'triangle' | 'note';

export type BackgroundType = 'solid' | 'image' | 'video' | 'procedural';
export type ProceduralStyle = 'stars' | 'grid' | 'plasma' | 'tunnel' | 'matrix';
export type VisualizerStyle = 'spectrum' | 'orb' | 'shockwave' | 'none';

export interface KeyframeValues {
  colors_text?: string;
  colors_active?: string;
  background_color?: string;
  effects_glow?: number;
  camera_zoom?: number; 
  camera_rotate?: number;
}

export interface SectionStyle {
  enabled: boolean;
  colors_text?: string;
  colors_active?: string;
  effects_glow_boost?: number; // Multiplier or add value
  camera_zoom_boost?: number;
}

export interface AnimationKeyframe {
  id: string;
  time: number;
  values: KeyframeValues;
}

export interface AudioLayer {
  id: string;
  name: string;
  buffer: AudioBuffer;
  volume: number;
  muted: boolean;
  solo: boolean;
  duration: number;
}

export interface RendererConfig {
  id: string;
  name: string;
  resolutionId: string; // '16:9', '9:16', '1:1', '4:5'
  background: {
    type: BackgroundType;
    color: string; // Base color or fallback
    url?: string; // Blob URL for image or video
    proceduralStyle?: ProceduralStyle;
    intensity?: number; // Speed or brightness for procedural
  };
  colors: {
    text: string;
    active: string;
    secondary: string; // Used for shadows/accents
  };
  font: {
    family: string;
    weight: string;
    italic: boolean;
  };
  animation: {
    entrance: AnimationStyle;
    active: ActiveStyle;
    exit: AnimationStyle;
  };
  audioReactivity: {
    enabled: boolean; // Master switch
    sensitivity: number; // 0.5 to 2.0
    visualizerStyle: VisualizerStyle;
  };
  effects: {
    glow: number; // 0 to 1 intensity
    blur: boolean;
    chromaticAberration: boolean; // Glitch effect
    vignette: boolean;
    scanlines: boolean;
    filmGrain: boolean;
    mirror: boolean;
    invert: boolean;
    barrelDistortion: boolean;
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
  sectionStyles: {
    verse: SectionStyle;
    chorus: SectionStyle;
    bridge: SectionStyle;
    intro: SectionStyle;
    outro: SectionStyle;
  };
  keyframes: AnimationKeyframe[];
}

export interface ProjectFile {
  version: string;
  timestamp: number;
  name: string;
  lyricData: LyricData;
  config: RendererConfig;
}