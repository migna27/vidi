

import 'react';

// Fix for missing JSX.IntrinsicElements types in environment
declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: any;
      span: any;
      h1: any;
      h2: any;
      h3: any;
      h4: any;
      h5: any;
      h6: any;
      p: any;
      br: any;
      hr: any;
      button: any;
      input: any;
      label: any;
      select: any;
      option: any;
      textarea: any;
      header: any;
      footer: any;
      section: any;
      nav: any;
      canvas: any;
      img: any;
      video: any;
      audio: any;
      a: any;
      ul: any;
      li: any;
      ol: any;
      form: any;
      table: any;
      thead: any;
      tbody: any;
      tr: any;
      td: any;
      th: any;
      [elemName: string]: any;
    }
  }
}

export interface LoadedAsset {
  id: string;
  type: 'image' | 'video' | 'font';
  name: string;
  url: string; // Object URL
  file: Blob; // Raw data
  mimeType: string;
}

export interface Word {
  word: string;
  start: number;
  end: number;
  probability: number;
  line_number: number;
}

export type SectionType = 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro';

export interface SegmentStyle {
    colorText?: string;
    colorActive?: string;
    scale?: number; // Multiplier relative to base font size
    offsetX?: number; // -1 to 1 (screen percentage)
    offsetY?: number; // -1 to 1
    letterSpacing?: number; // px
}

export interface Segment {
  id: string;
  start: number;
  end: number;
  text: string;
  section?: string;
  words: Word[];
  style?: SegmentStyle; // New: Per-segment style overrides
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
  state: 'idle' | 'analyzing' | 'rendering' | 'encoding' | 'done' | 'saving' | 'loading'; // Added saving/loading states
  progress: number;
  totalFrames?: number;
}

export type AnimationStyle = 'fade' | 'slide' | 'slam' | 'zoom' | 'typewriter' | 'spin' | 'blur' | 'glitch' | 'elastic' | 'drop' | 'scramble' | 'spiral' | 'inflate' | 'sink' | 'burn' | 'stretch' | 'stack-pop' | 'random';
export type ActiveStyle = 'pulse' | 'jitter' | 'bounce' | 'neon' | 'wave' | 'rotate' | 'skew' | 'pop' | 'flash' | 'float' | 'shiver' | 'rainbow' | 'heartbeat' | 'swing' | 'glitch-shake' | 'bass-bulge' | 'stretch-vertical' | 'orbit-spin' | 'blur-pulse' | 'chromatic-beat' | 'random';
export type ParticleShape = 'circle' | 'square' | 'star' | 'hexagon' | 'triangle' | 'note' | 'tetris';

export type BackgroundType = 'solid' | 'image' | 'video' | 'procedural';
export type ProceduralStyle = 'grid' | 'stars' | 'plasma' | 'tunnel' | 'matrix' | 'gradient-wave' | 'hexagons' | 'kaleidoscope' | 'dna' | 'nebula' | 'fire' | 'circuit' | 'rain' | 'digital-heartbeat';
export type VisualizerStyle = 'spectrum' | 'orb' | 'shockwave' | 'none';
export type ImageEffect = 'none' | 'dark-error' | 'red-error' | 'zoom-slow' | 'chromatic-shift' | 'alert' | 'thermal' | 'vhs-stripes' | 'liquid-warp' | 'scan-drift' | 'ghosting' | 'pixel-noise' | 'mirror-x' | 'bright-happy';
export type LayoutMode = 'center' | 'alternating';
export type TextAlignment = 'global' | 'center' | 'left' | 'right' | 'alternating';

// New: Custom Effect Type
export type CustomEffectType = 'shader' | 'camera';

export interface CustomEffect {
    id: string;
    name: string;
    type: CustomEffectType;
    code: string;
    active: boolean; // Is currently enabled in the render pipeline
    description?: string;
}

// New: Defines which effects can be overridden in a block
export interface EffectOverrides {
    // VFX Booleans (undefined means use global, true/false forces state)
    fx_glow?: boolean;
    fx_blur?: boolean;
    fx_chromaticAberration?: boolean; // Glitch
    fx_vignette?: boolean;
    fx_scanlines?: boolean;
    fx_filmGrain?: boolean;
    fx_mirror?: boolean;
    fx_invert?: boolean;
    fx_barrelDistortion?: boolean;
    fx_mosaic?: boolean;
    fx_sepia?: boolean;
    fx_grayscale?: boolean;
    fx_halftone?: boolean;
    fx_oldMovie?: boolean;
    fx_kaleidoscope?: boolean;
    fx_rgbSplit?: boolean;
    fx_vhs?: boolean; // Added for override support
    
