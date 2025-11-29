

import React, { useEffect, useRef, useState } from 'react';
import { LyricData, Segment, Word, SectionType } from '../types';
import { Clock, Trash2, Plus, PlayCircle, Download, AlertCircle, ChevronDown, ChevronUp, Tag } from 'lucide-react';

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
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedSegments);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setExpandedSegments(newSet);
  };

  const updateSegmentData = (index: number, updates: Partial<Segment>, shouldRecalculateWords = false) => {
    const newSegments = [...data.segments];
    const oldSegment = newSegments[index];
    
    // Prepare new segment object
    let updatedSegment = { ...oldSegment, ...updates };

    // If time or explicit flag changed, recalculate the internal word timestamps
    // NOTE: This resets custom word timings. Users should edit segment bounds first, then fine-tune words.
    if (shouldRecalculateWords || updates.start !== undefined || updates.end !== undefined) {
       updatedSegment.words = recalculateWords(
          updatedSegment.text, 
          updatedSegment.start, 
          updatedSegment.end
       );
    }

    newSegments[index] = updatedSegment;

    if (updates.start !== undefined) {
         newSegments.sort((a, b) => a.start - b.start);
    }

    onUpdate({ ...data, segments: newSegments });
  };

  const updateWordData = (segIndex: number, wordIndex: number, updates: Partial<Word>) => {
    const newSegments = [...data.segments];
    const segment = { ...newSegments[segIndex] };
    const newWords = [...segment.words];
    newWords[wordIndex] = { ...newWords[wordIndex], ...updates };
    segment.words = newWords;
    newSegments[segIndex] = segment;
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
        section: 'verse',
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
    const activeIndex = data.segments.findIndex(s => currentTime >= s.start && currentTime <= s.end);
    
    if (activeIndex !== -1 && scrollRef.current) {
        const row = scrollRef.current.children[activeIndex] as HTMLElement;
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

  const SECTION_COLORS: Record<SectionType, string> = {
      verse: 'text-blue-400',
      chorus: 'text-pink-400',
      bridge: 'text-yellow-400',
      intro: 'text-gray-400',
      outro: 'text-gray-400'
  };

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
                    const isExpanded = expandedSegments.has(seg.id);
                    const sectionColor = SECTION_COLORS[seg.section || 'verse'];
                    
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
                                
                                <div className="flex items-center gap-2">
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

                                    {/* SECTION SELECTOR */}
                                    <div className="relative">
                                        <Tag size={12} className={`absolute left-2 top-1.5 ${sectionColor} opacity-70`}/>
                                        <select 
                                            value={seg.section || 'verse'}
                                            onChange={(e) => updateSegmentData(idx, { section: e.target.value as SectionType })}
                                            className="bg-neutral-900 border border-white/5 text-[10px] uppercase font-bold text-gray-400 pl-6 pr-1 py-1 rounded focus:border-cyan-500 outline-none cursor-pointer"
                                        >
                                            <option value="intro">Intro</option>
                                            <option value="verse">Verse</option>
                                            <option value="chorus">Chorus</option>
                                            <option value="bridge">Bridge</option>
                                            <option value="outro">Outro</option>
                                        </select>
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
                                    onChange={(e) => updateSegmentData(idx, { text: e.target.value }, false)} 
                                    onBlur={() => updateSegmentData(idx, {}, true)} 
                                    placeholder="Enter lyrics here..."
                                />
                                <div className="absolute bottom-2 right-2 text-[9px] text-gray-600 pointer-events-none">
                                    {(seg.end - seg.start).toFixed(1)}s
                                </div>
                            </div>

                            {/* ROW 3: WORD EDITING TOGGLE */}
                            <div className="flex justify-center mt-1 border-t border-white/5 pt-1">
                                <button 
                                    onClick={() => toggleExpand(seg.id)}
                                    className={`text-[10px] flex items-center gap-1 transition-colors ${isExpanded ? 'text-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}
                                >
                                    {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                    {isExpanded ? "Hide Words" : "Timing"}
                                </button>
                            </div>

                            {/* ROW 4: EXPANDED WORD LIST */}
                            {isExpanded && (
                                <div className="mt-2 space-y-1 bg-black/20 p-2 rounded border border-white/5">
                                    <div className="grid grid-cols-12 gap-2 text-[9px] font-bold text-gray-500 uppercase mb-1 px-1">
                                        <div className="col-span-4">Word</div>
                                        <div className="col-span-3 text-center">Start</div>
                                        <div className="col-span-3 text-center">End</div>
                                        <div className="col-span-2 text-center">Play</div>
                                    </div>
                                    {seg.words.map((word, wIdx) => {
                                         const isWordActive = currentTime >= word.start && currentTime <= word.end;
                                         return (
                                            <div key={wIdx} className={`grid grid-cols-12 gap-2 items-center p-1 rounded transition-colors ${isWordActive ? 'bg-cyan-900/30' : 'hover:bg-white/5'}`}>
                                                <div className="col-span-4 text-xs text-gray-300 truncate font-mono" title={word.word}>
                                                    {word.word}
                                                </div>
                                                <div className="col-span-3">
                                                    <TimeInput 
                                                        className="w-full bg-black/40 border border-white/10 rounded px-1 py-0.5 text-[10px] font-mono text-center focus:border-cyan-500 outline-none text-gray-400 focus:text-white"
                                                        value={word.start}
                                                        onChange={(v) => updateWordData(idx, wIdx, { start: v })}
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <TimeInput 
                                                        className="w-full bg-black/40 border border-white/10 rounded px-1 py-0.5 text-[10px] font-mono text-center focus:border-cyan-500 outline-none text-gray-400 focus:text-white"
                                                        value={word.end}
                                                        onChange={(v) => updateWordData(idx, wIdx, { end: v })}
                                                    />
                                                </div>
                                                 <div className="col-span-2 flex justify-center">
                                                    <button
                                                        onClick={() => onSeek(word.start)}
                                                        className="text-gray-500 hover:text-cyan-400 p-0.5"
                                                        title="Play word"
                                                    >
                                                        <PlayCircle size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                         );
                                    })}
                                </div>
                            )}

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