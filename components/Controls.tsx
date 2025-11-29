import React, { useRef } from 'react';
import { Play, Pause, FileJson, Music, SkipBack, SkipForward, Download } from 'lucide-react';

interface ControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onJsonUpload: (jsonStr: string) => void;
  onAudioUpload: (file: File) => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onRender: () => void;
  isRendering: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onJsonUpload,
  onAudioUpload,
  currentTime,
  duration,
  onSeek,
  onRender,
  isRendering
}) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleJsonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onJsonUpload(event.target.result as string);
      }
    };
    reader.readAsText(file);
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAudioUpload(file);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    // const ms = Math.floor((time % 1) * 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-neutral-900/90 backdrop-blur-md border-t border-white/10 p-4 md:p-6 pb-8 md:pb-6 w-full fixed bottom-0 left-0 z-50">
      
      {/* Progress Bar */}
      <div className="w-full mb-4 flex items-center gap-3">
        <span className="text-xs text-gray-400 w-10 text-right font-mono">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          disabled={isRendering}
          className={`w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:h-2 transition-all ${isRendering ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        <span className="text-xs text-gray-400 w-10 font-mono">{formatTime(duration)}</span>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Playback Controls */}
        <div className="flex items-center gap-6 order-2 md:order-1">
           <button 
            onClick={() => onSeek(currentTime - 5)}
            disabled={isRendering}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-30"
          >
            <SkipBack size={24} />
          </button>

          <button
            onClick={onTogglePlay}
            disabled={isRendering}
            className={`w-14 h-14 flex items-center justify-center rounded-full bg-cyan-500 hover:bg-cyan-400 text-black transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(34,211,238,0.5)] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed`}
          >
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1"/>}
          </button>

          <button 
            onClick={() => onSeek(currentTime + 5)}
            disabled={isRendering}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-30"
          >
            <SkipForward size={24} />
          </button>
        </div>

        {/* File Inputs & Render */}
        <div className="flex gap-3 order-1 md:order-2">
          
          <button
            onClick={onRender}
            disabled={isRendering}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold text-black bg-gradient-to-r from-purple-400 to-cyan-400 hover:from-purple-300 hover:to-cyan-300 rounded-md transition-all shadow-lg ${isRendering ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}`}
          >
             <Download size={16} />
             <span>{isRendering ? 'Rendering...' : 'Render Video'}</span>
          </button>

          <div className="h-8 w-[1px] bg-white/10 mx-2 hidden md:block"></div>

          <button
            onClick={() => jsonInputRef.current?.click()}
            disabled={isRendering}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors border border-white/5 disabled:opacity-50"
          >
            <FileJson size={16} />
            <span className="hidden sm:inline">Load JSON</span>
          </button>
          <input
            type="file"
            ref={jsonInputRef}
            onChange={handleJsonChange}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            onClick={() => audioInputRef.current?.click()}
            disabled={isRendering}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors border border-white/5 disabled:opacity-50"
          >
            <Music size={16} />
            <span className="hidden sm:inline">Load Audio</span>
          </button>
          <input
            type="file"
            ref={audioInputRef}
            onChange={handleAudioChange}
            accept="audio/*"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};