

import React, { useRef, useEffect, useLayoutEffect, useImperativeHandle, forwardRef } from 'react';
import { LyricData, Word, AudioVisualizerData, RendererConfig, ParticleShape, AnimationKeyframe, SectionType, ImageEffect, AnimationStyle, ActiveStyle } from '../types';
import { RESOLUTIONS } from '../constants';

interface CanvasVideoRendererProps {
  data: LyricData;
  config: RendererConfig;
  isPlaying: boolean;
}

export interface CanvasVideoRendererRef {
  drawFrame: (time: number, analysisData: AudioVisualizerData, isAlphaRender?: boolean) => void;
  seekToTime: (time: number) => Promise<void>;
  canvas: HTMLCanvasElement | null;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  size: number;
  color: string;
  alpha: number;
  phase: number;
  angle: number; 
  life: number;
  maxLife: number;
  tetrominoType?: number;
  rotationIndex?: number;
}

interface Shockwave {
    id: number;
    x: number;
    y: number;
    radius: number;
    alpha: number;
    color: string;
}

// Math Helpers
const lerp = (start: number, end: number, t: number) => {
    return start * (1 - t) + end * t;
};

const easeOutElastic = (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

const easeOutBack = (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// Hex to RGB
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

// RGB to Hex
const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
};

// Lerp Color
const lerpColor = (start: string, end: string, t: number) => {
    const s = hexToRgb(start);
    const e = hexToRgb(end);
    const r = lerp(s.r, e.r, t);
    const g = lerp(s.g, e.g, t);
    const b = lerp(s.b, e.b, t);
    return rgbToHex(r, g, b);
};

// Random Character Generator
const getRandomChar = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    return chars.charAt(Math.floor(Math.random() * chars.length));
};

// Deterministic Random for animations
const getDeterministicRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

// Helper: Pick random animation
const getRandomAnimation = (seed: number, type: 'entrance' | 'active'): string => {
    const entranceOptions: AnimationStyle[] = ['fade', 'slide', 'slam', 'zoom', 'typewriter', 'spin', 'blur', 'glitch', 'elastic', 'drop', 'scramble', 'spiral', 'inflate'];
    const activeOptions: ActiveStyle[] = ['pulse', 'jitter', 'bounce', 'neon', 'wave', 'rotate', 'skew', 'pop', 'flash', 'float', 'shiver', 'rainbow', 'heartbeat', 'swing', 'glitch-shake'];
    
    if (type === 'entrance') {
        const idx = Math.floor(getDeterministicRandom(seed) * entranceOptions.length);
        return entranceOptions[idx];
    } else {
        const idx = Math.floor(getDeterministicRandom(seed + 100) * activeOptions.length);
        return activeOptions[idx];
    }
};

// Tetromino Definitions (Simple matrices)
const TETROMINOS = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 1, 0], [0, 1, 1]], // S
    [[0, 1, 1], [1, 1, 0]], // Z
    [[1, 0, 0], [1, 1, 1]], // J
    [[0, 0, 1], [1, 1, 1]]  // L
];

// --- PROCEDURAL BACKGROUND DRAWING FUNCTIONS ---

const drawGrid = (ctx: CanvasRenderingContext2D, time: number, color: string, speed: number, w: number, h: number, audio: AudioVisualizerData) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + (audio.bass * 2);
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    
    const horizon = h * 0.55;
    const centerX = w / 2;
    
    for (let i = -10; i <= 10; i++) {
        const x = centerX + (i * 200);
        ctx.beginPath();
        ctx.moveTo(centerX, horizon);
        ctx.lineTo(x + (i * 300) + (Math.sin(time + i)*audio.mid*50), h);
        ctx.stroke();
    }
    
    const offset = (time * 200 * speed) % 100;
    for(let y = horizon; y < h; y += 20 + ((y-horizon)*0.1)) {
        const moveY = y + offset;
        if(moveY > h) continue;
        
        ctx.beginPath();
        ctx.moveTo(0, moveY);
        ctx.lineTo(w, moveY);
        ctx.stroke();
    }
    
    const grad = ctx.createLinearGradient(0, horizon, 0, h);
    grad.addColorStop(0, color);
    grad.addColorStop(0.2, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, horizon, w, h - horizon);

    ctx.restore();
};

const drawPlasma = (ctx: CanvasRenderingContext2D, time: number, color: string, speed: number, w: number, h: number, audio: AudioVisualizerData) => {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    const count = 5;
    const pulse = 1 + (audio.bass * 0.5);
    
    for(let i=0; i<count; i++) {
        const t = time * speed + i;
        const x = w/2 + Math.sin(t) * (w * 0.2);
        const y = h/2 + Math.cos(t * 1.3) * (h * 0.15);
        const r = ((w * 0.15) + Math.sin(t * 0.5) * 100) * pulse;
        
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grad;
        ctx.fillRect(0,0, w, h);
    }
    ctx.restore();
};

const drawStars = (ctx: CanvasRenderingContext2D, time: number, color: string, speed: number, w: number, h: number, audio: AudioVisualizerData) => {
    ctx.save();
    ctx.fillStyle = color;
    const starCount = 200;
    const cx = w / 2;
    const cy = h / 2;
    const warpSpeed = speed * (1 + audio.high * 5);
    
    for(let i=0; i<starCount; i++) {
        let x = (Math.sin(i * 132.1) * w);
        let y = (Math.cos(i * 53.7) * h);
        let z = (i * 10 + (time * 500 * warpSpeed)) % 2000;
        
        if (z < 1) z = 1;
        const perspective = 500 / z;
        const sx = cx + x * perspective;
        const sy = cy + y * perspective;
        const size = (1 - z/2000) * 4 * (1 + audio.mid);
        
        if (sx > 0 && sx < w && sy > 0 && sy < h) {
             ctx.globalAlpha = 1 - z/2000;
             ctx.beginPath();
             ctx.arc(sx, sy, size, 0, Math.PI * 2);
             ctx.fill();
        }
    }
    ctx.restore();
};

const drawTunnel = (ctx: CanvasRenderingContext2D, time: number, color: string, speed: number, w: number, h: number, audio: AudioVisualizerData) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 + audio.bass * 5;
    const cx = w / 2;
    const cy = h / 2;
    
    const count = 15;
    const offset = (time * speed) % 1;
    const maxDim = Math.max(w, h);
    const rotate = Math.sin(time * 0.2) * audio.bass;

    ctx.translate(cx, cy);
    ctx.rotate(rotate);
    ctx.translate(-cx, -cy);

    for(let i=0; i<count; i++) {
        const progress = (i + offset) / count;
        const scale = Math.pow(progress, 3) * maxDim;
        
        ctx.globalAlpha = progress;
        ctx.beginPath();
        ctx.rect(cx - scale/2, cy - scale/2, scale, scale);
        ctx.stroke();
        
        if (i === count - 1) {
            ctx.beginPath();
            ctx.moveTo(0,0); ctx.lineTo(cx, cy);
            ctx.moveTo(w, 0); ctx.lineTo(cx, cy);
            ctx.moveTo(0, h); ctx.lineTo(cx, cy);
            ctx.moveTo(w, h); ctx.lineTo(cx, cy);
            ctx.stroke();
        }
    }
    ctx.restore();
}

