

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
  section?: string;
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

export type AnimationStyle = 'fade' | 'slide' | 'slam' | 'zoom' | 'typewriter' | 'spin' | 'blur' | 'glitch' | 'elastic' | 'drop' | 'scramble' | 'spiral' | 'inflate' | 'sink' | 'burn' | 'stretch' | 'stack-pop' | 'random';
export type ActiveStyle = 'pulse' | 'jitter' | 'bounce' | 'neon' | 'wave' | 'rotate' | 'skew' | 'pop' | 'flash' | 'float' | 'shiver' | 'rainbow' | 'heartbeat' | 'swing' | 'glitch-shake' | 'random';
export type ParticleShape = 'circle' | 'square' | 'star' | 'hexagon' | 'triangle' | 'note' | 'tetris';

export type BackgroundType = 'solid' | 'image' | 'video' | 'procedural';
export type ProceduralStyle = 'grid' | 'stars' | 'plasma' | 'tunnel' | 'matrix' | 'gradient-wave' | 'hexagons' | 'kaleidoscope' | 'dna';
export type VisualizerStyle = 'spectrum' | 'orb' | 'shockwave' | 'none';
export type ImageEffect = 'none' | 'dark-error' | 'red-error' | 'zoom-slow' | 'chromatic-shift' | 'alert' | 'thermal' | 'vhs-stripes' | 'liquid-warp' | 'scan-drift' | 'ghosting' | 'pixel-noise' | 'mirror-x' | 'bright-happy';

export interface KeyframeValues {
  colors_text?: string;
  colors_active?: string;
  background_color?: string;
  effects_glow?: number;
  camera_zoom?: number; 
  camera_rotate?: number;
  image_effects?: ImageEffect[]; // Changed to array
  image_effect_speed?: number; // New speed control
}

export interface SectionStyle {
  enabled: boolean;
  colors_text?: string;
  colors_active?: string;
  effects_glow_boost?: number; // Multiplier or add value
  camera_zoom_boost?: number;
  animation?: {
    entrance?: AnimationStyle;
    active?: ActiveStyle;
    exit?: AnimationStyle;
  };
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
  showLyrics: boolean; // New: Global toggle for lyrics rendering
  resolutionId: string; // '16:9', '9:16', '1:1', '4:5'
  background: {
    type: BackgroundType;
    color: string; // Base color or fallback
    url?: string; // Blob URL for image or video
    proceduralStyle?: ProceduralStyle;
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
  keyframes: AnimationKeyframe[];
}

export interface ProjectFile {
  version: string;
  timestamp: number;
  name: string;
  lyricData: LyricData;
  config: RendererConfig;
}