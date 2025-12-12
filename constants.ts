

import { LyricData, RendererConfig } from "./types";

export const FONTS = [
  'Montserrat',
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
  verse: { enabled: false },
  chorus: { enabled: true, colors_active: '#ff00ff', effects_glow_boost: 0.2, camera_zoom_boost: 0.2 },
  bridge: { enabled: true, colors_active: '#ffff00', effects_glow_boost: 0.0, camera_zoom_boost: 0.0 },
  intro: { enabled: false },
  outro: { enabled: false }
};

export const TEMPLATES: RendererConfig[] = [
  {
    id: 'kinetic-mix',
    name: 'Kinetic Mix',
    showLyrics: true,
    resolutionId: '16:9',
    background: {
      type: 'solid',
      color: '#000000',
      playbackSpeed: 1.0,
      imageEffects: [],
      imageEffectSpeed: 1.0
    },
    colors: {
      text: '#ffffff',
      active: '#00ff00',
      secondary: '#333333'
    },
    font: { family: 'Anton', weight: '900', italic: false },
    animation: {
      entrance: 'random', // Dynamic randomness
      active: 'random', // Dynamic randomness
      exit: 'fade'
    },
    audioReactivity: {
      enabled: true,
      sensitivity: 1.2,
      visualizerStyle: 'none'
    },
    effects: {
      glow: 0.0,
      blur: false,
      chromaticAberration: true,
      vignette: false,
      scanlines: false,
      filmGrain: true,
      mirror: false,
      invert: true,
      barrelDistortion: false,
      mosaic: false,
      sepia: false,
      grayscale: true,
      halftone: false,
      oldMovie: false,
      kaleidoscope: false,
      rgbSplit: false
    },
    particles: {
      enabled: false,
      count: 0,
      speed: 0,
      shape: 'circle',
      color: [],
      particleBehavior: 'drift'
    },
    camera: {
      shake: true,
      zoomBeat: true,
      rotate: false,
      sway: false,
      hardKick: true,
      panic: false,
      screenPump: true
    },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    showLyrics: true,
    resolutionId: '16:9',
    background: {
      type: 'solid',
      color: '#0a0a0a',
      playbackSpeed: 1.0,
      imageEffects: [],
      imageEffectSpeed: 1.0
    },
    colors: {
      text: '#e0e0e0', // Bright white-grey for legibility
      active: '#00ffff', // Cyan
      secondary: '#a855f7' // Purple
    },
    font: { family: 'Montserrat', weight: '900', italic: false },
    animation: {
      entrance: 'slide',
      active: 'neon',
      exit: 'fade'
    },
    audioReactivity: {
      enabled: true,
      sensitivity: 1.0,
      visualizerStyle: 'spectrum'
    },
    effects: {
      glow: 0.8,
      blur: true,
      chromaticAberration: true,
      vignette: true,
      scanlines: false, // Disabled for clarity
      filmGrain: true, // Subtle grain
      mirror: false,
      invert: false,
      barrelDistortion: false,
      mosaic: false,
      sepia: false,
      grayscale: false,
      halftone: false,
      oldMovie: false,
      kaleidoscope: false,
      rgbSplit: true
    },
    particles: {
      enabled: true,
      count: 100,
      speed: 1.0,
      shape: 'circle',
      color: ['#00ffff', '#a855f7', '#ffffff'],
      particleBehavior: 'drift'
    },
    camera: {
      shake: true,
      zoomBeat: true,
      rotate: true,
      sway: false,
      hardKick: false,
      panic: false,
      screenPump: false
    },
    sectionStyles: {
       verse: { enabled: false },
       chorus: { enabled: true, colors_active: '#ff00ff', effects_glow_boost: 0.3, camera_zoom_boost: 0.2 },
       bridge: { enabled: true, colors_active: '#ffff00', effects_glow_boost: 0.1 },
       intro: { enabled: false },
       outro: { enabled: false }
    },
    keyframes: []
  },
  {
    id: 'cyber-punk',
    name: 'Cyber Punk',
    showLyrics: true,
    resolutionId: '16:9',
    background: { type: 'solid', color: '#050505', playbackSpeed: 1.0, imageEffects: [], imageEffectSpeed: 1.0 },
    colors: { text: '#fee02f', active: '#00f0ff', secondary: '#ff003c' },
    font: { family: 'Oswald', weight: '700', italic: true },
    animation: { entrance: 'glitch', active: 'glitch-shake', exit: 'slam' },
    audioReactivity: { enabled: true, sensitivity: 1.3, visualizerStyle: 'shockwave' },
    effects: { 
      glow: 0.6, blur: false, chromaticAberration: true, vignette: true, scanlines: true, 
      filmGrain: true, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: true
    },
    particles: { enabled: true, count: 40, speed: 4, shape: 'triangle', color: ['#fee02f', '#00f0ff', '#ff003c'], particleBehavior: 'drift' },
    camera: { shake: true, zoomBeat: true, rotate: false, sway: false, hardKick: true, panic: false, screenPump: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'dreamscape',
    name: 'Dreamscape',
    showLyrics: true,
    resolutionId: '16:9',
    background: { type: 'procedural', color: '#1e1b4b', proceduralStyle: 'stars', intensity: 0.3, playbackSpeed: 1.0, imageEffects: [], imageEffectSpeed: 1.0 },
    colors: { text: '#e2e8f0', active: '#c4b5fd', secondary: '#818cf8' },
    font: { family: 'Playfair Display', weight: '700', italic: true },
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
    id: 'vhs-horror',
    name: 'VHS Horror',
    showLyrics: true,
    resolutionId: '16:9',
    background: { type: 'solid', color: '#020202', playbackSpeed: 1.0, imageEffects: [], imageEffectSpeed: 1.0 },
    colors: { text: '#d4d4d4', active: '#ff0000', secondary: '#520000' }, // Improved contrast
    font: { family: 'Cinzel', weight: '700', italic: false },
    animation: { entrance: 'typewriter', active: 'shiver', exit: 'burn' },
    audioReactivity: { enabled: true, sensitivity: 1.2, visualizerStyle: 'none' },
    effects: { 
      glow: 0.4, blur: true, chromaticAberration: true, vignette: true, scanlines: true, 
      filmGrain: true, mirror: false, invert: false, barrelDistortion: true, mosaic: false,
      sepia: false, grayscale: false, oldMovie: true, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: false, count: 0, speed: 0, shape: 'circle', color: [], particleBehavior: 'drift' },
    camera: { shake: true, zoomBeat: false, rotate: false, sway: false, hardKick: true, panic: false, screenPump: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'retro-arcade',
    name: 'Retro Arcade',
    showLyrics: true,
    resolutionId: '1:1',
    background: { type: 'solid', color: '#111111', playbackSpeed: 1.0, imageEffects: [], imageEffectSpeed: 1.0 },
    colors: { text: '#33ff00', active: '#ff00ff', secondary: '#00ffff' },
    font: { family: 'Press Start 2P', weight: '400', italic: false },
    animation: { entrance: 'typewriter', active: 'flash', exit: 'glitch' },
    audioReactivity: { enabled: true, sensitivity: 1.0, visualizerStyle: 'none' },
    effects: {
      glow: 0.4, blur: false, chromaticAberration: true, vignette: false, scanlines: true,
      filmGrain: false, mirror: false, invert: false, barrelDistortion: false, mosaic: true,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 50, speed: 2.0, shape: 'square', color: ['#33ff00', '#ff00ff'], particleBehavior: 'drift' },
    camera: { shake: true, zoomBeat: true, rotate: false, sway: false, hardKick: true, panic: false, screenPump: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
];