

import { LyricData, RendererConfig } from "./types";

export const FONTS = [
  'Montserrat',
  'Rubik Glitch',
  'Rubik Glitch Pop',
  'Creepster',
  'Nosifer',
  'Butcherman',
  'Pixelify Sans',
  'Anton',
  'Bebas Neue',
  'Lobster',
  'Pacifico',
  'Permanent Marker',
  'Press Start 2P',
  'Cinzel',
  'Oswald',
  'Playfair Display'
];

export const RESOLUTIONS = [
  { id: '16:9', name: 'Landscape (1920x1080)', width: 1920, height: 1080 },
  { id: '16:9-4k', name: 'Landscape 4K (3840x2160)', width: 3840, height: 2160 },
  { id: '9:16', name: 'Portrait (1080x1920)', width: 1080, height: 1920 },
  { id: '9:16-4k', name: 'Portrait 4K (2160x3840)', width: 2160, height: 3840 },
  { id: '1:1', name: 'Square (1080x1080)', width: 1080, height: 1080 },
  { id: '1:1-4k', name: 'Square 4K (2160x2160)', width: 2160, height: 2160 },
  { id: '4:5', name: 'Social (1080x1350)', width: 1080, height: 1350 }
];

export const DEFAULT_LYRICS: LyricData = {
  "createdAt": new Date().toISOString(),
  "segments": []
};

// --- CUSTOM FX TEMPLATES ---

export const TEMPLATE_SHADER_GLSL = `// Custom Shader Effect
// Available Uniforms:
// float u_time;       // Current time in seconds
// vec2 u_resolution;  // Canvas dimensions (width, height)
// float u_bass;       // Bass intensity (0.0 to 1.0)
// float u_mid;        // Mid intensity (0.0 to 1.0)
// float u_high;       // High intensity (0.0 to 1.0)

vec3 effect_main(vec3 color, vec2 uv) {
    // Example: Red Tint pulsating with Bass
    float pulse = 0.5 + 0.5 * sin(u_time * 5.0);
    vec3 tint = vec3(1.0, 0.2, 0.2) * (u_bass * 2.0 + 0.5);
    
    // Mix original color with tint
    return mix(color, color * tint, 0.5);
}`;

export const TEMPLATE_CAMERA_JS = `// Custom Camera Script (JavaScript)
// Available Variables:
// ctx: CanvasRenderingContext2D
// time: number (seconds)
// width: number (canvas width)
// height: number (canvas height)
// bass: number (0-1)
// mid: number (0-1)
// high: number (0-1)

// Example: Spiral Rotation on Bass
if (bass > 0.5) {
   const angle = Math.sin(time * 2) * 0.1 * bass;
   ctx.rotate(angle);
   
   // Slight zoom
   const zoom = 1 + (bass * 0.05);
   ctx.scale(zoom, zoom);
}`;

export const TEMPLATE_EVENT_PRESET = `{
  "label": "Heavy Drop",
  "overrides": {
    "fx_chromaticAberration": true,
    "fx_scanlines": true,
    "fx_invert": true,
    "cam_shake": true,
    "cam_hardKick": true
  }
}`;

const DEFAULT_SECTION_STYLES = {
  verse: { enabled: false, fontScale: 1.0, layout: { align: 'global' as const } },
  chorus: { enabled: true, colors_active: '#ff00ff', effects_glow_boost: 0.2, camera_zoom_boost: 0.2, fontScale: 1.1, layout: { align: 'global' as const } },
  bridge: { enabled: true, colors_active: '#ffff00', effects_glow_boost: 0.0, camera_zoom_boost: 0.0, fontScale: 1.0, layout: { align: 'global' as const } },
  intro: { enabled: false, fontScale: 1.0, layout: { align: 'global' as const } },
  outro: { enabled: false, fontScale: 1.0, layout: { align: 'global' as const } }
};

