
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { LyricData, Word, AudioVisualizerData } from '../types';

interface CanvasVideoRendererProps {
  data: LyricData;
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

const COLORS = ['#22d3ee', '#a855f7', '#ffffff', '#38bdf8', '#c084fc'];

export const CanvasVideoRenderer = forwardRef<CanvasVideoRendererRef, CanvasVideoRendererProps>(({
  data
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordsByLineCache = useRef<Map<string, Word[][]>>(new Map());
  
  // Deterministic Particles
  const particlesRef = useRef<Particle[]>([]);

  // Initialize particles strictly once
  useEffect(() => {
    if (particlesRef.current.length === 0) {
      // Seeded-like generation
      for (let i = 0; i < 150; i++) {
        particlesRef.current.push({
          id: i,
          x: (Math.sin(i * 12.34) * 0.5 + 0.5) * CANVAS_WIDTH,
          y: (Math.cos(i * 56.78) * 0.5 + 0.5) * CANVAS_HEIGHT,
          vx: (Math.sin(i * 99.11) - 0.5) * 1.5,
          vy: (Math.cos(i * 11.22) - 0.5) * 1.5,
          size: (Math.sin(i) * 0.5 + 0.5) * 4 + 1,
          color: COLORS[i % COLORS.length],
          alpha: (Math.sin(i * 3) * 0.5 + 0.5) * 0.5 + 0.2,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }, []);

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

    // --- 0. Pre-Calculation: Active Segment ---
    const activeSegmentIndex = data.segments.findIndex(
      (seg) => time >= seg.start - 1.0 && time <= seg.end + 2.0
    );
    const activeSegment = activeSegmentIndex !== -1 ? data.segments[activeSegmentIndex] : null;

    // --- 1. Background (Screen Space) ---
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Pulsing Gradient Background
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const bgRadius = CANVAS_WIDTH * (0.6 + bass * 0.3);
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, bgRadius);
    const bgOpacity = 0.15 + (bass * 0.25);
    
    bgGradient.addColorStop(0, `rgba(34, 211, 238, ${bgOpacity})`);
    bgGradient.addColorStop(0.5, `rgba(168, 85, 247, ${bgOpacity * 0.5})`);
    bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // --- 2. Camera Setup ---
    ctx.save();

    // Camera Parameters
    // A. Zoom: Pulse on Bass + Slow Breathing
    const baseZoom = 1.05; 
    const beatZoom = bass * 0.1; 
    const breathZoom = Math.sin(time * 0.5) * 0.02;
    const totalZoom = baseZoom + beatZoom + breathZoom;

    // B. Rotation: Tilt based on segment index + slow drift
    let targetTilt = 0;
    if (activeSegmentIndex !== -1) {
        targetTilt = (activeSegmentIndex % 2 === 0 ? 1 : -1) * 0.03; 
    }
    const driftRot = Math.sin(time * 0.2) * 0.015;
    
    // Camera Shake on heavy bass
    const shakeX = bass > 0.6 ? (Math.random() - 0.5) * bass * 40 : 0;
    const shakeY = bass > 0.6 ? (Math.random() - 0.5) * bass * 40 : 0;
    const shakeRot = bass > 0.7 ? (Math.random() - 0.5) * 0.02 : 0;

    const totalRot = targetTilt + driftRot + shakeRot;

    // C. Pan
    const panX = Math.sin(time * 0.3) * 30 + shakeX;
    const panY = Math.cos(time * 0.4) * 20 + shakeY;

    // Apply Transform
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.rotate(totalRot);
    ctx.scale(totalZoom, totalZoom);
    ctx.translate(-CANVAS_WIDTH / 2 - panX, -CANVAS_HEIGHT / 2 - panY);

    // --- 3. World Elements ---

    // Particles (Background)
    particlesRef.current.forEach(p => {
        let nx = p.x + (p.vx * time * 60 * 0.5); 
        let ny = p.y + (p.vy * time * 60 * 0.5);
        ny -= mid * 50 * Math.sin(time + p.id); // React to Mid

        nx = ((nx % CANVAS_WIDTH) + CANVAS_WIDTH) % CANVAS_WIDTH;
        ny = ((ny % CANVAS_HEIGHT) + CANVAS_HEIGHT) % CANVAS_HEIGHT;

        ctx.beginPath();
        const size = p.size * (1 + high * 2);
        ctx.arc(nx, ny, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        const flash = Math.sin(time * 5 + p.phase) * mid; 
        ctx.globalAlpha = Math.min(1, Math.max(0, p.alpha + flash));
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // Typography
    if (activeSegment) {
      const lines = getLines(activeSegment.id, activeSegment.words);
      const lineHeight = 130;
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
             
             // Use word hash for deterministic random effect selection
             const wordHash = (word.start * 1000 + wIdx) % 3; 

             ctx.save();
             ctx.translate(currentX + width / 2, currentY);

             if (isActive) {
               // --- ACTIVE WORD ---
               
               // Audio-Reactive Glow
               const glowIntensity = 30 + (bass * 60) + (mid * 40);
               ctx.shadowColor = `rgba(56, 189, 248, ${0.7 + bass * 0.3})`;
               ctx.shadowBlur = glowIntensity; 
               
               // Fill Color Pulse
               const lightness = 50 + (bass * 40);
               ctx.fillStyle = `hsl(190, 90%, ${lightness}%)`;
               
               // Active "Pop" + Jitter
               const jitterX = (Math.random() - 0.5) * bass * 10;
               const jitterY = (Math.random() - 0.5) * bass * 10;
               const scale = 1.1 + (bass * 0.15) + (mid * 0.05);
               
               ctx.translate(jitterX, jitterY);
               ctx.scale(scale, scale);

               // Draw Main Text
               ctx.textAlign = 'center';
               ctx.textBaseline = 'middle';
               
               // Chromatic Aberration (RGB Split) on High Impact
               if (bass > 0.4 || high > 0.6) {
                   const splitDist = (bass * 15) + (high * 10);
                   
                   ctx.globalCompositeOperation = 'screen';
                   
                   // Red Channel
                   ctx.save();
                   ctx.fillStyle = 'rgba(255, 0, 80, 0.8)';
                   ctx.translate(-splitDist, 0);
                   ctx.fillText(word.word, 0, 0);
                   ctx.restore();
                   
                   // Blue Channel
                   ctx.save();
                   ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
                   ctx.translate(splitDist, 0);
                   ctx.fillText(word.word, 0, 0);
                   ctx.restore();
                   
                   // White Center
                   ctx.fillStyle = '#ffffff';
                   ctx.fillText(word.word, 0, 0);
                   
                   ctx.globalCompositeOperation = 'source-over';
               } else {
                   ctx.fillText(word.word, 0, 0);
               }

             } else if (isFuture) {
               // --- ENTRANCE ANIMATIONS ---
               const diff = word.start - time;
               if (diff < 0.6) {
                  const progress = 1 - (diff / 0.6); // 0 to 1
                  const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress; // easeInOut
                  
                  ctx.fillStyle = "#ffffff";
                  ctx.shadowColor = "rgba(255,255,255,0.5)";
                  ctx.shadowBlur = 10 * progress;
                  ctx.globalAlpha = progress;

                  // Select Animation based on Hash
                  if (wordHash === 0) {
                      // 1. Slam (Big to Normal)
                      const scale = 3 - (2 * eased); 
                      ctx.scale(scale, scale);
                      ctx.globalAlpha = Math.pow(progress, 3);
                  } else if (wordHash === 1) {
                      // 2. Slide Up + Fade
                      const yOffset = 100 * (1 - eased);
                      ctx.translate(0, yOffset);
                      const skew = (1-eased) * 0.5;
                      ctx.transform(1, skew, 0, 1, 0, 0); // Skew
                  } else {
                      // 3. Unfold (Scale Y)
                      ctx.scale(1, eased);
                  }
                  
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(word.word, 0, 0);
               }
             } else {
               // --- EXIT ANIMATIONS ---
               const diff = time - word.end;
               // Fade out over 0.8s
               if (diff < 0.8) {
                   const progress = diff / 0.8;
                   ctx.globalAlpha = 1 - progress;
                   ctx.fillStyle = "#9ca3af";
                   
                   // Drift away
                   if (wordHash === 0) {
                       ctx.translate(0, -50 * progress); // Float Up
                       ctx.scale(1 + progress * 0.2, 1 + progress * 0.2);
                   } else if (wordHash === 1) {
                       ctx.translate(progress * 50, 0); // Drift Right
                       ctx.rotate(progress * 0.2);
                   } else {
                       ctx.scale(1 - progress * 0.3, 1 - progress * 0.3); // Shrink
                       ctx.filter = `blur(${progress * 10}px)`; // Requires canvas filter support
                   }
                   
                   ctx.textAlign = 'center';
                   ctx.textBaseline = 'middle';
                   ctx.fillText(word.word, 0, 0);
                   ctx.filter = 'none'; // Reset filter
               }
             }
             
             ctx.restore();
             currentX += width + 40;
         });
      });
    }

    // --- 4. Post-Process (Screen Space) ---
    ctx.restore(); // Back to screen space

    // Vignette
    const vignette = ctx.createRadialGradient(
        CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT/2, 
        CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH/1.2
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Spectrum Bars
    const bufferLength = raw.length;
    const displayCount = Math.min(bufferLength, 64);
    const barWidth = (CANVAS_WIDTH / displayCount) * 1.2;
    let xPos = 0;
    const startX = (CANVAS_WIDTH - (displayCount * (barWidth + 2))) / 2;

    for (let i = 0; i < displayCount; i++) {
        const value = raw[i];
        const barHeight = Math.pow(value / 255, 1.8) * (CANVAS_HEIGHT * 0.3);

        if (barHeight > 5) {
            const hue = 180 + (i / displayCount) * 120 + (bass * 30);
            const sat = 80 + (mid * 20);
            const light = 50 + (high * 30);

            ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, 0.6)`;
            ctx.fillRect(startX + xPos, CANVAS_HEIGHT - barHeight, barWidth, barHeight);
            
            // Reflection
            ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, 0.15)`;
            ctx.fillRect(startX + xPos, CANVAS_HEIGHT - barHeight - (barHeight * 0.2), barWidth, barHeight * 0.2);
        }
        xPos += barWidth + 2;
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
