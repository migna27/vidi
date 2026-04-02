







import React, { useState, useRef } from 'react';
import { Sliders, LayoutTemplate, Palette, Sparkles, Video, Type, Image as ImageIcon, Upload, Grid, Music, Camera, Aperture, Clock, Plus, Trash2, Monitor, Timer, FolderOpen, FileJson, FileText, FileAudio, Volume2, VolumeX, Mic2, Layers, AlignLeft, Tags, RotateCcw, AlignJustify, Code, Download, BookOpen, Edit2, Play, Check, X, Copy, Film, MoveRight, Activity, LogOut, FileOutput, Save, Wand2 } from 'lucide-react';
import { TEMPLATES, FONTS, RESOLUTIONS, TEMPLATE_SHADER_GLSL, TEMPLATE_CAMERA_JS, TEMPLATE_EVENT_PRESET } from '../constants';
import { RendererConfig, AnimationKeyframe, AudioLayer, LyricData, SectionType, SectionStyle, ImageEffect, ProceduralStyle, EventBlock, CustomEffect, CustomEffectType, LoadedAsset, AnimationStyle, ActiveStyle, TextEffectType } from '../types';
import { TimelineEditor } from './TimelineEditor';

interface SettingsPanelProps {
  config: RendererConfig;
  onUpdate: (config: RendererConfig) => void;
  // Lyrics Data
  data: LyricData;
  onUpdateData: (data: LyricData) => void;
  // Playback
  currentTime: number;
  onSeek: (time: number) => void;
  // File Handlers
  onJsonUpload: (jsonStr: string) => void;
  onSrtUpload: (srtStr: string) => void;
  onAudioLayerAdd: (file: File) => void;
  // Audio Mixer Handlers
  audioLayers: AudioLayer[];
  onUpdateLayer: (id: string, updates: Partial<AudioLayer>) => void;
  onRemoveLayer: (id: string) => void;
  // Project Management
  onResetProject: () => void;
  // Event Blocks
  eventBlocks: EventBlock[];
  onUpdateEventBlocks: (blocks: EventBlock[]) => void;
  // Asset Management (New)
  onAssetLoaded?: (type: 'background' | 'font', file: File, meta?: string) => void;
  // Custom Effects (New)
  customEffects?: CustomEffect[];
  onUpdateCustomEffects?: (fx: CustomEffect[]) => void;
  // Loaded Assets (New)
  assets?: LoadedAsset[];
  onSelectAsset?: (asset: LoadedAsset) => void;
}

// --- CONSTANTS FOR DROPDOWNS ---
const ENTRANCE_STYLES: AnimationStyle[] = ['fade', 'slide', 'slam', 'zoom', 'typewriter', 'blur', 'glitch', 'elastic', 'scramble', 'spiral', 'inflate', 'fly-in', 'unfold', 'swirl-in'];
const ACTIVE_STYLES: ActiveStyle[] = ['pulse', 'jitter', 'bounce', 'neon', 'wave', 'rotate', 'skew', 'pop', 'flash', 'float', 'shiver', 'glitch-shake', 'bass-bulge', 'wobble', 'breathing', 'tremble'];
const EXIT_STYLES: AnimationStyle[] = ['fade', 'slide', 'zoom', 'blur', 'sink', 'burn', 'shrink', 'drop', 'implode', 'roll-out', 'fly-out'];

// Helper: Format seconds to SRT time format (00:00:00,000)
const formatToSRTTime = (seconds: number) => {
    const date = new Date(0);
    date.setMilliseconds(seconds * 1000);
    const iso = date.toISOString();
    // ISO format: 1970-01-01T00:00:00.000Z
    // We want: 00:00:00,000
    return iso.substr(11, 8) + ',' + iso.substr(20, 3);
};

