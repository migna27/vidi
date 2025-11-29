
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { LyricData, Word, AudioVisualizerData, RendererConfig, ParticleShape } from '../types';

interface CanvasVideoRendererProps {
  data: LyricData;
  config: RendererConfig;
  isPlaying: boolean;
}

export interface CanvasVideoRendererRef {
  drawFrame: (time: number, analysisData: AudioVisualizerData) => void;
  canvas: HTMLCanvasElement | null;
}

// 16:9 Full HD Canvas
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

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

// Helper for Procedural Grid
const drawGrid = (ctx: CanvasRenderingContext2D, time: number, color: string, speed: number) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    
    // Horizon line
    const horizon = CANVAS_HEIGHT * 0.55;
    
    // Vertical lines (perspective)
    const centerX = CANVAS_WIDTH / 2;
    for (let i = -10; i <= 10; i++) {
        const x = centerX + (i * 200);
        ctx.beginPath();
        ctx.moveTo(centerX, horizon); // Vanishing point
        ctx.lineTo(x + (i * 300), CANVAS_HEIGHT);
        ctx.stroke();
    }
    
    // Horizontal lines (moving)
    const offset = (time * 200 * speed) % 100;
    for(let y = horizon; y < CANVAS_HEIGHT; y += 20 + ((y-horizon)*0.1)) {
        const moveY = y + offset;
        if(moveY > CANVAS_HEIGHT) continue;
        
        ctx.beginPath();
        ctx.moveTo(0, moveY);
        ctx.lineTo(CANVAS_WIDTH, moveY);
        ctx.stroke();
    }
    
    // Horizon glow
    const grad = ctx.createLinearGradient(0, horizon, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, color);
    grad.addColorStop(0.2, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, horizon, CANVAS_WIDTH, CANVAS_HEIGHT - horizon);

    ctx.restore();
};

