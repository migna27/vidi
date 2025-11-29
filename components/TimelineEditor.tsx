
import React, { useEffect, useRef, useState } from 'react';
import { LyricData, Segment, Word } from '../types';
import { Clock, Trash2, Plus, PlayCircle, Download, Save, AlertCircle } from 'lucide-react';

interface TimelineEditorProps {
  data: LyricData;
  onUpdate: (data: LyricData) => void;
  currentTime: number;
  onSeek: (time: number) => void;
}

// --- HELPER FUNCTIONS ---

const secondsToMMSS = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(2);
  const sStr = s.includes('.') ? s : `${s}.00`;
  return `${m.toString().padStart(2, '0')}:${sStr.padStart(5, '0')}`;
};

const mmssToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    return (minutes * 60) + seconds;
  }
  return parseFloat(timeStr) || 0;
};

// Recalculates word timings linearly across the segment duration
const recalculateWords = (text: string, start: number, end: number): Word[] => {
  const lines = text.split('\n');
  const words: Word[] = [];
  // Ensure duration is at least tiny to avoid division by zero
  const duration = Math.max(0.1, end - start);
  
  let totalWordCount = 0;
  lines.forEach(line => {
    const lineWords = line.trim().split(/\s+/).filter(w => w.length > 0);
    totalWordCount += lineWords.length;
  });

  if (totalWordCount === 0) return [];

  const timePerWord = duration / totalWordCount;
  let currentWordIndex = 0;

  lines.forEach((line, lineIdx) => {
    const lineWords = line.trim().split(/\s+/).filter(w => w.length > 0);
    lineWords.forEach((w) => {
      const wordStart = start + (currentWordIndex * timePerWord);
      const wordEnd = wordStart + timePerWord;
      
      words.push({
        word: w,
        start: wordStart,
        end: wordEnd,
        probability: 1,
        line_number: lineIdx
      });
      currentWordIndex++;
    });
  });

  return words;
};

