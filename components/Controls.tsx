
import React from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface ControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  isRendering: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  isRendering
}) => {
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-20 bg-neutral-900 border-t border-white/5 px-4 flex flex-col justify-center gap-2 select-none">
      
      {/* Timeline Scrubber */}
      <div className="flex items-center gap-4 w-full">
         <span className="text-xs font-mono text-cyan-500 w-16 text-right">{formatTime(currentTime)}</span>
         <div className="relative flex-1 h-6 flex items-center group">
             <div className="absolute w-full h-1 bg-neutral-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-600 transition-all duration-75 ease-linear"
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                  />
             </div>
             <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.01}
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                disabled={isRendering}
                className="absolute w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
             />
             <div 
                className="absolute h-3 w-1 bg-white rounded-full shadow pointer-events-none transition-all duration-75 ease-linear"
                style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
             />
         </div>
         <span className="text-xs font-mono text-gray-500 w-16">{formatTime(duration)}</span>
      </div>

      {/* Transport Controls */}
      <div className="flex items-center justify-center gap-4">
           <button 
            onClick={() => onSeek(Math.max(0, currentTime - 5))}
            disabled={isRendering}
            className="text-gray-500 hover:text-white transition-colors disabled:opacity-30 p-1"
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={onTogglePlay}
            disabled={isRendering}
            className={`w-8 h-8 flex items-center justify-center rounded-full bg-white text-black hover:bg-cyan-400 transition-all disabled:opacity-50`}
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5"/>}
          </button>

          <button 
            onClick={() => onSeek(Math.min(duration, currentTime + 5))}
            disabled={isRendering}
            className="text-gray-500 hover:text-white transition-colors disabled:opacity-30 p-1"
          >
            <SkipForward size={16} />
          </button>
      </div>
    </div>
  );
};
