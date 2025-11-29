import React, { useRef, useEffect } from 'react';
import { LyricData, Word } from '../types';

interface CanvasVideoRendererProps {
  data: LyricData;
  currentTime: number;
  analyser: AnalyserNode | null;
  forwardedRef: React.RefObject<HTMLCanvasElement | null>;
}

// 16:9 Full HD Canvas
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export const CanvasVideoRenderer: React.FC<CanvasVideoRendererProps> = ({
  data,
  currentTime,
  analyser,
  forwardedRef
}) => {
  const wordsByLineCache = useRef<Map<string, Word[][]>>(new Map());

  // Helper to group words
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

  useEffect(() => {
    const canvas = forwardedRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimization
    if (!ctx) return;

    // Buffer for analyser
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    // Font Config
    const baseFontSize = 100; // Large size for 1080p
    ctx.font = `900 ${baseFontSize}px "Montserrat", sans-serif`;

    const render = () => {
      // 1. Clear & Background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 2. Draw Visualizer (Background)
      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        dataArray.fill(0);
      }

      const barWidth = (CANVAS_WIDTH / bufferLength) * 2.5;
      let x = 0;
      
      // Draw mirrored bars
      for (let i = 0; i < bufferLength; i++) {
        // Boost high frequencies slightly for visuals
        const value = dataArray[i];
        const barHeight = (value / 255) * (CANVAS_HEIGHT * 0.4);

        if (barHeight > 0) {
            // Gradient
            const gradient = ctx.createLinearGradient(0, CANVAS_HEIGHT, 0, CANVAS_HEIGHT - barHeight);
            gradient.addColorStop(0, 'rgba(34, 211, 238, 0.4)'); // Cyan low
            gradient.addColorStop(1, 'rgba(168, 85, 247, 0.0)'); // Purple high

            ctx.fillStyle = gradient;
            
            // Only draw lower half of spectrum for bassy look
            if (i < bufferLength / 1.5) {
                // Right side
                ctx.fillRect(CANVAS_WIDTH / 2 + x, CANVAS_HEIGHT - barHeight, barWidth, barHeight);
                // Left side
                ctx.fillRect(CANVAS_WIDTH / 2 - x - barWidth, CANVAS_HEIGHT - barHeight, barWidth, barHeight);
            }
        }
        x += barWidth + 2;
      }

      // 3. Draw Particles (Dust)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      const t = Date.now();
      for (let k = 0; k < 30; k++) {
         const px = ((Math.sin(t * 0.0001 * (k + 1)) + 1) / 2) * CANVAS_WIDTH;
         const py = ((Math.cos(t * 0.0002 * (k + 1)) + 1) / 2) * CANVAS_HEIGHT;
         const size = (k % 3) + 1;
         ctx.beginPath();
         ctx.arc(px, py, size * 2, 0, Math.PI * 2);
         ctx.fill();
      }

      // 4. Draw Lyrics
      // Find active segment
      const activeSegment = data.segments.find(
        (seg) => currentTime >= seg.start - 1.0 && currentTime <= seg.end + 1.0
      );

      if (activeSegment) {
        const lines = getLines(activeSegment.id, activeSegment.words);
        const lineHeight = 130;
        const totalHeight = lines.length * lineHeight;
        const startY = (CANVAS_HEIGHT - totalHeight) / 2 + lineHeight / 2;

        lines.forEach((lineWords, lineIndex) => {
           // Measure line width first for centering
           ctx.font = `900 ${baseFontSize}px "Montserrat", sans-serif`;
           let lineWidth = 0;
           const wordSpacings: number[] = [];
           
           lineWords.forEach((word) => {
               const width = ctx.measureText(word.word).width;
               wordSpacings.push(width);
               lineWidth += width + 40; // 40px gap
           });
           lineWidth -= 40; // remove last gap

           let currentX = (CANVAS_WIDTH - lineWidth) / 2;
           const currentY = startY + (lineIndex * lineHeight);

           lineWords.forEach((word, wIdx) => {
               const width = wordSpacings[wIdx];
               
               // Calculate animation state
               const isPast = currentTime > word.end;
               const isFuture = currentTime < word.start;
               const isActive = !isPast && !isFuture;

               ctx.save();
               ctx.translate(currentX + width / 2, currentY); // Translate to center of word

               if (isActive) {
                 // Active: Scale up, Glow, Cyan
                 ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
                 ctx.shadowBlur = 40;
                 ctx.fillStyle = "#22d3ee";
                 const scale = 1.1 + Math.sin(Date.now() * 0.005) * 0.02; // Subtle pulse
                 ctx.scale(scale, scale);
               } else if (isFuture) {
                 // Future: Blur, Fade, Offset down
                 // Check if coming soon (within 0.5s)
                 const diff = word.start - currentTime;
                 if (diff < 0.5) {
                    const progress = 1 - (diff / 0.5); // 0 to 1
                    ctx.globalAlpha = 0.2 + (progress * 0.8);
                    ctx.scale(0.9 + (0.1 * progress), 0.9 + (0.1 * progress));
                    ctx.filter = `blur(${(1-progress)*5}px)`;
                    ctx.translate(0, (1-progress) * 20);
                 } else {
                    ctx.globalAlpha = 0; // Hide if far future
                 }
                 ctx.fillStyle = "#ffffff";
               } else {
                 // Past: Fade out, slightly blurred
                 ctx.globalAlpha = 0.4;
                 ctx.fillStyle = "#d1d5db";
                 ctx.filter = 'blur(1px)';
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
      } else {
          // Placeholder or "Kinetic Flow" logo when idle
          if (currentTime < 1) {
              ctx.save();
              ctx.translate(CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.shadowColor = "rgba(255, 255, 255, 0.2)";
              ctx.shadowBlur = 20;
              ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
              ctx.font = `900 150px "Montserrat", sans-serif`;
              ctx.fillText("...", 0, 0);
              ctx.restore();
          }
      }
    };

    // Since we are controlled by the parent's RequestAnimationFrame loop (indirectly via props),
    // we ideally just render whenever props change. 
    // HOWEVER, for smooth 60fps animations (particles, pulse), we need our own loop or the parent triggers re-renders.
    // React re-renders are not 60fps usually. 
    // We'll run a local RAF loop that reads the LATEST currentTime ref if possible, 
    // but here we rely on the parent updating `currentTime` state or just visual loop.
    
    // To solve sync: We will run an independent loop for visual effects, 
    // but use the passed `currentTime` for text logic.
    // Note: If `currentTime` only updates on state change, text might look "steppy" if state update is slow.
    // Ideally `currentTime` should be a Ref for smooth canvas animation, but props are okay for now given 60fps updates in App.tsx.
    
    requestAnimationFrame(render);

  }, [data, currentTime, analyser]); // Re-render on these changes

  return (
    <canvas
      ref={forwardedRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-full object-contain"
    />
  );
};