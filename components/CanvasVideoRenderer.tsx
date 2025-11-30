

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { LyricData, Word, AudioVisualizerData, RendererConfig, ParticleShape, AnimationKeyframe, SectionType } from '../types';
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
  size: number;
  color: string;
  alpha: number;
  phase: number;
  angle: number; // For rotation
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

// Random Character Generator for Scramble Effect
const getRandomChar = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    return chars.charAt(Math.floor(Math.random() * chars.length));
};

// --- PROCEDURAL BACKGROUND DRAWING FUNCTIONS ---

const drawGrid = (ctx: CanvasRenderingContext2D, time: number, color: string, speed: number, w: number, h: number, audio: AudioVisualizerData) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + (audio.bass * 2);
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    
    const horizon = h * 0.55;
    const centerX = w / 2;
    
    // Vertical lines
    for (let i = -10; i <= 10; i++) {
        const x = centerX + (i * 200);
        ctx.beginPath();
        ctx.moveTo(centerX, horizon);
        ctx.lineTo(x + (i * 300) + (Math.sin(time + i)*audio.mid*50), h);
        ctx.stroke();
    }
    
    // Horizontal lines
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
        
        // Glitch effect on beat
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
    
    // Create base gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, accentColor);
    grad.addColorStop(1, color);
    
    // Create dynamic layers
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
            
            // Determine if this hex lights up
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
    
    // Scale entire pattern on bass
    const scale = 1 + (audio.bass * 0.2);
    ctx.scale(scale, scale);
    
    for(let i=0; i<segments; i++) {
        ctx.save();
        ctx.rotate((i * angleStep) + rotation);
        
        // Draw pattern segment
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
        
        // Decorative lines
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
    // Rotate entire strand 45 degrees
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
        
        // Draw connector
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw particles
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

// Helper: Scanline Pattern Cache
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
  
  // Media Refs
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  // Resolution Handling
  const currentResolution = RESOLUTIONS.find(r => r.id === config.resolutionId) || RESOLUTIONS[0];
  const CANVAS_WIDTH = currentResolution.width;
  const CANVAS_HEIGHT = currentResolution.height;

  // Load Media when Config Changes
  useEffect(() => {
    // IMAGE
    if (config.background.type === 'image' && config.background.url) {
        // Reuse object if URL is same? React effect logic handles dependency check
        if (bgImageRef.current?.src !== config.background.url) {
             const img = new Image();
             img.crossOrigin = "anonymous";
             img.src = config.background.url;
             bgImageRef.current = img;
        }
    } else {
        bgImageRef.current = null;
    }

    // VIDEO
    if (config.background.type === 'video' && config.background.url) {
         if (bgVideoRef.current?.src !== config.background.url) {
             const vid = document.createElement('video');
             vid.crossOrigin = "anonymous";
             vid.src = config.background.url;
             vid.loop = true;
             vid.muted = true; // Essential for autoplay
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
            bgVideoRef.current.src = ""; // Clean up
            bgVideoRef.current = null;
        }
    }
  }, [config.background.type, config.background.url]);

  // Expose imperative handle for Exporting & Precise Seek
  useImperativeHandle(ref, () => ({
    canvas: canvasRef.current,
    drawFrame: (time, analysis, isAlphaRender) => {
       drawScene(time, analysis, isAlphaRender);
    },
    seekToTime: async (time: number) => {
        if (bgVideoRef.current && config.background.type === 'video') {
            const vid = bgVideoRef.current;
            if (vid.readyState >= 2) { // HAVE_CURRENT_DATA or better
                const playbackSpeed = config.background.playbackSpeed || 1.0;
                // Calculate correct time in video loop with speed scaling
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

  // Initialize or Update particles based on Config
  useEffect(() => {
    const pCount = config.particles.enabled ? config.particles.count : 0;
    
    if (particlesRef.current.length !== pCount) {
        const newParticles: Particle[] = [];
        for (let i = 0; i < pCount; i++) {
            newParticles.push({
            id: i,
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            vx: (Math.random() - 0.5) * config.particles.speed * 2,
            vy: (Math.random() - 0.5) * config.particles.speed * 2,
            size: (Math.random() * 4) + 2,
            color: config.particles.color[Math.floor(Math.random() * config.particles.color.length)] || '#fff',
            alpha: Math.random() * 0.5 + 0.2,
            phase: Math.random() * Math.PI * 2,
            angle: Math.random() * Math.PI * 2
            });
        }
        particlesRef.current = newParticles;
    } else {
        particlesRef.current.forEach(p => {
             const currentSpeed = Math.sqrt(p.vx*p.vx + p.vy*p.vy) || 0.1;
             const newSpeed = config.particles.speed * ((Math.random() * 1) + 0.5); 
             
             p.vx = (p.vx / currentSpeed) * newSpeed;
             p.vy = (p.vy / currentSpeed) * newSpeed;

             if (!config.particles.color.includes(p.color)) {
                 p.color = config.particles.color[Math.floor(Math.random() * config.particles.color.length)] || '#fff';
             }
        });
    }

  }, [config.particles.count, config.particles.speed, config.particles.enabled, config.particles.color, CANVAS_WIDTH, CANVAS_HEIGHT]);

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
    const ctx = canvas.getContext('2d', { alpha: true }); // Ensure alpha is allowed
    if (!ctx) return;

    // Calculate deltaTime
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;
    const safeDt = Math.abs(dt) > 1.0 ? 0.016 : dt; 

    // Find Active Segment
    const primaryActiveIndex = data.segments.findIndex(
      (seg) => time >= seg.start && time <= seg.end
    );
    const visibleSegments = data.segments.filter(
      (seg) => time >= seg.start - 2.0 && time <= seg.end + 2.0
    );
    visibleSegments.sort((a, b) => a.start - b.start);

    // --- Keyframe Interpolation ---
    let effectiveColorsActive = config.colors.active;
    let effectiveColorsText = config.colors.text;
    let effectiveBgColor = config.background.color;
    let effectiveGlow = config.effects.glow;
    let effectiveZoomOffset = 0;
    let effectiveRotateOffset = 0;

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

            effectiveColorsActive = lerpColor(
                prevKeyframe.values.colors_active || config.colors.active,
                nextKeyframe.values.colors_active || config.colors.active,
                t
            );
             effectiveColorsText = lerpColor(
                prevKeyframe.values.colors_text || config.colors.text,
                nextKeyframe.values.colors_text || config.colors.text,
                t
            );
             effectiveBgColor = lerpColor(
                prevKeyframe.values.background_color || config.background.color,
                nextKeyframe.values.background_color || config.background.color,
                t
            );
             effectiveGlow = lerp(
                 prevKeyframe.values.effects_glow ?? config.effects.glow,
                 nextKeyframe.values.effects_glow ?? config.effects.glow,
                 t
             );
             effectiveZoomOffset = lerp(
                 prevKeyframe.values.camera_zoom || 0,
                 nextKeyframe.values.camera_zoom || 0,
                 t
             );
             effectiveRotateOffset = lerp(
                 prevKeyframe.values.camera_rotate || 0,
                 nextKeyframe.values.camera_rotate || 0,
                 t
             );

        } else if (prevKeyframe) {
             effectiveColorsActive = prevKeyframe.values.colors_active || config.colors.active;
             effectiveColorsText = prevKeyframe.values.colors_text || config.colors.text;
             effectiveBgColor = prevKeyframe.values.background_color || config.background.color;
             effectiveGlow = prevKeyframe.values.effects_glow ?? config.effects.glow;
             effectiveZoomOffset = prevKeyframe.values.camera_zoom || 0;
             effectiveRotateOffset = prevKeyframe.values.camera_rotate || 0;
        } else if (nextKeyframe) {
             const t = Math.min(1, Math.max(0, time / nextKeyframe.time));
             effectiveColorsActive = lerpColor(config.colors.active, nextKeyframe.values.colors_active || config.colors.active, t);
             effectiveColorsText = lerpColor(config.colors.text, nextKeyframe.values.colors_text || config.colors.text, t);
             effectiveBgColor = lerpColor(config.background.color, nextKeyframe.values.background_color || config.background.color, t);
             effectiveGlow = lerp(config.effects.glow, nextKeyframe.values.effects_glow ?? config.effects.glow, t);
             effectiveZoomOffset = lerp(0, nextKeyframe.values.camera_zoom || 0, t);
             effectiveRotateOffset = lerp(0, nextKeyframe.values.camera_rotate || 0, t);
        }
    }

    // --- SECTION STYLE OVERRIDES ---
    if (primaryActiveIndex !== -1) {
        // Resolve Effective Section: Walk backwards to find the last defined section
        let activeSection = 'verse';
        for (let i = primaryActiveIndex; i >= 0; i--) {
            if (data.segments[i].section) {
                activeSection = data.segments[i].section || 'verse';
                break;
            }
        }
        
        // Normalize section name (e.g. "Verse 2" -> "verse")
        const normalizedSection = activeSection.toLowerCase().split(' ')[0] as SectionType;
        const sectionStyle = config.sectionStyles?.[normalizedSection];

        if (sectionStyle && sectionStyle.enabled) {
            if (sectionStyle.colors_active) effectiveColorsActive = sectionStyle.colors_active;
            if (sectionStyle.colors_text) effectiveColorsText = sectionStyle.colors_text;
            if (sectionStyle.effects_glow_boost) effectiveGlow = Math.min(1.0, effectiveGlow + sectionStyle.effects_glow_boost);
            if (sectionStyle.camera_zoom_boost) effectiveZoomOffset += sectionStyle.camera_zoom_boost;
        }
    }


    // --- Audio Reactivity Handling ---
    let { bass, mid, high, raw } = analysis;
    const audioEnabled = config.audioReactivity.enabled;
    const sensitivity = config.audioReactivity.sensitivity;
    
    if (!audioEnabled) {
        bass = 0; mid = 0; high = 0;
    } else {
        bass *= sensitivity; mid *= sensitivity; high *= sensitivity;
    }
    
    if (audioEnabled) {
        effectiveGlow = effectiveGlow * (1 + (mid * 0.8) + (bass * 0.2));
    }


    // --- 1. Background Rendering ---
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    
    if (isAlphaRender) {
        // In Alpha mode, we clear the canvas completely
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        // Normal Background Rendering
        ctx.fillStyle = effectiveBgColor;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (config.background.type === 'image' && bgImageRef.current) {
            const img = bgImageRef.current;
            if (img.complete) {
                ctx.save();
                const opacity = config.background.intensity ?? 1.0;
                ctx.globalAlpha = opacity;
                const scale = Math.max(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
                const x = (CANVAS_WIDTH / 2) - (img.width / 2) * scale;
                const y = (CANVAS_HEIGHT / 2) - (img.height / 2) * scale;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                ctx.restore();
            }
        } 
        else if (config.background.type === 'video' && bgVideoRef.current) {
            const vid = bgVideoRef.current;
            if (vid.readyState >= 2) {
                const vidDuration = vid.duration || 1;
                const playbackSpeed = config.background.playbackSpeed || 1.0;
                
                // Calculate where the video should logically be based on song time & speed
                const scaledTime = time * playbackSpeed;
                const targetTime = scaledTime % vidDuration;
                
                // "Soft Sync" Logic for Playback (Smooth loop, less seeking)
                if (isPlaying) {
                     // Ensure playback rate matches config
                     if (Math.abs(vid.playbackRate - playbackSpeed) > 0.1) {
                         vid.playbackRate = playbackSpeed;
                     }

                     if (vid.paused) vid.play().catch(() => {});
                     
                     // Check drift - Only correct if significantly off to avoid stutter
                     // We use a larger threshold because the browser's video engine is usually smoother than our frame ticks
                     const drift = Math.abs(vid.currentTime - targetTime);
                     const wrapDrift = Math.abs((vid.currentTime - vidDuration) - targetTime);

                     // If drift is > 0.3s, hard seek. Otherwise let it play.
                     if (drift > 0.3 && wrapDrift > 0.3) {
                         vid.currentTime = targetTime;
                     }
                } else {
                     // "Hard Sync" for paused scrubbing
                     if (Math.abs(vid.currentTime - targetTime) > 0.05) {
                        vid.currentTime = targetTime;
                     }
                     if (!vid.paused) vid.pause();
                }

                ctx.save();
                const opacity = config.background.intensity ?? 1.0;
                ctx.globalAlpha = opacity;
                const scale = Math.max(CANVAS_WIDTH / vid.videoWidth, CANVAS_HEIGHT / vid.videoHeight);
                const x = (CANVAS_WIDTH / 2) - (vid.videoWidth / 2) * scale;
                const y = (CANVAS_HEIGHT / 2) - (vid.videoHeight / 2) * scale;
                ctx.drawImage(vid, x, y, vid.videoWidth * scale, vid.videoHeight * scale);
                ctx.restore();
            }
        }
        else if (config.background.type === 'procedural') {
            const speed = config.background.intensity || 0.5;
            const style = config.background.proceduralStyle || 'grid';
            const audioData = { bass, mid, high, raw }; // Pack for helpers
            
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
        
        // Global Overlay
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;
        const bgRadius = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * (0.6 + bass * 0.2);
        const bgGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, bgRadius);
        bgGradient.addColorStop(0, 'rgba(0,0,0,0)'); 
        bgGradient.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    // --- Shockwaves (SKIP IN ALPHA) ---
    if (!isAlphaRender && audioEnabled && config.audioReactivity.visualizerStyle === 'shockwave') {
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;
        if (bass > 0.7 && Math.random() > 0.8) {
            shockwavesRef.current.push({
                id: Date.now(),
                x: cx,
                y: cy,
                radius: 50,
                alpha: 1.0,
                color: effectiveColorsActive
            });
        }
        
        shockwavesRef.current.forEach((sw, idx) => {
            sw.radius += 10 + (bass * 20);
            sw.alpha -= 0.02;
            
            if(sw.alpha <= 0) {
                shockwavesRef.current.splice(idx, 1);
            } else {
                ctx.save();
                ctx.beginPath();
                ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
                ctx.strokeStyle = sw.color;
                ctx.lineWidth = 10;
                ctx.globalAlpha = sw.alpha * 0.5;
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    // --- 2. Camera Setup ---
    ctx.save();

    let zoom = 1.0 + effectiveZoomOffset;
    if (config.camera.zoomBeat && audioEnabled) zoom += bass * 0.1;
    if (config.camera.hardKick && audioEnabled && bass > 0.7) zoom += 0.2;
    
    zoom += Math.sin(time * 0.5) * 0.02;

    let rot = effectiveRotateOffset;
    if (config.camera.rotate) {
         if (primaryActiveIndex !== -1) rot += (primaryActiveIndex % 2 === 0 ? 1 : -1) * 0.02; 
        rot += Math.sin(time * 0.2) * 0.01; 
    }

    let shakeX = 0;
    let shakeY = 0;
    if (config.camera.shake && bass > 0.6 && audioEnabled) {
        shakeX = (Math.random() - 0.5) * bass * 30;
        shakeY = (Math.random() - 0.5) * bass * 30;
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

    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.rotate(rot);
    ctx.scale(zoom, zoom);
    ctx.translate(-CANVAS_WIDTH / 2 - shakeX, -CANVAS_HEIGHT / 2 - shakeY);
    
    if (!isAlphaRender && config.effects.invert && bass > 0.7 && audioEnabled) {
        ctx.filter = 'invert(1)';
    }

    // --- 3. World Elements ---

    // Central Orb (SKIP IN ALPHA)
    if (!isAlphaRender && audioEnabled && config.audioReactivity.visualizerStyle === 'orb') {
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;
        ctx.save();
        ctx.translate(cx, cy);
        const orbRadius = (Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.2) + (bass * 100);
        
        const orbGrad = ctx.createRadialGradient(0,0, 0, 0,0, orbRadius);
        orbGrad.addColorStop(0, effectiveColorsActive);
        orbGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
        ctx.fillStyle = orbGrad;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(0,0, orbRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.strokeStyle = config.colors.secondary;
        ctx.lineWidth = 2 + (high * 5);
        for(let i=0; i<=Math.PI * 2; i+=0.1) {
            const r = orbRadius * 0.6 + (Math.sin(i * 10 + time) * 10) + (raw[Math.floor(i*10) % raw.length] || 0) * 0.5;
            const px = Math.cos(i) * r;
            const py = Math.sin(i) * r;
            if (i===0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }


    // Particles (SKIP IN ALPHA)
    if (!isAlphaRender && config.particles.enabled) {
        particlesRef.current.forEach(p => {
            const audioSpeedBoost = audioEnabled ? (1 + bass * 3.0) : 1; 
            p.x += p.vx * safeDt * 60 * audioSpeedBoost;
            p.y += p.vy * safeDt * 60 * audioSpeedBoost;
            
            let drawY = p.y;
            if (audioEnabled) {
                drawY -= mid * 50 * Math.sin(time + p.id); 
                p.angle += (0.02 + (bass * 0.2)) * audioSpeedBoost; 
            } else {
                p.angle += 0.02; 
            }

            p.x = ((p.x % CANVAS_WIDTH) + CANVAS_WIDTH) % CANVAS_WIDTH;
            p.y = ((p.y % CANVAS_HEIGHT) + CANVAS_HEIGHT) % CANVAS_HEIGHT;
            
            let drawX = p.x;
            drawY = ((drawY % CANVAS_HEIGHT) + CANVAS_HEIGHT) % CANVAS_HEIGHT;

            ctx.save();
            ctx.translate(drawX, drawY);
            ctx.rotate(p.angle);

            ctx.beginPath();
            const size = p.size * (audioEnabled ? (1 + high * 1.5) : 1);
            
            if (config.particles.shape === 'square') {
                ctx.rect(-size/2, -size/2, size, size);
            } else if (config.particles.shape === 'star') {
                 drawPolygon(ctx, 0, 0, size, 5, -Math.PI/2);
            } else if (config.particles.shape === 'hexagon') {
                 drawPolygon(ctx, 0, 0, size, 6, 0);
            } else if (config.particles.shape === 'triangle') {
                 drawPolygon(ctx, 0, 0, size, 3, -Math.PI/2);
            } else if (config.particles.shape === 'note') {
                 drawNote(ctx, 0, 0, size);
            } else {
                ctx.arc(0, 0, size, 0, Math.PI * 2);
            }

            ctx.fillStyle = p.color;
            const flash = audioEnabled ? Math.sin(time * 5 + p.phase) * mid : 0; 
            ctx.globalAlpha = Math.min(1, Math.max(0, p.alpha + flash));
            ctx.fill();
            ctx.restore();
        });
    }

    // Typography (ALWAYS RENDER)
    visibleSegments.forEach(activeSegment => {
      const lines = getLines(activeSegment.id, activeSegment.words);
      
      const isPortrait = CANVAS_HEIGHT > CANVAS_WIDTH;
      
      // -- DYNAMIC FONT SIZING FIX --
      // Initial guess: larger relative font in portrait
      let fontSize = isPortrait ? CANVAS_WIDTH * 0.13 : CANVAS_HEIGHT * 0.10; 
      
      const fontWeight = config.font.weight || '900';
      const fontStyle = config.font.italic ? 'italic' : 'normal';
      const fontFamily = config.font.family || 'Montserrat';

      // Set Font to measure
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;

      // Calculate width of longest line to prevent clipping
      let maxLineWidth = 0;
      const wordGap = fontSize * 0.3; 
      
      // First Pass: Measure widths
      lines.forEach((lineWords) => {
         let w = 0;
         lineWords.forEach((word, i) => {
             w += ctx.measureText(word.word).width;
             if (i < lineWords.length - 1) w += wordGap;
         });
         if (w > maxLineWidth) maxLineWidth = w;
      });

      // Constraint: Text must not exceed 85% of canvas width
      const maxAllowedWidth = CANVAS_WIDTH * 0.85;
      if (maxLineWidth > maxAllowedWidth) {
          const scaleFactor = maxAllowedWidth / maxLineWidth;
          fontSize *= scaleFactor;
          // Re-set font
          ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
      }

      const lineHeight = fontSize * 1.2;
      const totalHeight = lines.length * lineHeight;
      const startY = (CANVAS_HEIGHT - totalHeight) / 2 + lineHeight / 2;

      // Recalculate word spacings with final font size
      // We can use the scale factor but measuring is robust
      const finalWordGap = fontSize * 0.3;

      // --- RESOLVE SECTION ANIMATION OVERRIDES FOR THIS SEGMENT ---
      let currentSegEntrance = config.animation.entrance;
      let currentSegActive = config.animation.active;
      let currentSegExit = config.animation.exit;

      if (activeSegment.section) {
           const normalizedSection = activeSegment.section.toLowerCase().split(' ')[0] as SectionType;
           const style = config.sectionStyles?.[normalizedSection];
           if (style && style.enabled && style.animation) {
               if (style.animation.entrance) currentSegEntrance = style.animation.entrance;
               if (style.animation.active) currentSegActive = style.animation.active;
               if (style.animation.exit) currentSegExit = style.animation.exit;
           }
      }

      lines.forEach((lineWords, lineIndex) => {
         // Measure current line width
         let currentLineWidth = 0;
         const wordWidths: number[] = [];
         
         lineWords.forEach((word) => {
             const width = ctx.measureText(word.word).width;
             wordWidths.push(width);
             currentLineWidth += width;
         });
         
         // Add gaps
         if (lineWords.length > 1) {
             currentLineWidth += (lineWords.length - 1) * finalWordGap;
         }

         let currentX = (CANVAS_WIDTH - currentLineWidth) / 2;
         const currentY = startY + (lineIndex * lineHeight);

         lineWords.forEach((word, wIdx) => {
             const width = wordWidths[wIdx];
             const isPast = time > word.end;
             const isFuture = time < word.start;
             const isActive = !isPast && !isFuture;
             
             ctx.save();
             ctx.translate(currentX + width / 2, currentY);

             if (isActive) {
               ctx.fillStyle = effectiveColorsActive;
               const activeAnim = currentSegActive;

               // --- ACTIVE ANIMATIONS ---
               if (activeAnim === 'neon') {
                   const glowIntensity = (30 + (bass * 50)) * effectiveGlow;
                   ctx.shadowColor = effectiveColorsActive;
                   ctx.shadowBlur = glowIntensity; 
                   ctx.scale(1.05 + bass * 0.1, 1.05 + bass * 0.1);
               } else if (activeAnim === 'pulse') {
                   const s = 1 + (Math.sin(time * 10) * 0.1) + (bass * 0.2);
                   ctx.scale(s, s);
               } else if (activeAnim === 'bounce') {
                   const bounceY = Math.abs(Math.sin(time * 8)) * -30 * (1 + bass);
                   ctx.translate(0, bounceY);
               } else if (activeAnim === 'jitter') {
                    const jitterMag = 5 + (bass * 20);
                    ctx.translate((Math.random()-0.5)*jitterMag, (Math.random()-0.5)*jitterMag);
               } else if (activeAnim === 'wave') {
                   const waveY = Math.sin((time * 5) + (wIdx * 0.5)) * 20;
                   ctx.translate(0, waveY);
               } else if (activeAnim === 'rotate') {
                   const rot = Math.sin(time * 5) * 0.1 * (1+bass);
                   ctx.rotate(rot);
               } else if (activeAnim === 'skew') {
                   const skewAmount = Math.sin(time * 8) * 0.3 * (1 + bass);
                   ctx.transform(1, 0, skewAmount, 1, 0, 0);
               } else if (activeAnim === 'pop') {
                   const popScale = 1 + (bass > 0.6 ? bass * 0.5 : 0);
                   ctx.scale(popScale, popScale);
               } else if (activeAnim === 'flash') {
                   if (bass > 0.7 && Math.sin(time * 30) > 0) {
                       ctx.fillStyle = '#ffffff';
                       ctx.shadowBlur = 40;
                       ctx.shadowColor = '#ffffff';
                   }
               } else if (activeAnim === 'float') {
                   const floatY = Math.sin(time * 2) * 15;
                   const floatRot = Math.sin(time * 1.5) * 0.05;
                   ctx.translate(0, floatY);
                   ctx.rotate(floatRot);
               } else if (activeAnim === 'shiver') {
                   const amount = 2 + (bass * 10);
                   ctx.translate((Math.random()-0.5)*amount, (Math.random()-0.5)*amount);
               } else if (activeAnim === 'rainbow') {
                   const hue = (time * 100) % 360;
                   ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                   ctx.scale(1.05, 1.05);
               } else if (activeAnim === 'heartbeat') {
                   // Double pulse
                   const beat = (time * 2) % 1.5; 
                   let scale = 1;
                   if (beat < 0.2) scale = 1.1 + (bass * 0.2);
                   else if (beat > 0.3 && beat < 0.5) scale = 1.05 + (bass * 0.1);
                   ctx.scale(scale, scale);
               } else if (activeAnim === 'swing') {
                   // Pivot at top center (approx)
                   ctx.translate(0, -fontSize/2);
                   ctx.rotate(Math.sin(time * 3) * 0.2);
                   ctx.translate(0, fontSize/2);
               }

               ctx.textAlign = 'center';
               ctx.textBaseline = 'middle';
               
               if (config.effects.chromaticAberration && (bass > 0.4 || high > 0.6) && audioEnabled) {
                   const splitDist = (bass * 15) + (high * 5);
                   ctx.globalCompositeOperation = 'screen';
                   ctx.save();
                   ctx.fillStyle = '#ff0055'; 
                   ctx.translate(-splitDist, 0);
                   ctx.fillText(word.word, 0, 0);
                   ctx.restore();
                   ctx.save();
                   ctx.fillStyle = '#00ffff'; 
                   ctx.translate(splitDist, 0);
                   ctx.fillText(word.word, 0, 0);
                   ctx.restore();
                   ctx.fillStyle = '#ffffff';
                   ctx.fillText(word.word, 0, 0);
                   ctx.globalCompositeOperation = 'source-over';
               } else {
                   ctx.fillText(word.word, 0, 0);
               }

             } else if (isFuture) {
               const diff = word.start - time;
               if (diff < 0.6) {
                  const progress = 1 - (diff / 0.6); 
                  const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress; 
                  
                  ctx.fillStyle = effectiveColorsText;
                  ctx.globalAlpha = progress;

                  const entranceAnim = currentSegEntrance;

                  // --- ENTRANCE ANIMATIONS ---
                  if (entranceAnim === 'slam') {
                      const scale = 3 - (2 * eased); 
                      ctx.scale(scale, scale);
                      ctx.globalAlpha = Math.pow(progress, 3);
                  } else if (entranceAnim === 'slide') {
                      const yOffset = 100 * (1 - eased);
                      ctx.translate(0, yOffset);
                  } else if (entranceAnim === 'zoom') {
                      ctx.scale(eased, eased);
                  } else if (entranceAnim === 'typewriter') {
                      ctx.scale(0.95 + (0.05 * eased), 0.95 + (0.05 * eased));
                  } else if (entranceAnim === 'spin') {
                      ctx.rotate((1-eased) * Math.PI);
                      ctx.scale(eased, eased);
                  } else if (entranceAnim === 'blur') {
                      ctx.filter = `blur(${(1-eased)*10}px)`;
                  } else if (entranceAnim === 'glitch') {
                      if (Math.random() > eased) ctx.translate((Math.random()-0.5)*20, 0);
                  } else if (entranceAnim === 'elastic') {
                      const scale = easeOutElastic(progress);
                      ctx.scale(scale, scale);
                  } else if (entranceAnim === 'drop') {
                      // Fall from top
                      const yOffset = -500 * (1 - easeOutElastic(progress));
                      ctx.translate(0, yOffset);
                  } else if (entranceAnim === 'spiral') {
                      const angle = (1 - progress) * Math.PI * 4;
                      ctx.rotate(angle);
                      ctx.scale(progress, progress);
                  } else if (entranceAnim === 'inflate') {
                      // 0 -> 1.2 -> 1
                      let scale = 0;
                      if (progress < 0.7) scale = (progress / 0.7) * 1.2;
                      else scale = 1.2 - ((progress - 0.7) / 0.3) * 0.2;
                      ctx.scale(scale, scale);
                  } else if (entranceAnim === 'stretch') {
                      // Wide to Normal
                      const scaleX = 3 - (2 * eased);
                      const scaleY = eased;
                      ctx.scale(scaleX, scaleY);
                  }

                  if (effectiveGlow > 0) {
                     ctx.shadowColor = config.colors.secondary;
                     ctx.shadowBlur = 10 * progress * effectiveGlow;
                  }

                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';

                  let textToDraw = word.word;
                  if (entranceAnim === 'scramble' && progress < 1.0) {
                      // Scramble letters until finish
                      const charsToScramble = Math.floor((1 - progress) * word.word.length);
                      if (charsToScramble > 0) {
                        textToDraw = word.word.split('').map((char, idx) => {
                             // Keep first few chars correct as progress increases
                             if (idx >= word.word.length - charsToScramble) return getRandomChar();
                             return char;
                        }).join('');
                      }
                      ctx.fillStyle = '#00ff00'; // Matrix vibe override usually, but use palette?
                      // Let's stick to palette but maybe flash?
                      if (Math.random() > 0.8) ctx.fillStyle = '#ffffff';
                  }

                  ctx.fillText(textToDraw, 0, 0);
               }
             } else {
               const diff = time - word.end;
               if (diff < 0.6) {
                   const progress = diff / 0.6;
                   ctx.globalAlpha = 1 - progress;
                   ctx.fillStyle = config.colors.secondary;
                   
                   const exitAnim = currentSegExit;

                   // --- EXIT ANIMATIONS ---
                   if (exitAnim === 'zoom') {
                       const s = 1 - (progress * 0.5);
                       ctx.scale(s, s);
                   } else if (exitAnim === 'slide') {
                       ctx.translate(0, -50 * progress);
                   } else if (exitAnim === 'slam') {
                        ctx.translate(0, progress * 100);
                        ctx.rotate(progress * 0.5);
                   } else if (exitAnim === 'blur') {
                        ctx.filter = `blur(${progress*10}px)`;
                   } else if (exitAnim === 'glitch') {
                        if (Math.random() > 0.5) ctx.translate((Math.random()-0.5)*20, 0);
                   } else if (exitAnim === 'drop') {
                        ctx.translate(0, progress * 500);
                        ctx.rotate(progress * 0.2);
                   } else if (exitAnim === 'spiral') {
                       ctx.rotate(progress * Math.PI * 2);
                       ctx.scale(1 - progress, 1 - progress);
                   } else if (exitAnim === 'sink') {
                       ctx.translate(0, progress * 100);
                   } else if (exitAnim === 'burn') {
                       ctx.translate(0, -progress * 50);
                       ctx.filter = `blur(${progress * 8}px)`;
                       ctx.fillStyle = '#111'; // Charred
                   }
                   
                   ctx.textAlign = 'center';
                   ctx.textBaseline = 'middle';
                   ctx.fillText(word.word, 0, 0);
               }
             }
             
             ctx.restore();
             currentX += width + finalWordGap;
         });
      });
    });

    ctx.filter = 'none'; 
    ctx.restore(); 

    // --- 4. Post-Process Effects (Screen Space) ---

    // Kaleidoscope Effect (Likely keep for alpha if it just messes with text)
    if (config.effects.kaleidoscope) {
        const tempC = document.createElement('canvas');
        tempC.width = CANVAS_WIDTH;
        tempC.height = CANVAS_HEIGHT;
        const tempCtx = tempC.getContext('2d');
        if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0);
            
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.save();
            ctx.translate(CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
            const slices = 8;
            const step = (Math.PI * 2) / slices;
            
            for(let i=0; i<slices; i++) {
                ctx.save();
                ctx.rotate(i * step + (time * 0.2));
                ctx.beginPath();
                ctx.moveTo(0,0);
                ctx.arc(0,0, Math.max(CANVAS_WIDTH, CANVAS_HEIGHT), -step/2 - 0.01, step/2 + 0.01);
                ctx.closePath();
                ctx.clip();
                
                // Draw image rotated back so it acts as a mirror
                // Every other slice is mirrored
                if (i % 2 === 0) {
                     ctx.scale(-1, 1);
                     ctx.rotate(time * 0.1); // Add swirl
                } else {
                     ctx.rotate(-time * 0.1);
                }
                
                ctx.drawImage(tempC, -CANVAS_WIDTH/2, -CANVAS_HEIGHT/2);
                ctx.restore();
            }
            ctx.restore();
        }
    }

    if (config.effects.rgbSplit) {
        const offset = 10;
        const tempC = document.createElement('canvas');
        tempC.width = CANVAS_WIDTH;
        tempC.height = CANVAS_HEIGHT;
        const tempCtx = tempC.getContext('2d');
        if (tempCtx) {
             tempCtx.drawImage(canvas, 0, 0);
             ctx.globalCompositeOperation = 'screen';
             ctx.save();
             
             // Red Channel
             ctx.fillStyle = 'red'; // Multiply not easily done without pixel manipulation, assume add
             // Better: draw original with offsets and composite
             ctx.clearRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
             
             // Draw Red
             ctx.globalCompositeOperation = 'source-over';
             ctx.drawImage(tempC, -offset, 0);
             ctx.globalCompositeOperation = 'multiply';
             ctx.fillStyle = '#ff0000';
             ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
             
             const redLayer = ctx.getImageData(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);

             // Draw Blue
             ctx.globalCompositeOperation = 'source-over';
             ctx.drawImage(tempC, offset, 0);
             ctx.globalCompositeOperation = 'multiply';
             ctx.fillStyle = '#0000ff';
             ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
             const blueLayer = ctx.getImageData(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);

             // Draw Green (Center)
             ctx.globalCompositeOperation = 'source-over';
             ctx.drawImage(tempC, 0, 0);
             ctx.globalCompositeOperation = 'multiply';
             ctx.fillStyle = '#00ff00';
             ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
             const greenLayer = ctx.getImageData(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
             
             // Combine - simplified approach to avoid slow pixel manipulation
             // We use 'screen' blend mode on the main context with 3 offset draws
             ctx.globalCompositeOperation = 'source-over';
             // In Alpha mode, we can't fill black. 
             if (!isAlphaRender) {
                 ctx.fillStyle = 'black';
                 ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
             } else {
                 ctx.clearRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
             }
             
             ctx.globalCompositeOperation = 'screen';
             
             // Red
             ctx.save();
             ctx.translate(-offset, 0);
             ctx.drawImage(tempC, 0, 0);
             ctx.globalCompositeOperation = 'multiply';
             ctx.fillStyle = 'red';
             ctx.fillRect(0, 0, CANVAS_WIDTH + offset, CANVAS_HEIGHT);
             ctx.restore();

             // Blue
             ctx.save();
             ctx.translate(offset, 0);
             ctx.drawImage(tempC, 0, 0);
             ctx.globalCompositeOperation = 'multiply';
             ctx.fillStyle = 'blue';
             ctx.fillRect(-offset, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
             ctx.restore();

             // Green
             ctx.save();
             ctx.drawImage(tempC, 0, 0);
             ctx.globalCompositeOperation = 'multiply';
             ctx.fillStyle = 'lime';
             ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
             ctx.restore();
             
             ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // --- OVERLAY EFFECTS (SKIP ALL IN ALPHA MODE) ---
    if (!isAlphaRender) {
        if (config.effects.sepia) {
            ctx.save();
            ctx.globalCompositeOperation = 'color';
            ctx.fillStyle = 'rgba(112, 66, 20, 0.6)'; 
            ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = 'rgba(112, 66, 20, 0.3)'; 
            ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.restore();
        }

        if (config.effects.grayscale) {
            ctx.save();
            ctx.globalCompositeOperation = 'saturation';
            ctx.fillStyle = '#000000';
            ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.restore();
        }
        
        // Pixelate / Mosaic (Enhanced to react to bass if needed)
        if (config.effects.mosaic) {
            let pixelSize = 4 + (bass * 6);
            if (pixelSize > 1) {
                // To do pixelation without creating new canvas constantly, we can turn off smoothing
                const tempC = document.createElement('canvas');
                const scale = 1/pixelSize;
                tempC.width = CANVAS_WIDTH * scale;
                tempC.height = CANVAS_HEIGHT * scale;
                const tempCtx = tempC.getContext('2d');
                if (tempCtx) {
                    tempCtx.drawImage(canvas, 0, 0, tempC.width, tempC.height);
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(tempC, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    ctx.imageSmoothingEnabled = true;
                }
            }
        }
        
        // Halftone
        if (config.effects.halftone) {
             ctx.save();
             ctx.globalCompositeOperation = 'overlay';
             const dotSize = 4;
             // We can simulate with a pattern
             const pCanvas = document.createElement('canvas');
             pCanvas.width = dotSize;
             pCanvas.height = dotSize;
             const pCtx = pCanvas.getContext('2d');
             if (pCtx) {
                 pCtx.fillStyle = '#000';
                 pCtx.beginPath();
                 pCtx.arc(dotSize/2, dotSize/2, dotSize/3, 0, Math.PI*2);
                 pCtx.fill();
                 const pat = ctx.createPattern(pCanvas, 'repeat');
                 if (pat) {
                     ctx.fillStyle = pat;
                     ctx.globalAlpha = 0.3;
                     ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
                 }
             }
             ctx.restore();
        }

        // Old Movie (Scratches + Flicker)
        if (config.effects.oldMovie) {
             ctx.save();
             // Flicker
             const flicker = Math.random() * 0.1;
             ctx.fillStyle = `rgba(0,0,0,${flicker})`;
             ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
             
             // Scratches
             if (Math.random() > 0.8) {
                 const x = Math.random() * CANVAS_WIDTH;
                 ctx.beginPath();
                 ctx.moveTo(x, 0);
                 ctx.lineTo(x + (Math.random()-0.5)*2, CANVAS_HEIGHT);
                 ctx.strokeStyle = `rgba(255,255,255,${Math.random()*0.5})`;
                 ctx.lineWidth = 1;
                 ctx.stroke();
             }
             ctx.restore();
        }
        
        if (config.effects.scanlines) {
            const pat = getScanlinePattern(ctx);
            if (pat) {
                ctx.save();
                ctx.fillStyle = pat;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                ctx.restore();
            }
        }

        if (config.effects.vignette) {
            const gradient = ctx.createRadialGradient(
            CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.3,
            CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.8
            );
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        if (config.effects.filmGrain) {
            // Simple static noise
            // Optimization: Generate noise once and offset it? 
            // For now, random rects are too slow. 
            // Let's use a composite mode with random color overlay
            ctx.save();
            ctx.globalCompositeOperation = 'overlay';
            // Generating noise per frame is expensive. 
            // A simple approximation is random alpha white/black
            // but for performance in this renderer, we might skip full per-pixel noise
            // or use a pre-rendered noise texture if we had one.
            // Let's just do a very subtle flicker for now to save FPS
            ctx.fillStyle = `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, 0.03)`;
            ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
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