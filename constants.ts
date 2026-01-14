

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
  { id: '9:16', name: 'Portrait (1080x1920)', width: 1080, height: 1920 },
  { id: '1:1', name: 'Square (1080x1080)', width: 1080, height: 1080 },
  { id: '4:5', name: 'Social (1080x1350)', width: 1080, height: 1350 }
];

export const DEFAULT_LYRICS: LyricData = {
  "createdAt": new Date().toISOString(),
  "segments": []
};

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
    id: 'cyber-circuit',
    name: 'Cyber Circuit',
    showLyrics: true,
    resolutionId: '16:9',
    layout: { mode: 'center', horizontalMargin: 0.1 },
    background: { type: 'procedural', color: '#000000', proceduralStyle: ['grid', 'circuit', 'matrix'], intensity: 0.8, playbackSpeed: 1.0, imageEffects: [], imageEffectSpeed: 1.0 },
    colors: { text: '#00ff00', active: '#ffffff', secondary: '#003300' },
    font: { family: 'Rubik Glitch', weight: '400', italic: false, fontSize: 80 },
    animation: { entrance: 'typewriter', active: 'glitch-shake', exit: 'glitch' },
    audioReactivity: { enabled: true, sensitivity: 1.2, visualizerStyle: 'spectrum' },
    effects: { 
      glow: 0.5, blur: false, chromaticAberration: true, vignette: true, scanlines: true, 
      filmGrain: false, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: true
    },
    particles: { enabled: false, count: 0, speed: 0, shape: 'square', color: [], particleBehavior: 'drift' },
    camera: { shake: true, zoomBeat: true, rotate: false, sway: false, hardKick: false, panic: false, screenPump: false },
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
    id: 'horror-night',
    name: 'Horror Night',
    showLyrics: true,
    resolutionId: '16:9',
    layout: { mode: 'center', horizontalMargin: 0.1 },
    background: { type: 'procedural', color: '#1a0000', proceduralStyle: ['rain'], intensity: 0.8, playbackSpeed: 1.0, imageEffects: ['red-error', 'dark-error'], imageEffectSpeed: 1.0 },
    colors: { text: '#880000', active: '#ff0000', secondary: '#330000' },
    font: { family: 'Nosifer', weight: '400', italic: false, fontSize: 80 },
    animation: { entrance: 'fade', active: 'shiver', exit: 'burn' },
    audioReactivity: { enabled: true, sensitivity: 1.0, visualizerStyle: 'none' },
    effects: { 
      glow: 0.4, blur: true, chromaticAberration: true, vignette: true, scanlines: true, 
      filmGrain: true, mirror: false, invert: false, barrelDistortion: true, mosaic: false,
      sepia: false, grayscale: false, oldMovie: true, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: false, count: 0, speed: 0, shape: 'circle', color: [], particleBehavior: 'drift' },
    camera: { shake: true, zoomBeat: true, rotate: false, sway: true, hardKick: true, panic: false, screenPump: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  }
];