// Helper Components
const ToggleInput: React.FC<{ label: string, value: boolean, onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-gray-400">{label}</span>
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full relative transition-colors ${value ? 'bg-cyan-600' : 'bg-neutral-700'}`}
    >
      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
);

const ColorInput: React.FC<{ label: string, value: string, onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between bg-neutral-900 p-2 rounded-md border border-white/5">
    <span className="text-xs font-bold text-gray-400">{label}</span>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: value }}></div>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="opacity-0 absolute w-8 h-8 cursor-pointer"
      />
      <span className="text-xs font-mono text-gray-500">{value}</span>
    </div>
  </div>
);

const SelectInput: React.FC<{ label: string, icon?: React.ElementType, value: string, options: string[], onChange: (v: string) => void }> = ({ label, icon: Icon, value, options, onChange }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1">
            {Icon && <Icon size={10} />} {label}
        </label>
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-neutral-950 border border-white/10 rounded px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-cyan-500"
        >
            {options.map(opt => (
                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
            ))}
        </select>
    </div>
);

const DocSection: React.FC<{ title: string, description: string, code?: string }> = ({ title, description, code }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        if(code) {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="bg-neutral-900 border border-white/5 rounded-lg overflow-hidden mb-4">
            <div className="p-3 border-b border-white/5">
                <h4 className="text-xs font-bold text-cyan-400 mb-1">{title}</h4>
                <p className="text-[10px] text-gray-400 leading-relaxed">{description}</p>
            </div>
            {code && (
                <div className="relative bg-black/50 p-3">
                    <pre className="text-[9px] font-mono text-gray-300 whitespace-pre-wrap">{code}</pre>
                    <button 
                        onClick={handleCopy}
                        className="absolute top-2 right-2 p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-gray-400 hover:text-white transition-colors"
                        title="Copy Code"
                    >
                        {copied ? <Check size={12} className="text-green-400"/> : <Copy size={12}/>}
                    </button>
                </div>
            )}
        </div>
    );
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
    config, 
    onUpdate, 
    data,
    onUpdateData,
    currentTime,
    onSeek,
    onAudioLayerAdd,
    audioLayers,
    onUpdateLayer,
    onRemoveLayer,
    onJsonUpload,
    onSrtUpload,
    onResetProject,
    eventBlocks,
    onUpdateEventBlocks,
    onAssetLoaded,
    customEffects = [],
    onUpdateCustomEffects,
    assets = [],
    onSelectAsset
}) => {
  const [activeTab, setActiveTab] = useState<'project' | 'media' | 'lyrics' | 'sections' | 'templates' | 'customize' | 'library' | 'guide'>('project');
  const [editingEffect, setEditingEffect] = useState<CustomEffect | null>(null);
  
  const bgInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleTemplateSelect = (template: RendererConfig) => {
    onUpdate(JSON.parse(JSON.stringify(template)));
  };

  const updateNested = (section: keyof RendererConfig, key: string, value: any) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    // @ts-ignore
    newConfig[section][key] = value;
    onUpdate(newConfig);
  };

  const updateSectionStyle = (section: SectionType, key: keyof SectionStyle, value: any) => {
      const newConfig = JSON.parse(JSON.stringify(config));
      if (!newConfig.sectionStyles) newConfig.sectionStyles = {};
      if (!newConfig.sectionStyles[section]) newConfig.sectionStyles[section] = { enabled: false };
      
      // @ts-ignore
      newConfig.sectionStyles[section][key] = value;
      onUpdate(newConfig);
  };

  const updateSectionTextEffect = (section: SectionType, fx: TextEffectType, value: number) => {
      const newConfig = JSON.parse(JSON.stringify(config));
      if (!newConfig.sectionStyles[section].textEffects) {
          newConfig.sectionStyles[section].textEffects = { glitch: 0, glow: 0, shift: 0, wave: 0 };
      }
      newConfig.sectionStyles[section].textEffects[fx] = value;
      onUpdate(newConfig);
  };

  const updateSectionAnimation = (section: SectionType, type: 'entrance' | 'active' | 'exit', value: string) => {
      const newConfig = JSON.parse(JSON.stringify(config));
      if (!newConfig.sectionStyles[section].animation) newConfig.sectionStyles[section].animation = {};
      newConfig.sectionStyles[section].animation[type] = value;
      onUpdate(newConfig);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          const type = file.type.startsWith('video') ? 'video' : 'image';
          
          const newConfig = JSON.parse(JSON.stringify(config));
          newConfig.background.type = type;
          newConfig.background.url = url;
          onUpdate(newConfig);
          if(onAssetLoaded) onAssetLoaded('background', file);
      }
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       const reader = new FileReader();
       reader.onload = (ev) => {
           if(ev.target?.result) {
               const fontName = 'CustomFont-' + Date.now();
               const fontFace = new FontFace(fontName, `url(${ev.target.result})`);
               fontFace.load().then((loadedFace) => {
                   document.fonts.add(loadedFace);
                   updateNested('font', 'family', fontName);
                   if(onAssetLoaded) onAssetLoaded('font', file, fontName);
               }).catch(err => console.error("Font load failed", err));
           }
       };
       reader.readAsDataURL(file);
    }
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) onJsonUpload(event.target.result as string);
    };
    reader.readAsText(file);
  };

  const handleSrtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) onSrtUpload(event.target.result as string);
    };
    reader.readAsText(file);
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          onAudioLayerAdd(file);
      }
      if (audioInputRef.current) audioInputRef.current.value = '';
  };

  // --- EXPORT HANDLERS ---
  const exportLyricsAsSrt = () => {
    let srtContent = '';
    data.segments.forEach((seg, index) => {
        srtContent += `${index + 1}\n`;
        srtContent += `${formatToSRTTime(seg.start)} --> ${formatToSRTTime(seg.end)}\n`;
        srtContent += `${seg.text}\n\n`;
    });
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitles.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportLyricsAsJson = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lyrics.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- CUSTOM EFFECT HANDLERS ---
  const addNewEffect = (type: CustomEffectType) => {
      const count = customEffects.length + 1;
      const defaultName = type === 'shader' ? `Custom Shader ${count}` : `Camera FX ${count}`;
      
      const newFx: CustomEffect = {
          id: `fx-${Date.now()}`,
          name: defaultName,
          type,
          code: type === 'shader' ? TEMPLATE_SHADER_GLSL : TEMPLATE_CAMERA_JS,
          active: false,
          description: "New custom effect"
      };
      
      setEditingEffect(newFx);
  };

  const saveEffect = (fx: CustomEffect) => {
      if (!onUpdateCustomEffects) return;
      const exists = customEffects.find(e => e.id === fx.id);
      let updatedList = [];
      if (exists) {
          updatedList = customEffects.map(e => e.id === fx.id ? fx : e);
      } else {
          updatedList = [...customEffects, fx];
      }
      onUpdateCustomEffects(updatedList);
      setEditingEffect(null);
  };

  const deleteEffect = (id: string) => {
      if (!onUpdateCustomEffects || !confirm("Delete this effect permanently?")) return;
      onUpdateCustomEffects(customEffects.filter(e => e.id !== id));
      if (editingEffect?.id === id) setEditingEffect(null);
  };

  const toggleEffect = (id: string) => {
      if (!onUpdateCustomEffects) return;
      onUpdateCustomEffects(customEffects.map(e => e.id === id ? { ...e, active: !e.active } : e));
  };

  const downloadTemplate = (content: string, filename: string) => {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
  };

  // Determine duration for visual track
  const maxAudioDuration = audioLayers.reduce((max, l) => Math.max(max, l.duration), 0);
  const maxLyricDuration = data.segments.length > 0 ? data.segments[data.segments.length-1].end : 0;
  const projectDuration = Math.max(maxAudioDuration, maxLyricDuration, 60);

  return (
    <div className="h-full flex flex-col bg-neutral-800 border-r border-white/5 text-gray-200">
      
      {/* Tab Navigation */}
      <div className="flex border-b border-white/5 bg-neutral-900 overflow-x-auto no-scrollbar">
        {[
            { id: 'project', icon: FolderOpen, label: 'Files' },
            { id: 'media', icon: ImageIcon, label: 'Media' },
            { id: 'lyrics', icon: Clock, label: 'Timeline' },
            { id: 'sections', icon: Tags, label: 'Parts' },
            { id: 'templates', icon: LayoutTemplate, label: 'Presets' },
            { id: 'customize', icon: Sliders, label: 'Style' },
            { id: 'library', icon: Code, label: 'Library' },
            { id: 'guide', icon: BookOpen, label: 'Guide' },
        ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              title={tab.label}
              className={`flex-1 min-w-[50px] py-4 text-[10px] font-bold uppercase flex flex-col items-center justify-center gap-1 transition-colors border-b-2 ${activeTab === tab.id ? 'text-cyan-400 border-cyan-400 bg-white/5' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-neutral-800">
        
        {/* PROJECT TAB */}
        {activeTab === 'project' && (
             <div className="p-4 space-y-6">
                
                {/* Audio Mixer */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                         <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Layers size={14}/> Audio Mixer
                        </h3>
                        <button
                             onClick={() => audioInputRef.current?.click()}
                             className="text-[10px] bg-neutral-700 hover:bg-neutral-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        >
                            <Plus size={10} /> Add Layer
                        </button>
                        <input
                            type="file"
                            ref={audioInputRef}
                            onChange={handleAudioChange}
                            accept="audio/*"
                            className="hidden"
                        />
                    </div>

                    <div className="space-y-2">
                        {audioLayers.length === 0 ? (
                            <div className="text-center p-4 border border-dashed border-white/10 rounded-lg text-xs text-gray-500">
                                No audio tracks loaded.
                            </div>
                        ) : (
                            audioLayers.map(layer => (
                                <div key={layer.id} className="bg-neutral-900 border border-white/5 rounded-lg p-2.5">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Music size={12} className="text-cyan-500 shrink-0"/>
                                            <span className="text-xs font-bold truncate text-gray-300" title={layer.name}>{layer.name}</span>
                                        </div>
                                        <button 
                                            onClick={() => onRemoveLayer(layer.id)}
                                            className="text-neutral-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={12}/>
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="range" min="0" max="1" step="0.01"
                                            value={layer.volume}
                                            onChange={(e) => onUpdateLayer(layer.id, { volume: parseFloat(e.target.value) })}
                                            className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                            title={`Volume: ${Math.round(layer.volume * 100)}%`}
                                        />
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => onUpdateLayer(layer.id, { muted: !layer.muted })}
                                                className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border transition-colors ${layer.muted ? 'bg-red-900/50 border-red-500/50 text-red-400' : 'bg-neutral-800 border-white/5 text-gray-400 hover:text-white'}`}
                                                title="Mute"
                                            >
                                                M
                                            </button>
                                            <button
                                                onClick={() => onUpdateLayer(layer.id, { solo: !layer.solo })}
                                                className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border transition-colors ${layer.solo ? 'bg-yellow-900/50 border-yellow-500/50 text-yellow-400' : 'bg-neutral-800 border-white/5 text-gray-400 hover:text-white'}`}
                                                title="Solo"
                                            >
                                                S
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Type size={14}/> Lyrics Source
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                         <button
                            onClick={() => jsonInputRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-900 hover:bg-neutral-700 rounded-lg border border-white/5 transition-colors group"
                        >
                            <FileJson size={24} className="text-gray-500 group-hover:text-purple-400" />
                            <span className="text-xs font-bold text-gray-400 group-hover:text-white">Import JSON</span>
                        </button>
                        <input
                            type="file"
                            ref={jsonInputRef}
                            onChange={handleJsonChange}
                            accept=".json,application/json"
                            className="hidden"
                        />

                         <button
                            onClick={() => srtInputRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-900 hover:bg-neutral-700 rounded-lg border border-white/5 transition-colors group"
                        >
                            <FileText size={24} className="text-gray-500 group-hover:text-orange-400" />
                            <span className="text-xs font-bold text-gray-400 group-hover:text-white">Import SRT</span>
                        </button>
                        <input
                            type="file"
                            ref={srtInputRef}
                            onChange={handleSrtChange}
                            accept=".srt"
                            className="hidden"
                        />
                    </div>
                    
                    {/* EXPORT SECTION */}
                    <h4 className="text-[10px] font-bold text-gray-600 uppercase mb-2">Export Lyrics</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={exportLyricsAsJson}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-white/5 text-xs text-gray-300"
                        >
                             <FileJson size={12}/> JSON
                        </button>
                        <button 
                            onClick={exportLyricsAsSrt}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded border border-white/5 text-xs text-gray-300"
                        >
                             <FileText size={12}/> SRT
                        </button>
                    </div>
                </section>

                <section>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <ImageIcon size={14}/> Assets
                    </h3>
                    <div className="space-y-2">
                         <button 
                            onClick={() => bgInputRef.current?.click()}
                            className="w-full flex items-center justify-start gap-3 px-3 py-2 bg-neutral-900 hover:bg-neutral-700 rounded-lg border border-white/5 transition-colors text-sm text-gray-300"
                        >
                            <Upload size={16} className="text-gray-500"/>
                            Upload Background Media
                        </button>
                        <input type="file" ref={bgInputRef} onChange={handleBgUpload} accept="image/*,video/*" className="hidden"/>

                        <button 
                            onClick={() => fontInputRef.current?.click()}
                            className="w-full flex items-center justify-start gap-3 px-3 py-2 bg-neutral-900 hover:bg-neutral-700 rounded-lg border border-white/5 transition-colors text-sm text-gray-300"
                        >
                             <Type size={16} className="text-gray-500"/>
                             Upload Custom Font
                        </button>
                        <input type="file" ref={fontInputRef} onChange={handleFontUpload} accept=".ttf,.woff,.woff2,.otf" className="hidden"/>
                    </div>
                </section>

                <section className="pt-4 border-t border-white/5">
                    <button
                        onClick={onResetProject}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-950/30 hover:bg-red-900/50 text-red-400 rounded-lg border border-red-900/50 transition-colors text-sm font-bold"
                    >
                        <Trash2 size={16} />
                        Reset Project Defaults
                    </button>
                </section>
             </div>
        )}

        {/* MEDIA TAB */}
        {activeTab === 'media' && (
            <div className="p-4 space-y-6">
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Grid size={14}/> Media Library
                        </h3>
                        <button
                             onClick={() => bgInputRef.current?.click()}
                             className="text-[10px] bg-cyan-900/50 hover:bg-cyan-800/80 border border-cyan-500/30 text-cyan-200 px-3 py-1.5 rounded flex items-center gap-1 transition-colors font-bold"
                        >
                            <Upload size={12} /> Upload New
                        </button>
                        <input type="file" ref={bgInputRef} onChange={handleBgUpload} accept="image/*,video/*" className="hidden"/>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {assets.filter(a => a.type === 'image' || a.type === 'video').length === 0 ? (
                            <div className="col-span-3 text-center p-8 border border-dashed border-white/10 rounded-lg text-xs text-gray-500">
                                No media assets loaded.
                            </div>
                        ) : (
                            assets.filter(a => a.type === 'image' || a.type === 'video').map(asset => (
                                <button
                                    key={asset.id}
                                    onClick={() => onSelectAsset && onSelectAsset(asset)}
                                    className="relative aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-cyan-500 transition-colors group bg-black"
                                    title={asset.name}
                                >
                                    {asset.type === 'video' ? (
                                        <>
                                            <video src={asset.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <Film size={20} className="text-white drop-shadow-md opacity-80" />
                                            </div>
                                        </>
                                    ) : (
                                        <img src={asset.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={asset.name} />
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 truncate text-[9px] text-gray-300">
                                        {asset.name}
                                    </div>
                                    {config.background.url === asset.url && (
                                        <div className="absolute top-1 right-1 bg-cyan-500 rounded-full p-0.5">
                                            <Check size={10} className="text-black" />
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </section>
                
                <section className="pt-4 border-t border-white/5">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Type size={14}/> Fonts
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                        {assets.filter(a => a.type === 'font').length === 0 ? (
                            <div className="text-center p-4 border border-dashed border-white/10 rounded-lg text-xs text-gray-500">
                                No custom fonts.
                            </div>
                        ) : (
                            assets.filter(a => a.type === 'font').map(asset => (
                                <div key={asset.id} className="flex items-center gap-3 p-2 bg-neutral-900 border border-white/5 rounded">
                                    <div className="w-8 h-8 flex items-center justify-center bg-neutral-800 rounded text-gray-500">
                                        <Type size={16} />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="text-xs font-bold text-gray-300 truncate">{asset.name}</div>
                                        <div className="text-[10px] text-gray-600">Custom Font</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'lyrics' && (
            <TimelineEditor 
                data={data} 
                onUpdate={onUpdateData} 
                currentTime={currentTime}
                onSeek={onSeek}
                eventBlocks={eventBlocks}
                onUpdateEventBlocks={onUpdateEventBlocks}
                customEffects={customEffects}
                projectConfig={config}
                duration={projectDuration}
            />
        )}

        {/* CUSTOMIZE TAB */}
        {activeTab === 'customize' && (
          <div className="p-4 space-y-6">
              <section>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Aperture size={14}/> Global Effects</h3>
                  <div className="bg-neutral-900 p-3 rounded-lg border border-white/5 space-y-2">
                        <ToggleInput label="Chromatic Ab." value={config.effects.chromaticAberration} onChange={(v) => updateNested('effects', 'chromaticAberration', v)} />
                        <ToggleInput label="Scanlines" value={config.effects.scanlines} onChange={(v) => updateNested('effects', 'scanlines', v)} />
                        <ToggleInput label="Vignette" value={config.effects.vignette} onChange={(v) => updateNested('effects', 'vignette', v)} />
                        <ToggleInput label="Film Grain" value={config.effects.filmGrain} onChange={(v) => updateNested('effects', 'filmGrain', v)} />
                        <ToggleInput label="Glow" value={config.effects.glow > 0} onChange={(v) => updateNested('effects', 'glow', v ? 0.8 : 0)} />
                        <ToggleInput label="Crimson Pop" value={config.effects.crimsonPop} onChange={(v) => updateNested('effects', 'crimsonPop', v)} />
                        <ToggleInput label="Blood Pulse" value={config.effects.bloodPulse} onChange={(v) => updateNested('effects', 'bloodPulse', v)} />
                        <ToggleInput label="Red Glitch" value={config.effects.redChannelGlitch} onChange={(v) => updateNested('effects', 'redChannelGlitch', v)} />
                  </div>
              </section>

              {/* ACTIVE CUSTOM EFFECTS LIST IN CUSTOMIZE TAB */}
              {customEffects && customEffects.length > 0 && (
                  <section>
                      <h3 className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Code size={14}/> User Effects</h3>
                      <div className="space-y-2">
                          {customEffects.map(fx => (
                              <div key={fx.id} className="flex items-center justify-between bg-neutral-900 p-2 rounded-lg border border-white/5">
                                  <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${fx.active ? 'bg-purple-500' : 'bg-gray-600'}`} />
                                      <span className="text-xs font-medium text-gray-300">{fx.name}</span>
                                  </div>
                                  <ToggleInput label="" value={fx.active} onChange={() => toggleEffect(fx.id)} />
                              </div>
                          ))}
                      </div>
                  </section>
              )}

              <section>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Type size={14}/> Typography</h3>
                  <div className="bg-neutral-900 p-3 rounded-lg border border-white/5 space-y-3">
                      <SelectInput label="Font Family" icon={Type} value={config.font.family} options={FONTS} onChange={(v) => updateNested('font', 'family', v)} />
                      <div className="flex gap-2">
                        <div className="flex-1">
                             <SelectInput label="Weight" value={config.font.weight} options={['100','300','400','700','900']} onChange={(v) => updateNested('font', 'weight', v)} />
                        </div>
                        <div className="flex items-end pb-1">
                             <button onClick={() => updateNested('font', 'italic', !config.font.italic)} className={`p-1.5 rounded ${config.font.italic ? 'bg-cyan-600 text-white' : 'bg-neutral-800 text-gray-400'}`} title="Italic">
                                 I
                             </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-500 uppercase">Font Size</label>
                          <input type="range" min="20" max="200" value={config.font.fontSize} onChange={(e) => updateNested('font', 'fontSize', parseInt(e.target.value))} className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                      </div>
                      <ColorInput label="Text Color" value={config.colors.text} onChange={(v) => updateNested('colors', 'text', v)} />
                      <ColorInput label="Active Color" value={config.colors.active} onChange={(v) => updateNested('colors', 'active', v)} />
                  </div>
              </section>
              
               <section>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Sparkles size={14}/> Particles</h3>
                  <div className="bg-neutral-900 p-3 rounded-lg border border-white/5 space-y-3">
                      <ToggleInput label="Enabled" value={config.particles.enabled} onChange={(v) => updateNested('particles', 'enabled', v)} />
                      {config.particles.enabled && (
                          <>
                             <SelectInput label="Shape" value={config.particles.shape} options={['circle', 'square', 'star', 'hexagon', 'triangle', 'note', 'tetris']} onChange={(v) => updateNested('particles', 'shape', v)} />
                             <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">Count</label>
                                <input type="range" min="0" max="200" value={config.particles.count} onChange={(e) => updateNested('particles', 'count', parseInt(e.target.value))} className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">Speed</label>
                                <input type="range" min="0.1" max="5.0" step="0.1" value={config.particles.speed} onChange={(e) => updateNested('particles', 'speed', parseFloat(e.target.value))} className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                             </div>
                          </>
                      )}
                  </div>
              </section>
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
            <div className="grid grid-cols-2 gap-3 p-4">
                {TEMPLATES.map(t => (
                    <button
                        key={t.id}
                        onClick={() => handleTemplateSelect(t)}
                        className={`p-3 rounded-xl border text-left transition-all ${config.id === t.id ? 'bg-cyan-900/20 border-cyan-500/50' : 'bg-neutral-900 border-white/5 hover:border-white/20'}`}
                    >
                        <div className="font-bold text-xs text-gray-200 mb-1">{t.name}</div>
                        <div className="text-[10px] text-gray-500">Preset</div>
                    </button>
                ))}
            </div>
        )}

        {/* SECTIONS TAB */}
        {activeTab === 'sections' && (
            <div className="p-4 space-y-4">
                {(['verse', 'chorus', 'bridge', 'intro', 'outro'] as SectionType[]).map((section) => {
                    const style = config.sectionStyles[section];
                    return (
                        <div key={section} className="bg-neutral-900 border border-white/5 rounded-lg overflow-hidden">
                            <div className="p-3 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Tags size={14} className="text-gray-500"/>
                                    <span className="text-xs font-bold uppercase text-gray-300">{section}</span>
                                </div>
                                <ToggleInput label="" value={style.enabled} onChange={(v) => updateSectionStyle(section, 'enabled', v)} />
                            </div>
                            
                            {style.enabled && (
                                <div className="p-3 space-y-3 bg-black/20">
                                    <div className="grid grid-cols-2 gap-2">
                                         <ColorInput label="Text" value={style.colors_text || config.colors.text} onChange={(v) => updateSectionStyle(section, 'colors_text', v)} />
                                         <ColorInput label="Active" value={style.colors_active || config.colors.active} onChange={(v) => updateSectionStyle(section, 'colors_active', v)} />
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-gray-500 uppercase">Scale</label>
                                        <input type="range" min="0.5" max="2.0" step="0.1" value={style.fontScale || 1.0} onChange={(e) => updateSectionStyle(section, 'fontScale', parseFloat(e.target.value))} className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                                    </div>

                                    <div className="space-y-1 pt-2 border-t border-white/5">
                                         <SelectInput label="Entrance" value={style.animation?.entrance || config.animation.entrance} options={ENTRANCE_STYLES} onChange={(v) => updateSectionAnimation(section, 'entrance', v)} />
                                         <SelectInput label="Active Loop" value={style.animation?.active || config.animation.active} options={ACTIVE_STYLES} onChange={(v) => updateSectionAnimation(section, 'active', v)} />
                                         <SelectInput label="Exit" value={style.animation?.exit || config.animation.exit} options={EXIT_STYLES} onChange={(v) => updateSectionAnimation(section, 'exit', v)} />
                                    </div>

                                    {/* NEW: TEXT EFFECTS CONTROLS */}
                                    <div className="space-y-2 pt-2 border-t border-white/5">
                                        <h4 className="text-[9px] font-bold text-purple-400 uppercase flex items-center gap-1"><Wand2 size={10}/> Text Shader FX</h4>
                                        {[
                                            { id: 'glitch', label: 'Glitch' },
                                            { id: 'glow', label: 'Glow' },
                                            { id: 'shift', label: 'RGB Shift' },
                                            { id: 'wave', label: 'Wave' }
                                        ].map((fx) => (
                                            <div key={fx.id} className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400 w-12">{fx.label}</span>
                                                <input 
                                                    type="range" min="0" max="1" step="0.1"
                                                    // @ts-ignore
                                                    value={style.textEffects?.[fx.id] || 0}
                                                    // @ts-ignore
                                                    onChange={(e) => updateSectionTextEffect(section, fx.id, parseFloat(e.target.value))}
                                                    className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
        
        {/* LIBRARY TAB (Custom Shader/JS Editor) */}
        {activeTab === 'library' && (
            <div className="flex flex-col h-full">
                {editingEffect ? (
                    <div className="flex flex-col h-full p-4 space-y-3">
                         <div className="flex items-center justify-between mb-2">
                             <input 
                                value={editingEffect.name} 
                                onChange={(e) => setEditingEffect({...editingEffect, name: e.target.value})}
                                className="bg-transparent text-sm font-bold text-white outline-none border-b border-white/20 focus:border-cyan-500 w-full"
                             />
                             <div className="flex gap-2">
                                <button onClick={() => setEditingEffect(null)} className="p-1.5 text-gray-400 hover:text-white"><X size={16}/></button>
                             </div>
                         </div>
                         
                         <div className="flex-1 bg-black rounded-lg border border-white/10 overflow-hidden flex flex-col">
                             <div className="bg-white/5 px-3 py-1 text-[10px] text-gray-400 font-mono border-b border-white/5 flex justify-between">
                                 <span>{editingEffect.type === 'shader' ? 'GLSL Fragment' : 'JavaScript Context'}</span>
                             </div>
                             <textarea 
                                value={editingEffect.code}
                                onChange={(e) => setEditingEffect({...editingEffect, code: e.target.value})}
                                className="flex-1 bg-transparent p-3 text-xs font-mono text-gray-300 outline-none resize-none leading-relaxed"
                                spellCheck={false}
                             />
                         </div>

                         <div className="flex justify-between items-center">
                             <button onClick={() => deleteEffect(editingEffect.id)} className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1"><Trash2 size={14}/> Delete</button>
                             <button onClick={() => saveEffect(editingEffect)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2"><Save size={14}/> Save Effect</button>
                         </div>
                    </div>
                ) : (
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => addNewEffect('shader')} className="p-4 bg-neutral-900 border border-white/5 hover:border-purple-500 rounded-lg flex flex-col items-center gap-2 transition-colors">
                                <Sparkles size={24} className="text-purple-400"/>
                                <span className="text-xs font-bold text-gray-300">New Shader</span>
                            </button>
                            <button onClick={() => addNewEffect('camera')} className="p-4 bg-neutral-900 border border-white/5 hover:border-orange-500 rounded-lg flex flex-col items-center gap-2 transition-colors">
                                <Camera size={24} className="text-orange-400"/>
                                <span className="text-xs font-bold text-gray-300">New Script</span>
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">My Library</h3>
                             {customEffects.length === 0 ? (
                                 <div className="text-center p-6 border border-dashed border-white/10 rounded-lg text-xs text-gray-500">
                                     No custom effects yet.
                                 </div>
                             ) : (
                                 customEffects.map(fx => (
                                     <div key={fx.id} onClick={() => setEditingEffect(fx)} className="flex items-center justify-between p-3 bg-neutral-900 border border-white/5 rounded-lg hover:border-cyan-500/50 cursor-pointer group transition-colors">
                                         <div className="flex items-center gap-3">
                                             <div className={`p-2 rounded ${fx.type === 'shader' ? 'bg-purple-900/20 text-purple-400' : 'bg-orange-900/20 text-orange-400'}`}>
                                                 {fx.type === 'shader' ? <Sparkles size={16}/> : <Camera size={16}/>}
                                             </div>
                                             <div>
                                                 <div className="text-xs font-bold text-gray-200">{fx.name}</div>
                                                 <div className="text-[10px] text-gray-500">{fx.type === 'shader' ? 'GLSL' : 'JS'} &bull; {fx.active ? 'Active' : 'Inactive'}</div>
                                             </div>
                                         </div>
                                         <Edit2 size={14} className="text-gray-600 group-hover:text-white transition-colors" />
                                     </div>
                                 ))
                             )}
                        </div>
                    </div>
                )}
            </div>
        )}
        
        {/* GUIDE TAB */}
        {activeTab === 'guide' && (
            <div className="p-4 space-y-6">
                 <section>
                     <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><BookOpen size={14}/> Documentation</h3>
                     <DocSection 
                        title="Shader Uniforms (GLSL)" 
                        description="Variables available in your custom fragment shaders."
                        code={`uniform float u_time;\nuniform vec2 u_resolution;\nuniform float u_bass; // 0.0-1.0\nuniform float u_mid;\nuniform float u_high;\nuniform float u_intensity;`}
                     />
                     <DocSection 
                        title="Camera Context (JS)" 
                        description="Variables available in your custom camera scripts."
                        code={`ctx.rotate(angle);\nctx.scale(x, y);\nctx.translate(x, y);\n// variables: bass, mid, high, time, width, height`}
                     />
                 </section>
                 
                 <section>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Download size={14}/> Templates</h3>
                      <div className="space-y-2">
                           <button onClick={() => downloadTemplate(TEMPLATE_SHADER_GLSL, 'shader_template.glsl')} className="w-full text-left px-3 py-2 bg-neutral-900 border border-white/5 rounded text-xs text-gray-300 hover:text-white hover:bg-neutral-800 transition-colors">
                               Download GLSL Template
                           </button>
                           <button onClick={() => downloadTemplate(TEMPLATE_CAMERA_JS, 'camera_script.js')} className="w-full text-left px-3 py-2 bg-neutral-900 border border-white/5 rounded text-xs text-gray-300 hover:text-white hover:bg-neutral-800 transition-colors">
                               Download JS Camera Template
                           </button>
                           <button onClick={() => downloadTemplate(TEMPLATE_EVENT_PRESET, 'event_preset.json')} className="w-full text-left px-3 py-2 bg-neutral-900 border border-white/5 rounded text-xs text-gray-300 hover:text-white hover:bg-neutral-800 transition-colors">
                               Download Event Preset JSON
                           </button>
                      </div>
                 </section>
            </div>
        )}

      </div>
    </div>
  );
};