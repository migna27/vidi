
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { LyricData, Word, AudioVisualizerData, RendererConfig, Segment } from '../types';

interface CanvasVideoRendererProps {
  data: LyricData;
  config: RendererConfig;
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
}

export const CanvasVideoRenderer = forwardRef<CanvasVideoRendererRef, CanvasVideoRendererProps>(({
  data,
  config
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordsByLineCache = useRef<Map<string, Word[][]>>(new Map());
  
  // Deterministic Particles
  const particlesRef = useRef<Particle[]>([]);

  // Initialize or Update particles based on Config
  useEffect(() => {
    const pCount = config.particles.enabled ? config.particles.count : 0;
    
    // Resize or Init particles array
    if (particlesRef.current.length !== pCount) {
        const newParticles: Particle[] = [];
        for (let i = 0; i < pCount; i++) {
            newParticles.push({
            id: i,
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            vx: (Math.random() - 0.5) * config.particles.speed * 2,
            vy: (Math.random() - 0.5) * config.particles.speed * 2,
            size: (Math.random() * 4) + 1,
            color: config.particles.color[Math.floor(Math.random() * config.particles.color.length)] || '#fff',
            alpha: Math.random() * 0.5 + 0.2,
            phase: Math.random() * Math.PI * 2
            });
        }
        particlesRef.current = newParticles;
    } else {
        // Just update properties if count is same (e.g. speed changed)
        particlesRef.current.forEach(p => {
             p.vx = (p.vx > 0 ? 1 : -1) * Math.random() * config.particles.speed;
             p.vy = (p.vy > 0 ? 1 : -1) * Math.random() * config.particles.speed;
             // Update color palette if changed (random re-pick)
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

    const { bass, mid, high, raw } = analysis;

    // --- 0. Pre-Calculation: Visible Segments ---
    // Critical Fix: Filter all segments visible in the time window instead of just finding the first one.
    // Overlapping segments (fade out/fade in) must both be rendered.
    const visibleSegments = data.segments.filter(
      (seg) => time >= seg.start - 2.0 && time <= seg.end + 2.0
    );

    // Sort: Render earlier segments first, so later (active) segments draw on top
    visibleSegments.sort((a, b) => a.start - b.start);

    // Identify primary active segment for camera logic (the one strictly happening now)
    const primaryActiveIndex = data.segments.findIndex(
      (seg) => time >= seg.start && time <= seg.end
    );

    // --- 1. Background ---
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    
    if (config.colors.background.startsWith('#')) {
        ctx.fillStyle = config.colors.background;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Add subtle gradient overlay if it's a solid color to keep depth
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;
        const bgRadius = CANVAS_WIDTH * (0.6 + bass * 0.2);
        const bgGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, bgRadius);
        bgGradient.addColorStop(0, `${config.colors.secondary}33`); // Hex transparency 20%
        bgGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        // Fallback
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // --- 2. Camera Setup ---
    ctx.save();

    // Camera Parameters
    let zoom = 1.0;
    if (config.camera.zoomBeat) {
        zoom += bass * 0.1;
    }
    const breathZoom = Math.sin(time * 0.5) * 0.02;
    zoom += breathZoom;

    let rot = 0;
    if (config.camera.rotate) {
         if (primaryActiveIndex !== -1) {
            rot = (primaryActiveIndex % 2 === 0 ? 1 : -1) * 0.02; 
        }
        rot += Math.sin(time * 0.2) * 0.01; // drift
    }

    let shakeX = 0;
    let shakeY = 0;
    if (config.camera.shake && bass > 0.6) {
        shakeX = (Math.random() - 0.5) * bass * 30;
        shakeY = (Math.random() - 0.5) * bass * 30;
    }

    // Apply Transform
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.rotate(rot);
    ctx.scale(zoom, zoom);
    ctx.translate(-CANVAS_WIDTH / 2 - shakeX, -CANVAS_HEIGHT / 2 - shakeY);

    // --- 3. World Elements ---

    // Particles
    if (config.particles.enabled) {
        particlesRef.current.forEach(p => {
            let nx = p.x + (p.vx * time * 60 * 0.5); 
            let ny = p.y + (p.vy * time * 60 * 0.5);
            ny -= mid * 50 * Math.sin(time + p.id); // React to Mid

            nx = ((nx % CANVAS_WIDTH) + CANVAS_WIDTH) % CANVAS_WIDTH;
            ny = ((ny % CANVAS_HEIGHT) + CANVAS_HEIGHT) % CANVAS_HEIGHT;

            ctx.beginPath();
            const size = p.size * (1 + high * 1.5);
            
            if (config.particles.shape === 'square') {
                ctx.rect(nx, ny, size, size);
            } else if (config.particles.shape === 'star') {
                // Simplified diamond for star
                 ctx.moveTo(nx, ny - size);
                 ctx.lineTo(nx + size, ny);
                 ctx.lineTo(nx, ny + size);
                 ctx.lineTo(nx - size, ny);
                 ctx.closePath();
            } else {
                ctx.arc(nx, ny, size, 0, Math.PI * 2);
            }

            ctx.fillStyle = p.color;
            const flash = Math.sin(time * 5 + p.phase) * mid; 
            ctx.globalAlpha = Math.min(1, Math.max(0, p.alpha + flash));
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });
    }

    // Typography - Iterate through ALL visible segments
    visibleSegments.forEach(activeSegment => {
      const lines = getLines(activeSegment.id, activeSegment.words);
      const lineHeight = 140; // Slightly larger spacing
      const totalHeight = lines.length * lineHeight;
      const startY = (CANVAS_HEIGHT - totalHeight) / 2 + lineHeight / 2;
      const baseFontSize = 100;

      ctx.font = `900 ${baseFontSize}px "Montserrat", sans-serif`;

      lines.forEach((lineWords, lineIndex) => {
         // Measure
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
               // --- ACTIVE WORD ---
               
               // 1. Color
               ctx.fillStyle = config.colors.active;

               // 2. Animation Style
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
               }

               // Draw Main Text
               ctx.textAlign = 'center';
               ctx.textBaseline = 'middle';
               
               // Glitch / Chromatic Aberration
               if (config.effects.chromaticAberration && (bass > 0.4 || high > 0.6)) {
                   const splitDist = (bass * 15) + (high * 5);
                   ctx.globalCompositeOperation = 'screen';
                   
                   ctx.save();
                   ctx.fillStyle = '#ff0055'; // Red-Pink
                   ctx.translate(-splitDist, 0);
                   ctx.fillText(word.word, 0, 0);
                   ctx.restore();
                   
                   ctx.save();
                   ctx.fillStyle = '#00ffff'; // Cyan
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
               // --- ENTRANCE ---
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
                      // Fallback for simple fade + slight scale for typewriter feel
                      ctx.scale(0.95 + (0.05 * eased), 0.95 + (0.05 * eased));
                  }
                  
                  // Common shadow
                  if (config.effects.glow > 0) {
                     ctx.shadowColor = config.colors.secondary;
                     ctx.shadowBlur = 10 * progress * config.effects.glow;
                  }

                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(word.word, 0, 0);
               }
             } else {
               // --- EXIT ---
               const diff = time - word.end;
               if (diff < 0.6) {
                   const progress = diff / 0.6;
                   ctx.globalAlpha = 1 - progress;
                   ctx.fillStyle = config.colors.secondary; // Dimmed
                   
                   if (config.animation.exit === 'zoom') {
                       const s = 1 - (progress * 0.5);
                       ctx.scale(s, s);
                   } else if (config.animation.exit === 'slide') {
                       ctx.translate(0, -50 * progress);
                   } else if (config.animation.exit === 'slam') {
                        ctx.translate(0, progress * 100);
                        ctx.rotate(progress * 0.5);
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

    // --- 4. Post-Process (Screen Space) ---
    ctx.restore(); 

    // Vignette
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

    // Scanlines
    if (config.effects.scanlines) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = 0; i < CANVAS_HEIGHT; i += 4) {
            ctx.fillRect(0, i, CANVAS_WIDTH, 1);
        }
    }

    // Film Grain
    if (config.effects.filmGrain) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        for(let i=0; i<400; i++) {
            const x = Math.random() * CANVAS_WIDTH;
            const y = Math.random() * CANVAS_HEIGHT;
            ctx.fillRect(x, y, 2, 2);
        }
    }

    // Audio Spectrum (Minimal Overlay)
    if (raw.length > 0) {
        const bufferLength = raw.length;
        const displayCount = Math.min(bufferLength, 64);
        const barWidth = (CANVAS_WIDTH / displayCount) * 1.2;
        let xPos = 0;
        const startX = (CANVAS_WIDTH - (displayCount * (barWidth + 2))) / 2;

        for (let i = 0; i < displayCount; i++) {
            const value = raw[i];
            const barHeight = Math.pow(value / 255, 1.8) * (CANVAS_HEIGHT * 0.2);

            if (barHeight > 5) {
                // Bar color derived from palette
                ctx.fillStyle = `${config.colors.secondary}66`; // 40% opacity
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