// --- SUB-COMPONENT: TIME INPUT ---
// Handles the MM:SS display while editing, commits to seconds on blur
const TimeInput = ({ 
  value, 
  onChange,
  className 
}: { 
  value: number, 
  onChange: (val: number) => void,
  className?: string 
}) => {
  const [localValue, setLocalValue] = useState(secondsToMMSS(value));
  const [isEditing, setIsEditing] = useState(false);

  // Sync with prop updates if not currently typing
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(secondsToMMSS(value));
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const seconds = mmssToSeconds(localValue);
    onChange(seconds);
    setLocalValue(secondsToMMSS(seconds)); // Re-format to ensure validity
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="text"
      className={className}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={() => setIsEditing(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="00:00.00"
    />
  );
};

// --- MAIN COMPONENT ---

export const TimelineEditor: React.FC<TimelineEditorProps> = ({ data, onUpdate, currentTime, onSeek }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateSegmentData = (index: number, updates: Partial<Segment>, shouldRecalculateWords = false) => {
    const newSegments = [...data.segments];
    const oldSegment = newSegments[index];
    
    // Prepare new segment object
    let updatedSegment = { ...oldSegment, ...updates };

    // If time or explicit flag changed, recalculate the internal word timestamps
    if (shouldRecalculateWords || updates.start !== undefined || updates.end !== undefined) {
       updatedSegment.words = recalculateWords(
          updatedSegment.text, 
          updatedSegment.start, 
          updatedSegment.end
       );
    }

    newSegments[index] = updatedSegment;

    // If start time changed, we might need to resort, but that can be jarring while editing.
    // For now, we update in place. A "Sort" button could be added if needed.
    if (updates.start !== undefined) {
         newSegments.sort((a, b) => a.start - b.start);
    }

    onUpdate({ ...data, segments: newSegments });
  };

  const handleDelete = (index: number) => {
    if(!confirm("Delete this lyric segment?")) return;
    const newSegments = [...data.segments];
    newSegments.splice(index, 1);
    onUpdate({ ...data, segments: newSegments });
  };

  const handleAdd = () => {
    const newSegments = [...data.segments];
    const lastSeg = newSegments[newSegments.length - 1];
    const newStart = lastSeg ? lastSeg.end + 0.2 : 0;
    
    const newSegment: Segment = {
        id: Date.now().toString(),
        start: newStart,
        end: newStart + 2.0,
        text: "New Line",
        words: []
    };
    newSegment.words = recalculateWords(newSegment.text, newSegment.start, newSegment.end);
    
    newSegments.push(newSegment);
    onUpdate({ ...data, segments: newSegments });
  };

  const handleExportJson = () => {
      const exportData = {
          ...data,
          createdAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lyrics-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  // Auto-scroll logic
  useEffect(() => {
    // Only auto-scroll if we aren't hovering (to prevent fighting the user)
    // For simplicity, we just scroll if the difference is significant
    const activeIndex = data.segments.findIndex(s => currentTime >= s.start && currentTime <= s.end);
    
    if (activeIndex !== -1 && scrollRef.current) {
        const row = scrollRef.current.children[activeIndex] as HTMLElement;
        // Check if row is already visible to avoid unnecessary jitter
        if (row) {
            const container = scrollRef.current;
            const rowTop = row.offsetTop;
            const rowBottom = rowTop + row.offsetHeight;
            const containerTop = container.scrollTop;
            const containerBottom = containerTop + container.offsetHeight;

            if (rowTop < containerTop || rowBottom > containerBottom) {
                 row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
  }, [currentTime, data.segments]);

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-white/5">
        
        {/* HEADER TOOLBAR */}
        <div className="p-3 border-b border-white/5 flex justify-between items-center bg-neutral-800 shrink-0">
            <div className="flex items-center gap-2">
                <Clock size={16} className="text-cyan-400" /> 
                <span className="text-xs font-bold text-gray-200 uppercase tracking-widest">Timeline</span>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={handleExportJson}
                    className="text-[10px] flex items-center gap-1 bg-neutral-700 hover:bg-neutral-600 px-3 py-1.5 rounded text-gray-200 transition-colors border border-white/5"
                    title="Export edited lyrics to JSON"
                >
                    <Download size={12} /> Export JSON
                </button>
                <button 
                    onClick={handleAdd}
                    className="text-[10px] flex items-center gap-1 bg-cyan-700 hover:bg-cyan-600 px-3 py-1.5 rounded text-white transition-colors font-bold shadow-sm shadow-cyan-900/20"
                >
                    <Plus size={12} /> Add Line
                </button>
            </div>
        </div>

        {/* LIST AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3" ref={scrollRef}>
            {data.segments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500 border-2 border-dashed border-white/5 rounded-xl">
                    <AlertCircle className="mb-2 opacity-50" />
                    <span className="text-xs">No lyrics found.</span>
                    <span className="text-[10px] mt-1">Import a file or click "Add Line"</span>
                </div>
            ) : (
                data.segments.map((seg, idx) => {
                    const isActive = currentTime >= seg.start && currentTime <= seg.end;
                    
                    return (
                        <div 
                            key={seg.id} 
                            className={`group relative flex flex-col gap-2 p-3 rounded-lg border transition-all duration-200 ${
                                isActive 
                                ? 'bg-cyan-950/30 border-cyan-500/50 shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]' 
                                : 'bg-neutral-800 border-white/5 hover:border-white/10'
                            }`}
                        >
                            {/* ACTIVE INDICATOR STRIP */}
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 rounded-l-lg" />
                            )}

                            {/* ROW 1: CONTROLS & TIMESTAMPS */}
                            <div className="flex items-center justify-between gap-3">
                                
                                {/* Start / End Inputs */}
                                <div className="flex items-center gap-2 bg-neutral-950/50 p-1 rounded-md border border-white/5">
                                    <div className="flex flex-col px-1">
                                        <label className="text-[8px] text-cyan-500 font-bold uppercase">Start</label>
                                        <TimeInput 
                                            className="bg-transparent w-16 text-xs font-mono text-gray-200 outline-none focus:text-white"
                                            value={seg.start}
                                            onChange={(val) => updateSegmentData(idx, { start: val })}
                                        />
                                    </div>
                                    <div className="w-px h-6 bg-white/10"></div>
                                    <div className="flex flex-col px-1">
                                        <label className="text-[8px] text-purple-500 font-bold uppercase">End</label>
                                         <TimeInput 
                                            className="bg-transparent w-16 text-xs font-mono text-gray-200 outline-none focus:text-white"
                                            value={seg.end}
                                            onChange={(val) => updateSegmentData(idx, { end: val })}
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => onSeek(seg.start)}
                                        className={`p-1.5 rounded-md transition-colors ${isActive ? 'bg-cyan-500 text-black' : 'hover:bg-white/10 text-gray-400'}`}
                                        title="Play segment"
                                    >
                                        <PlayCircle size={14} fill={isActive ? "currentColor" : "none"} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(idx)}
                                        className="p-1.5 rounded-md hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                                        title="Delete segment"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* ROW 2: TEXT EDITING */}
                            <div className="relative">
                                <textarea
                                    className={`w-full bg-neutral-900/50 rounded-md p-2 text-sm outline-none resize-none font-medium leading-relaxed border transition-colors focus:ring-1 focus:ring-cyan-500/50 ${
                                        isActive ? 'text-white border-white/10' : 'text-gray-400 border-transparent focus:text-gray-200'
                                    }`}
                                    rows={Math.max(2, seg.text.split('\n').length)}
                                    value={seg.text}
                                    onChange={(e) => updateSegmentData(idx, { text: e.target.value }, false)} // Update text state only
                                    onBlur={() => updateSegmentData(idx, {}, true)} // Recalculate words on blur
                                    placeholder="Enter lyrics here..."
                                />
                                <div className="absolute bottom-2 right-2 text-[9px] text-gray-600 pointer-events-none">
                                    {(seg.end - seg.start).toFixed(1)}s
                                </div>
                            </div>

                        </div>
                    );
                })
            )}
            
            {/* PADDING FOR SCROLL */}
            <div className="h-20"></div>
        </div>
    </div>
  );
};
