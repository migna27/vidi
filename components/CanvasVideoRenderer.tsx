
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

    // --- 1. Background ---
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Pulsing Gradient
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const radius = CANVAS_WIDTH * (0.6 + bass * 0.3);
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    const opacity = 0.1 + (bass * 0.2);
    
    gradient.addColorStop(0, `rgba(34, 211, 238, ${opacity})`);
    gradient.addColorStop(0.4, `rgba(168, 85, 247, ${opacity * 0.5})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // --- 2. Particles (Deterministic Physics) ---
    particlesRef.current.forEach(p => {
        // Position is a function of Time + Physics + Music
        // We simulate "flow" by using time in sine waves rather than accumulating velocity 
        // to allow seeking/frame-perfect render without simulation state
        
        // Base movement based on time
        let nx = p.x + (p.vx * time * 60 * 0.5); 
        let ny = p.y + (p.vy * time * 60 * 0.5);

        // Add music reactivity
        ny -= mid * 50 * Math.sin(time + p.id);

        // Wrap around logic (simulated via modulo)
        nx = ((nx % CANVAS_WIDTH) + CANVAS_WIDTH) % CANVAS_WIDTH;
        ny = ((ny % CANVAS_HEIGHT) + CANVAS_HEIGHT) % CANVAS_HEIGHT;

        ctx.beginPath();
        const size = p.size * (1 + high * 2);
        ctx.arc(nx, ny, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        // Flash based on mid energy
        const flash = Math.sin(time * 5 + p.phase) * mid; 
        ctx.globalAlpha = Math.min(1, Math.max(0, p.alpha + flash));
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // --- 3. Wave Effect ---
    ctx.save();
    ctx.beginPath();
    // Start line
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    for (let x = 0; x <= CANVAS_WIDTH; x += 20) {
        // Deterministic wave function
        const yOffset = Math.sin(x * 0.005 + time * 2) * (50 + bass * 100);
        const yOffset2 = Math.cos(x * 0.01 - time) * (30 + mid * 50);
        ctx.lineTo(x, CANVAS_HEIGHT / 2 + yOffset + yOffset2);
    }
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 + bass * 0.1})`;
    ctx.lineWidth = 2 + bass * 4;
    ctx.stroke();
    ctx.restore();

    // --- 4. Spectrum Bars ---
    const bufferLength = raw.length;
    const displayCount = Math.min(bufferLength, 64);
    const barWidth = (CANVAS_WIDTH / displayCount) * 1.2;
    let xPos = 0;
    const startX = (CANVAS_WIDTH - (displayCount * (barWidth + 2))) / 2;

    for (let i = 0; i < displayCount; i++) {
        const value = raw[i];
        const barHeight = Math.pow(value / 255, 1.5) * (CANVAS_HEIGHT * 0.35);

        if (barHeight > 5) {
            const hue = 180 + (i / displayCount) * 120 + (bass * 30);
            const sat = 70 + (mid * 30);
            const light = 50 + (high * 20);

            ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, 0.5)`;
            
            // Bottom
            ctx.fillRect(startX + xPos, CANVAS_HEIGHT - barHeight, barWidth, barHeight);
            
            // Top Mirror (faint)
            ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, 0.1)`;
            ctx.fillRect(startX + xPos, 0, barWidth, barHeight * 0.6);
        }
        xPos += barWidth + 2;
    }

    // --- 5. Typography ---
    const activeSegment = data.segments.find(
      (seg) => time >= seg.start - 1.0 && time <= seg.end + 1.0
    );

    if (activeSegment) {
      const lines = getLines(activeSegment.id, activeSegment.words);
      const lineHeight = 130;
      const totalHeight = lines.length * lineHeight;
      const startY = (CANVAS_HEIGHT - totalHeight) / 2 + lineHeight / 2;
      const baseFontSize = 100;

      ctx.font = `900 ${baseFontSize}px "Montserrat", sans-serif`;

      lines.forEach((lineWords, lineIndex) => {
         // Measure for centering
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
               ctx.shadowColor = "rgba(56, 189, 248, 0.9)";
               ctx.shadowBlur = 40 + (bass * 30); 
               ctx.fillStyle = "#22d3ee";
               // Slight pulse on beat
               const scale = 1.1 + (bass * 0.1);
               ctx.scale(scale, scale);
             } else if (isFuture) {
               const diff = word.start - time;
               if (diff < 0.6) {
                  const progress = 1 - (diff / 0.6);
                  ctx.globalAlpha = 0.2 + (progress * 0.8);
                  const enterScale = 0.8 + (0.2 * progress);
                  ctx.scale(enterScale, enterScale);
                  // ctx.filter = `blur(${(1-progress)*8}px)`; // Filter is expensive, use simple opacity/scale for speed
                  ctx.translate(0, (1-progress) * 40);
               } else {
                  ctx.globalAlpha = 0; 
               }
               ctx.fillStyle = "#ffffff";
             } else {
               // Past
               ctx.globalAlpha = 0.3;
               ctx.fillStyle = "#9ca3af";
               ctx.scale(1, 1);
             }

             if (ctx.globalAlpha > 0.01) {
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 ctx.fillText(word.word, 0, 0);
             }
             
             ctx.restore();
             currentX += width + 40;
         });
      });
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