    // Camera Booleans
    cam_shake?: boolean;
    cam_zoomBeat?: boolean;
    cam_rotate?: boolean;
    cam_sway?: boolean;
    cam_hardKick?: boolean;
    cam_panic?: boolean;
    cam_screenPump?: boolean;

    // Particles
    part_enabled?: boolean;
    
    // Background Image FX (Replaces global list if present)
    bg_imageEffects?: ImageEffect[];

    // Custom Effects Overrides (ID -> enabled/disabled)
    custom_fx?: Record<string, boolean>;
}

export interface EventBlock {
    id: string;
    start: number;
    end: number;
    label: string;
    overrides: EffectOverrides;
    collapsed?: boolean; // UI State
    smoothIn?: boolean; // New: Fade effect in
    smoothOut?: boolean; // New: Fade effect out
}

// Deprecated but kept for type compatibility if needed, though we moved to EventBlocks
export interface KeyframeValues {
  colors_text?: string;
  colors_active?: string;
  background_color?: string;
}

export interface AnimationKeyframe {
  id: string;
  time: number;
  values: KeyframeValues;
}

export interface SectionStyle {
  enabled: boolean;
  colors_text?: string;
  colors_active?: string;
  effects_glow_boost?: number; // Multiplier or add value
  camera_zoom_boost?: number;
  fontScale?: number; // 1.0 = 100%
  layout?: {
      align: TextAlignment;
      horizontalMargin?: number; // Override margin
  };
  animation?: {
    entrance?: AnimationStyle;
    active?: ActiveStyle;
    exit?: AnimationStyle;
  };
}

export interface AudioLayer {
  id: string;
  name: string;
  buffer: AudioBuffer;
  volume: number;
  muted: boolean;
  solo: boolean;
  duration: number;
  // New for serialization
  sourceFile?: Blob; 
  mimeType?: string;
}

export interface RendererConfig {
  id: string;
  name: string;
  showLyrics: boolean; // New: Global toggle for lyrics rendering
  resolutionId: string; // '16:9', '9:16', '1:1', '4:5'
  
  layout: {
      mode: LayoutMode;
      horizontalMargin: number; // 0.0 to 0.5 (Percentage of screen width)
  };

  background: {
    type: BackgroundType;
    color: string; // Base color or fallback
    url?: string; // Blob URL for image or video
    proceduralStyle?: ProceduralStyle[]; // Changed to array for stacking
    imageEffects?: ImageEffect[]; // Changed to array
    imageEffectSpeed?: number; // New speed control
    intensity?: number; // Opacity (Video/Image) or Speed/Brightness (Procedural)
    playbackSpeed?: number; // Playback rate for Video
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
    fontSize: number; // Size in px
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
    mosaic: boolean; // Pixelate effect
    sepia: boolean;
    grayscale: boolean;
    halftone: boolean;
    oldMovie: boolean;
    kaleidoscope: boolean;
    rgbSplit: boolean;
  };
  particles: {
    enabled: boolean;
    count: number;
    speed: number;
    shape: ParticleShape;
    color: string[]; // Palette
    particleBehavior: 'drift' | 'rise';
  };
  camera: {
    shake: boolean;
    zoomBeat: boolean;
    rotate: boolean;
    sway: boolean; // Gentle panning
    hardKick: boolean; // Aggressive Z-punch
    panic: boolean; // Aggressive erratic movement
    screenPump: boolean;
  };
  sectionStyles: {
    verse: SectionStyle;
    chorus: SectionStyle;
    bridge: SectionStyle;
    intro: SectionStyle;
    outro: SectionStyle;
  };
  keyframes: AnimationKeyframe[]; // Kept for legacy compat, but UI will use EventBlocks mostly
}

export interface EncodedAsset {
    data: string; // Base64
    mimeType: string;
    name?: string;
}

export interface ProjectAssets {
    audio: Array<{ id: string, name: string, data: string, mimeType: string, volume: number, muted: boolean, solo: boolean }>;
    background?: { data: string, mimeType: string, type: 'image' | 'video' };
    fonts: Array<{ name: string, data: string, mimeType: string }>;
}

export type AppProjectType = 'video-lyrics' | 'visualizer' | 'typography';

export interface ProjectFile {
  version: string;
  type?: AppProjectType;
  timestamp: number;
  name: string;
  lyricData: LyricData;
  config: RendererConfig;
  eventBlocks?: EventBlock[];
  assets?: ProjectAssets; // New container for binary data
  customEffects?: CustomEffect[]; // Export custom effects with project
}