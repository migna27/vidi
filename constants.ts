

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
      count: 150,
      speed: 1.0,
      shape: 'circle',
      color: ['#22d3ee', '#a855f7', '#ffffff', '#38bdf8', '#c084fc']
    },
    camera: {
      shake: true,
      zoomBeat: true,
      rotate: true,
      sway: false,
      hardKick: false,
      panic: false
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
    id: 'vhs-horror',
    name: 'VHS Horror',
    resolutionId: '16:9',
    background: { type: 'solid', color: '#000000' },
    colors: { text: '#b0b0b0', active: '#ff0000', secondary: '#500000' },
    font: { family: 'Cinzel', weight: '700', italic: false },
    animation: { entrance: 'typewriter', active: 'shiver', exit: 'burn' },
    audioReactivity: { enabled: true, sensitivity: 1.2, visualizerStyle: 'none' },
    effects: { 
      glow: 0.3, blur: true, chromaticAberration: true, vignette: true, scanlines: true, 
      filmGrain: true, mirror: false, invert: false, barrelDistortion: true, mosaic: false,
      sepia: false, grayscale: false, oldMovie: true, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: false, count: 0, speed: 0, shape: 'circle', color: [] },
    camera: { shake: true, zoomBeat: false, rotate: false, sway: false, hardKick: true, panic: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'abyssal-void',
    name: 'Abyssal Void',
    resolutionId: '16:9',
    background: { type: 'procedural', color: '#020617', proceduralStyle: 'plasma', intensity: 0.3 },
    colors: { text: '#94a3b8', active: '#38bdf8', secondary: '#1e293b' },
    font: { family: 'Montserrat', weight: '400', italic: false },
    animation: { entrance: 'sink', active: 'float', exit: 'sink' },
    audioReactivity: { enabled: true, sensitivity: 0.8, visualizerStyle: 'orb' },
    effects: { 
      glow: 1.0, blur: true, chromaticAberration: false, vignette: true, scanlines: false, 
      filmGrain: false, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 100, speed: 0.2, shape: 'circle', color: ['#0f172a', '#38bdf8', '#020617'] },
    camera: { shake: false, zoomBeat: true, rotate: false, sway: true, hardKick: false, panic: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'toxic-waste',
    name: 'Toxic Waste',
    resolutionId: '16:9',
    background: { type: 'solid', color: '#000000' },
    colors: { text: '#a3e635', active: '#facc15', secondary: '#3f6212' },
    font: { family: 'Oswald', weight: '700', italic: false },
    animation: { entrance: 'inflate', active: 'jitter', exit: 'glitch' },
    audioReactivity: { enabled: true, sensitivity: 1.5, visualizerStyle: 'shockwave' },
    effects: { 
      glow: 0.7, blur: false, chromaticAberration: true, vignette: true, scanlines: false, 
      filmGrain: true, mirror: false, invert: true, barrelDistortion: true, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 80, speed: 2.5, shape: 'hexagon', color: ['#a3e635', '#facc15'] },
    camera: { shake: true, zoomBeat: true, rotate: false, sway: false, hardKick: true, panic: true },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
      id: 'paper-cutout',
      name: 'Paper Cutout',
      resolutionId: '4:5',
      background: { type: 'solid', color: '#f5f5f4' },
      colors: { text: '#1c1917', active: '#000000', secondary: '#44403c' },
      font: { family: 'Permanent Marker', weight: '400', italic: false },
      animation: { entrance: 'drop', active: 'swing', exit: 'drop' },
      audioReactivity: { enabled: true, sensitivity: 0.5, visualizerStyle: 'none' },
      effects: { 
          glow: 0, blur: false, chromaticAberration: false, vignette: true, scanlines: false, 
          filmGrain: true, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
          sepia: true, grayscale: false, oldMovie: false, halftone: true, kaleidoscope: false, rgbSplit: false
      },
      particles: { enabled: false, count: 0, speed: 0, shape: 'circle', color: [] },
      camera: { shake: false, zoomBeat: false, rotate: false, sway: true, hardKick: false, panic: false },
      sectionStyles: DEFAULT_SECTION_STYLES,
      keyframes: []
  },
  {
      id: 'strobe-club',
      name: 'Strobe Club',
      resolutionId: '1:1',
      background: { type: 'solid', color: '#000000' },
      colors: { text: '#ffffff', active: '#ffffff', secondary: '#888888' },
      font: { family: 'Anton', weight: '900', italic: false },
      animation: { entrance: 'slam', active: 'flash', exit: 'slam' },
      audioReactivity: { enabled: true, sensitivity: 2.0, visualizerStyle: 'shockwave' },
      effects: { 
          glow: 0.2, blur: false, chromaticAberration: false, vignette: false, scanlines: false, 
          filmGrain: false, mirror: false, invert: true, barrelDistortion: false, mosaic: false,
          sepia: false, grayscale: true, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: true
      },
      particles: { enabled: false, count: 0, speed: 0, shape: 'circle', color: [] },
      camera: { shake: true, zoomBeat: true, rotate: false, sway: false, hardKick: true, panic: false },
      sectionStyles: DEFAULT_SECTION_STYLES,
      keyframes: []
  },
  {
    id: 'vaporwave-aesthetic',
    name: 'Vaporwave',
    resolutionId: '16:9',
    background: { type: 'procedural', color: '#ff71ce', proceduralStyle: 'grid', intensity: 0.6 },
    colors: { text: '#01cdfe', active: '#fffb96', secondary: '#b967ff' },
    font: { family: 'Pacifico', weight: '400', italic: false },
    animation: { entrance: 'stretch', active: 'wave', exit: 'blur' },
    audioReactivity: { enabled: true, sensitivity: 0.8, visualizerStyle: 'spectrum' },
    effects: { 
      glow: 0.7, blur: true, chromaticAberration: true, vignette: true, scanlines: true, 
      filmGrain: true, mirror: false, invert: false, barrelDistortion: true, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: true
    },
    particles: { enabled: true, count: 40, speed: 0.5, shape: 'square', color: ['#01cdfe', '#b967ff', '#fffb96'] },
    camera: { shake: false, zoomBeat: true, rotate: false, sway: true, hardKick: false, panic: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
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
      entrance: 'scramble',
      active: 'jitter',
      exit: 'slam'
    },
    audioReactivity: {
      enabled: true,
      sensitivity: 1.2,
      visualizerStyle: 'shockwave'
    },
    effects: {
      glow: 0.4, blur: false, chromaticAberration: true, vignette: true, scanlines: true,
      filmGrain: true, mirror: false, invert: true, barrelDistortion: false, mosaic: true,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
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
      rotate: false,
      sway: false,
      hardKick: true,
      panic: false
    },
    sectionStyles: { ...DEFAULT_SECTION_STYLES, chorus: { enabled: true, colors_active: '#ff0000', camera_zoom_boost: 0.1 }},
    keyframes: []
  },
  {
    id: 'vintage-film',
    name: 'Vintage Film',
    resolutionId: '16:9',
    background: { type: 'solid', color: '#1a1005' },
    colors: { text: '#d6c4a8', active: '#ffffff', secondary: '#8a6e45' },
    font: { family: 'Playfair Display', weight: '700', italic: true },
    animation: { entrance: 'blur', active: 'pulse', exit: 'fade' },
    audioReactivity: { enabled: true, sensitivity: 0.6, visualizerStyle: 'none' },
    effects: { 
      glow: 0.3, blur: true, chromaticAberration: false, vignette: true, scanlines: true, 
      filmGrain: true, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: true, grayscale: false, oldMovie: true, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 20, speed: 0.2, shape: 'circle', color: ['#ffffff', '#d6c4a8'] },
    camera: { shake: true, zoomBeat: false, rotate: false, sway: true, hardKick: false, panic: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'hyper-kinetic',
    name: 'Hyper Kinetic',
    resolutionId: '9:16',
    background: { type: 'solid', color: '#facc15' }, // Yellow
    colors: { text: '#000000', active: '#ffffff', secondary: '#000000' },
    font: { family: 'Anton', weight: '900', italic: false },
    animation: { entrance: 'slam', active: 'pop', exit: 'drop' },
    audioReactivity: { enabled: true, sensitivity: 1.5, visualizerStyle: 'shockwave' },
    effects: { 
      glow: 0, blur: false, chromaticAberration: true, vignette: false, scanlines: false, 
      filmGrain: false, mirror: true, invert: true, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: true, oldMovie: false, halftone: false, kaleidoscope: true, rgbSplit: false
    },
    particles: { enabled: true, count: 50, speed: 3.0, shape: 'triangle', color: ['#000000', '#ffffff'] },
    camera: { shake: true, zoomBeat: true, rotate: false, sway: false, hardKick: true, panic: true },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'corporate-clean',
    name: 'Corporate Clean',
    resolutionId: '16:9',
    background: { type: 'solid', color: '#ffffff' },
    colors: { text: '#1e293b', active: '#3b82f6', secondary: '#94a3b8' },
    font: { family: 'Montserrat', weight: '700', italic: false },
    animation: { entrance: 'slide', active: 'pulse', exit: 'slide' },
    audioReactivity: { enabled: true, sensitivity: 0.5, visualizerStyle: 'none' },
    effects: { 
      glow: 0, blur: false, chromaticAberration: false, vignette: false, scanlines: false, 
      filmGrain: false, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: false, count: 0, speed: 0, shape: 'circle', color: [] },
    camera: { shake: false, zoomBeat: false, rotate: false, sway: true, hardKick: false, panic: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'gothic-realm',
    name: 'Gothic Realm',
    resolutionId: '16:9',
    background: { type: 'procedural', color: '#000000', proceduralStyle: 'tunnel', intensity: 0.2 },
    colors: { text: '#9ca3af', active: '#dc2626', secondary: '#4b5563' },
    font: { family: 'Cinzel', weight: '700', italic: false },
    animation: { entrance: 'fade', active: 'flash', exit: 'fade' },
    audioReactivity: { enabled: true, sensitivity: 1.0, visualizerStyle: 'shockwave' },
    effects: { 
      glow: 0.5, blur: true, chromaticAberration: false, vignette: true, scanlines: false, 
      filmGrain: true, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: true, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 100, speed: 0.5, shape: 'circle', color: ['#dc2626', '#333333'] },
    camera: { shake: false, zoomBeat: true, rotate: false, sway: true, hardKick: true, panic: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'starlight-ballad',
    name: 'Starlight Ballad',
    resolutionId: '16:9',
    background: { type: 'procedural', color: '#0f172a', proceduralStyle: 'stars', intensity: 0.2 },
    colors: { text: '#e2e8f0', active: '#ffffff', secondary: '#94a3b8' },
    font: { family: 'Playfair Display', weight: '400', italic: true },
    animation: { entrance: 'fade', active: 'float', exit: 'fade' },
    audioReactivity: { enabled: true, sensitivity: 0.8, visualizerStyle: 'orb' },
    effects: {
      glow: 0.6, blur: true, chromaticAberration: false, vignette: true, scanlines: false,
      filmGrain: true, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 200, speed: 0.1, shape: 'circle', color: ['#ffffff', '#94a3b8'] },
    camera: { shake: false, zoomBeat: false, rotate: true, sway: true, hardKick: false, panic: false },
    sectionStyles: { ...DEFAULT_SECTION_STYLES, chorus: { enabled: true, colors_active: '#e0f2fe', effects_glow_boost: 0.3 } },
    keyframes: []
  },
  {
    id: 'retro-arcade',
    name: 'Retro Arcade',
    resolutionId: '1:1',
    background: { type: 'solid', color: '#111111' },
    colors: { text: '#33ff00', active: '#ff00ff', secondary: '#00ffff' },
    font: { family: 'Press Start 2P', weight: '400', italic: false },
    animation: { entrance: 'typewriter', active: 'flash', exit: 'glitch' },
    audioReactivity: { enabled: true, sensitivity: 1.0, visualizerStyle: 'none' },
    effects: {
      glow: 0.4, blur: false, chromaticAberration: true, vignette: false, scanlines: true,
      filmGrain: false, mirror: false, invert: false, barrelDistortion: false, mosaic: true,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 50, speed: 2.0, shape: 'square', color: ['#33ff00', '#ff00ff'] },
    camera: { shake: true, zoomBeat: true, rotate: false, sway: false, hardKick: true, panic: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'tok-hype',
    name: 'Tok Hype',
    resolutionId: '9:16',
    background: { type: 'solid', color: '#000000' },
    colors: { text: '#ffffff', active: '#ffee00', secondary: '#ff0055' },
    font: { family: 'Montserrat', weight: '900', italic: false },
    animation: { entrance: 'elastic', active: 'bounce', exit: 'slide' },
    audioReactivity: { enabled: true, sensitivity: 1.4, visualizerStyle: 'shockwave' },
    effects: {
      glow: 0.2, blur: false, chromaticAberration: true, vignette: false, scanlines: false,
      filmGrain: false, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 80, speed: 3.0, shape: 'note', color: ['#ff0055', '#ffee00'] },
    camera: { shake: true, zoomBeat: true, rotate: false, sway: true, hardKick: true, panic: false },
    sectionStyles: { ...DEFAULT_SECTION_STYLES, chorus: { enabled: true, colors_active: '#00ffff', camera_zoom_boost: 0.15 } },
    keyframes: []
  },
  {
    id: 'crimson-heat',
    name: 'Crimson Heat',
    resolutionId: '16:9',
    background: { type: 'procedural', color: '#450a0a', proceduralStyle: 'plasma', intensity: 1.2 },
    colors: { text: '#fca5a5', active: '#ffffff', secondary: '#ef4444' },
    font: { family: 'Oswald', weight: '700', italic: false },
    animation: { entrance: 'slam', active: 'jitter', exit: 'blur' },
    audioReactivity: { enabled: true, sensitivity: 1.2, visualizerStyle: 'shockwave' },
    effects: {
      glow: 0.8, blur: true, chromaticAberration: true, vignette: true, scanlines: false,
      filmGrain: true, mirror: false, invert: false, barrelDistortion: true, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 60, speed: 4.0, shape: 'triangle', color: ['#ef4444', '#f87171', '#fee2e2'] },
    camera: { shake: true, zoomBeat: true, rotate: false, sway: false, hardKick: true, panic: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  },
  {
    id: 'lofi-chill',
    name: 'Lo-Fi Chill',
    resolutionId: '16:9',
    background: { type: 'procedural', color: '#4c1d95', proceduralStyle: 'plasma', intensity: 0.3 },
    colors: { text: '#ddd6fe', active: '#a78bfa', secondary: '#8b5cf6' },
    font: { family: 'Pacifico', weight: '400', italic: false },
    animation: { entrance: 'blur', active: 'wave', exit: 'fade' },
    audioReactivity: { enabled: true, sensitivity: 0.5, visualizerStyle: 'orb' },
    effects: {
      glow: 0.4, blur: true, chromaticAberration: true, vignette: true, scanlines: false,
      filmGrain: true, mirror: false, invert: false, barrelDistortion: false, mosaic: false,
      sepia: false, grayscale: false, oldMovie: false, halftone: false, kaleidoscope: false, rgbSplit: false
    },
    particles: { enabled: true, count: 30, speed: 0.2, shape: 'circle', color: ['#a78bfa', '#c4b5fd'] },
    camera: { shake: false, zoomBeat: false, rotate: false, sway: true, hardKick: false, panic: false },
    sectionStyles: DEFAULT_SECTION_STYLES,
    keyframes: []
  }
];