const drawMatrix = (ctx: CanvasRenderingContext2D, time: number, color: string, speed: number, w: number, h: number, audio: AudioVisualizerData) => {
    ctx.save();
    ctx.fillStyle = color;
    
    const fontSize = Math.floor(w / 40); 
    ctx.font = `${fontSize}px monospace`;
    const columns = Math.ceil(w / fontSize);
    
    for(let i=0; i<columns; i++) {
        const randomFactor = Math.abs(Math.sin(i * 123.45));
        const colSpeed = (randomFactor * 0.5 + 1.0) * speed * 250; 
        const offset = Math.cos(i * 67.89) * h;
        
        let y = (time * colSpeed + offset) % (h + 300);
        if (y < 0) y += h + 300;
        y -= 300; 
        
        if (audio.bass > 0.8 && Math.random() > 0.9) {
            y += (Math.random() - 0.5) * 50;
        }

        const charCount = 8 + Math.floor(randomFactor * 6);
        
        for(let j=0; j<charCount; j++) {
            const charY = y - (j * fontSize);
            if (charY > -fontSize && charY < h + fontSize) {
                ctx.globalAlpha = (1 - (j / charCount)) * 0.7;
                const charCode = 0x30A0 + ((Math.floor(time * i) + j) % 90); 
                const char = String.fromCharCode(charCode);
                ctx.fillText(char, i * fontSize, charY);
            }
        }
    }
    ctx.restore();
}

const drawGradientWave = (ctx: CanvasRenderingContext2D, time: number, color: string, accentColor: string, speed: number, w: number, h: number, audio: AudioVisualizerData) => {
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, accentColor);
    grad.addColorStop(1, color);
    
    const layers = 5;
    const baseAmp = h * 0.1;
    const beatAmp = audio.bass * h * 0.2;
    
    for(let i=0; i<layers; i++) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        
        const layerColor = i % 2 === 0 ? color : accentColor;
        ctx.fillStyle = layerColor;
        ctx.globalAlpha = 0.3;
        
        const layerSpeed = speed * (i + 1) * 0.5;
        const phase = i * 2;
        
        for(let x=0; x <= w; x += 20) {
            const yOffset = Math.sin((x * 0.01) + (time * layerSpeed) + phase) * (baseAmp + beatAmp);
            const yBase = h * (0.3 + (i * 0.15));
            ctx.lineTo(x, yBase + yOffset);
        }
        
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fill();
    }
    ctx.restore();
};

const drawHexagons = (ctx: CanvasRenderingContext2D, time: number, color: string, accentColor: string, speed: number, w: number, h: number, audio: AudioVisualizerData) => {
    ctx.save();
    const size = 40 + (audio.bass * 10);
    const hexH = size * 2;
    const hexW = Math.sqrt(3) * size;
    const vertDist = hexH * 0.75;
    
    ctx.lineWidth = 1;
    
    const rows = Math.ceil(h / vertDist) + 1;
    const cols = Math.ceil(w / hexW) + 1;
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const xOffset = (r % 2) * (hexW / 2);
            const cx = (c * hexW) + xOffset;
            const cy = r * vertDist;
            
            const noise = Math.sin(c * 0.5 + time * speed) * Math.cos(r * 0.5 + time * speed);
            const active = noise > 0.5 || (audio.mid > 0.6 && Math.random() > 0.8);
            
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = 2 * Math.PI / 6 * i;
                const px = cx + size * Math.cos(angle);
                const py = cy + size * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            
            if (active) {
                ctx.fillStyle = accentColor;
                ctx.globalAlpha = 0.2 + (audio.mid * 0.5);
                ctx.fill();
                ctx.strokeStyle = accentColor;
                ctx.globalAlpha = 0.8;
                ctx.stroke();
            } else {
                ctx.strokeStyle = color;
                ctx.globalAlpha = 0.1;
                ctx.stroke();
            }
        }
    }
    ctx.restore();
};

const drawKaleidoscope = (ctx: CanvasRenderingContext2D, time: number, color: string, accentColor: string, speed: number, w: number, h: number, audio: AudioVisualizerData) => {
    ctx.save();
    ctx.translate(w/2, h/2);
    
    const segments = 8;
    const angleStep = (Math.PI * 2) / segments;
    const rotation = time * speed * 0.5;
    
    const scale = 1 + (audio.bass * 0.2);
    ctx.scale(scale, scale);
    
    for(let i=0; i<segments; i++) {
        ctx.save();
        ctx.rotate((i * angleStep) + rotation);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w/2, 50 + (audio.mid * 100));
        ctx.lineTo(w/2, -50 - (audio.mid * 100));
        ctx.closePath();
        
        const grad = ctx.createLinearGradient(0,0, w/2, 0);
        grad.addColorStop(0, color);
        grad.addColorStop(1, accentColor);
        
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(100 + audio.high * 50, 0, 20, 0, Math.PI * 2);
        ctx.strokeStyle = accentColor;
        ctx.stroke();
        
        ctx.restore();
    }
    ctx.restore();
};

const drawDNA = (ctx: CanvasRenderingContext2D, time: number, color: string, accentColor: string, speed: number, w: number, h: number, audio: AudioVisualizerData) => {
    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.rotate(Math.PI / 4);
    
    const len = Math.max(w, h) * 1.5;
    const points = 40;
    const spacing = len / points;
    
    const strandWidth = 100 + (audio.bass * 50);
    const t = time * speed * 2;
    
    for(let i = -points/2; i < points/2; i++) {
        const x = i * spacing;
        const angle = (i * 0.5) + t;
        
        const y1 = Math.sin(angle) * strandWidth;
        const y2 = Math.sin(angle + Math.PI) * strandWidth;
        
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        const size = 5 + (audio.mid * 5);
        
        ctx.beginPath();
        ctx.arc(x, y1, size, 0, Math.PI*2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x, y2, size, 0, Math.PI*2);
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.8;
        ctx.fill();
    }
    
    ctx.restore();
};

// Helper: Pattern Caches
let scanlinePattern: CanvasPattern | null = null;
const getScanlinePattern = (ctx: CanvasRenderingContext2D) => {
    if (!scanlinePattern) {
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 1;
        pCanvas.height = 4;
        const pCtx = pCanvas.getContext('2d');
        if (pCtx) {
            pCtx.fillStyle = 'rgba(0,0,0,0.3)';
            pCtx.fillRect(0, 0, 1, 2); 
            scanlinePattern = ctx.createPattern(pCanvas, 'repeat');
        }
    }
    return scanlinePattern;
};

