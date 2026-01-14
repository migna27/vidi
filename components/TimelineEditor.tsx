import React, { useEffect, useRef, useState } from 'react';
import { LyricData, Segment, Word } from '../types';
import { Clock, Trash2, Plus, PlayCircle, Download, AlertCircle, ChevronDown, ChevronUp, Tag, X, FolderInput, Check } from 'lucide-react';

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
const recalculateWords = (text: string, start: number, end: number, oldWords?: Word[]): Word[] => {
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

  // Check if we can reuse relative timing from old words
  // Only implies if word count is identical (segment shift or resize)
  const canPreserveTiming = oldWords && oldWords.length === totalWordCount;
  const oldDuration = oldWords && oldWords.length > 0 
      ? (oldWords[oldWords.length-1].end - oldWords[0].start) // approximation
      : 1;

  // Fallback linear timing
  const timePerWord = duration / totalWordCount;
  let currentWordIndex = 0;

  lines.forEach((line, lineIdx) => {
    const lineWords = line.trim().split(/\s+/).filter(w => w.length > 0);
    lineWords.forEach((w) => {
      let wordStart, wordEnd;

      if (canPreserveTiming && oldWords) {
          // Relative Scaling
          const oldW = oldWords[currentWordIndex];
          // Determine relative position in previous segment (0 to 1)
          // We map relative to the *segment boundaries* provided, not necessarily word boundaries
          // But to be safe, let's use the previous word's relative offset from its previous start
          // Actually, simplistic scaling:
          // newWordStart = newSegStart + ( (oldWordStart - oldSegStart) / oldSegDuration ) * newSegDuration
          
          // However, we don't have the explicit 'oldSegStart' passed here easily without more args.
          // Let's assume linear distribution for now is better than broken complex logic, 
          // UNLESS we are just shifting (duration matches).
          
          // Actually, let's just stick to linear redistribution for text changes.
          // For Start/End changes, this function is called with existing text.
          // If we passed the old segment start/end, we could do perfect scaling.
          
          // Fallback to linear for now as requested correction implies specific logic fix or general improvement.
          // Optimized linear:
          wordStart = start + (currentWordIndex * timePerWord);
          wordEnd = wordStart + timePerWord;
      } else {
          wordStart = start + (currentWordIndex * timePerWord);
          wordEnd = wordStart + timePerWord;
      }

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

// --- SUB-COMPONENTS ---

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

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(secondsToMMSS(value));
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const seconds = mmssToSeconds(localValue);
    onChange(seconds);
    setLocalValue(secondsToMMSS(seconds));
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

const DebouncedTextArea = ({ 
    value, 
    onChange, 
    onBlur, 
    className, 
    rows,
    placeholder
}: { 
    value: string, 
    onChange: (val: string) => void, 
    onBlur: () => void,
    className?: string,
    rows?: number,
    placeholder?: string
}) => {
    const [localValue, setLocalValue] = useState(value);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync external value updates (e.g. undo/redo)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        
        // Debounce parent update to prevent heavy re-renders
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            onChange(newValue);
        }, 300); // 300ms debounce
    };

    return (
        <textarea
            className={className}
            rows={rows}
            value={localValue}
            onChange={handleChange}
            onBlur={onBlur}
            placeholder={placeholder}
        />
    );
};

// --- MAIN COMPONENT ---

export const TimelineEditor: React.FC<TimelineEditorProps> = ({ data, onUpdate, currentTime, onSeek }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

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

    // If time changed, try to preserve relative word timings scaling
    // If text changed (shouldRecalculateWords), we must regenerate
    if (shouldRecalculateWords) {
         updatedSegment.words = recalculateWords(
            updatedSegment.text, 
            updatedSegment.start, 
            updatedSegment.end
         );
    } else if (updates.start !== undefined || updates.end !== undefined) {
         // Logic for Time Stretching (Preserving Relative Word Positions)
         const oldDuration = oldSegment.end - oldSegment.start;
         const newDuration = updatedSegment.end - updatedSegment.start;
         
         if (oldDuration > 0 && updatedSegment.words.length > 0) {
             const ratio = newDuration / oldDuration;
             const newStart = updatedSegment.start;
             const oldStart = oldSegment.start;

             updatedSegment.words = oldSegment.words.map(w => ({
                 ...w,
                 start: newStart + (w.start - oldStart) * ratio,
                 end: newStart + (w.end - oldStart) * ratio
             }));
         } else {
             // Fallback
             updatedSegment.words = recalculateWords(updatedSegment.text, updatedSegment.start, updatedSegment.end);
         }
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
        section: undefined, 
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

  const confirmSectionEdit = (index: number, name: string) => {
      if (name && name.trim()) {
          updateSegmentData(index, { section: name.trim().toLowerCase() });
      }
      setEditingSectionId(null);
  };

  const handleRemoveSection = (index: number) => {
      updateSegmentData(index, { section: undefined });
  };

  // Auto-scroll logic
  useEffect(() => {
    const activeIndex = data.segments.findIndex(s => currentTime >= s.start && currentTime <= s.end);
    
    if (activeIndex !== -1 && scrollRef.current) {
        const activeSegmentId = data.segments[activeIndex].id;
        const row = scrollRef.current.querySelector(`[data-segment-id="${activeSegmentId}"]`) as HTMLElement;
        
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

  const SECTION_COLORS: Record<string, string> = {
      verse: 'border-blue-500',
      chorus: 'border-pink-500',
      bridge: 'border-yellow-500',
      intro: 'border-gray-500',
      outro: 'border-red-500'
  };

  const SECTION_BG: Record<string, string> = {
      verse: 'bg-blue-950/40 text-blue-200',
      chorus: 'bg-pink-950/40 text-pink-200',
      bridge: 'bg-yellow-950/40 text-yellow-200',
      intro: 'bg-gray-800/60 text-gray-300',
      outro: 'bg-red-950/40 text-red-200'
  };

  const getSectionColor = (name: string) => {
     const normalized = name.toLowerCase().split(' ')[0]; // Handle "Verse 2" -> "verse"
     return SECTION_COLORS[normalized] || 'border-gray-600';
  };

  const getSectionBg = (name: string) => {
     const normalized = name.toLowerCase().split(' ')[0];
     return SECTION_BG[normalized] || 'bg-neutral-800 text-gray-400';
  };

  let currentSection = 'verse'; 

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
                    <Download size={12} /> JSON
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
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2" ref={scrollRef}>
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
                    const isEditingSection = editingSectionId === seg.id;
                    
                    // Determine Section Header
                    const isNewSection = !!seg.section;
                    if (isNewSection) currentSection = seg.section!;
                    else if (idx === 0 && !seg.section) currentSection = 'verse'; // First item default

                    const sectionColor = getSectionColor(currentSection);
                    const sectionBg = getSectionBg(currentSection);

                    return (
                        <div key={seg.id} className="flex flex-col gap-1">
                            
                            {/* SECTION HEADER BLOCK */}
                            {isNewSection && (
                                <div className={`flex items-center justify-between px-3 py-1.5 rounded-md mt-2 mb-1 ${sectionBg} border border-white/5 shadow-sm`}>
                                    <div className="flex items-center gap-2">
                                        <Tag size={12} className="opacity-70" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">{currentSection}</span>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveSection(idx)}
                                        className="p-1 hover:bg-black/20 rounded-full opacity-60 hover:opacity-100 transition-opacity"
                                        title="Merge with previous section"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            )}

                            {/* SEGMENT CARD */}
                            <div 
                                data-segment-id={seg.id}
                                className={`group relative flex flex-col gap-2 p-3 rounded-r-lg border-t border-b border-r border-white/5 transition-all duration-200 border-l-4 ${sectionColor} ${
                                    isActive 
                                    ? 'bg-cyan-950/30 border-t-cyan-500/30 border-b-cyan-500/30 shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]' 
                                    : 'bg-neutral-800 hover:border-r-white/20'
                                }`}
                            >
                                {/* ACTIVE INDICATOR STRIP (Overlay) */}
                                {isActive && (
                                    <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-r-lg pointer-events-none" />
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
                                    </div>

                                    {/* Action Buttons */}
                                    <div className={`flex items-center gap-1 transition-opacity ${isEditingSection ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                                        
                                        {/* Inline Section Editor or Add Button */}
                                        {!isNewSection && (
                                            isEditingSection ? (
                                                <div className="flex items-center gap-1 bg-black/40 rounded p-0.5 animate-in slide-in-from-right-2 duration-200 border border-cyan-500/50">
                                                    <input 
                                                        autoFocus
                                                        className="w-20 bg-transparent text-[10px] text-white outline-none px-1 font-bold placeholder-gray-500"
                                                        placeholder="Name..."
                                                        defaultValue="Chorus"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') confirmSectionEdit(idx, e.currentTarget.value);
                                                            if (e.key === 'Escape') setEditingSectionId(null);
                                                            e.stopPropagation();
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                            confirmSectionEdit(idx, input.value);
                                                        }}
                                                        className="p-1 hover:bg-green-500/20 text-green-400 rounded"
                                                    >
                                                        <Check size={12} />
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingSectionId(null);
                                                        }}
                                                        className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingSectionId(seg.id);
                                                    }}
                                                    className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white flex items-center gap-1"
                                                    title="Start new section here"
                                                >
                                                    <FolderInput size={14} />
                                                </button>
                                            )
                                        )}

                                        <button 
                                            type="button"
                                            onClick={() => onSeek(seg.start)}
                                            className={`p-1.5 rounded-md transition-colors ${isActive ? 'bg-cyan-500 text-black' : 'hover:bg-white/10 text-gray-400'}`}
                                            title="Play segment"
                                        >
                                            <PlayCircle size={14} fill={isActive ? "currentColor" : "none"} />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => handleDelete(idx)}
                                            className="p-1.5 rounded-md hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                                            title="Delete segment"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* ROW 2: TEXT EDITING (DEBOUNCED) */}
                                <div className="relative">
                                    <DebouncedTextArea
                                        className={`w-full bg-neutral-900/50 rounded-md p-2 text-sm outline-none resize-none font-medium leading-relaxed border transition-colors focus:ring-1 focus:ring-cyan-500/50 ${
                                            isActive ? 'text-white border-white/10' : 'text-gray-400 border-transparent focus:text-gray-200'
                                        }`}
                                        rows={Math.max(2, seg.text.split('\n').length)}
                                        value={seg.text}
                                        onChange={(val) => updateSegmentData(idx, { text: val }, true)} 
                                        onBlur={() => {}} 
                                        placeholder="Enter lyrics here..."
                                    />
                                    <div className="absolute bottom-2 right-2 text-[9px] text-gray-600 pointer-events-none">
                                        {(seg.end - seg.start).toFixed(1)}s
                                    </div>
                                </div>

                                {/* ROW 3: WORD EDITING TOGGLE */}
                                <div className="flex justify-center mt-1 border-t border-white/5 pt-1">
                                    <button 
                                        type="button"
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
                                                            type="button"
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