export const TEMPLATES: RendererConfig[] = [
  {
    id: 'ethereal-nebula',
    name: 'Ethereal Nebula',
    showLyrics: true,
    resolutionId: '16:9',
    layout: { mode: 'center', horizontalMargin: 0.1 },
    background: { type: 'procedural', color: '#0f172a', proceduralStyle: ['stars', 'nebula'], intensity: 0.8, playbackSpeed: 1.0, imageEffects: [], imageEffectSpeed: 1.0 },
    colors: { text: '#e2e8f0', active: '#38bdf8', secondary: '#818cf8' },
    font: { family: 'Montserrat', weight: '900', italic: false, fontSize: 80 },
    animation: { entrance: 'blur', active: 'orbit-spin', exit: 'fade' },
    audioReactivity: { enabled: true, sensitivity: 1.0, visualizerStyle: 'none' },
    effects: { 
      glow: 0.8, blur: false, chromaticAberration: false, vignette: true, scanlines: false, 
      filmGrain: true, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 80, speed: 0.5, shape: 'circle', color: ['#38bdf8', '#ffffff'], particleBehavior: 'drift' },
    camera: { shake: false, zoomBeat: true, rotate: true, sway: true, hardKick: false, panic: false, screenPump: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'cyber-city',
    name: 'Cyber City',
    showLyrics: true,
    resolutionId: '16:9',
    layout: { mode: 'center', horizontalMargin: 0.1 },
    background: {
      type: 'procedural',
      color: '#050a14',
      proceduralStyle: ['grid', 'rain'],
      intensity: 0.7,
      playbackSpeed: 1.0,
      imageEffects: ['scan-drift', 'chromatic-shift'],
      imageEffectSpeed: 1.0
    },
    colors: { text: '#00ffff', active: '#ff00ff', secondary: '#ffff00' },
    font: { family: 'Rubik Glitch Pop', weight: '400', italic: false, fontSize: 85 },
    animation: { entrance: 'glitch', active: 'neon', exit: 'scramble' },
    audioReactivity: { enabled: true, sensitivity: 1.2, visualizerStyle: 'spectrum' },
    effects: {
      glow: 1.0, blur: false, chromaticAberration: true, vignette: true, scanlines: true,
      filmGrain: true, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: true
    },
    particles: { enabled: true, count: 50, speed: 1.0, shape: 'square', color: ['#00ffff', '#ff00ff'], particleBehavior: 'drift' },
    camera: { shake: false, zoomBeat: true, rotate: false, sway: false, hardKick: true, panic: false, screenPump: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'retro-vhs',
    name: 'Retro VHS 90s',
    showLyrics: true,
    resolutionId: '16:9',
    layout: { mode: 'center', horizontalMargin: 0.1 },
    background: { 
        type: 'procedural', 
        color: '#000022', 
        proceduralStyle: ['grid'], 
        intensity: 0.6, 
        playbackSpeed: 1.0, 
        imageEffects: ['vhs-stripes', 'chromatic-shift', 'scan-drift'], 
        imageEffectSpeed: 2.0 
    },
    colors: { text: '#cccccc', active: '#00ff00', secondary: '#ff00ff' },
    font: { family: 'Pixelify Sans', weight: '700', italic: false, fontSize: 70 },
    animation: { entrance: 'typewriter', active: 'jitter', exit: 'glitch' },
    audioReactivity: { enabled: true, sensitivity: 1.2, visualizerStyle: 'none' },
    effects: { 
      glow: 0.7, blur: true, chromaticAberration: true, vignette: true, scanlines: false, 
      filmGrain: true, mirror: false, invert: false, barrelDistortion: true, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: false, count: 0, speed: 0, shape: 'square', color: [], particleBehavior: 'drift' },
    camera: { shake: true, zoomBeat: true, rotate: false, sway: false, hardKick: false, panic: false, screenPump: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'noir-cinema',
    name: 'Noir Cinema',
    showLyrics: true,
    resolutionId: '16:9',
    layout: { mode: 'center', horizontalMargin: 0.1 },
    background: {
      type: 'procedural',
      color: '#1a1a1a',
      proceduralStyle: ['gradient-wave'],
      intensity: 0.2,
      playbackSpeed: 0.5,
      imageEffects: [],
      imageEffectSpeed: 1.0
    },
    colors: { text: '#cccccc', active: '#ffffff', secondary: '#888888' },
    font: { family: 'Cinzel', weight: '700', italic: false, fontSize: 70 },
    animation: { entrance: 'typewriter', active: 'pulse', exit: 'fade' },
    audioReactivity: { enabled: true, sensitivity: 0.5, visualizerStyle: 'none' },
    effects: {
      glow: 0.2, blur: true, chromaticAberration: false, vignette: true, scanlines: false,
      filmGrain: true, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: true, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 20, speed: 0.2, shape: 'circle', color: ['#ffffff'], particleBehavior: 'drift' },
    camera: { shake: true, zoomBeat: false, rotate: false, sway: false, hardKick: false, panic: false, screenPump: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'toxic-waste',
    name: 'Toxic Sludge',
    showLyrics: true,
    resolutionId: '16:9',
    layout: { mode: 'center', horizontalMargin: 0.1 },
    background: { 
        type: 'procedural', 
        color: '#112200', 
        proceduralStyle: ['plasma'], 
        intensity: 1.5, 
        playbackSpeed: 1.0, 
        imageEffects: ['liquid-warp', 'thermal'], 
        imageEffectSpeed: 0.5 
    },
    colors: { text: '#ccff00', active: '#00ff00', secondary: '#33ff00' },
    font: { family: 'Creepster', weight: '400', italic: false, fontSize: 90 },
    animation: { entrance: 'inflate', active: 'bounce', exit: 'sink' },
    audioReactivity: { enabled: true, sensitivity: 1.5, visualizerStyle: 'shockwave' },
    effects: { 
      glow: 0.9, blur: false, chromaticAberration: false, vignette: true, scanlines: false, 
      filmGrain: false, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 40, speed: 1.0, shape: 'circle', color: ['#00ff00', '#ccff00'], particleBehavior: 'rise' },
    camera: { shake: false, zoomBeat: true, rotate: true, sway: true, hardKick: false, panic: false, screenPump: true },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    showLyrics: true,
    resolutionId: '16:9',
    layout: { mode: 'center', horizontalMargin: 0.1 },
    background: {
      type: 'procedural',
      color: '#001e3c',
      proceduralStyle: ['plasma', 'gradient-wave'],
      intensity: 0.6,
      playbackSpeed: 0.5,
      imageEffects: ['liquid-warp'],
      imageEffectSpeed: 0.5
    },
    colors: { text: '#90caf9', active: '#e3f2fd', secondary: '#64b5f6' },
    font: { family: 'Lobster', weight: '400', italic: false, fontSize: 80 },
    animation: { entrance: 'fade', active: 'wave', exit: 'fade' },
    audioReactivity: { enabled: true, sensitivity: 0.8, visualizerStyle: 'orb' },
    effects: {
      glow: 0.6, blur: true, chromaticAberration: false, vignette: true, scanlines: false,
      filmGrain: false, mirror: false, invert: false, barrelDistortion: true, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 60, speed: 0.3, shape: 'circle', color: ['#e3f2fd', '#bbdefb'], particleBehavior: 'rise' },
    camera: { shake: false, zoomBeat: true, rotate: false, sway: true, hardKick: false, panic: false, screenPump: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'glitch-news',
    name: 'Glitch Matrix',
    showLyrics: true,
    resolutionId: '16:9',
    layout: { mode: 'center', horizontalMargin: 0.1 },
    background: { 
        type: 'procedural', 
        color: '#000000', 
        proceduralStyle: ['matrix', 'grid'], 
        intensity: 0.8, 
        playbackSpeed: 1.0, 
        imageEffects: ['dark-error', 'pixel-noise'], 
        imageEffectSpeed: 1.0 
    },
    colors: { text: '#ffffff', active: '#ff0000', secondary: '#990000' },
    font: { family: 'Rubik Glitch', weight: '400', italic: false, fontSize: 80 },
    animation: { entrance: 'scramble', active: 'glitch-shake', exit: 'glitch' },
    audioReactivity: { enabled: true, sensitivity: 1.3, visualizerStyle: 'spectrum' },
    effects: { 
      glow: 0.5, blur: false, chromaticAberration: true, vignette: false, scanlines: true, 
      filmGrain: true, mirror: false, invert: true, barrelDistortion: false, mosaic: true,
      sepia: false, grayscale: true, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: true
    },
    particles: { enabled: false, count: 0, speed: 0, shape: 'square', color: [], particleBehavior: 'drift' },
    camera: { shake: true, zoomBeat: true, rotate: false, sway: false, hardKick: true, panic: true, screenPump: true },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'street-tag',
    name: 'Street Tag',
    showLyrics: true,
    resolutionId: '16:9',
    layout: { mode: 'center', horizontalMargin: 0.1 },
    background: {
      type: 'solid',
      color: '#262626',
      proceduralStyle: [],
      intensity: 1.0,
      playbackSpeed: 1.0,
      imageEffects: [],
      imageEffectSpeed: 1.0
    },
    colors: { text: '#f5f5f5', active: '#ffab00', secondary: '#ffea00' },
    font: { family: 'Permanent Marker', weight: '400', italic: false, fontSize: 90 },
    animation: { entrance: 'slam', active: 'bounce', exit: 'fade' },
    audioReactivity: { enabled: true, sensitivity: 1.5, visualizerStyle: 'shockwave' },
    effects: {
      glow: 0.4, blur: false, chromaticAberration: true, vignette: true, scanlines: false,
      filmGrain: true, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: true, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 0, speed: 0, shape: 'circle', color: [], particleBehavior: 'drift' },
    camera: { shake: true, zoomBeat: true, rotate: true, sway: false, hardKick: true, panic: false, screenPump: true },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'bass-inferno',
    name: 'Bass Inferno',
    showLyrics: true,
    resolutionId: '16:9',
    layout: { mode: 'center', horizontalMargin: 0.1 },
    background: { type: 'procedural', color: '#1a0500', proceduralStyle: ['fire', 'tunnel'], intensity: 1.0, playbackSpeed: 1.0, imageEffects: [], imageEffectSpeed: 1.0 },
    colors: { text: '#ffcc00', active: '#ff4400', secondary: '#ff0000' },
    font: { family: 'Anton', weight: '900', italic: false, fontSize: 90 },
    animation: { entrance: 'slam', active: 'bass-bulge', exit: 'burn' },
    audioReactivity: { enabled: true, sensitivity: 1.5, visualizerStyle: 'shockwave' },
    effects: { 
      glow: 0.6, blur: false, chromaticAberration: true, vignette: true, scanlines: false, 
      filmGrain: true, mirror: false, invert: true, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 50, speed: 2.5, shape: 'triangle', color: ['#ff4400', '#ffcc00'], particleBehavior: 'rise' },
    camera: { shake: true, zoomBeat: true, rotate: false, sway: false, hardKick: true, panic: false, screenPump: true },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'happy-tetris-rain',
    name: 'Happy Tetris Rain',
    showLyrics: true,
    resolutionId: '16:9',
    layout: { mode: 'center', horizontalMargin: 0.1 },
    background: {
      type: 'solid',
      color: '#1a1a1a', 
      playbackSpeed: 1.0,
      imageEffects: ['bright-happy'],
      imageEffectSpeed: 1.0,
      intensity: 1.0
    },
    colors: {
      text: '#ffffff',
      active: '#FFFF00',
      secondary: '#FF00FF'
    },
    font: { family: 'Press Start 2P', weight: '400', italic: false, fontSize: 60 },
    animation: {
      entrance: 'stack-pop',
      active: 'bounce',
      exit: 'drop'
    },
    audioReactivity: {
      enabled: true,
      sensitivity: 1.0,
      visualizerStyle: 'none'
    },
    effects: {
      glow: 0.3,
      blur: false,
      chromaticAberration: false,
      vignette: false,
      scanlines: false,
      filmGrain: false,
      mirror: false,
      invert: false,
      barrelDistortion: false,
      mosaic: false,
      sepia: false,
      grayscale: false,
      halftone: false,
      oldMovie: false,
      kaleidoscope: false,
      rgbSplit: false
    },
    particles: {
      enabled: true,
      count: 30,
      speed: 1.5,
      shape: 'tetris',
      color: ['#00FFFF', '#FFFF00', '#FF00FF', '#32CD32', '#FFA500'],
      particleBehavior: 'drift'
    },
    camera: {
      shake: false,
      zoomBeat: true,
      rotate: false,
      sway: true,
      hardKick: false,
      panic: false,
      screenPump: false
    },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'dreamscape',
    name: 'Dreamscape',
    showLyrics: true,
    resolutionId: '16:9',
    layout: { mode: 'center', horizontalMargin: 0.1 },
    background: { type: 'procedural', color: '#1e1b4b', proceduralStyle: ['stars'], intensity: 0.3, playbackSpeed: 1.0, imageEffects: [], imageEffectSpeed: 1.0 },
    colors: { text: '#e2e8f0', active: '#c4b5fd', secondary: '#818cf8' },
    font: { family: 'Playfair Display', weight: '700', italic: true, fontSize: 75 },
    animation: { entrance: 'blur', active: 'float', exit: 'fade' },
    audioReactivity: { enabled: true, sensitivity: 0.8, visualizerStyle: 'orb' },
    effects: { 
      glow: 0.9, blur: true, chromaticAberration: false, vignette: true, scanlines: false, 
      filmGrain: true, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 150, speed: 0.2, shape: 'circle', color: ['#c4b5fd', '#ffffff'], particleBehavior: 'rise' },
    camera: { shake: false, zoomBeat: false, rotate: false, sway: true, hardKick: false, panic: false, screenPump: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'midnight-horror',
    name: 'Midnight Horror',
    showLyrics: true,
    resolutionId: '16:9',
    layout: { mode: 'center', horizontalMargin: 0.1 },
    background: {
      type: 'procedural',
      color: '#0f0000',
      proceduralStyle: ['matrix', 'fire'],
      intensity: 0.4,
      playbackSpeed: 0.8,
      imageEffects: ['dark-error', 'ghosting'],
      imageEffectSpeed: 0.8
    },
    colors: { text: '#880000', active: '#ff0000', secondary: '#550000' },
    font: { family: 'Nosifer', weight: '400', italic: false, fontSize: 80 },
    animation: { entrance: 'burn', active: 'shiver', exit: 'burn' },
    audioReactivity: { enabled: true, sensitivity: 1.0, visualizerStyle: 'none' },
    effects: {
      glow: 0.8, blur: false, chromaticAberration: true, vignette: true, scanlines: false,
      filmGrain: true, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: true, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 10, speed: 0.1, shape: 'circle', color: ['#330000'], particleBehavior: 'drift' },
    camera: { shake: true, zoomBeat: false, rotate: false, sway: true, hardKick: false, panic: true, screenPump: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  }
];