let noisePattern: CanvasPattern | null = null;
const getNoisePattern = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (!noisePattern) {
        const pCanvas = document.createElement('canvas');
        const size = 100;
        pCanvas.width = size;
        pCanvas.height = size;
        const pCtx = pCanvas.getContext('2d');
        if (pCtx) {
            const imageData = pCtx.createImageData(size, size);
            for (let i = 0; i < imageData.data.length; i += 4) {
                const val = Math.random() * 255;
                imageData.data[i] = val;
                imageData.data[i+1] = val;
                imageData.data[i+2] = val;
                imageData.data[i+3] = 255;
            }
            pCtx.putImageData(imageData, 0, 0);
            noisePattern = ctx.createPattern(pCanvas, 'repeat');
        }
    }
    return noisePattern;
};


// Shape Drawing Helpers
const drawPolygon = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, rotation: number) => {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = rotation + (i * 2 * Math.PI) / sides;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
};

const drawNote = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.font = `${size * 2}px Arial`;
    ctx.fillText('♪', x, y);
}

const drawAlertIcon = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number, bass: number) => {
    const size = Math.min(w, h) * 0.4;
    const cx = w / 2;
    const cy = h / 2;
    
    const pulse = 1 + (Math.sin(time * 15) * 0.1) + (bass * 0.1);
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    
    ctx.beginPath();
    ctx.moveTo(0, -size/2);
    ctx.lineTo(size/2, size/2);
    ctx.lineTo(-size/2, size/2);
    ctx.closePath();
    
    ctx.shadowBlur = 40 + (bass * 40);
    ctx.shadowColor = '#ff0000';
    
    ctx.fillStyle = 'rgba(50, 0, 0, 0.8)';
    ctx.fill();
    
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#ff0000';
    ctx.stroke();
    
    ctx.fillStyle = '#ff0000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${size * 0.6}px Arial`;
    ctx.shadowBlur = 0;
    ctx.fillText('!', 0, size * 0.1);
    
    ctx.restore();
};

