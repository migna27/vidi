import React, { useMemo } from 'react';
import { LyricData, Segment, Word } from '../types';

interface LyricRendererProps {
  data: LyricData;
  currentTime: number;
}

// Helper to determine word opacity/scale based on timing
const getWordStyle = (word: Word, currentTime: number) => {
  const isPast = currentTime > word.end;
  const isFuture = currentTime < word.start;
  const isActive = !isPast && !isFuture;

  // Kinetic entrance effect
  // If active, we calculate progress (0 to 1)
  const duration = word.end - word.start;
  const progress = isActive ? (currentTime - word.start) / duration : 0;

  if (isFuture) {
    // Coming up soon?
    if (word.start - currentTime < 0.5) {
      return "opacity-20 scale-95 blur-[2px] translate-y-2";
    }
    return "opacity-0 scale-90 translate-y-4";
  }

  if (isActive) {
    return "opacity-100 scale-110 active-word-glow text-cyan-400 z-10 font-black tracking-wide";
  }

  // Past words fade out slightly but stay visible to complete the sentence until the segment ends
  return "opacity-50 scale-100 text-gray-300 blur-[0.5px]";
};

// Group words by line_number to render structured layout
const groupWordsByLine = (words: Word[]) => {
  const lines: Record<number, Word[]> = {};
  words.forEach(w => {
    if (!lines[w.line_number]) lines[w.line_number] = [];
    lines[w.line_number].push(w);
  });
  return Object.values(lines);
};

export const LyricRenderer: React.FC<LyricRendererProps> = ({ data, currentTime }) => {
  // Find the active segment or the nearest upcoming/recent one
  const activeSegmentIndex = data.segments.findIndex(
    (seg) => currentTime >= seg.start - 0.5 && currentTime <= seg.end + 0.5
  );
  
  const activeSegment = activeSegmentIndex !== -1 ? data.segments[activeSegmentIndex] : null;
  const nextSegment = data.segments[activeSegmentIndex + 1];

  // If no active segment, display a placeholder or specific state
  if (!activeSegment) {
    // Look for next segment to tease it
    const upcomingIndex = data.segments.findIndex(s => s.start > currentTime);
    if (upcomingIndex !== -1) {
       // Just visual filler
       return (
        <div className="flex flex-col items-center justify-center h-full text-center transition-all duration-700 ease-in-out opacity-20">
           <div className="animate-pulse text-2xl font-bold tracking-[0.5em] text-gray-500">
             ...
           </div>
        </div>
       )
    }
    return null;
  }

  const lines = groupWordsByLine(activeSegment.words);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-out transform">
        {lines.map((lineWords, lineIdx) => (
          <div 
            key={`${activeSegment.id}-line-${lineIdx}`} 
            className="flex flex-wrap justify-center gap-x-4 gap-y-2 my-1 md:my-3 transition-all duration-500"
          >
            {lineWords.map((word, wIdx) => {
              const styleClass = getWordStyle(word, currentTime);
              return (
                <span
                  key={`${word.word}-${wIdx}`}
                  className={`inline-block transition-all duration-200 ease-out transform origin-center text-3xl md:text-5xl lg:text-7xl font-bold uppercase ${styleClass}`}
                  style={{ willChange: 'transform, opacity, filter' }}
                >
                  {word.word}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};