
import { LyricData, RendererConfig } from "./types";

export const DEFAULT_LYRICS: LyricData = {
  "createdAt": "2025-11-29T01:23:00.207Z",
  "segments": [
    {
      "id": "0",
      "start": 0,
      "end": 12.76,
      "text": "SON LAS TRES\nY DIEZ DE LA\nMAÑANA",
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
      "words": [
        { "word": "EXACTA", "start": 19.759, "end": 20.72, "probability": 0.99, "line_number": 3 }
      ]
    },
    {
      "id": "5",
      "start": 20.72,
      "end": 22.8,
      "text": "CADA EMOJI\nES UN CÓDIGO\nQUE INTENTO",
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

export const TEMPLATES: RendererConfig[] = [
  {
    id: 'neon-night',
    name: 'Neon Night',
    colors: {
      background: '#050505',
      text: '#ffffff',
      active: '#22d3ee', // Cyan
      secondary: '#a855f7' // Purple
    },
    animation: {
      entrance: 'slide',
      active: 'neon',
      exit: 'fade'
    },
    effects: {
      glow: 0.8,
      blur: true,
      chromaticAberration: true,
      vignette: true,
      scanlines: false,
      filmGrain: false
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
    }
  },
  {
    id: 'cyber-glitch',
    name: 'Cyber Glitch',
    colors: {
      background: '#000000',
      text: '#e2e8f0',
      active: '#00ff00', // Matrix Green
      secondary: '#ff0000' // Red
    },
    animation: {
      entrance: 'typewriter',
      active: 'jitter',
      exit: 'slam'
    },
    effects: {
      glow: 0.4,
      blur: false,
      chromaticAberration: true,
      vignette: true,
      scanlines: true,
      filmGrain: true
    },
    particles: {
      enabled: true,
      count: 80,
      speed: 3.0,
      shape: 'square',
      color: ['#00ff00', '#003300', '#ffffff']
    },
    camera: {
      shake: true,
      zoomBeat: false,
      rotate: false
    }
  },
  {
    id: 'bubble-pop',
    name: 'Bubble Pop',
    colors: {
      background: '#fff7ed', // Orange 50
      text: '#4c1d95', // Violet 900
      active: '#db2777', // Pink 600
      secondary: '#fbbf24' // Amber 400
    },
    animation: {
      entrance: 'slam',
      active: 'bounce',
      exit: 'zoom'
    },
    effects: {
      glow: 0.0,
      blur: false,
      chromaticAberration: false,
      vignette: false,
      scanlines: false,
      filmGrain: false
    },
    particles: {
      enabled: true,
      count: 50,
      speed: 0.5,
      shape: 'circle',
      color: ['#db2777', '#fbbf24', '#3b82f6', '#f472b6']
    },
    camera: {
      shake: false,
      zoomBeat: true,
      rotate: true
    }
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    colors: {
      background: '#ffffff',
      text: '#171717',
      active: '#000000',
      secondary: '#737373'
    },
    animation: {
      entrance: 'fade',
      active: 'pulse',
      exit: 'fade'
    },
    effects: {
      glow: 0.0,
      blur: false,
      chromaticAberration: false,
      vignette: false,
      scanlines: false,
      filmGrain: true
    },
    particles: {
      enabled: false,
      count: 0,
      speed: 0,
      shape: 'circle',
      color: []
    },
    camera: {
      shake: false,
      zoomBeat: false,
      rotate: false
    }
  }
];