// Helper for Plasma
const drawPlasma = (ctx: CanvasRenderingContext2D, time: number, color: string, speed: number) => {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    const count = 5;
    for(let i=0; i<count; i++) {
        const t = time * speed + i;
        const x = CANVAS_WIDTH/2 + Math.sin(t) * 400;
        const y = CANVAS_HEIGHT/2 + Math.cos(t * 1.3) * 300;
        const r = 300 + Math.sin(t * 0.5) * 100;
        
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grad;
        ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    ctx.restore();
};

// Helper for Stars
const drawStars = (ctx: CanvasRenderingContext2D, time: number, color: string, speed: number) => {
    ctx.save();
    ctx.fillStyle = color;
    // Deterministic stars based on time offset
    const starCount = 200;
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    
    for(let i=0; i<starCount; i++) {
        let x = (Math.sin(i * 132.1) * CANVAS_WIDTH);
        let y = (Math.cos(i * 53.7) * CANVAS_HEIGHT);
        let z = (i * 10 + (time * 500 * speed)) % 2000;
        
        if (z < 1) z = 1;
        const perspective = 500 / z;
        const sx = cx + x * perspective;
        const sy = cy + y * perspective;
        const size = (1 - z/2000) * 4;
        
        if (sx > 0 && sx < CANVAS_WIDTH && sy > 0 && sy < CANVAS_HEIGHT) {
             ctx.globalAlpha = 1 - z/2000;
             ctx.beginPath();
             ctx.arc(sx, sy, size, 0, Math.PI * 2);
             ctx.fill();
        }
    }
    ctx.restore();
};

// Helper for Tunnel
const drawTunnel = (ctx: CanvasRenderingContext2D, time: number, color: string, speed: number) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    
    const count = 15;
    const offset = (time * speed) % 1;
    
    for(let i=0; i<count; i++) {
        const progress = (i + offset) / count; // 0 to 1
        const scale = Math.pow(progress, 3) * Math.max(CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.globalAlpha = progress;
        ctx.beginPath();
        ctx.rect(cx - scale/2, cy - scale/2, scale, scale);
        ctx.stroke();
        
        if (i === count - 1) {
            ctx.beginPath();
            ctx.moveTo(0,0); ctx.lineTo(cx, cy);
            ctx.moveTo(CANVAS_WIDTH, 0); ctx.lineTo(cx, cy);
            ctx.moveTo(0, CANVAS_HEIGHT); ctx.lineTo(cx, cy);
            ctx.moveTo(CANVAS_WIDTH, CANVAS_HEIGHT); ctx.lineTo(cx, cy);
            ctx.stroke();
        }
    }
    ctx.restore();
}

// Helper for Optimized Matrix Rain
const drawMatrix = (ctx: CanvasRenderingContext2D, time: number, color: string, speed: number) => {
    ctx.save();
    ctx.fillStyle = color;
    
    const fontSize = 35; 
    ctx.font = `${fontSize}px monospace`;
    
    const columns = Math.ceil(CANVAS_WIDTH / fontSize);
    
    for(let i=0; i<columns; i++) {
        const randomFactor = Math.abs(Math.sin(i * 123.45));
        const colSpeed = (randomFactor * 0.5 + 1.0) * speed * 250; 
        const offset = Math.cos(i * 67.89) * CANVAS_HEIGHT;
        
        let y = (time * colSpeed + offset) % (CANVAS_HEIGHT + 300);
        if (y < 0) y += CANVAS_HEIGHT + 300;
        y -= 300; 
        
        const charCount = 8 + Math.floor(randomFactor * 6);
        
        for(let j=0; j<charCount; j++) {
            const charY = y - (j * fontSize);
            if (charY > -fontSize && charY < CANVAS_HEIGHT + fontSize) {
                ctx.globalAlpha = (1 - (j / charCount)) * 0.7;
                const charCode = 0x30A0 + ((Math.floor(time * i) + j) % 90); 
                const char = String.fromCharCode(charCode);
                ctx.fillText(char, i * fontSize, charY);
            }
        }
    }
    ctx.restore();
}

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
  
  // Media Refs
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  // Load Media when Config Changes
  useEffect(() => {
    if (config.background.type === 'image' && config.background.url) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = config.background.url;
        bgImageRef.current = img;
    } else {
        bgImageRef.current = null;
    }

    if (config.background.type === 'video' && config.background.url) {
        const vid = document.createElement('video');
        vid.crossOrigin = "anonymous";
        vid.src = config.background.url;
        vid.loop = true;
        vid.muted = true;
        vid.load();
        bgVideoRef.current = vid;
    } else {
        if(bgVideoRef.current) {
            bgVideoRef.current.pause();
            bgVideoRef.current = null;
        }
    }
  }, [config.background.type, config.background.url]);

  // Manage Video Playback
  useEffect(() => {
    if (bgVideoRef.current) {
        if (isPlaying) {
             bgVideoRef.current.play().catch(() => {});
        } else {
             bgVideoRef.current.pause();
        }
    }
  }, [isPlaying]);

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
             p.vx = (p.vx > 0 ? 1 : -1) * Math.random() * config.particles.speed;
             p.vy = (p.vy > 0 ? 1 : -1) * Math.random() * config.particles.speed;
             if (!config.particles.color.includes(p.color)) {
                 p.color = config.particles.color[Math.floor(Math.random() * config.particles.color.length)] || '#fff';
             }
        });
    }

  }, [config.particles.count, config.particles.speed, config.particles.enabled, config.particles.color]);

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

  const drawScene = (time: number, analysis: AudioVisualizerData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // --- Audio Reactivity Handling ---
    let { bass, mid, high, raw } = analysis;
    const audioEnabled = config.audioReactivity.enabled;
    const sensitivity = config.audioReactivity.sensitivity;
    
    // If audio reactivity is disabled, zero out values for visual effects
    if (!audioEnabled) {
        bass = 0;
        mid = 0;
        high = 0;
    } else {
        bass *= sensitivity;
        mid *= sensitivity;
        high *= sensitivity;
    }

    const visibleSegments = data.segments.filter(
      (seg) => time >= seg.start - 2.0 && time <= seg.end + 2.0
    );
    visibleSegments.sort((a, b) => a.start - b.start);

    const primaryActiveIndex = data.segments.findIndex(
      (seg) => time >= seg.start && time <= seg.end
    );

    // --- 1. Background Rendering ---
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    
    // Fill base color first
    ctx.fillStyle = config.background.color || '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (config.background.type === 'image' && bgImageRef.current) {
        const img = bgImageRef.current;
        if (img.complete) {
            const scale = Math.max(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
            const x = (CANVAS_WIDTH / 2) - (img.width / 2) * scale;
            const y = (CANVAS_HEIGHT / 2) - (img.height / 2) * scale;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        }
    } 
    else if (config.background.type === 'video' && bgVideoRef.current) {
        const vid = bgVideoRef.current;
        if (vid.readyState >= 2) {
            if (Math.abs(vid.currentTime - (time % vid.duration)) > 0.05) {
                 vid.currentTime = time % vid.duration;
            }
            const scale = Math.max(CANVAS_WIDTH / vid.videoWidth, CANVAS_HEIGHT / vid.videoHeight);
            const x = (CANVAS_WIDTH / 2) - (vid.videoWidth / 2) * scale;
            const y = (CANVAS_HEIGHT / 2) - (vid.videoHeight / 2) * scale;
            ctx.drawImage(vid, x, y, vid.videoWidth * scale, vid.videoHeight * scale);
        }
    }
    else if (config.background.type === 'procedural') {
        const speed = config.background.intensity || 0.5;
        const style = config.background.proceduralStyle || 'grid';
        
        if (style === 'grid') drawGrid(ctx, time, config.background.color, speed);
        if (style === 'plasma') drawPlasma(ctx, time, config.background.color, speed);
        if (style === 'stars') drawStars(ctx, time, config.background.color, speed);
        if (style === 'tunnel') drawTunnel(ctx, time, config.background.color, speed);
        if (style === 'matrix') drawMatrix(ctx, time, config.background.color, speed);
    }
    
    // Global Overlay
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    const bgRadius = CANVAS_WIDTH * (0.6 + bass * 0.2);
    const bgGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, bgRadius);
    bgGradient.addColorStop(0, 'rgba(0,0,0,0)'); 
    bgGradient.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // --- Shockwaves (Audio Reactive Background) ---
    if (audioEnabled && config.audioReactivity.visualizerStyle === 'shockwave') {
        if (bass > 0.7 && Math.random() > 0.8) {
            shockwavesRef.current.push({
                id: Date.now(),
                x: cx,
                y: cy,
                radius: 50,
                alpha: 1.0,
                color: config.colors.active
            });
        }
        
        // Update and draw shockwaves
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

    let zoom = 1.0;
    if (config.camera.zoomBeat && audioEnabled) {
        zoom += bass * 0.1;
    }
    const breathZoom = Math.sin(time * 0.5) * 0.02;
    zoom += breathZoom;

    let rot = 0;
    if (config.camera.rotate) {
         if (primaryActiveIndex !== -1) {
            rot = (primaryActiveIndex % 2 === 0 ? 1 : -1) * 0.02; 
        }
        rot += Math.sin(time * 0.2) * 0.01; 
    }

    let shakeX = 0;
    let shakeY = 0;
    if (config.camera.shake && bass > 0.6 && audioEnabled) {
        shakeX = (Math.random() - 0.5) * bass * 30;
        shakeY = (Math.random() - 0.5) * bass * 30;
    }

    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.rotate(rot);
    ctx.scale(zoom, zoom);
    ctx.translate(-CANVAS_WIDTH / 2 - shakeX, -CANVAS_HEIGHT / 2 - shakeY);
    
    if (config.effects.invert && bass > 0.7 && audioEnabled) {
        ctx.filter = 'invert(1)';
    }

    // --- 3. World Elements ---

    // Central Orb (Audio Reactive)
    if (audioEnabled && config.audioReactivity.visualizerStyle === 'orb') {
        ctx.save();
        ctx.translate(cx, cy);
        const orbRadius = 200 + (bass * 100);
        
        // Core
        const orbGrad = ctx.createRadialGradient(0,0, 0, 0,0, orbRadius);
        orbGrad.addColorStop(0, config.colors.active);
        orbGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
        ctx.fillStyle = orbGrad;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(0,0, orbRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Jittery Ring
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


    // Particles
    if (config.particles.enabled) {
        particlesRef.current.forEach(p => {
            let nx = p.x + (p.vx * time * 60 * 0.5); 
            let ny = p.y + (p.vy * time * 60 * 0.5);
            
            // Audio Reaction on Particles
            if (audioEnabled) {
                ny -= mid * 50 * Math.sin(time + p.id); 
                p.angle += 0.02 + (bass * 0.1); // Rotate faster on bass
            } else {
                p.angle += 0.02; // Constant rotation
            }

            nx = ((nx % CANVAS_WIDTH) + CANVAS_WIDTH) % CANVAS_WIDTH;
            ny = ((ny % CANVAS_HEIGHT) + CANVAS_HEIGHT) % CANVAS_HEIGHT;

            ctx.save();
            ctx.translate(nx, ny);
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

    // Typography
    visibleSegments.forEach(activeSegment => {
      const lines = getLines(activeSegment.id, activeSegment.words);
      const lineHeight = 140; 
      const totalHeight = lines.length * lineHeight;
      const startY = (CANVAS_HEIGHT - totalHeight) / 2 + lineHeight / 2;
      const baseFontSize = 100;

      const fontWeight = config.font.weight || '900';
      const fontStyle = config.font.italic ? 'italic' : 'normal';
      const fontFamily = config.font.family || 'Montserrat';
      ctx.font = `${fontStyle} ${fontWeight} ${baseFontSize}px "${fontFamily}", sans-serif`;

      lines.forEach((lineWords, lineIndex) => {
         let lineWidth = 0;
         const wordSpacings: number[] = [];
         
         lineWords.forEach((word) => {
             const width = ctx.measureText(word.word).width;
             wordSpacings.push(width);
             lineWidth += width + 40; 
         });
         lineWidth -= 40; 

         let currentX = (CANVAS_WIDTH - lineWidth) / 2;
         const currentY = startY + (lineIndex * lineHeight);

         lineWords.forEach((word, wIdx) => {
             const width = wordSpacings[wIdx];
             const isPast = time > word.end;
             const isFuture = time < word.start;
             const isActive = !isPast && !isFuture;
             
             ctx.save();
             ctx.translate(currentX + width / 2, currentY);

             if (isActive) {
               ctx.fillStyle = config.colors.active;

               if (config.animation.active === 'neon') {
                   const glowIntensity = (30 + (bass * 50)) * config.effects.glow;
                   ctx.shadowColor = config.colors.active;
                   ctx.shadowBlur = glowIntensity; 
                   ctx.scale(1.05 + bass * 0.1, 1.05 + bass * 0.1);
               } else if (config.animation.active === 'pulse') {
                   const s = 1 + (Math.sin(time * 10) * 0.1) + (bass * 0.2);
                   ctx.scale(s, s);
               } else if (config.animation.active === 'bounce') {
                   const bounceY = Math.abs(Math.sin(time * 8)) * -30 * (1 + bass);
                   ctx.translate(0, bounceY);
               } else if (config.animation.active === 'jitter') {
                    const jitterMag = 5 + (bass * 20);
                    ctx.translate((Math.random()-0.5)*jitterMag, (Math.random()-0.5)*jitterMag);
               } else if (config.animation.active === 'wave') {
                   const waveY = Math.sin((time * 5) + (wIdx * 0.5)) * 20;
                   ctx.translate(0, waveY);
               } else if (config.animation.active === 'rotate') {
                   const rot = Math.sin(time * 5) * 0.1 * (1+bass);
                   ctx.rotate(rot);
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
                  const progress = 1 - (diff / 0.6); // 0 to 1
                  const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress; 
                  
                  ctx.fillStyle = config.colors.text;
                  ctx.globalAlpha = progress;

                  if (config.animation.entrance === 'slam') {
                      const scale = 3 - (2 * eased); 
                      ctx.scale(scale, scale);
                      ctx.globalAlpha = Math.pow(progress, 3);
                  } else if (config.animation.entrance === 'slide') {
                      const yOffset = 100 * (1 - eased);
                      ctx.translate(0, yOffset);
                  } else if (config.animation.entrance === 'zoom') {
                      ctx.scale(eased, eased);
                  } else if (config.animation.entrance === 'typewriter') {
                      ctx.scale(0.95 + (0.05 * eased), 0.95 + (0.05 * eased));
                  } else if (config.animation.entrance === 'spin') {
                      ctx.rotate((1-eased) * Math.PI);
                      ctx.scale(eased, eased);
                  } else if (config.animation.entrance === 'blur') {
                      ctx.filter = `blur(${(1-eased)*10}px)`;
                  } else if (config.animation.entrance === 'glitch') {
                      if (Math.random() > eased) ctx.translate((Math.random()-0.5)*20, 0);
                  }
                  
                  if (config.effects.glow > 0) {
                     ctx.shadowColor = config.colors.secondary;
                     ctx.shadowBlur = 10 * progress * config.effects.glow;
                  }

                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(word.word, 0, 0);
               }
             } else {
               const diff = time - word.end;
               if (diff < 0.6) {
                   const progress = diff / 0.6;
                   ctx.globalAlpha = 1 - progress;
                   ctx.fillStyle = config.colors.secondary;
                   
                   if (config.animation.exit === 'zoom') {
                       const s = 1 - (progress * 0.5);
                       ctx.scale(s, s);
                   } else if (config.animation.exit === 'slide') {
                       ctx.translate(0, -50 * progress);
                   } else if (config.animation.exit === 'slam') {
                        ctx.translate(0, progress * 100);
                        ctx.rotate(progress * 0.5);
                   } else if (config.animation.exit === 'blur') {
                        ctx.filter = `blur(${progress*10}px)`;
                   } else if (config.animation.exit === 'glitch') {
                        if (Math.random() > 0.5) ctx.translate((Math.random()-0.5)*20, 0);
                   }
                   
                   ctx.textAlign = 'center';
                   ctx.textBaseline = 'middle';
                   ctx.fillText(word.word, 0, 0);
               }
             }
             
             ctx.restore();
             currentX += width + 40;
         });
      });
    });

    ctx.filter = 'none'; // Reset filter
    ctx.restore(); // Exit World Space

    // --- 4. Post-Process Effects (Screen Space) ---

    if (config.effects.mirror) {
        ctx.save();
        const w = CANVAS_WIDTH / 2;
        const h = CANVAS_HEIGHT;
        ctx.save();
        ctx.translate(CANVAS_WIDTH, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(canvas, 0, 0, w, h, 0, 0, w, h);
        ctx.restore();
        ctx.restore();
    }
    
    if (config.effects.vignette) {
        const vignette = ctx.createRadialGradient(
            CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT/2, 
            CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH/1.1
        );
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = vignette;
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
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        for(let i=0; i<100; i++) {
            const x = Math.random() * CANVAS_WIDTH;
            const y = Math.random() * CANVAS_HEIGHT;
            ctx.fillRect(x, y, 2, 2);
        }
    }

    // Audio Spectrum Overlay
    if (audioEnabled && config.audioReactivity.visualizerStyle === 'spectrum' && raw.length > 0) {
        const bufferLength = raw.length;
        const displayCount = Math.min(bufferLength, 64);
        const barWidth = (CANVAS_WIDTH / displayCount) * 1.2;
        let xPos = 0;
        const startX = (CANVAS_WIDTH - (displayCount * (barWidth + 2))) / 2;

        for (let i = 0; i < displayCount; i++) {
            const value = raw[i];
            const barHeight = Math.pow(value / 255, 1.8) * (CANVAS_HEIGHT * 0.2);

            if (barHeight > 5) {
                ctx.fillStyle = `${config.colors.secondary}66`;
                ctx.fillRect(startX + xPos, CANVAS_HEIGHT - barHeight, barWidth, barHeight);
            }
            xPos += barWidth + 2;
        }
    }
  };

  useImperativeHandle(ref, () => ({
    drawFrame: drawScene,
    canvas: canvasRef.current
  }));

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
