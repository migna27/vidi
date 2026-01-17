

import React, { useState, useRef } from 'react';
import { Sliders, LayoutTemplate, Palette, Sparkles, Video, Type, Image as ImageIcon, Upload, Grid, Music, Camera, Aperture, Clock, Plus, Trash2, Monitor, Timer, FolderOpen, FileJson, FileText, FileAudio, Volume2, VolumeX, Mic2, Layers, AlignLeft, Tags, RotateCcw, AlignJustify, Code, Download, BookOpen, Edit2, Play, Check, X, Copy, Film } from 'lucide-react';
import { TEMPLATES, FONTS, RESOLUTIONS, TEMPLATE_SHADER_GLSL, TEMPLATE_CAMERA_JS, TEMPLATE_EVENT_PRESET } from '../constants';
import { RendererConfig, AnimationKeyframe, AudioLayer, LyricData, SectionType, SectionStyle, ImageEffect, ProceduralStyle, EventBlock, CustomEffect, CustomEffectType, LoadedAsset } from '../types';
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
        if (audioInputRef.current) audioInputRef.current.value = '';
    }
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
                    <div className="grid grid-cols-2 gap-3">
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
                  </div>
              </section>

              {/* ACTIVE CUSTOM EFFECTS LIST IN CUSTOMIZE TAB */}
              {customEffects && customEffects.length > 0 && (
                  <section>
                      <h3 className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Code size={14}/> User Effects</h3>
                      <div className="bg-neutral-900 p-3 rounded-lg border border-white/5 space-y-2">
                          {customEffects.map(fx => (
                              <ToggleInput 
                                key={fx.id} 
                                label={fx.name} 
                                value={fx.active} 
                                onChange={() => toggleEffect(fx.id)} 
                              />
                          ))}
                      </div>
                  </section>
              )}
          </div>
        )}

        {/* LIBRARY TAB */}
        {activeTab === 'library' && (
            <div className="p-4 space-y-6">
                {!editingEffect ? (
                    <>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => addNewEffect('shader')} className="flex-1 bg-cyan-900/40 border border-cyan-500/30 hover:bg-cyan-800/50 text-cyan-200 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                                <Plus size={14}/> New Shader FX
                            </button>
                            <button onClick={() => addNewEffect('camera')} className="flex-1 bg-purple-900/40 border border-purple-500/30 hover:bg-purple-800/50 text-purple-200 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                                <Plus size={14}/> New Camera FX
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {customEffects.length === 0 ? (
                                <div className="text-center text-gray-500 py-8 text-xs italic">
                                    No custom effects created yet.<br/>Use the buttons above or download templates from the Guide.
                                </div>
                            ) : (
                                customEffects.map(fx => (
                                    <div key={fx.id} className="bg-neutral-900 border border-white/5 rounded-lg p-3 group">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${fx.type === 'shader' ? 'bg-cyan-500' : 'bg-purple-500'}`} />
                                                <span className="font-bold text-sm text-gray-200">{fx.name}</span>
                                                {fx.active && <span className="text-[9px] bg-green-900 text-green-300 px-1 rounded uppercase">Active</span>}
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => setEditingEffect(fx)} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white" title="Edit Code">
                                                    <Edit2 size={14}/>
                                                </button>
                                                <button onClick={() => toggleEffect(fx.id)} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white" title={fx.active ? "Disable" : "Enable"}>
                                                    <Play size={14} fill={fx.active ? "currentColor" : "none"}/>
                                                </button>
                                                <button onClick={() => deleteEffect(fx.id)} className="p-1.5 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400" title="Delete">
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-500 line-clamp-2 font-mono bg-black/30 p-1.5 rounded">
                                            {fx.description || "// No description"}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-2">
                            <input 
                                autoFocus
                                value={editingEffect.name}
                                onChange={(e) => setEditingEffect({...editingEffect, name: e.target.value})}
                                className="bg-transparent text-sm font-bold border-b border-transparent focus:border-cyan-500 outline-none w-1/2"
                                placeholder="Effect Name"
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setEditingEffect(null)} className="text-xs text-gray-400 hover:text-white bg-neutral-700 px-2 py-1 rounded">Cancel</button>
                                <button onClick={() => saveEffect(editingEffect)} className="text-xs bg-cyan-600 px-3 py-1 rounded text-white font-bold">Save</button>
                            </div>
                        </div>
                        <input 
                            value={editingEffect.description || ''}
                            onChange={(e) => setEditingEffect({...editingEffect, description: e.target.value})}
                            className="bg-neutral-900 text-xs text-gray-400 p-2 rounded mb-2 w-full outline-none"
                            placeholder="Short description..."
                        />
                        <div className="flex-1 bg-neutral-950 rounded border border-white/10 p-2 overflow-hidden flex flex-col">
                            <div className="text-[10px] text-gray-500 mb-1 font-mono">{editingEffect.type === 'shader' ? '// GLSL Fragment Shader Body' : '// JavaScript Camera Logic'}</div>
                            <textarea 
                                value={editingEffect.code}
                                onChange={(e) => setEditingEffect({...editingEffect, code: e.target.value})}
                                className="flex-1 bg-transparent text-xs font-mono text-green-400 outline-none resize-none leading-relaxed"
                                spellCheck={false}
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2">
                            {editingEffect.type === 'shader' 
                                ? "Writes to 'color'. Use 'effect_main(vec3 color, vec2 uv)'." 
                                : "Executes per frame. Access 'ctx', 'time', 'bass'."}
                        </p>
                    </div>
                )}
            </div>
        )}

        {/* GUIDE TAB */}
        {activeTab === 'guide' && (
            <div className="p-4 space-y-6">
                <div className="text-center mb-6">
                    <BookOpen className="mx-auto text-cyan-500 mb-2" size={24}/>
                    <h2 className="text-sm font-bold text-white">Effect Developer Guide</h2>
                    <p className="text-[10px] text-gray-400">Custom Shaders & Scripts</p>
                </div>

                {/* 1. LAYER SYSTEM EXPLANATION */}
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3 border-b border-white/5 pb-1">Understanding Layers</h3>
                    <div className="bg-neutral-950/50 p-3 rounded-lg text-[10px] text-gray-400 space-y-2">
                        <p>The renderer draws in the following order:</p>
                        <ol className="list-decimal pl-4 space-y-1">
                            <li><span className="text-cyan-400 font-bold">Background (GLSL):</span> Images, videos, or solid colors are drawn here. <span className="italic text-gray-500">Only GLSL Shaders affect this layer.</span></li>
                            <li><span className="text-purple-400 font-bold">Camera (JS):</span> The entire screen (Background + Text) is rotated/scaled/shaken. <span className="italic text-gray-500">Use JS Camera FX to move everything.</span></li>
                            <li><span className="text-white font-bold">Text & Particles:</span> Drawn on top. To style specific text, use the Timeline.</li>
                        </ol>
                    </div>
                </div>

                {/* 2. GLSL SHADERS */}
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Code size={12}/> GLSL Shaders (Background)
                    </h3>
                    
                    <DocSection 
                        title="Simple Color Shift" 
                        description="Mixes the background color with a specific color (Pink) based on the Bass level."
                        code={`vec3 effect_main(vec3 color, vec2 uv) {
  // Target Color (Pink)
  vec3 pink = vec3(1.0, 0.0, 1.0);
  
  // Mix original with pink based on Bass strength
  return mix(color, pink, u_bass * 0.8 * u_intensity);
}`}
                    />

                    <DocSection 
                        title="Wavy Distortion" 
                        description="Modifies the color by sampling from a distorted UV position. Creates a ripple effect."
                        code={`vec3 effect_main(vec3 color, vec2 uv) {
  // Create a wave offset
  float wave = sin(uv.y * 10.0 + u_time * 2.0) * 0.05;
  
  // You cannot change 'uv' directly here for sampling (limitation),
  // but you can modify color brightness based on position
  color += wave * u_bass;
  
  return color;
}`}
                    />
                </div>

                {/* 3. CAMERA SCRIPTS */}
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Camera size={12}/> Camera Scripts (Global)
                    </h3>

                    <DocSection 
                        title="Bass Zoom (The Drop)" 
                        description="Zooms into the center of the screen whenever the bass hits above 0.5."
                        code={`if (bass > 0.5) {
  // Zoom in by 10% scaled by bass
  const zoom = 1.0 + (bass * 0.1 * intensity);
  ctx.scale(zoom, zoom);
}`}
                    />

                    <DocSection 
                        title="Continuous Rotation" 
                        description="Slowly spins the entire screen (text included) based on time."
                        code={`// Rotate based on time
const angle = Math.sin(time * 0.5) * 0.1 * intensity;
ctx.rotate(angle);`}
                    />
                </div>

                {/* 4. TEXT TARGETING INFO */}
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-3 border-b border-white/5 pb-1">Targeting Text Only</h3>
                    <div className="bg-neutral-900 p-3 rounded-lg text-[10px] text-gray-400">
                        <p className="mb-2">
                            <strong className="text-white">Note:</strong> You cannot use GLSL shaders to apply pixel effects (like blur/glitch) <em>only</em> to the text while keeping the background clean.
                        </p>
                        <p>
                            To style text, go to the <strong className="text-cyan-400">Timeline</strong> tab, click on a lyric segment, and use the <strong>Style</strong> tab to change Color, Glow, and Size per line.
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-white/5">
                    <button onClick={() => downloadTemplate(TEMPLATE_SHADER_GLSL, 'custom_shader.glsl')} className="flex-1 bg-neutral-900 hover:bg-neutral-700 py-2 rounded text-xs font-bold border border-white/10 text-cyan-400">Download GLSL Template</button>
                    <button onClick={() => downloadTemplate(TEMPLATE_CAMERA_JS, 'custom_camera.js')} className="flex-1 bg-neutral-900 hover:bg-neutral-700 py-2 rounded text-xs font-bold border border-white/10 text-purple-400">Download JS Template</button>
                </div>
            </div>
        )}
        
        {/* TEMPLATES & SECTIONS TABS (Standard Content) */}
        {activeTab === 'templates' && (
          <div className="p-4 grid grid-cols-2 gap-3">
             {TEMPLATES.map(t => (
               <button
                 key={t.id}
                 onClick={() => handleTemplateSelect(t)}
                 className="flex flex-col items-start gap-2 p-3 bg-neutral-900 border border-white/5 hover:border-cyan-500/50 rounded-xl transition-all hover:bg-neutral-800 group text-left"
               >
                 <div className="w-full aspect-video bg-black/40 rounded-lg mb-1 overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="text-gray-700 group-hover:text-cyan-500 transition-colors" />
                    </div>
                 </div>
                 <div>
                    <span className="text-sm font-bold block text-gray-200 group-hover:text-cyan-400">{t.name}</span>
                 </div>
               </button>
             ))}
          </div>
        )}

        {activeTab === 'sections' && (
             <div className="p-4 space-y-6">
                 {['verse', 'chorus', 'bridge', 'intro', 'outro'].map((sectionKey) => {
                     const key = sectionKey as SectionType;
                     const style = config.sectionStyles?.[key] || { enabled: false };
                     return (
                         <div key={key} className="bg-neutral-900 border border-white/5 rounded-lg p-3">
                             <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                                 <h3 className="text-xs font-bold text-gray-200 uppercase tracking-widest">{key}</h3>
                                 <ToggleInput 
                                    label=""
                                    value={style.enabled} 
                                    onChange={(v) => updateSectionStyle(key, 'enabled', v)}
                                 />
                             </div>
                             {style.enabled && (
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Font Scale</span>
                                        <span>{Math.round((style.fontScale || 1.0) * 100)}%</span>
                                    </div>
                                    <input 
                                        type="range" min="0.5" max="2.0" step="0.1" 
                                        value={style.fontScale || 1.0} 
                                        onChange={(e) => updateSectionStyle(key, 'fontScale', parseFloat(e.target.value))}
                                        className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                    />
                                     <ColorInput label="Active Color" value={style.colors_active || config.colors.active} onChange={(v) => updateSectionStyle(key, 'colors_active', v)} />
                                </div>
                             )}
                         </div>
                     )
                 })}
             </div>
        )}
      </div>
    </div>
  );
};