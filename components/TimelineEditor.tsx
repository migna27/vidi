

import React, { useEffect, useRef, useState } from 'react';
import { LyricData, Segment, Word, EventBlock, EffectOverrides, CustomEffect, RendererConfig } from '../types';
import { Clock, Trash2, Plus, PlayCircle, Download, AlertCircle, ChevronDown, ChevronUp, Tag, X, FolderInput, Check, Zap, Eye, EyeOff, TrendingUp, TrendingDown, Palette, Type, MousePointer2 } from 'lucide-react';

interface TimelineEditorProps {
  data: LyricData;
  onUpdate: (data: LyricData) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  eventBlocks: EventBlock[];
  onUpdateEventBlocks: (blocks: EventBlock[]) => void;
  customEffects?: CustomEffect[]; 
  projectConfig?: RendererConfig; // Need access to project colors for the palette
  duration?: number;
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
  const duration = Math.max(0.1, end - start);
  
  let totalWordCount = 0;
  lines.forEach(line => {
    totalWordCount += line.trim().split(/\s+/).filter(w => w.length > 0).length;
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
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
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

    useEffect(() => { setLocalValue(value); }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => onChange(newValue), 300);
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

const EffectToggle: React.FC<{ label: string, isActive: boolean | undefined, onToggle: () => void }> = ({ label, isActive, onToggle }) => {
    return (
        <button
            onClick={onToggle}
            className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                isActive === true 
                ? 'bg-purple-600 border-purple-400 text-white font-bold shadow-[0_0_10px_rgba(147,51,234,0.3)]' 
                : isActive === false 
                ? 'bg-red-900/50 border-red-500/30 text-red-300 line-through decoration-red-500' // Forced Off
                : 'bg-neutral-800 border-white/5 text-gray-500 hover:border-white/20' // Global
            }`}
        >
            {label}
        </button>
    );
};

// New Component: Visual Timeline Track
const VisualTimelineTrack: React.FC<{ 
    duration: number, 
    items: Array<{type: string, data: any}>, 
    currentTime: number, 
    onSeek: (t: number) => void 
}> = ({ duration, items, currentTime, onSeek }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const maxDur = Math.max(duration, 10); // Minimum 10s timeline

    const handleClick = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        onSeek(percent * maxDur);
    };

    return (
        <div className="w-full bg-neutral-900 h-16 border-b border-white/5 relative select-none overflow-hidden group cursor-crosshair" onClick={handleClick} ref={containerRef}>
            {/* Grid Lines */}
            <div className="absolute inset-0 flex" style={{ opacity: 0.1 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex-1 border-r border-white"></div>
                ))}
            </div>

            {/* Blocks */}
            {items.map((item, i) => {
                const { start, end } = item.data;
                const left = (start / maxDur) * 100;
                const width = Math.max(0.2, ((end - start) / maxDur) * 100);
                const isLyric = item.type === 'segment';
                
                return (
                    <div 
                        key={i}
                        className={`absolute top-0 bottom-0 border-r border-black/20 ${isLyric ? 'bg-cyan-500/20 hover:bg-cyan-500/40 border-t-2 border-t-cyan-500/50' : 'bg-purple-500/20 hover:bg-purple-500/40 border-b-2 border-b-purple-500/50 h-3/4 top-auto'}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={isLyric ? item.data.text : item.data.label}
                    />
                );
            })}

            {/* Playhead */}
            <div 
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_10px_red] z-10 pointer-events-none transition-all duration-75 ease-linear"
                style={{ left: `${(currentTime / maxDur) * 100}%` }}
            >
                <div className="absolute -top-1 -left-1.5 w-4 h-4 bg-red-500 rotate-45 transform -translate-y-1/2" />
            </div>
            
            {/* Time Indicator */}
            <div className="absolute bottom-1 right-2 text-[9px] font-mono text-gray-500 bg-black/50 px-1 rounded">
                {secondsToMMSS(maxDur)}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const TimelineEditor: React.FC<TimelineEditorProps> = ({ 
    data, 
    onUpdate, 
    currentTime, 
    onSeek,
    eventBlocks,
    onUpdateEventBlocks,
    customEffects = [],
    projectConfig,
    duration = 60
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTabMap, setActiveTabMap] = useState<Record<string, 'text' | 'style'>>({});

  const setTab = (id: string, tab: 'text' | 'style') => {
      setActiveTabMap(prev => ({...prev, [id]: tab}));
  };

  // --- DATA UPDATERS ---

  const updateSegmentData = (index: number, updates: Partial<Segment>, shouldRecalculateWords = false) => {
    const newSegments = [...data.segments];
    const oldSegment = newSegments[index];
    let updatedSegment = { ...oldSegment, ...updates };

    if (shouldRecalculateWords) {
         updatedSegment.words = recalculateWords(updatedSegment.text, updatedSegment.start, updatedSegment.end);
    } else if (updates.start !== undefined || updates.end !== undefined) {
         const oldDuration = oldSegment.end - oldSegment.start;
         const newDuration = updatedSegment.end - updatedSegment.start;
         if (oldDuration > 0 && updatedSegment.words.length > 0) {
             const ratio = newDuration / oldDuration;
             updatedSegment.words = oldSegment.words.map(w => ({
                 ...w,
                 start: updatedSegment.start + (w.start - oldSegment.start) * ratio,
                 end: updatedSegment.start + (w.end - oldSegment.start) * ratio
             }));
         } else {
             updatedSegment.words = recalculateWords(updatedSegment.text, updatedSegment.start, updatedSegment.end);
         }
    }
    newSegments[index] = updatedSegment;
    if (updates.start !== undefined) newSegments.sort((a, b) => a.start - b.start);
    onUpdate({ ...data, segments: newSegments });
  };

  const updateSegmentStyle = (index: number, styleUpdates: Partial<Segment['style']>) => {
      const newSegments = [...data.segments];
      const segment = newSegments[index];
      const currentStyle = segment.style || {};
      
      // Clean up undefined/empty values
      const newStyle = { ...currentStyle, ...styleUpdates };
      Object.keys(newStyle).forEach(key => {
          // @ts-ignore
          if (newStyle[key] === undefined || newStyle[key] === '') delete newStyle[key];
      });

      newSegments[index] = { ...segment, style: newStyle };
      onUpdate({ ...data, segments: newSegments });
  };

  const handleDeleteSegment = (index: number) => {
    if(!confirm("Delete this lyric segment?")) return;
    const newSegments = [...data.segments];
    newSegments.splice(index, 1);
    onUpdate({ ...data, segments: newSegments });
  };

  const handleAddSegment = () => {
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

  // --- EVENT BLOCK UPDATERS ---

  const handleAddEventBlock = () => {
      const newBlock: EventBlock = {
          id: `evt-${Date.now()}`,
          start: currentTime,
          end: currentTime + 5,
          label: "FX Block",
          overrides: {},
          collapsed: false,
          smoothIn: false,
          smoothOut: false
      };
      onUpdateEventBlocks([...eventBlocks, newBlock].sort((a, b) => a.start - b.start));
  };

  const updateEventBlock = (id: string, updates: Partial<EventBlock>) => {
      let newBlocks = eventBlocks.map(b => b.id === id ? { ...b, ...updates } : b);
      if (updates.start !== undefined) newBlocks.sort((a, b) => a.start - b.start);
      onUpdateEventBlocks(newBlocks);
  };

  const toggleOverride = (blockId: string, key: keyof EffectOverrides) => {
      const block = eventBlocks.find(b => b.id === blockId);
      if(!block) return;

      const current = block.overrides[key];
      // Cycle: undefined (Global) -> true (On) -> false (Off) -> undefined
      let next: boolean | undefined;
      if (current === undefined) next = true;
      else if (current === true) next = false;
      else next = undefined;

      const newOverrides = { ...block.overrides, [key]: next };
      // Remove key if undefined to clean up
      if (next === undefined) delete newOverrides[key];

      updateEventBlock(blockId, { overrides: newOverrides });
  };

  const toggleCustomOverride = (blockId: string, effectId: string) => {
      const block = eventBlocks.find(b => b.id === blockId);
      if(!block) return;

      const currentMap = block.overrides.custom_fx || {};
      const current = currentMap[effectId];

      let next: boolean | undefined;
      if (current === undefined) next = true;
      else if (current === true) next = false;
      else next = undefined;

      const newMap = { ...currentMap, [effectId]: next };
      if (next === undefined) delete newMap[effectId];

      const newOverrides = { ...block.overrides };
      if (Object.keys(newMap).length === 0) {
          delete newOverrides.custom_fx;
      } else {
          // @ts-ignore 
          newOverrides.custom_fx = newMap;
      }
      
      updateEventBlock(blockId, { overrides: newOverrides });
  };
  
  const deleteEventBlock = (id: string) => {
      if(!confirm("Delete this event block?")) return;
      onUpdateEventBlocks(eventBlocks.filter(b => b.id !== id));
  };

  // --- RENDER HELPERS ---

  // Combine and sort lyrics and events for display
  const combinedItems = [
      ...data.segments.map((s, i) => ({ type: 'segment' as const, data: s, index: i, start: s.start })),
      ...eventBlocks.map((b, i) => ({ type: 'block' as const, data: b, index: i, start: b.start }))
  ].sort((a, b) => a.start - b.start);

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

  const getSectionColor = (name: string) => SECTION_COLORS[name.toLowerCase().split(' ')[0]] || 'border-gray-600';
  const getSectionBg = (name: string) => SECTION_BG[name.toLowerCase().split(' ')[0]] || 'bg-neutral-800 text-gray-400';

  let currentSection = 'verse'; 

  // Auto-scroll logic
  useEffect(() => {
    const activeItem = combinedItems.find(item => {
        if(item.type === 'segment') return currentTime >= item.data.start && currentTime <= item.data.end;
        if(item.type === 'block') return currentTime >= item.data.start && currentTime <= item.data.end;
        return false;
    });

    if (activeItem && scrollRef.current) {
        const id = activeItem.type === 'segment' ? activeItem.data.id : activeItem.data.id;
        const row = scrollRef.current.querySelector(`[data-id="${id}"]`) as HTMLElement;
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
  }, [currentTime, combinedItems]);

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-white/5">
        
        {/* VISUAL TRACK */}
        <VisualTimelineTrack 
            duration={duration} 
            items={combinedItems} 
            currentTime={currentTime} 
            onSeek={onSeek} 
        />

        {/* HEADER TOOLBAR */}
        <div className="p-3 border-b border-white/5 flex justify-between items-center bg-neutral-800 shrink-0">
            <div className="flex items-center gap-2">
                <Clock size={16} className="text-cyan-400" /> 
                <span className="text-xs font-bold text-gray-200 uppercase tracking-widest">Detail View</span>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={handleAddEventBlock}
                    className="text-[10px] flex items-center gap-1 bg-purple-900/50 hover:bg-purple-800/80 border border-purple-500/50 px-3 py-1.5 rounded text-purple-200 transition-colors font-bold"
                >
                    <Zap size={12} /> Event
                </button>
                <button 
                    onClick={handleAddSegment}
                    className="text-[10px] flex items-center gap-1 bg-cyan-900/50 hover:bg-cyan-800/80 border border-cyan-500/50 px-3 py-1.5 rounded text-cyan-200 transition-colors font-bold"
                >
                    <Plus size={12} /> Line
                </button>
            </div>
        </div>

        {/* LIST AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3" ref={scrollRef}>
            {combinedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500 border-2 border-dashed border-white/5 rounded-xl">
                    <AlertCircle className="mb-2 opacity-50" />
                    <span className="text-xs">Timeline Empty</span>
                    <span className="text-xs text-gray-600 mt-1">Add a Lyric Line or FX Event</span>
                </div>
            ) : (
                combinedItems.map((item) => {
                    // --- RENDER LYRIC SEGMENT ---
                    if (item.type === 'segment') {
                        const seg = item.data;
                        const idx = item.index;
                        const isActive = currentTime >= seg.start && currentTime <= seg.end;
                        const currentTab = activeTabMap[seg.id] || 'text';
                        
                        // Handle Section Headers
                        const isNewSection = !!seg.section;
                        if (isNewSection) currentSection = seg.section!;
                        else if (idx === 0 && !seg.section) currentSection = 'verse'; 
                        
                        return (
                             <div key={seg.id} className="flex flex-col gap-1">
                                {isNewSection && (
                                    <div className={`flex items-center justify-between px-3 py-1.5 rounded-md mt-2 ${getSectionBg(currentSection)} border border-white/5 shadow-sm sticky top-0 z-10`}>
                                        <div className="flex items-center gap-2">
                                            <Tag size={12} className="opacity-70" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{currentSection}</span>
                                        </div>
                                    </div>
                                )}
                                <div 
                                    data-id={seg.id}
                                    className={`group relative flex flex-col rounded-lg border border-white/5 transition-all duration-200 overflow-hidden ${
                                        isActive ? 'bg-cyan-950/20 border-cyan-500/30' : 'bg-neutral-800/80 hover:border-white/20'
                                    }`}
                                >
                                    {/* Vertical Color Indicator */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${getSectionColor(currentSection).replace('border-','bg-')}`}></div>

                                    {/* Card Toolbar */}
                                    <div className="flex items-center justify-between p-2 pl-3 bg-black/20 border-b border-white/5">
                                        {/* Tabs */}
                                        <div className="flex gap-1 bg-black/40 p-0.5 rounded-md">
                                            <button 
                                                onClick={() => setTab(seg.id, 'text')}
                                                className={`p-1 rounded text-[10px] flex items-center gap-1 ${currentTab === 'text' ? 'bg-neutral-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                <Type size={12} /> Text
                                            </button>
                                            <button 
                                                onClick={() => setTab(seg.id, 'style')}
                                                className={`p-1 rounded text-[10px] flex items-center gap-1 ${currentTab === 'style' ? 'bg-neutral-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                <Palette size={12} /> Style
                                            </button>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                             {!isNewSection && (
                                                <button onClick={() => updateSegmentData(idx, { section: 'new section' })} className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white" title="Start New Section">
                                                    <FolderInput size={14} />
                                                </button>
                                             )}
                                             <button onClick={() => onSeek(seg.start)} className={`p-1 rounded-md transition-colors ${isActive ? 'text-cyan-400' : 'hover:bg-white/10 text-gray-400'}`}>
                                                 <PlayCircle size={14} fill={isActive ? "currentColor" : "none"} />
                                             </button>
                                             <button onClick={() => handleDeleteSegment(idx)} className="p-1 rounded-md hover:bg-red-500/20 text-gray-500 hover:text-red-400">
                                                 <Trash2 size={14} />
                                             </button>
                                        </div>
                                    </div>
                                    
                                    {/* TAB CONTENT: TEXT */}
                                    {currentTab === 'text' && (
                                        <div className="p-3">
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-1">
                                                    <TimeInput className="bg-neutral-900 border border-white/10 rounded px-1 w-14 text-[10px] font-mono text-gray-300 outline-none focus:border-cyan-500" value={seg.start} onChange={(val) => updateSegmentData(idx, { start: val })} />
                                                    <span className="text-gray-600 text-[10px]">to</span>
                                                    <TimeInput className="bg-neutral-900 border border-white/10 rounded px-1 w-14 text-[10px] font-mono text-gray-300 outline-none focus:border-cyan-500" value={seg.end} onChange={(val) => updateSegmentData(idx, { end: val })} />
                                                </div>
                                            </div>
                                            <DebouncedTextArea
                                                className={`w-full bg-transparent text-sm outline-none resize-none font-medium leading-relaxed transition-colors placeholder-gray-700 ${isActive ? 'text-white' : 'text-gray-300'}`}
                                                rows={Math.max(1, seg.text.split('\n').length)}
                                                value={seg.text}
                                                onChange={(val) => updateSegmentData(idx, { text: val }, true)} 
                                                onBlur={() => {}} 
                                                placeholder="Enter lyrics..."
                                            />
                                        </div>
                                    )}

                                    {/* TAB CONTENT: STYLE */}
                                    {currentTab === 'style' && (
                                        <div className="p-3 bg-neutral-900/50">
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] text-gray-500 uppercase font-bold">Text Color</label>
                                                    <div className="flex gap-2 items-center">
                                                        <input 
                                                            type="color" 
                                                            value={seg.style?.colorText || projectConfig?.colors.text || '#ffffff'} 
                                                            onChange={(e) => updateSegmentStyle(idx, { colorText: e.target.value })}
                                                            className="w-6 h-6 bg-transparent cursor-pointer rounded overflow-hidden"
                                                        />
                                                        {projectConfig && (
                                                            <div className="flex gap-1">
                                                                {[projectConfig.colors.text, projectConfig.colors.active, projectConfig.colors.secondary].map(c => (
                                                                    <div key={c} onClick={() => updateSegmentStyle(idx, { colorText: c })} className="w-4 h-4 rounded-full cursor-pointer border border-white/10 hover:scale-110 transition-transform" style={{background: c}}></div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] text-gray-500 uppercase font-bold">Active Glow</label>
                                                    <div className="flex gap-2 items-center">
                                                        <input 
                                                            type="color" 
                                                            value={seg.style?.colorActive || projectConfig?.colors.active || '#00ffff'} 
                                                            onChange={(e) => updateSegmentStyle(idx, { colorActive: e.target.value })}
                                                            className="w-6 h-6 bg-transparent cursor-pointer rounded overflow-hidden"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-1">
                                                <div className="flex justify-between">
                                                    <label className="text-[9px] text-gray-500 uppercase font-bold">Font Scale</label>
                                                    <span className="text-[9px] text-gray-400">{seg.style?.scale || 1.0}x</span>
                                                </div>
                                                <input 
                                                    type="range" min="0.5" max="3.0" step="0.1"
                                                    value={seg.style?.scale || 1.0}
                                                    onChange={(e) => updateSegmentStyle(idx, { scale: parseFloat(e.target.value) })}
                                                    className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                                />
                                            </div>
                                            
                                            <div className="mt-3 flex justify-end">
                                                <button onClick={() => updateSegmentStyle(idx, { colorText: undefined, colorActive: undefined, scale: 1.0 })} className="text-[9px] text-red-400 hover:text-red-300">
                                                    Reset Styles
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                             </div>
                        );
                    } 
                    
                    // --- RENDER EVENT BLOCK ---
                    else {
                        const block = item.data;
                        const isActive = currentTime >= block.start && currentTime <= block.end;
                        
                        return (
                            <div 
                                key={block.id}
                                data-id={block.id}
                                className={`group relative p-3 rounded-lg border border-purple-500/30 transition-all ${
                                    isActive ? 'bg-purple-950/40 shadow-[0_0_15px_rgba(147,51,234,0.1)]' : 'bg-neutral-900/80 hover:bg-neutral-800'
                                }`}
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-l-lg"></div>

                                {/* HEADER */}
                                <div className="flex items-center justify-between mb-2 pl-2">
                                     <div className="flex items-center gap-2">
                                         <Zap size={14} className="text-purple-400" />
                                         <input 
                                            value={block.label}
                                            onChange={(e) => updateEventBlock(block.id, { label: e.target.value })}
                                            className="bg-transparent text-xs font-bold text-purple-200 outline-none w-32 border-b border-transparent hover:border-purple-500/50 focus:border-purple-500"
                                         />
                                         
                                         {/* FADE CONTROLS */}
                                         <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
                                             <button 
                                                onClick={() => updateEventBlock(block.id, { smoothIn: !block.smoothIn })}
                                                className={`p-1 rounded ${block.smoothIn ? 'text-green-400 bg-green-950/30' : 'text-gray-600 hover:text-gray-400'}`}
                                                title="Fade In"
                                             >
                                                 <TrendingUp size={12} />
                                             </button>
                                             <button 
                                                onClick={() => updateEventBlock(block.id, { smoothOut: !block.smoothOut })}
                                                className={`p-1 rounded ${block.smoothOut ? 'text-green-400 bg-green-950/30' : 'text-gray-600 hover:text-gray-400'}`}
                                                title="Fade Out"
                                             >
                                                 <TrendingDown size={12} />
                                             </button>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-2">
                                          <div className="flex items-center gap-1 bg-black/40 rounded px-1.5 py-0.5 border border-white/5">
                                              <TimeInput className="bg-transparent w-12 text-[10px] font-mono text-gray-400 outline-none text-right" value={block.start} onChange={(v) => updateEventBlock(block.id, { start: v })} />
                                              <span className="text-[10px] text-gray-600">-</span>
                                              <TimeInput className="bg-transparent w-12 text-[10px] font-mono text-gray-400 outline-none text-right" value={block.end} onChange={(v) => updateEventBlock(block.id, { end: v })} />
                                          </div>
                                          <button onClick={() => updateEventBlock(block.id, { collapsed: !block.collapsed })} className="p-1 hover:text-white text-gray-500">
                                              {block.collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                          </button>
                                          
                                          {/* DELETE BUTTON */}
                                          <button 
                                            onClick={() => deleteEventBlock(block.id)} 
                                            className="p-1.5 bg-red-950/20 hover:bg-red-900/50 rounded text-red-700 hover:text-red-400 border border-red-900/10 hover:border-red-900/50 ml-1"
                                            title="Delete FX Block"
                                          >
                                              <Trash2 size={12} />
                                          </button>
                                     </div>
                                </div>

                                {/* ACTIVE OVERRIDES INDICATOR (Collapsed Mode) */}
                                {block.collapsed && (
                                    <div className="flex flex-wrap gap-1 pl-2">
                                        {Object.entries(block.overrides).map(([k, v]) => {
                                            if (k === 'custom_fx') return null; // Handle separately or ignore in summary
                                            return (
                                                <span key={k} className="text-[9px] bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">
                                                    {k.replace('fx_', '').replace('cam_', '')}
                                                </span>
                                            )
                                        })}
                                        {block.overrides.custom_fx && Object.keys(block.overrides.custom_fx).length > 0 && (
                                            <span className="text-[9px] bg-cyan-900/50 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/20">
                                                +{Object.keys(block.overrides.custom_fx).length} Custom
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* FULL EDITOR (Expanded Mode) */}
                                {!block.collapsed && (
                                    <div className="pl-2 grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/5">
                                         {/* VFX */}
                                         <div>
                                             <h4 className="text-[9px] font-bold text-gray-500 uppercase mb-2">Visual FX</h4>
                                             <div className="flex flex-wrap gap-2">
                                                 <EffectToggle label="Glitch" isActive={block.overrides.fx_chromaticAberration} onToggle={() => toggleOverride(block.id, 'fx_chromaticAberration')} />
                                                 <EffectToggle label="VHS" isActive={block.overrides.fx_vhs} onToggle={() => toggleOverride(block.id, 'fx_vhs')} />
                                                 <EffectToggle label="Pixelate" isActive={block.overrides.fx_mosaic} onToggle={() => toggleOverride(block.id, 'fx_mosaic')} />
                                                 <EffectToggle label="Invert" isActive={block.overrides.fx_invert} onToggle={() => toggleOverride(block.id, 'fx_invert')} />
                                                 <EffectToggle label="Mirror" isActive={block.overrides.fx_mirror} onToggle={() => toggleOverride(block.id, 'fx_mirror')} />
                                                 <EffectToggle label="RGB Split" isActive={block.overrides.fx_rgbSplit} onToggle={() => toggleOverride(block.id, 'fx_rgbSplit')} />
                                                 <EffectToggle label="Scanlines" isActive={block.overrides.fx_scanlines} onToggle={() => toggleOverride(block.id, 'fx_scanlines')} />
                                                 <EffectToggle label="Kaleidoscope" isActive={block.overrides.fx_kaleidoscope} onToggle={() => toggleOverride(block.id, 'fx_kaleidoscope')} />
                                                 <EffectToggle label="Halftone" isActive={block.overrides.fx_halftone} onToggle={() => toggleOverride(block.id, 'fx_halftone')} />
                                                 <EffectToggle label="Old Movie" isActive={block.overrides.fx_oldMovie} onToggle={() => toggleOverride(block.id, 'fx_oldMovie')} />
                                             </div>
                                         </div>
                                         {/* Camera */}
                                         <div>
                                             <h4 className="text-[9px] font-bold text-gray-500 uppercase mb-2">Camera</h4>
                                             <div className="flex flex-wrap gap-2">
                                                 <EffectToggle label="Shake" isActive={block.overrides.cam_shake} onToggle={() => toggleOverride(block.id, 'cam_shake')} />
                                                 <EffectToggle label="Zoom Beat" isActive={block.overrides.cam_zoomBeat} onToggle={() => toggleOverride(block.id, 'cam_zoomBeat')} />
                                                 <EffectToggle label="Hard Kick" isActive={block.overrides.cam_hardKick} onToggle={() => toggleOverride(block.id, 'cam_hardKick')} />
                                                 <EffectToggle label="Panic" isActive={block.overrides.cam_panic} onToggle={() => toggleOverride(block.id, 'cam_panic')} />
                                                 <EffectToggle label="Sway" isActive={block.overrides.cam_sway} onToggle={() => toggleOverride(block.id, 'cam_sway')} />
                                                 <EffectToggle label="Rotate" isActive={block.overrides.cam_rotate} onToggle={() => toggleOverride(block.id, 'cam_rotate')} />
                                             </div>
                                             <h4 className="text-[9px] font-bold text-gray-500 uppercase mb-2 mt-3">Particles</h4>
                                             <EffectToggle label="Particles" isActive={block.overrides.part_enabled} onToggle={() => toggleOverride(block.id, 'part_enabled')} />
                                         </div>

                                         {/* Custom Effects */}
                                         {customEffects && customEffects.length > 0 && (
                                             <div className="col-span-2 pt-3 mt-3 border-t border-white/5">
                                                 <h4 className="text-[9px] font-bold text-cyan-500 uppercase mb-2">Custom Effects</h4>
                                                 <div className="flex flex-wrap gap-2">
                                                     {customEffects.map(fx => (
                                                         <EffectToggle 
                                                            key={fx.id} 
                                                            label={fx.name} 
                                                            isActive={block.overrides.custom_fx?.[fx.id]} 
                                                            onToggle={() => toggleCustomOverride(block.id, fx.id)} 
                                                         />
                                                     ))}
                                                 </div>
                                             </div>
                                         )}
                                    </div>
                                )}
                            </div>
                        );
                    }
                })
            )}
            
            <div className="h-20"></div>
        </div>
    </div>
  );
};