export const CanvasVideoRenderer = forwardRef<CanvasVideoRendererRef, CanvasVideoRendererProps>(({
  data,
  config,
  isPlaying
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordsByLineCache = useRef<Map<string, Word[][]>>(new Map());
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const lastTimeRef = useRef<number>(0);
  const lastFlashTimeRef = useRef<number>(0); 
  const wordPositionsCache = useRef<Map<string, { x: number, y: number }>>(new Map());
  const screenPumpState = useRef({ intensity: 0 });
  
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  useLayoutEffect(() => {
    wordsByLineCache.current.clear();
    wordPositionsCache.current.clear();
  }, [data]);

  const currentResolution = RESOLUTIONS.find(r => r.id === config.resolutionId) || RESOLUTIONS[0];
  const CANVAS_WIDTH = currentResolution.width;
  const CANVAS_HEIGHT = currentResolution.height;

  useEffect(() => {
    if (config.background.type === 'image' && config.background.url) {
        if (bgImageRef.current?.src !== config.background.url) {
             const img = new Image();
             img.crossOrigin = "anonymous";
             img.src = config.background.url;
             bgImageRef.current = img;
        }
    } else {
        bgImageRef.current = null;
    }

    if (config.background.type === 'video' && config.background.url) {
         if (bgVideoRef.current?.src !== config.background.url) {
             const vid = document.createElement('video');
             vid.crossOrigin = "anonymous";
             vid.src = config.background.url;
             vid.loop = true;
             vid.muted = true;
             vid.playsInline = true;
             // @ts-ignore
             vid.webkitPlaysInline = true;
             vid.preload = "auto";
             vid.load();
             bgVideoRef.current = vid;
         }
    } else {
        if(bgVideoRef.current) {
            bgVideoRef.current.pause();
            bgVideoRef.current.src = ""; 
            bgVideoRef.current = null;
        }
    }
  }, [config.background.type, config.background.url]);

  useImperativeHandle(ref, () => ({
    canvas: canvasRef.current,
    drawFrame: (time, analysis, isAlphaRender) => {
       drawScene(time, analysis, isAlphaRender);
    },
    seekToTime: async (time: number) => {
        if (bgVideoRef.current && config.background.type === 'video') {
            const vid = bgVideoRef.current;
            if (vid.readyState >= 2) {
                const playbackSpeed = config.background.playbackSpeed || 1.0;
                const vidDuration = vid.duration || 1;
                const scaledTime = time * playbackSpeed;
                const targetTime = scaledTime % vidDuration;

                return new Promise<void>((resolve) => {
                    const onSeeked = () => {
                        vid.removeEventListener('seeked', onSeeked);
                        resolve();
                    };
                    vid.addEventListener('seeked', onSeeked);
                    vid.currentTime = targetTime;
                });
            }
        }
        return Promise.resolve();
    }
  }));

  useEffect(() => {
    const pCount = config.particles.enabled ? config.particles.count : 0;
    
    if (particlesRef.current.length !== pCount) {
        const newParticles: Particle[] = [];
        for (let i = 0; i < pCount; i++) {
            const maxLife = (Math.random() * 5) + 3;
            // Configurable size based on shape
            const isTetris = config.particles.shape === 'tetris';
            
            const newSpeed = config.particles.speed * ((Math.random() * 1) + 0.5);
            
            newParticles.push({
                id: i,
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                // Tetris: Fall straight down (vx=0, vy>0), others random drift
                vx: isTetris ? 0 : (Math.random() - 0.5) * config.particles.speed * 2,
                vy: isTetris ? (Math.random() * 2 + 3) * config.particles.speed : (Math.random() - 0.5) * config.particles.speed * 2,
                speed: newSpeed,
                // Tetris: Much larger (20-50), others small (2-6)
                size: isTetris ? (Math.random() * 30) + 20 : (Math.random() * 4) + 2,
                color: config.particles.color[Math.floor(Math.random() * config.particles.color.length)] || '#fff',
                alpha: Math.random() * 0.5 + 0.2,
                phase: Math.random() * Math.PI * 2,
                // Tetris Random Rotation: 0, 90, 180, 270 (0, PI/2, PI, 1.5PI)
                angle: isTetris ? (Math.floor(Math.random() * 4) * (Math.PI / 2)) : Math.random() * Math.PI * 2, 
                life: Math.random() * maxLife,
                maxLife: maxLife,
                tetrominoType: Math.floor(Math.random() * TETROMINOS.length),
                rotationIndex: Math.floor(Math.random() * 4)
            });
        }
        particlesRef.current = newParticles;
    } else {
        const isTetris = config.particles.shape === 'tetris';
        particlesRef.current.forEach(p => {
             const currentSpeed = Math.sqrt(p.vx*p.vx + p.vy*p.vy) || 0.1;
             const newSpeed = config.particles.speed * ((Math.random() * 1) + 0.5); 
             
             if (isTetris) {
                 p.vx = 0;
                 p.vy = (Math.random() * 2 + 3) * config.particles.speed;
                 p.size = (Math.random() * 30) + 20;
                 p.angle = (Math.floor(Math.random() * 4) * (Math.PI / 2));
             } else {
                 p.vx = (p.vx / currentSpeed) * newSpeed;
                 p.vy = (p.vy / currentSpeed) * newSpeed;
             }
             
             p.speed = newSpeed;
             if (!config.particles.color.includes(p.color)) {
                 p.color = config.particles.color[Math.floor(Math.random() * config.particles.color.length)] || '#fff';
             }
        });
    }

  }, [config.particles.count, config.particles.speed, config.particles.enabled, config.particles.color, CANVAS_WIDTH, CANVAS_HEIGHT, config.particles.shape]);

  const getLines = (segmentId: string, words: Word[]): Word[][] => {
    if (wordsByLineCache.current.has(segmentId)) {
      return wordsByLineCache.current.get(segmentId)!;
    }
    const linesMap: Record<number, Word[]> = {};
    words.forEach(w => {
      if (!linesMap[w.line_number]) linesMap[w.line_number] = [];
      linesMap[w.line_number].push(w);
    });
    const result = Object.values(linesMap);
    wordsByLineCache.current.set(segmentId, result);
    return result;
  };

  const drawScene = (time: number, analysis: AudioVisualizerData, isAlphaRender = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;
    const safeDt = Math.abs(dt) > 1.0 ? 0.016 : dt; 

    // --- EFFECTIVE CONFIG RESOLUTION ---
    let effectiveColorsActive = config.colors.active;
    let effectiveColorsText = config.colors.text;
    let effectiveBgColor = config.background.color;
    let effectiveGlow = config.effects.glow;
    let effectiveZoomOffset = 0;
    let effectiveRotateOffset = 0;
    
    let effectiveImageEffects: ImageEffect[] = config.background.imageEffects || [];
    let effectiveImageEffectSpeed = config.background.imageEffectSpeed || 1.0;

    const keyframes = config.keyframes || [];
    if (keyframes.length > 0) {
        let prevKeyframe: AnimationKeyframe | null = null;
        let nextKeyframe: AnimationKeyframe | null = null;

        for (let i = 0; i < keyframes.length; i++) {
            if (keyframes[i].time <= time) {
                prevKeyframe = keyframes[i];
            } else {
                nextKeyframe = keyframes[i];
                break;
            }
        }

        if (prevKeyframe && nextKeyframe) {
            const totalDuration = nextKeyframe.time - prevKeyframe.time;
            const elapsed = time - prevKeyframe.time;
            const t = Math.min(1, Math.max(0, elapsed / totalDuration));

            effectiveColorsActive = lerpColor(prevKeyframe.values.colors_active || config.colors.active, nextKeyframe.values.colors_active || config.colors.active, t);
             effectiveColorsText = lerpColor(prevKeyframe.values.colors_text || config.colors.text, nextKeyframe.values.colors_text || config.colors.text, t);
             effectiveBgColor = lerpColor(prevKeyframe.values.background_color || config.background.color, nextKeyframe.values.background_color || config.background.color, t);
             effectiveGlow = lerp(prevKeyframe.values.effects_glow ?? config.effects.glow, nextKeyframe.values.effects_glow ?? config.effects.glow, t);
             effectiveZoomOffset = lerp(prevKeyframe.values.camera_zoom || 0, nextKeyframe.values.camera_zoom || 0, t);
             effectiveRotateOffset = lerp(prevKeyframe.values.camera_rotate || 0, nextKeyframe.values.camera_rotate || 0, t);
             effectiveImageEffectSpeed = lerp(prevKeyframe.values.image_effect_speed ?? config.background.imageEffectSpeed ?? 1.0, nextKeyframe.values.image_effect_speed ?? config.background.imageEffectSpeed ?? 1.0, t);
             effectiveImageEffects = prevKeyframe.values.image_effects || config.background.imageEffects || [];
        } else if (prevKeyframe) {
             effectiveColorsActive = prevKeyframe.values.colors_active || config.colors.active;
             effectiveColorsText = prevKeyframe.values.colors_text || config.colors.text;
             effectiveBgColor = prevKeyframe.values.background_color || config.background.color;
             effectiveGlow = prevKeyframe.values.effects_glow ?? config.effects.glow;
             effectiveZoomOffset = prevKeyframe.values.camera_zoom || 0;
             effectiveRotateOffset = prevKeyframe.values.camera_rotate || 0;
             effectiveImageEffects = prevKeyframe.values.image_effects || config.background.imageEffects || [];
             effectiveImageEffectSpeed = prevKeyframe.values.image_effect_speed ?? config.background.imageEffectSpeed ?? 1.0;
        } else if (nextKeyframe) {
             const t = Math.min(1, Math.max(0, time / nextKeyframe.time));
             effectiveColorsActive = lerpColor(config.colors.active, nextKeyframe.values.colors_active || config.colors.active, t);
             effectiveColorsText = lerpColor(config.colors.text, nextKeyframe.values.colors_text || config.colors.text, t);
             effectiveBgColor = lerpColor(config.background.color, nextKeyframe.values.background_color || config.background.color, t);
             effectiveGlow = lerp(config.effects.glow, nextKeyframe.values.effects_glow ?? config.effects.glow, t);
             effectiveZoomOffset = lerp(0, nextKeyframe.values.camera_zoom || 0, t);
             effectiveRotateOffset = lerp(0, nextKeyframe.values.camera_rotate || 0, t);
             effectiveImageEffectSpeed = lerp(config.background.imageEffectSpeed ?? 1.0, nextKeyframe.values.image_effect_speed ?? config.background.imageEffectSpeed ?? 1.0, t);
             effectiveImageEffects = config.background.imageEffects || [];
        }
    }

    // --- AUDIO & CONFIG ---
    let { bass, mid, high, raw } = analysis;
    const audioEnabled = config.audioReactivity.enabled;
    const sensitivity = config.audioReactivity.sensitivity;
    
    if (!audioEnabled) {
        bass = 0; mid = 0; high = 0;
    } else {
        bass *= sensitivity; mid *= sensitivity; high *= sensitivity;
    }
    
    if (audioEnabled) {
        effectiveGlow = effectiveGlow * (1 + (mid * 0.2) + (bass * 0.8));
    }


    // ===========================
    // LAYER 1: BACKGROUND RENDER
    // ===========================
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    
    if (isAlphaRender) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        ctx.fillStyle = effectiveBgColor;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const drawMedia = (media: HTMLImageElement | HTMLVideoElement, isVideo: boolean) => {
             const width = isVideo ? (media as HTMLVideoElement).videoWidth : (media as HTMLImageElement).width;
             const height = isVideo ? (media as HTMLVideoElement).videoHeight : (media as HTMLImageElement).height;
             const opacity = config.background.intensity ?? 1.0;

             ctx.save();
             ctx.globalAlpha = opacity;
             
             let scale = Math.max(CANVAS_WIDTH / width, CANVAS_HEIGHT / height);
             let x = (CANVAS_WIDTH / 2) - (width / 2) * scale;
             let y = (CANVAS_HEIGHT / 2) - (height / 2) * scale;

             const speedScalar = effectiveImageEffectSpeed;
             const hasZoom = effectiveImageEffects.includes('zoom-slow');
             const hasChromatic = effectiveImageEffects.includes('chromatic-shift');
             const hasVhsStripes = effectiveImageEffects.includes('vhs-stripes');
             const hasLiquidWarp = effectiveImageEffects.includes('liquid-warp');
             const hasScanDrift = effectiveImageEffects.includes('scan-drift');
             const hasGhosting = effectiveImageEffects.includes('ghosting');
             const hasMirrorX = effectiveImageEffects.includes('mirror-x');
             const hasPixelNoise = effectiveImageEffects.includes('pixel-noise');
             const hasBrightHappy = effectiveImageEffects.includes('bright-happy');

             if (hasZoom) scale *= 1.0 + (Math.sin(time * 0.2 * speedScalar) * 0.1); 
             if (audioEnabled && effectiveImageEffects.some(e => ['dark-error','red-error'].includes(e))) {
                 scale *= 1.0 + (bass * 0.15 * speedScalar); 
             }

             // Recalculate Base Positions
             x = (CANVAS_WIDTH / 2) - (width / 2) * scale;
             y = (CANVAS_HEIGHT / 2) - (height / 2) * scale;

             // --- EFFECT LOGIC ---

             if (hasBrightHappy) {
                 ctx.filter = 'brightness(1.1) saturate(1.2)';
             }
             
             if (hasMirrorX) {
                 ctx.translate(CANVAS_WIDTH, 0);
                 ctx.scale(-1, 1);
                 // Need to flip texture draw logic if we flip context? 
                 // Actually standard drawImage works, but we might want just half reflected?
                 // Simple mirror: Flip whole context, draw, then restore. Result: Flipped image.
                 // To do "Kaleidoscope-ish" mirror (left half mirrored to right), complex clipping needed.
                 // For now, simple horizontal flip is active.
             }

             if (hasGhosting) {
                 ctx.save();
                 ctx.globalAlpha = opacity * 0.5;
                 ctx.globalCompositeOperation = 'screen';
                 const ghostScale = scale * (1.05 + Math.sin(time * 2 * speedScalar) * 0.02);
                 const gx = (CANVAS_WIDTH / 2) - (width / 2) * ghostScale;
                 const gy = (CANVAS_HEIGHT / 2) - (height / 2) * ghostScale;
                 ctx.drawImage(media, gx, gy, width * ghostScale, height * ghostScale);
                 ctx.restore();
             }

             if (hasLiquidWarp) {
                 // Slicing approach for liquid effect
                 const slices = 20; 
                 const sliceH = height / slices;
                 for (let i = 0; i < slices; i++) {
                     const sy = i * sliceH;
                     const dyOffset = Math.sin((i * 0.5) + (time * 2 * speedScalar)) * (50 + bass * 20);
                     const dxOffset = Math.cos((i * 0.5) + (time * 1.5 * speedScalar)) * (20 + bass * 10);
                     
                     ctx.drawImage(
                         media, 
                         0, sy, width, sliceH, 
                         x + dxOffset, y + (sy * scale) + dyOffset, width * scale, sliceH * scale
                     );
                 }
             } else if (hasScanDrift) {
                 // Scanline tearing
                 const slices = 40;
                 const sliceH = height / slices;
                 for (let i = 0; i < slices; i++) {
                     const sy = i * sliceH;
                     let dxOffset = 0;
                     // Random drift occasionally
                     if (Math.random() > 0.9 - (bass * 0.2)) {
                         dxOffset = (Math.random() - 0.5) * (100 * speedScalar);
                     }
                     // Wave drift
                     dxOffset += Math.sin((i * 0.2) + (time * 5)) * 10;

                     ctx.drawImage(
                         media, 
                         0, sy, width, sliceH, 
                         x + dxOffset, y + (sy * scale), width * scale, sliceH * scale
                     );
                 }
             } else {
                 // Standard Draw (fallback or composed)
                 if (hasChromatic) {
                     const shift = (Math.sin(time * speedScalar) * 10) + (bass * 20);
                     ctx.save();
                     ctx.globalCompositeOperation = 'screen';
                     ctx.globalAlpha = opacity * 0.7;
                     ctx.translate(shift, 0);
                     ctx.fillStyle = '#ff0000';
                     ctx.drawImage(media, x, y, width * scale, height * scale);
                     ctx.translate(-shift * 2, 0); 
                     ctx.fillStyle = '#00ffff';
                     ctx.drawImage(media, x, y, width * scale, height * scale);
                     ctx.translate(shift, 0); 
                     ctx.globalCompositeOperation = 'lighten';
                     ctx.globalAlpha = opacity;
                     ctx.drawImage(media, x, y, width * scale, height * scale);
                     ctx.restore();
                 } else {
                     ctx.drawImage(media, x, y, width * scale, height * scale);
                 }
             }
             
             if (hasPixelNoise) {
                 // RGB Noise only on top of image area
                 const pattern = getNoisePattern(ctx, 100, 100);
                 if (pattern) {
                     ctx.save();
                     ctx.globalCompositeOperation = 'overlay';
                     ctx.globalAlpha = 0.15 + (high * 0.1);
                     ctx.fillStyle = pattern;
                     // Draw over entire canvas but masked? No, just rect for now over whole screen is standard
                     // but let's constrain to image rect for better effect if not warping
                     if (!hasLiquidWarp && !hasScanDrift) {
                         ctx.translate(x, y);
                         ctx.fillRect(0, 0, width * scale, height * scale);
                     } else {
                         ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                     }
                     ctx.restore();
                 }
             }

             if (hasVhsStripes) {
                 const numStripes = 5;
                 const stripeOffset = (time * 100 * speedScalar) % CANVAS_HEIGHT;
                 ctx.save();
                 ctx.globalCompositeOperation = 'overlay';
                 for(let i=0; i<numStripes; i++) {
                     const sy = (stripeOffset + i * (CANVAS_HEIGHT/numStripes)) % CANVAS_HEIGHT;
                     const height = 10 + Math.random() * 20;
                     ctx.fillStyle = i % 2 === 0 ? 'rgba(0,255,255,0.2)' : 'rgba(255,0,255,0.2)';
                     ctx.fillRect(0, sy, CANVAS_WIDTH, height);
                 }
                 ctx.restore();
             }
             
             // --- ERROR OVERLAYS ---
             if (effectiveImageEffects.includes('dark-error')) {
                 ctx.globalCompositeOperation = 'hard-light'; 
                 ctx.fillStyle = 'rgba(60, 20, 180, 0.5)';
                 ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
             }
             if (effectiveImageEffects.includes('red-error')) {
                 ctx.globalCompositeOperation = 'hard-light'; 
                 ctx.fillStyle = 'rgba(180, 20, 20, 0.5)';
                 ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
             }

             ctx.restore();
        };

        if (config.background.type === 'image' && bgImageRef.current?.complete) {
            drawMedia(bgImageRef.current, false);
        } else if (config.background.type === 'video' && bgVideoRef.current?.readyState >= 2) {
            const vid = bgVideoRef.current;
            const playbackSpeed = config.background.playbackSpeed || 1.0;
            if (isPlaying) {
                 if (Math.abs(vid.playbackRate - playbackSpeed) > 0.1) vid.playbackRate = playbackSpeed;
                 if (vid.paused) vid.play().catch(() => {});
                 const targetTime = (time * playbackSpeed) % (vid.duration || 1);
                 if (Math.abs(vid.currentTime - targetTime) > 0.5) vid.currentTime = targetTime;
            } else {
                 if (!vid.paused) vid.pause();
                 vid.currentTime = (time * playbackSpeed) % (vid.duration || 1);
            }
            drawMedia(vid, true);
        } else if (config.background.type === 'procedural') {
            const speed = config.background.intensity || 0.5;
            const style = config.background.proceduralStyle || 'grid';
            const audioData = { bass, mid, high, raw };
            
            if (style === 'grid') drawGrid(ctx, time, effectiveBgColor, speed, CANVAS_WIDTH, CANVAS_HEIGHT, audioData);
            if (style === 'plasma') drawPlasma(ctx, time, effectiveBgColor, speed, CANVAS_WIDTH, CANVAS_HEIGHT, audioData);
            if (style === 'stars') drawStars(ctx, time, effectiveBgColor, speed, CANVAS_WIDTH, CANVAS_HEIGHT, audioData);
            if (style === 'tunnel') drawTunnel(ctx, time, effectiveBgColor, speed, CANVAS_WIDTH, CANVAS_HEIGHT, audioData);
            if (style === 'matrix') drawMatrix(ctx, time, effectiveBgColor, speed, CANVAS_WIDTH, CANVAS_HEIGHT, audioData);
            if (style === 'gradient-wave') drawGradientWave(ctx, time, effectiveBgColor, effectiveColorsActive, speed, CANVAS_WIDTH, CANVAS_HEIGHT, audioData);
            if (style === 'hexagons') drawHexagons(ctx, time, effectiveBgColor, effectiveColorsActive, speed, CANVAS_WIDTH, CANVAS_HEIGHT, audioData);
            if (style === 'kaleidoscope') drawKaleidoscope(ctx, time, effectiveBgColor, effectiveColorsActive, speed, CANVAS_WIDTH, CANVAS_HEIGHT, audioData);
            if (style === 'dna') drawDNA(ctx, time, effectiveBgColor, effectiveColorsActive, speed, CANVAS_WIDTH, CANVAS_HEIGHT, audioData);
        }
        
        // Global Overlay Gradient (Behind text)
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;
        const bgRadius = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * (0.6 + bass * 0.2);
        const bgGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, bgRadius);
        bgGradient.addColorStop(0, 'rgba(0,0,0,0)'); 
        bgGradient.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // ===========================
    // LAYER 2: CAMERA & WORLD (PARTICLES)
    // ===========================
    
    // Shared Camera Transforms
    let zoom = 1.0 + effectiveZoomOffset;
    if (config.camera.zoomBeat && audioEnabled) zoom += bass * 0.1;
    if (config.camera.hardKick && audioEnabled && bass > 0.7) zoom += 0.2;
    zoom += Math.sin(time * 0.5) * 0.02;

    if (config.camera.screenPump && audioEnabled && bass > 0.75 && screenPumpState.current.intensity <= 0.1) {
        screenPumpState.current.intensity = 1.0;
    }
    if (screenPumpState.current.intensity > 0) {
        const pumpProgress = 1 - screenPumpState.current.intensity;
        const pumpAmount = 1.0 + (0.05 * (1 - Math.pow(pumpProgress, 2)));
        zoom *= pumpAmount;
        screenPumpState.current.intensity -= 0.08;
    }

    let rot = effectiveRotateOffset;
    if (config.camera.rotate) rot += Math.sin(time * 0.2) * 0.01; 

    let shakeX = 0;
    let shakeY = 0;
    if (config.camera.shake && audioEnabled) {
        // Dynamic shake based on audio intensity
        // Remove hard threshold of 0.6 to allow subtler shakes at lower volumes
        const shakeIntensity = (bass * 40) + (mid * 15); // Tuned for visibility
        if (shakeIntensity > 1.0) {
            shakeX = (Math.random() - 0.5) * shakeIntensity;
            shakeY = (Math.random() - 0.5) * shakeIntensity;
        }
    }
    
    if (config.camera.sway) {
        shakeX += Math.sin(time * 0.5) * 20;
        shakeY += Math.cos(time * 0.3) * 20;
        rot += Math.sin(time * 0.2) * 0.02; 
    }

    if (config.camera.panic && bass > 0.5 && audioEnabled) {
        zoom += (Math.random() * 0.3);
        rot += (Math.random() - 0.5) * 0.1;
        shakeX += (Math.random() - 0.5) * 50;
        shakeY += (Math.random() - 0.5) * 50;
    }

    // -- RENDER PARTICLES (Affected by Camera) --
    if (!isAlphaRender && config.particles.enabled) {
        ctx.save();
        ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.rotate(rot);
        ctx.scale(zoom, zoom);
        ctx.translate(-CANVAS_WIDTH / 2 - shakeX, -CANVAS_HEIGHT / 2 - shakeY);

        const particleBehavior = config.particles.particleBehavior || 'drift';
        particlesRef.current.forEach(p => {
             if (config.particles.shape === 'tetris') {
                 // SPECIAL LOGIC FOR TETRIS: Fall down, reset at top
                 p.y += p.speed * (1 + bass * 0.5); 
                 
                 // If out of bounds (bottom), reset to top with new shape/color
                 if (p.y > CANVAS_HEIGHT + 100) {
                     p.y = -100;
                     p.x = Math.random() * CANVAS_WIDTH;
                     p.tetrominoType = Math.floor(Math.random() * TETROMINOS.length);
                     p.color = config.particles.color[Math.floor(Math.random() * config.particles.color.length)] || '#fff';
                     // New random discrete angle
                     p.angle = (Math.floor(Math.random() * 4) * (Math.PI / 2));
                 }
             } else if (particleBehavior === 'rise') {
                 p.y -= p.vy * safeDt * 50; 
                 p.x += Math.sin(p.phase + time) * p.speed * 0.5;
                 p.life -= safeDt;
                 if (p.life <= 0) {
                     p.life = p.maxLife;
                     p.y = CANVAS_HEIGHT + 50;
                     p.x = Math.random() * CANVAS_WIDTH;
                 }
                 p.alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.7; 
             } else {
                 p.x += p.vx + (Math.sin(time + p.phase) * bass * 2);
                 p.y += p.vy + (Math.cos(time + p.phase) * bass * 2);
                 p.angle += 0.02 * (1 + bass);
                 if (p.x < -50) p.x = CANVAS_WIDTH + 50;
                 if (p.x > CANVAS_WIDTH + 50) p.x = -50;
                 if (p.y < -50) p.y = CANVAS_HEIGHT + 50;
                 if (p.y > CANVAS_HEIGHT + 50) p.y = -50;
             }
             
             ctx.save();
             ctx.translate(p.x, p.y);
             ctx.rotate(p.angle); // Always apply rotation (static or dynamic)
             
             ctx.fillStyle = p.color;
             ctx.globalAlpha = p.alpha;
             const pSize = p.size * (1 + high);

             if (config.particles.shape === 'tetris') {
                 // Force 80% opacity logic for Happy Tetris Rain as requested
                 ctx.globalAlpha = 0.8; 
                 const shape = TETROMINOS[p.tetrominoType || 0];
                 const blockSize = pSize * 2; // Make them visible
                 
                 // Center the drawing
                 const rows = shape.length;
                 const cols = shape[0].length;
                 const offsetX = (cols * blockSize) / 2;
                 const offsetY = (rows * blockSize) / 2;
                 
                 shape.forEach((row, rY) => {
                     row.forEach((val, rX) => {
                         if (val) {
                             const drawX = (rX * blockSize) - offsetX;
                             const drawY = (rY * blockSize) - offsetY;
                             
                             // Draw Base Block
                             ctx.fillStyle = p.color;
                             ctx.fillRect(drawX, drawY, blockSize, blockSize);
                             
                             // Draw "Candy" Highlight (Top Shine)
                             ctx.fillStyle = 'rgba(255,255,255,0.4)';
                             ctx.fillRect(drawX, drawY, blockSize, blockSize * 0.25);
                         }
                     });
                 });

             } else if (config.particles.shape === 'circle') { ctx.beginPath(); ctx.arc(0,0, pSize, 0, Math.PI*2); ctx.fill(); }
             else if (config.particles.shape === 'square') ctx.fillRect(-pSize, -pSize, pSize*2, pSize*2);
             else if (config.particles.shape === 'triangle') { drawPolygon(ctx, 0, 0, pSize * 2, 3, 0); ctx.fill(); }
             else if (config.particles.shape === 'star') { drawPolygon(ctx, 0, 0, pSize * 2, 5, 0); ctx.fill(); }
             else if (config.particles.shape === 'hexagon') { drawPolygon(ctx, 0, 0, pSize * 2, 6, 0); ctx.fill(); }
             else if (config.particles.shape === 'note') { drawNote(ctx, 0, 0, pSize); }

             ctx.restore();
        });
        ctx.restore(); // End Camera for Particles
    }

    // ===========================
    // LAYER 3: OVERLAYS (Scanlines, Vignette) - BEHIND TEXT
    // ===========================
    if (!isAlphaRender) {
        if (config.effects.vignette) {
            const grad = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH * 0.3, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH * 0.8);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.8)');
            ctx.fillStyle = grad;
            ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        if (config.effects.scanlines) {
            const pattern = getScanlinePattern(ctx);
            if (pattern) {
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }
        }
        if (config.effects.filmGrain) { 
            const pattern = getNoisePattern(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
            if (pattern) {
                ctx.save();
                ctx.globalAlpha = 0.08;
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                ctx.restore();
            }
        }
    }


    // ===========================
    // LAYER 4: TEXT RENDERING (TOP LAYER)
    // ===========================
    if (config.showLyrics !== false) {
      ctx.save();
    
      // Re-apply Camera transform for Text to match world movement
      ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.rotate(rot);
      ctx.scale(zoom, zoom);
      ctx.translate(-CANVAS_WIDTH / 2 - shakeX, -CANVAS_HEIGHT / 2 - shakeY);

      if (!isAlphaRender && config.effects.invert && bass > 0.7 && audioEnabled) {
          ctx.filter = 'invert(1)';
      }

      const primaryActiveIndex = data.segments.findIndex(
        (seg) => time >= seg.start && time <= seg.end
      );
      const visibleSegments = data.segments.filter(
        (seg) => (time >= seg.start - 2.0 && time <= seg.end + 2.0)
      );
      visibleSegments.sort((a, b) => a.start - b.start);

      // Section Overrides
      let activeAnimationEntrance = config.animation.entrance;
      let activeAnimationActive = config.animation.active;
      let activeAnimationExit = config.animation.exit;
      let effectiveSectionGlow = effectiveGlow;
      let effectiveSectionZoom = effectiveZoomOffset;
      let currentEffectiveColorsActive = effectiveColorsActive;
      let currentEffectiveColorsText = effectiveColorsText;

      if (primaryActiveIndex !== -1) {
          let activeSection = 'verse';
          for (let i = primaryActiveIndex; i >= 0; i--) {
              if (data.segments[i].section) {
                  activeSection = data.segments[i].section || 'verse';
                  break;
              }
          }
          const normalizedSection = activeSection.toLowerCase().split(' ')[0] as SectionType;
          const sectionStyle = config.sectionStyles?.[normalizedSection];
          if (sectionStyle && sectionStyle.enabled) {
              if (sectionStyle.colors_active) currentEffectiveColorsActive = sectionStyle.colors_active;
              if (sectionStyle.colors_text) currentEffectiveColorsText = sectionStyle.colors_text;
              if (sectionStyle.effects_glow_boost) effectiveSectionGlow = Math.min(1.0, effectiveGlow + sectionStyle.effects_glow_boost);
              if (sectionStyle.camera_zoom_boost) effectiveSectionZoom += sectionStyle.camera_zoom_boost;
              if (sectionStyle.animation?.entrance) activeAnimationEntrance = sectionStyle.animation.entrance;
              if (sectionStyle.animation?.active) activeAnimationActive = sectionStyle.animation.active;
              if (sectionStyle.animation?.exit) activeAnimationExit = sectionStyle.animation.exit;
          }
      }

      visibleSegments.forEach(seg => {
          const lines = getLines(seg.id, seg.words);
          const isActiveSegment = (time >= seg.start && time <= seg.end);
          
          const lineHeight = 100 + (bass * 10);
          const totalHeight = lines.length * lineHeight;
          let startY = (CANVAS_HEIGHT / 2) - (totalHeight / 2) + (lineHeight / 2);

          lines.forEach((lineWords, lineIdx) => {
              const lineY = startY + (lineIdx * lineHeight);
              ctx.font = `${config.font.italic ? 'italic' : ''} ${config.font.weight} 80px ${config.font.family}`;
              const totalLineWidth = lineWords.reduce((acc, w) => acc + ctx.measureText(w.word).width + 30, 0) - 30;
              let currentX = (CANVAS_WIDTH / 2) - (totalLineWidth / 2);

              lineWords.forEach((w, wIdx) => {
                  const wordWidth = ctx.measureText(w.word).width;
                  let centerX = currentX + wordWidth / 2;
                  let centerY = lineY;

                  const isWordActive = time >= w.start && time <= w.end;
                  const isFuture = time < w.start;
                  const isPast = time > w.end;
                  
                  // --- ANIMATION SELECTION (Random Support) ---
                  const seed = w.start * 1000 + wIdx;
                  const finalEntrance = activeAnimationEntrance === 'random' ? getRandomAnimation(seed, 'entrance') : activeAnimationEntrance;
                  const finalActive = activeAnimationActive === 'random' ? getRandomAnimation(seed, 'active') : activeAnimationActive;
                  
                  let alpha = 1.0;
                  let scale = 1.0;
                  let blur = 0;
                  let offsetY = 0;
                  let offsetX = 0;
                  let rotation = 0;
                  let color = currentEffectiveColorsText;

                  if (isFuture) {
                      const dist = w.start - time;
                      if (dist < 0.5) { 
                          const t = 1 - (dist / 0.5); 
                          alpha = t;
                          
                          if (finalEntrance === 'stack-pop') {
                              if (dist < 0.2) {
                                  const popT = 1 - (dist / 0.2);
                                  scale = easeOutBack(popT);
                              } else { scale = 0; }
                          } else if (finalEntrance === 'slide') { offsetY = (1 - t) * 50;
                          } else if (finalEntrance === 'slam') { scale = 2.0 - t;
                          } else if (finalEntrance === 'zoom') { scale = t;
                          } else if (finalEntrance === 'spin') { rotation = (1 - t) * Math.PI; scale = t;
                          } else if (finalEntrance === 'blur') { blur = (1 - t) * 10;
                          } else if (finalEntrance === 'glitch') {
                              if (Math.random() > t) offsetX = (Math.random() - 0.5) * 20;
                          } else if (finalEntrance === 'elastic') { scale = easeOutElastic(t);
                          } else if (finalEntrance === 'drop') { offsetY = (1 - t) * -200;
                          } else if (finalEntrance === 'spiral') { rotation = (1-t) * Math.PI * 2; scale = t * 0.1;
                          } else if (finalEntrance === 'inflate') { scale = 0.5 + (t * 0.5); offsetY = (1-t) * 20;
                          }
                      } else { alpha = 0; }
                  } else if (isWordActive) {
                      color = currentEffectiveColorsActive;
                      scale = 1.1; 

                      if (finalActive === 'glitch-shake') {
                          offsetX = (Math.random() - 0.5) * (10 + high * 20);
                          offsetY = (Math.random() - 0.5) * (10 + high * 20);
                          rotation = (Math.random() - 0.5) * 0.05;
                      } else if (finalActive === 'pulse') { scale += Math.sin(time * 10) * 0.05 + (bass * 0.1);
                      } else if (finalActive === 'jitter') { offsetX = (Math.random() - 0.5) * 5; offsetY = (Math.random() - 0.5) * 5;
                      } else if (finalActive === 'bounce') { offsetY = Math.sin(time * 15) * 10;
                      } else if (finalActive === 'wave') { offsetY = Math.sin(time * 5 + centerX * 0.01) * 10;
                      } else if (finalActive === 'rotate') { rotation = Math.sin(time * 3) * 0.1;
                      } else if (finalActive === 'pop') { if (bass > 0.6) scale = 1.4;
                      } else if (finalActive === 'flash') { if (Math.sin(time * 20) > 0) alpha = 0.5;
                      } else if (finalActive === 'float') { offsetY = Math.sin(time * 2) * 5; rotation = Math.sin(time * 1.5) * 0.02;
                      } else if (finalActive === 'shiver') { rotation = (Math.random() - 0.5) * 0.1;
                      } else if (finalActive === 'heartbeat') {
                          const beat = (time * 2) % 1;
                          if (beat < 0.2) scale = 1.3; else if (beat > 0.3 && beat < 0.4) scale = 1.2;
                      } else if (finalActive === 'swing') { rotation = Math.sin(time * 4) * 0.1; offsetY = Math.abs(Math.sin(time * 4)) * 5;
                      }
                  } else if (isPast) {
                      color = currentEffectiveColorsText;
                      const dist = time - w.end;
                      if (dist < 0.5) {
                          const t = dist / 0.5;
                          alpha = 1 - t;
                          if (activeAnimationExit === 'slide') offsetY = t * -50;
                          else if (activeAnimationExit === 'slam') scale = 1.0 + t;
                          else if (activeAnimationExit === 'zoom') scale = 1.0 - t;
                          else if (activeAnimationExit === 'blur') blur = t * 20;
                      } else {
                          if (isActiveSegment) { alpha = 0.3; blur = 1; } 
                          else { alpha = 0; }
                      }
                  }

                  if (alpha > 0.01) {
                      ctx.save();
                      ctx.translate(centerX + offsetX, centerY + offsetY);
                      ctx.rotate(rotation);
                      ctx.scale(scale, scale);

                      if (blur > 0) ctx.filter = `blur(${blur}px)`;
                      ctx.globalAlpha = alpha;
                      
                      // --- LEGIBILITY ENHANCEMENT: HARD STROKE ---
                      // Always render a stroke behind the text to ensure it pops off the background
                      ctx.lineJoin = 'round';
                      ctx.lineWidth = 6;
                      ctx.strokeStyle = 'rgba(0,0,0,0.8)'; // Semi-transparent black stroke
                      ctx.strokeText(w.word, -wordWidth / 2, 0);

                      if (effectiveSectionGlow > 0 && (isWordActive || alpha > 0.5)) {
                          ctx.shadowBlur = effectiveSectionGlow * 30;
                          ctx.shadowColor = isWordActive ? currentEffectiveColorsActive : currentEffectiveColorsText;
                      }

                      let textToDraw = w.word;
                      if (isFuture && finalEntrance === 'scramble' && w.start - time < 0.5) {
                          textToDraw = w.word.split('').map(c => Math.random() > 0.5 ? getRandomChar() : c).join('');
                      }

                      ctx.fillStyle = color;
                      if (isWordActive && finalActive === 'rainbow') {
                          const grad = ctx.createLinearGradient(-wordWidth/2, 0, wordWidth/2, 0);
                          grad.addColorStop(0, '#ff0000'); grad.addColorStop(0.2, '#ffff00'); grad.addColorStop(0.4, '#00ff00');
                          grad.addColorStop(0.6, '#00ffff'); grad.addColorStop(0.8, '#0000ff'); grad.addColorStop(1, '#ff00ff');
                          ctx.fillStyle = grad;
                      }

                      ctx.fillText(textToDraw, -wordWidth / 2, 0);
                      
                      if (isWordActive && finalActive === 'glitch-shake') {
                          const glitchShift = 5 + high * 10;
                          ctx.globalCompositeOperation = 'lighter';
                          ctx.fillStyle = '#ff00ff';
                          ctx.fillText(textToDraw, -wordWidth/2 - glitchShift, 0);
                          ctx.fillStyle = '#00ffff';
                          ctx.fillText(textToDraw, -wordWidth/2 + glitchShift, 0);
                      }

                      ctx.restore();
                  }

                  currentX += wordWidth + 30;
              });
          });
      });
      ctx.restore(); // Restore Camera
    }

    // ===========================
    // LAYER 5: FINAL COMPOSITION (Chromatic Aberration affects everything)
    // ===========================
    if (config.effects.chromaticAberration || config.effects.rgbSplit) {
        const caShift = config.effects.chromaticAberration ? 2 + mid * 20 * sensitivity : 0;
        const rgbShift = config.effects.rgbSplit ? 5 : 0;
        const totalShift = Math.max(caShift, rgbShift);
        if (totalShift > 0.1) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(canvas, totalShift, 0);
            ctx.drawImage(canvas, -totalShift, 0);
            ctx.restore();
        }
    }
  };

  return (
    <canvas 
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-full object-contain"
    />
  );
});

CanvasVideoRenderer.displayName = 'CanvasVideoRenderer';