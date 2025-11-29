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
  "createdAt": "2025-11-29T01:23:00.207Z",
  "segments": [
    {
      "id": "0",
      "start": 0,
      "end": 12.76,
      "text": "SON LAS TRES\nY DIEZ DE LA\nMAÑANA",
      "section": "intro",
      "words": [
        { "word": "SON", "start": 0, "end": 11.34, "probability": 0.95, "line_number": 0 },
        { "word": "LAS", "start": 11.34, "end": 11.5, "probability": 0.99, "line_number": 0 },
        { "word": "TRES", "start": 11.5, "end": 11.67, "probability": 0.55, "line_number": 0 },
        { "word": "Y", "start": 11.67, "end": 11.84, "probability": 0.99, "line_number": 1 },
        { "word": "DIEZ", "start": 11.84, "end": 11.96, "probability": 0.98, "line_number": 1 },
        { "word": "DE", "start": 11.96, "end": 12.1, "probability": 0.99, "line_number": 1 },
        { "word": "LA", "start": 12.1, "end": 12.45, "probability": 0.99, "line_number": 1 },
        { "word": "MAÑANA", "start": 12.45, "end": 12.76, "probability": 0.99, "line_number": 2 }
      ]
    },
    {
      "id": "1",
      "start": 12.76,
      "end": 15.36,
      "text": "LA LUZ DE TU\nMENSAJE EN\nMI CARA",
      "section": "verse",
      "words": [
        { "word": "LA", "start": 12.76, "end": 13.7, "probability": 0.99, "line_number": 0 },
        { "word": "LUZ", "start": 13.7, "end": 13.85, "probability": 0.99, "line_number": 0 },
        { "word": "DE", "start": 13.85, "end": 13.97, "probability": 0.99, "line_number": 0 },
        { "word": "TU", "start": 13.97, "end": 14.16, "probability": 0.99, "line_number": 0 },
        { "word": "MENSAJE", "start": 14.16, "end": 14.54, "probability": 0.99, "line_number": 1 },
        { "word": "EN", "start": 14.54, "end": 14.76, "probability": 0.99, "line_number": 1 },
        { "word": "MI", "start": 14.76, "end": 15.11, "probability": 0.99, "line_number": 2 },
        { "word": "CARA", "start": 15.11, "end": 15.36, "probability": 0.99, "line_number": 2 }
      ]
    },
    {
      "id": "2",
      "start": 15.36,
      "end": 17.52,
      "text": "LO ANALIZO\nTODO CADA\nPUTO PIXEL",
      "section": "verse",
      "words": [
        { "word": "LO", "start": 15.36, "end": 15.7, "probability": 0.99, "line_number": 0 },
        { "word": "ANALIZO", "start": 15.7, "end": 16.219, "probability": 0.99, "line_number": 0 },
        { "word": "TODO", "start": 16.219, "end": 16.52, "probability": 0.99, "line_number": 1 },
        { "word": "CADA", "start": 16.52, "end": 16.8, "probability": 0.72, "line_number": 1 },
        { "word": "PUTO", "start": 16.8, "end": 17.29, "probability": 0.99, "line_number": 2 },
        { "word": "PIXEL", "start": 17.29, "end": 17.52, "probability": 0.78, "line_number": 2 }
      ]
    },
    {
      "id": "3",
      "start": 17.52,
      "end": 19.759,
      "text": "EL TIEMPO\nQUE TARDASTE\nLA PALABRA",
      "section": "verse",
      "words": [
        { "word": "EL", "start": 17.52, "end": 18.13, "probability": 0.99, "line_number": 0 },
        { "word": "TIEMPO", "start": 18.13, "end": 18.37, "probability": 0.99, "line_number": 0 },
        { "word": "QUE", "start": 18.37, "end": 18.57, "probability": 0.99, "line_number": 1 },
        { "word": "TARDASTE", "start": 18.57, "end": 18.99, "probability": 0.93, "line_number": 1 },
        { "word": "LA", "start": 18.99, "end": 19.29, "probability": 0.65, "line_number": 2 },
        { "word": "PALABRA", "start": 19.29, "end": 19.759, "probability": 0.99, "line_number": 2 }
      ]
    },
    {
      "id": "4",
      "start": 19.759,
      "end": 20.72,
      "text": "EXACTA",
      "section": "bridge",
      "words": [
        { "word": "EXACTA", "start": 19.759, "end": 20.72, "probability": 0.99, "line_number": 3 }
      ]
    },
    {
      "id": "5",
      "start": 20.72,
      "end": 22.8,
      "text": "CADA EMOJI\nES UN CÓDIGO\nQUE INTENTO",
      "section": "chorus",
      "words": [
        { "word": "CADA", "start": 20.72, "end": 21.22, "probability": 0.99, "line_number": 0 },
        { "word": "EMOJI", "start": 21.22, "end": 21.53, "probability": 0.99, "line_number": 0 },
        { "word": "ES", "start": 21.53, "end": 21.72, "probability": 0.99, "line_number": 1 },
        { "word": "UN", "start": 21.72, "end": 21.98, "probability": 0.99, "line_number": 1 },
        { "word": "CÓDIGO", "start": 21.98, "end": 22.259, "probability": 0.99, "line_number": 1 },
        { "word": "QUE", "start": 22.259, "end": 22.43, "probability": 0.99, "line_number": 2 },
        { "word": "INTENTO", "start": 22.43, "end": 22.8, "probability": 0.99, "line_number": 2 }
      ]
    }
  ]
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
    id: 'neon-night',
    name: 'Neon Night',
    resolutionId: '16:9',
    background: {
      type: 'solid',
      color: '#050505'
    },
    colors: {
      text: '#ffffff',
      active: '#22d3ee', // Cyan
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
      scanlines: false,
      filmGrain: false,
      mirror: false,
      invert: false,
      barrelDistortion: false
    },
    particles: {
      enabled: true,
      count: 150,
      speed: 1.0,
      shape: 'circle',
      color: ['#22d3ee', '#a855f7', '#ffffff', '#38bdf8', '#c084fc']
    },
    camera: {
      shake: true,
      zoomBeat: true,
      rotate: true
    },
    sectionStyles: {
       verse: { enabled: false },
       chorus: { enabled: true, colors_active: '#d946ef', effects_glow_boost: 0.3, camera_zoom_boost: 0.2 },
       bridge: { enabled: true, colors_active: '#facc15', effects_glow_boost: 0.1 },
       intro: { enabled: false },
       outro: { enabled: false }
    },
    keyframes: []
  },
  {
    id: 'cyber-glitch',
    name: 'Cyber Glitch',
    resolutionId: '16:9',
    background: {
      type: 'procedural',
      color: '#000000',
      proceduralStyle: 'matrix',
      intensity: 1.0
    },
    colors: {
      text: '#e2e8f0',
      active: '#00ff00', // Matrix Green
      secondary: '#ff0000' // Red
    },
    font: { family: 'Oswald', weight: '700', italic: false },
    animation: {
      entrance: 'typewriter',
      active: 'jitter',
      exit: 'slam'
    },
    audioReactivity: {
      enabled: true,
      sensitivity: 1.2,
      visualizerStyle: 'shockwave'
    },
    effects: {
      glow: 0.4,
      blur: false,
      chromaticAberration: true,
      vignette: true,
      scanlines: true,
      filmGrain: true,
      mirror: false,
      invert: true,
      barrelDistortion: false
    },
    particles: {
      enabled: true,
      count: 40,
      speed: 3.0,
      shape: 'hexagon',
      color: ['#00ff00', '#003300', '#ffffff']
    },
    camera: {
      shake: true,
      zoomBeat: false,
      rotate: false
    },
    sectionStyles: { ...DEFAULT_SECTION_STYLES, chorus: { enabled: true, colors_active: '#ff0000', camera_zoom_boost: 0.1 }},
    keyframes: []
  },
  {
    id: 'synthwave',
    name: 'Synthwave 80s',
    resolutionId: '16:9',
    background: { type: 'procedural', color: '#2b0057', proceduralStyle: 'grid', intensity: 0.8 },
    colors: { text: '#ff00ff', active: '#00ffff', secondary: '#ffff00' },
    font: { family: 'Permanent Marker', weight: '400', italic: false },
    animation: { entrance: 'slide', active: 'wave', exit: 'zoom' },
    audioReactivity: { enabled: true, sensitivity: 1.0, visualizerStyle: 'spectrum' },
    effects: { glow: 0.6, blur: false, chromaticAberration: true, vignette: true, scanlines: true, filmGrain: true, mirror: false, invert: false, barrelDistortion: false },
    particles: { enabled: true, count: 60, speed: 1.5, shape: 'triangle', color: ['#ff00ff', '#00ffff'] },
    camera: { shake: false, zoomBeat: true, rotate: false },
    sectionStyles: { ...DEFAULT_SECTION_STYLES, chorus: { enabled: true, colors_active: '#facc15', effects_glow_boost: 0.4 }},
    keyframes: []
  },
  {
    id: 'minimal-light',
    name: 'Minimal Light',
    resolutionId: '1:1',
    background: { type: 'solid', color: '#ffffff' },
    colors: { text: '#000000', active: '#ff3366', secondary: '#cccccc' },
    font: { family: 'Oswald', weight: '700', italic: false },
    animation: { entrance: 'fade', active: 'pulse', exit: 'fade' },
    audioReactivity: { enabled: true, sensitivity: 0.8, visualizerStyle: 'none' },
    effects: { glow: 0, blur: false, chromaticAberration: false, vignette: false, scanlines: false, filmGrain: false, mirror: false, invert: false, barrelDistortion: false },
    particles: { enabled: false, count: 0, speed: 0, shape: 'circle', color: [] },
    camera: { shake: false, zoomBeat: false, rotate: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'cinematic-gold',
    name: 'Cinematic Gold',
    resolutionId: '16:9',
    background: { type: 'solid', color: '#0a0a0a' },
    colors: { text: '#cfc09f', active: '#ffd700', secondary: '#8a7e5f' },
    font: { family: 'Cinzel', weight: '700', italic: false },
    animation: { entrance: 'zoom', active: 'neon', exit: 'fade' },
    audioReactivity: { enabled: true, sensitivity: 0.5, visualizerStyle: 'none' },
    effects: { glow: 0.4, blur: true, chromaticAberration: false, vignette: true, scanlines: false, filmGrain: true, mirror: false, invert: false, barrelDistortion: false },
    particles: { enabled: true, count: 30, speed: 0.2, shape: 'circle', color: ['#ffd700', '#cfc09f'] },
    camera: { shake: false, zoomBeat: false, rotate: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: '8bit-retro',
    name: '8-Bit Retro',
    resolutionId: '4:5',
    background: { type: 'solid', color: '#2d2d2d' },
    colors: { text: '#ffffff', active: '#facc15', secondary: '#ef4444' },
    font: { family: 'Press Start 2P', weight: '400', italic: false },
    animation: { entrance: 'typewriter', active: 'bounce', exit: 'glitch' },
    audioReactivity: { enabled: true, sensitivity: 1.5, visualizerStyle: 'spectrum' },
    effects: { glow: 0, blur: false, chromaticAberration: false, vignette: false, scanlines: true, filmGrain: false, mirror: false, invert: false, barrelDistortion: false },
    particles: { enabled: true, count: 20, speed: 1.0, shape: 'square', color: ['#facc15', '#ef4444', '#3b82f6'] },
    camera: { shake: true, zoomBeat: true, rotate: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    resolutionId: '16:9',
    background: { type: 'procedural', color: '#020617', proceduralStyle: 'stars', intensity: 0.3 },
    colors: { text: '#e2e8f0', active: '#60a5fa', secondary: '#1e293b' },
    font: { family: 'Montserrat', weight: '300', italic: true },
    animation: { entrance: 'fade', active: 'pulse', exit: 'fade' },
    audioReactivity: { enabled: true, sensitivity: 0.8, visualizerStyle: 'orb' },
    effects: { glow: 0.5, blur: true, chromaticAberration: false, vignette: true, scanlines: false, filmGrain: false, mirror: false, invert: false, barrelDistortion: false },
    particles: { enabled: true, count: 100, speed: 0.5, shape: 'star', color: ['#ffffff', '#60a5fa'] },
    camera: { shake: false, zoomBeat: false, rotate: true },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'pop-art',
    name: 'Pop Art',
    resolutionId: '1:1',
    background: { type: 'procedural', color: '#fbbf24', proceduralStyle: 'tunnel', intensity: 0.8 },
    colors: { text: '#000000', active: '#dc2626', secondary: '#2563eb' },
    font: { family: 'Bebas Neue', weight: '400', italic: false },
    animation: { entrance: 'slam', active: 'bounce', exit: 'slide' },
    audioReactivity: { enabled: true, sensitivity: 1.2, visualizerStyle: 'shockwave' },
    effects: { glow: 0, blur: false, chromaticAberration: false, vignette: false, scanlines: true, filmGrain: false, mirror: false, invert: true, barrelDistortion: false },
    particles: { enabled: true, count: 50, speed: 2.0, shape: 'circle', color: ['#dc2626', '#2563eb', '#ffffff'] },
    camera: { shake: true, zoomBeat: true, rotate: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'smooth-jazz',
    name: 'Smooth Jazz',
    resolutionId: '16:9',
    background: { type: 'procedural', color: '#2e1065', proceduralStyle: 'plasma', intensity: 0.4 },
    colors: { text: '#f3e8ff', active: '#d8b4fe', secondary: '#6b21a8' },
    font: { family: 'Lobster', weight: '400', italic: false },
    animation: { entrance: 'fade', active: 'wave', exit: 'blur' },
    audioReactivity: { enabled: true, sensitivity: 0.8, visualizerStyle: 'none' },
    effects: { glow: 0.7, blur: true, chromaticAberration: false, vignette: true, scanlines: false, filmGrain: true, mirror: false, invert: false, barrelDistortion: false },
    particles: { enabled: true, count: 40, speed: 0.5, shape: 'note', color: ['#d8b4fe', '#f3e8ff'] },
    camera: { shake: false, zoomBeat: true, rotate: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'glitch-horror',
    name: 'Glitch Horror',
    resolutionId: '16:9',
    background: { type: 'solid', color: '#000000' },
    colors: { text: '#ff0000', active: '#ffffff', secondary: '#500000' },
    font: { family: 'Anton', weight: '400', italic: false },
    animation: { entrance: 'glitch', active: 'jitter', exit: 'glitch' },
    audioReactivity: { enabled: true, sensitivity: 1.5, visualizerStyle: 'shockwave' },
    effects: { glow: 0.3, blur: false, chromaticAberration: true, vignette: true, scanlines: true, filmGrain: true, mirror: true, invert: false, barrelDistortion: true },
    particles: { enabled: false, count: 0, speed: 0, shape: 'circle', color: [] },
    camera: { shake: true, zoomBeat: false, rotate: true },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  // --- NEW TEMPLATES BELOW ---
  {
    id: 'neon-noir',
    name: 'Neon Noir',
    resolutionId: '16:9',
    background: { type: 'procedural', color: '#0f0f0f', proceduralStyle: 'tunnel', intensity: 0.5 },
    colors: { text: '#ffffff', active: '#ef4444', secondary: '#3b82f6' },
    font: { family: 'Playfair Display', weight: '700', italic: true },
    animation: { entrance: 'fade', active: 'neon', exit: 'blur' },
    audioReactivity: { enabled: true, sensitivity: 1.2, visualizerStyle: 'shockwave' },
    effects: { glow: 0.9, blur: true, chromaticAberration: true, vignette: true, scanlines: false, filmGrain: true, mirror: true, invert: false, barrelDistortion: false },
    particles: { enabled: true, count: 100, speed: 2.0, shape: 'circle', color: ['#ef4444', '#ffffff', '#000000'] },
    camera: { shake: true, zoomBeat: true, rotate: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'cyber-zen',
    name: 'Cyber Zen',
    resolutionId: '16:9',
    background: { type: 'procedural', color: '#1a0b2e', proceduralStyle: 'grid', intensity: 0.3 },
    colors: { text: '#d8b4fe', active: '#22d3ee', secondary: '#c084fc' },
    font: { family: 'Montserrat', weight: '300', italic: false },
    animation: { entrance: 'slide', active: 'wave', exit: 'zoom' },
    audioReactivity: { enabled: true, sensitivity: 0.7, visualizerStyle: 'orb' },
    effects: { glow: 0.8, blur: false, chromaticAberration: false, vignette: true, scanlines: false, filmGrain: false, mirror: false, invert: false, barrelDistortion: false },
    particles: { enabled: true, count: 50, speed: 0.3, shape: 'hexagon', color: ['#22d3ee', '#c084fc'] },
    camera: { shake: false, zoomBeat: true, rotate: true },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'hacker-terminal',
    name: 'Hacker Terminal',
    resolutionId: '16:9',
    background: { type: 'solid', color: '#000000' },
    colors: { text: '#22c55e', active: '#86efac', secondary: '#14532d' },
    font: { family: 'Press Start 2P', weight: '400', italic: false },
    animation: { entrance: 'typewriter', active: 'jitter', exit: 'glitch' },
    audioReactivity: { enabled: true, sensitivity: 1.0, visualizerStyle: 'spectrum' },
    effects: { glow: 0.4, blur: false, chromaticAberration: false, vignette: true, scanlines: true, filmGrain: true, mirror: false, invert: false, barrelDistortion: false },
    particles: { enabled: false, count: 0, speed: 0, shape: 'square', color: [] },
    camera: { shake: true, zoomBeat: false, rotate: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'electric-dreams',
    name: 'Electric Dreams',
    resolutionId: '9:16',
    background: { type: 'procedural', color: '#1e1b4b', proceduralStyle: 'plasma', intensity: 1.2 },
    colors: { text: '#ffffff', active: '#f472b6', secondary: '#3b82f6' },
    font: { family: 'Permanent Marker', weight: '400', italic: false },
    animation: { entrance: 'slam', active: 'bounce', exit: 'slide' },
    audioReactivity: { enabled: true, sensitivity: 1.4, visualizerStyle: 'shockwave' },
    effects: { glow: 1.0, blur: true, chromaticAberration: true, vignette: false, scanlines: false, filmGrain: false, mirror: false, invert: true, barrelDistortion: false },
    particles: { enabled: true, count: 80, speed: 2.5, shape: 'star', color: ['#f472b6', '#3b82f6', '#ffff00'] },
    camera: { shake: true, zoomBeat: true, rotate: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'night-city',
    name: 'Night City',
    resolutionId: '16:9',
    background: { type: 'procedural', color: '#020617', proceduralStyle: 'stars', intensity: 2.0 },
    colors: { text: '#facc15', active: '#06b6d4', secondary: '#ec4899' },
    font: { family: 'Anton', weight: '400', italic: false },
    animation: { entrance: 'zoom', active: 'rotate', exit: 'slide' },
    audioReactivity: { enabled: true, sensitivity: 0.9, visualizerStyle: 'orb' },
    effects: { glow: 0.6, blur: true, chromaticAberration: true, vignette: true, scanlines: false, filmGrain: true, mirror: false, invert: false, barrelDistortion: true },
    particles: { enabled: true, count: 120, speed: 3.0, shape: 'triangle', color: ['#06b6d4', '#ec4899', '#facc15'] },
    camera: { shake: false, zoomBeat: true, rotate: true },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  }
];