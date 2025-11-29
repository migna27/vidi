import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    // Buffer for frequency data
    const bufferLength = analyser ? analyser.frequencyBinCount : 128; // Default if no analyser
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      // Resize canvas to full window
      const width = canvas.width = window.innerWidth;
      const height = canvas.height = window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // If not playing or no analyser, just zero out or small noise
         for(let i = 0; i < bufferLength; i++) dataArray[i] = 0;
      }

      // Draw mirrored frequency bars at the bottom
      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] * (height / 800); // Scale height
        
        // Use a gradient based on the intensity
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, 'rgba(34, 211, 238, 0.5)'); // Cyan
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.0)'); // Purple fade

        ctx.fillStyle = gradient;
        
        // Draw bottom centered visualizer
        // Only draw lower frequencies (left side of array) mostly as they are bassier
        if (i < bufferLength / 2) {
            ctx.fillRect(width / 2 + x, height - barHeight, barWidth, barHeight);
            ctx.fillRect(width / 2 - x - barWidth, height - barHeight, barWidth, barHeight);
        }
        
        x += barWidth + 1;
      }

      // Draw particle dust (simulated)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      for(let k = 0; k < 50; k++) {
         const px = (Math.sin(Date.now() * 0.001 + k) * width/2) + width/2;
         const py = (Math.cos(Date.now() * 0.002 + k * 10) * height/2) + height/2;
         const size = Math.random() * 2;
         ctx.beginPath();
         ctx.arc(px, py, size, 0, Math.PI * 2);
         ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser, isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-60"
    />
  );
};