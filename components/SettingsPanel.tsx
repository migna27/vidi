

import React, { useState, useRef } from 'react';
import { Sliders, LayoutTemplate, Palette, Sparkles, Video, Type, Image as ImageIcon, Upload, Grid, Music, Camera, Aperture, Clock, Plus, Trash2, Monitor, Timer, FolderOpen, FileJson, FileText, FileAudio, Volume2, VolumeX, Mic2, Layers, AlignLeft, Tags, RotateCcw } from 'lucide-react';
import { TEMPLATES, FONTS, RESOLUTIONS } from '../constants';
import { RendererConfig, AnimationKeyframe, AudioLayer, LyricData, SectionType, SectionStyle, ImageEffect } from '../types';
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
}

// Helper Components
const ToggleInput = ({ label, value, onChange }: { label: string, value: boolean, onChange: (v: boolean) => void }) => (
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

const MultiToggleInput = ({ label, values, options, onChange }: { label: string, values: string[], options: string[], onChange: (v: string[]) => void }) => (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
            const isActive = values.includes(opt);
            return (
                <button
                    key={opt}
                    onClick={() => {
                        if (isActive) {
                            onChange(values.filter(v => v !== opt));
                        } else {
                            onChange([...values, opt]);
                        }
                    }}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all border ${
                        isActive 
                        ? 'bg-cyan-600 text-white border-cyan-500' 
                        : 'bg-neutral-800 text-gray-400 border-white/5 hover:border-white/20'
                    }`}
                >
                    {opt}
                </button>
            );
        })}
      </div>
    </div>
);

const SelectInput = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: any) => void }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-neutral-900 border border-white/10 rounded-md px-2 py-1.5 text-sm text-gray-200 focus:border-cyan-500 outline-none"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
      ))}
    </select>
  </div>
);

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
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

const IMAGE_EFFECT_OPTIONS = [
    'bright-happy', 'zoom-slow', 'chromatic-shift', 'vhs-stripes', 'liquid-warp', 
    'scan-drift', 'ghosting', 'pixel-noise', 'mirror-x', 
    'dark-error', 'red-error', 'alert', 'thermal'
];

interface KeyframeEditorProps {
    keyframe: AnimationKeyframe;
    defaults: RendererConfig;
    onUpdate: (id: string, updates: Partial<AnimationKeyframe> | Partial<AnimationKeyframe['values']>) => void;
    onDelete: (id: string) => void;
}

const KeyframeEditor: React.FC<KeyframeEditorProps> = ({ keyframe, defaults, onUpdate, onDelete }) => {
    return (
        <div className="bg-neutral-900 p-4 rounded-xl border border-white/10 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                 <h4 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                    <Sliders size={14} /> Edit Keyframe
                 </h4>
                 <button 
                    onClick={() => onDelete(keyframe.id)}
                    className="text-red-400 hover:text-red-300 p-1 hover:bg-red-900/20 rounded transition-colors"
                    title="Delete Keyframe"
                 >
                    <Trash2 size={16} />
                 </button>
            </div>
            
            <div className="flex flex-col gap-1">
                 <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Timer size={12} /> Timestamp (seconds)
                 </label>
                 <input 
                    type="number" 
                    step="0.1"
                    min="0"
                    value={keyframe.time.toFixed(2)}
                    onChange={(e) => onUpdate(keyframe.id, { time: parseFloat(e.target.value) })}
                    className="bg-black border border-white/10 rounded-md px-2 py-1.5 text-sm text-white focus:border-cyan-500 outline-none font-mono"
                 />
            </div>

            <div className="space-y-3 pt-2 border-t border-white/5">
                <ColorInput 
                    label="Active Color" 
                    value={keyframe.values.colors_active || defaults.colors.active} 
                    onChange={(v) => onUpdate(keyframe.id, { values: { ...keyframe.values, colors_active: v } })} 
                />
                <ColorInput 
                    label="Background Color" 
                    value={keyframe.values.background_color || defaults.background.color} 
                    onChange={(v) => onUpdate(keyframe.id, { values: { ...keyframe.values, background_color: v } })} 
                />
                
                {/* Image Effect Override in Keyframe */}
                <MultiToggleInput 
                    label="Active Image Effects" 
                    values={keyframe.values.image_effects || defaults.background.imageEffects || []} 
                    options={IMAGE_EFFECT_OPTIONS} 
                    onChange={(v) => onUpdate(keyframe.id, { values: { ...keyframe.values, image_effects: v as ImageEffect[] } })} 
                />

                <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Effect Speed</span>
                        <span>{(keyframe.values.image_effect_speed ?? defaults.background.imageEffectSpeed ?? 1.0).toFixed(1)}x</span>
                    </div>
                    <input 
                        type="range" min="0.1" max="5.0" step="0.1" 
                        value={keyframe.values.image_effect_speed ?? defaults.background.imageEffectSpeed ?? 1.0} 
                        onChange={(e) => onUpdate(keyframe.id, { values: { ...keyframe.values, image_effect_speed: parseFloat(e.target.value) } })}
                        className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                </div>

                <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Glow Intensity</span>
                        <span>{Math.round((keyframe.values.effects_glow ?? defaults.effects.glow) * 100)}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.1" 
                        value={keyframe.values.effects_glow ?? defaults.effects.glow} 
                        onChange={(e) => onUpdate(keyframe.id, { values: { ...keyframe.values, effects_glow: parseFloat(e.target.value) } })}
                        className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                </div>

                <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Camera Zoom (Offset)</span>
                        <span>{keyframe.values.camera_zoom?.toFixed(2) || 0}</span>
                    </div>
                    <input 
                        type="range" min="-0.5" max="2.0" step="0.1" 
                        value={keyframe.values.camera_zoom || 0} 
                        onChange={(e) => onUpdate(keyframe.id, { values: { ...keyframe.values, camera_zoom: parseFloat(e.target.value) } })}
                        className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                </div>

                <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Camera Rotate (Rad)</span>
                        <span>{keyframe.values.camera_rotate?.toFixed(2) || 0}</span>
                    </div>
                    <input 
                        type="range" min="-3.14" max="3.14" step="0.1" 
                        value={keyframe.values.camera_rotate || 0} 
                        onChange={(e) => onUpdate(keyframe.id, { values: { ...keyframe.values, camera_rotate: parseFloat(e.target.value) } })}
                        className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                </div>
            </div>
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
    onResetProject
}) => {
  const [activeTab, setActiveTab] = useState<'project' | 'lyrics' | 'sections' | 'templates' | 'customize' | 'timeline'>('project');
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for Project Files
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

  const updateColor = (key: keyof RendererConfig['colors'], value: string) => {
    updateNested('colors', key, value);
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
        // Reset input
        if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  // Keyframe Logic
  const addKeyframe = () => {
    const newKeyframe: AnimationKeyframe = {
      id: Date.now().toString(),
      time: currentTime,
      values: {
        colors_active: config.colors.active,
        colors_text: config.colors.text,
        background_color: config.background.color,
        effects_glow: config.effects.glow,
        camera_zoom: 0,
        camera_rotate: 0,
        image_effects: config.background.imageEffects || [],
        image_effect_speed: config.background.imageEffectSpeed || 1.0
      }
    };
    const newConfig = { ...config, keyframes: [...(config.keyframes || []), newKeyframe].sort((a, b) => a.time - b.time) };
    onUpdate(newConfig);
    setSelectedKeyframeId(newKeyframe.id);
  };

  const updateKeyframe = (id: string, updates: Partial<AnimationKeyframe> | Partial<AnimationKeyframe['values']>) => {
     let newConfig = { ...config };
     newConfig.keyframes = newConfig.keyframes.map(kf => {
         if (kf.id === id) {
             if ('values' in updates) {
                 return { ...kf, values: { ...kf.values, ...(updates as any).values } };
             } else {
                 return { ...kf, ...updates };
             }
         }
         return kf;
     });

     if ('time' in updates) {
         newConfig.keyframes.sort((a, b) => a.time - b.time);
     }
     onUpdate(newConfig);
  };

  const deleteKeyframe = (id: string) => {
    const newConfig = { ...config };
    newConfig.keyframes = newConfig.keyframes.filter(kf => kf.id !== id);
    onUpdate(newConfig);
    if(selectedKeyframeId === id) setSelectedKeyframeId(null);
  }

  const selectedKeyframe = config.keyframes?.find(k => k.id === selectedKeyframeId);

  return (
    <div className="h-full flex flex-col bg-neutral-800 border-r border-white/5 text-gray-200">
      
      {/* Tab Navigation */}
      <div className="flex border-b border-white/5 bg-neutral-900 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('project')}
          title="Project Files"
          className={`flex-1 min-w-[60px] py-4 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors border-b-2 ${activeTab === 'project' ? 'text-cyan-400 border-cyan-400 bg-white/5' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
        >
          <FolderOpen size={16} />
          Files
        </button>
        <button 
          onClick={() => setActiveTab('lyrics')}
          title="Edit Lyrics"
          className={`flex-1 min-w-[60px] py-4 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors border-b-2 ${activeTab === 'lyrics' ? 'text-cyan-400 border-cyan-400 bg-white/5' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
        >
          <AlignLeft size={16} />
          Lyrics
        </button>
        <button 
          onClick={() => setActiveTab('sections')}
          title="Sections"
          className={`flex-1 min-w-[60px] py-4 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors border-b-2 ${activeTab === 'sections' ? 'text-cyan-400 border-cyan-400 bg-white/5' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
        >
          <Tags size={16} />
          Parts
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          title="Templates"
          className={`flex-1 min-w-[60px] py-4 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors border-b-2 ${activeTab === 'templates' ? 'text-cyan-400 border-cyan-400 bg-white/5' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
        >
          <LayoutTemplate size={16} />
          Presets
        </button>
        <button 
          onClick={() => setActiveTab('customize')}
          title="Customize"
          className={`flex-1 min-w-[60px] py-4 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors border-b-2 ${activeTab === 'customize' ? 'text-cyan-400 border-cyan-400 bg-white/5' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
        >
          <Sliders size={16} />
          Style
        </button>
        <button 
          onClick={() => setActiveTab('timeline')}
          title="Keyframes"
          className={`flex-1 min-w-[60px] py-4 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors border-b-2 ${activeTab === 'timeline' ? 'text-cyan-400 border-cyan-400 bg-white/5' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
        >
          <Clock size={16} />
          Keys
        </button>
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
                    <p className="text-[10px] text-gray-500 mt-2 text-center">
                        Go to "Lyrics" tab to edit imported data.
                    </p>
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
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <RotateCcw size={14}/> Reset
                    </h3>
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

        {/* LYRICS TAB */}
        {activeTab === 'lyrics' && (
            <TimelineEditor 
                data={data} 
                onUpdate={onUpdateData} 
                currentTime={currentTime}
                onSeek={onSeek}
            />
        )}

        {/* SECTIONS TAB */}
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

                             {style.enabled ? (
                                 <div className="space-y-3">
                                     <ColorInput 
                                        label="Active Color" 
                                        value={style.colors_active || config.colors.active} 
                                        onChange={(v) => updateSectionStyle(key, 'colors_active', v)} 
                                    />
                                     <ColorInput 
                                        label="Text Color Override" 
                                        value={style.colors_text || config.colors.text} 
                                        onChange={(v) => updateSectionStyle(key, 'colors_text', v)} 
                                    />
                                    
                                    <div>
                                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                                            <span>Glow Boost</span>
                                            <span>+{((style.effects_glow_boost || 0) * 100).toFixed(0)}%</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="1" step="0.1" 
                                            value={style.effects_glow_boost || 0} 
                                            onChange={(e) => updateSectionStyle(key, 'effects_glow_boost', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                        />
                                    </div>
                                    
                                    <div>
                                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                                            <span>Zoom Boost</span>
                                            <span>+{((style.camera_zoom_boost || 0) * 100).toFixed(0)}%</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="0.5" step="0.05" 
                                            value={style.camera_zoom_boost || 0} 
                                            onChange={(e) => updateSectionStyle(key, 'camera_zoom_boost', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                        />
                                    </div>

                                    {/* Animation Overrides */}
                                    <div className="pt-2 border-t border-white/5 space-y-2">
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase">Animation Override</h4>
                                        <SelectInput 
                                            label="Entrance" 
                                            value={style.animation?.entrance || config.animation.entrance} 
                                            options={['random', 'fade', 'slide', 'slam', 'zoom', 'typewriter', 'spin', 'blur', 'glitch', 'elastic', 'drop', 'scramble', 'spiral', 'inflate', 'stretch', 'stack-pop']} 
                                            onChange={(v) => {
                                                const currentAnim = style.animation || {};
                                                updateSectionStyle(key, 'animation', { ...currentAnim, entrance: v });
                                            }} 
                                        />
                                        <SelectInput 
                                            label="Active" 
                                            value={style.animation?.active || config.animation.active} 
                                            options={['random', 'pulse', 'jitter', 'bounce', 'neon', 'wave', 'rotate', 'skew', 'pop', 'flash', 'float', 'shiver', 'rainbow', 'heartbeat', 'swing', 'glitch-shake']} 
                                            onChange={(v) => {
                                                const currentAnim = style.animation || {};
                                                updateSectionStyle(key, 'animation', { ...currentAnim, active: v });
                                            }} 
                                        />
                                        <SelectInput 
                                            label="Out" 
                                            value={style.animation?.exit || config.animation.exit} 
                                            options={['fade', 'slide', 'slam', 'zoom', 'blur', 'glitch', 'drop', 'spiral', 'sink', 'burn']} 
                                            onChange={(v) => {
                                                const currentAnim = style.animation || {};
                                                updateSectionStyle(key, 'animation', { ...currentAnim, exit: v });
                                            }} 
                                        />
                                    </div>
                                 </div>
                             ) : (
                                 <p className="text-[10px] text-gray-500 text-center py-2">
                                     Using default global styles.
                                 </p>
                             )}
                         </div>
                     );
                 })}
            </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <div className="p-4 grid grid-cols-2 gap-3">
             {TEMPLATES.map(t => (
               <button
                 key={t.id}
                 onClick={() => handleTemplateSelect(t)}
                 className="flex flex-col items-start gap-2 p-3 bg-neutral-900 border border-white/5 hover:border-cyan-500/50 rounded-xl transition-all hover:bg-neutral-800 group text-left"
               >
                 <div className="w-full aspect-video bg-black/40 rounded-lg mb-1 overflow-hidden relative">
                    {/* Visual Preview Placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="text-gray-700 group-hover:text-cyan-500 transition-colors" />
                    </div>
                 </div>
                 <div>
                    <span className="text-sm font-bold block text-gray-200 group-hover:text-cyan-400">{t.name}</span>
                    <span className="text-[10px] text-gray-500 uppercase">{t.resolutionId}</span>
                 </div>
               </button>
             ))}
          </div>
        )}

        {/* CUSTOMIZE TAB */}
        {activeTab === 'customize' && (
          <div className="p-4 space-y-6">
            {/* Resolution */}
            <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Monitor size={14}/> Output Settings
                </h3>
                <div className="bg-neutral-900 p-3 rounded-lg border border-white/5">
                    <SelectInput 
                        label="Resolution / Aspect Ratio"
                        value={config.resolutionId}
                        options={RESOLUTIONS.map(r => r.id)}
                        onChange={(v) => {
                             const newConfig = { ...config, resolutionId: v };
                             onUpdate(newConfig);
                        }}
                    />
                    <div className="mt-2 text-[10px] text-gray-500 text-right">
                        {RESOLUTIONS.find(r => r.id === config.resolutionId)?.name}
                    </div>
                </div>
            </section>

            {/* Audio Reactivity */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Music size={14}/> Audio Reactivity
              </h3>
              <div className="bg-neutral-900 p-3 rounded-lg border border-white/5 space-y-3">
                 <ToggleInput 
                    label="Enabled" 
                    value={config.audioReactivity.enabled} 
                    onChange={(v) => updateNested('audioReactivity', 'enabled', v)} 
                 />
                 
                 {config.audioReactivity.enabled && (
                    <>
                        <SelectInput 
                            label="Visualizer Style" 
                            value={config.audioReactivity.visualizerStyle} 
                            options={['spectrum', 'orb', 'shockwave', 'none']} 
                            onChange={(v) => updateNested('audioReactivity', 'visualizerStyle', v)} 
                        />
                        <div className="pt-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Sensitivity</span>
                                <span>{Math.round(config.audioReactivity.sensitivity * 100)}%</span>
                            </div>
                            <input 
                                type="range" min="0.5" max="2.0" step="0.1" 
                                value={config.audioReactivity.sensitivity} 
                                onChange={(e) => updateNested('audioReactivity', 'sensitivity', parseFloat(e.target.value))}
                                className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                        </div>
                    </>
                 )}
              </div>
            </section>

            {/* Background */}
            <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ImageIcon size={14}/> Background Config
                </h3>
                <div className="bg-neutral-900 p-3 rounded-lg border border-white/5 space-y-3">
                    <SelectInput 
                      label="Type" 
                      value={config.background.type} 
                      options={['solid', 'image', 'video', 'procedural']} 
                      onChange={(v) => updateNested('background', 'type', v)} 
                    />

                    {config.background.type === 'solid' && (
                        <ColorInput label="Color" value={config.background.color} onChange={(v) => updateNested('background', 'color', v)} />
                    )}

                    {(config.background.type === 'procedural' || config.background.type === 'image' || config.background.type === 'video') && (
                        <>
                             {config.background.type === 'procedural' ? (
                                <>
                                    <ColorInput label="Base Color" value={config.background.color} onChange={(v) => updateNested('background', 'color', v)} />
                                    <SelectInput 
                                        label="Style" 
                                        value={config.background.proceduralStyle || 'grid'} 
                                        options={['grid', 'stars', 'plasma', 'tunnel', 'matrix', 'gradient-wave', 'hexagons', 'kaleidoscope', 'dna']} 
                                        onChange={(v) => updateNested('background', 'proceduralStyle', v)} 
                                    />
                                </>
                             ) : (
                                <>
                                    <MultiToggleInput 
                                        label="Active Effects" 
                                        values={config.background.imageEffects || []} 
                                        options={IMAGE_EFFECT_OPTIONS} 
                                        onChange={(v) => updateNested('background', 'imageEffects', v)} 
                                    />
                                    <div className="pt-2">
                                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                                            <span>Effect Speed</span>
                                            <span>{(config.background.imageEffectSpeed || 1.0).toFixed(1)}x</span>
                                        </div>
                                        <input 
                                            type="range" min="0.1" max="5.0" step="0.1" 
                                            value={config.background.imageEffectSpeed || 1.0} 
                                            onChange={(e) => updateNested('background', 'imageEffectSpeed', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                        />
                                    </div>
                                </>
                             )}
                             
                             <div className="pt-2">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>
                                        {config.background.type === 'procedural' ? 'Intensity/Speed' : 'Opacity/Dim'}
                                    </span>
                                    <span>{Math.round((config.background.intensity || 0.5) * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min={config.background.type === 'procedural' ? "0.1" : "0"} max={config.background.type === 'procedural' ? "2.0" : "1.0"} step="0.1" 
                                    value={config.background.intensity ?? (config.background.type === 'procedural' ? 0.5 : 1.0)} 
                                    onChange={(e) => updateNested('background', 'intensity', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                />
                             </div>
                             
                             {config.background.type === 'video' && (
                                 <div className="pt-2">
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Playback Speed</span>
                                        <span>{config.background.playbackSpeed || 1.0}x</span>
                                    </div>
                                    <input 
                                        type="range" min="0.1" max="4.0" step="0.1" 
                                        value={config.background.playbackSpeed || 1.0} 
                                        onChange={(e) => updateNested('background', 'playbackSpeed', parseFloat(e.target.value))}
                                        className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                    />
                                </div>
                             )}
                        </>
                    )}
                </div>
            </section>
            
            {/* ... rest of sections ... */}
            {/* Colors */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Palette size={14}/> Palette
              </h3>
              <div className="space-y-2">
                <ColorInput label="Main Text" value={config.colors.text} onChange={(v) => updateColor('text', v)} />
                <ColorInput label="Active Word" value={config.colors.active} onChange={(v) => updateColor('active', v)} />
                <ColorInput label="Accents/Shadows" value={config.colors.secondary} onChange={(v) => updateColor('secondary', v)} />
              </div>
            </section>

             <section>
               <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Type size={14}/> Typography
                  </h3>
                  <ToggleInput label="Show Lyrics" value={config.showLyrics ?? true} onChange={(v) => onUpdate({ ...config, showLyrics: v })} />
               </div>
              <div className="bg-neutral-900 p-3 rounded-lg border border-white/5 space-y-3">
                <SelectInput 
                   label="Font Family"
                   value={config.font.family}
                   options={FONTS} 
                   onChange={(v) => updateNested('font', 'family', v)}
                />
                {/* ... font controls ... */}
                <div className="flex gap-3">
                    <div className="flex-1">
                        <SelectInput 
                            label="Weight" 
                            value={config.font.weight} 
                            options={['100', '300', '400', '700', '900']} 
                            onChange={(v) => updateNested('font', 'weight', v)}
                        />
                    </div>
                    <div className="flex-1 pt-6">
                        <ToggleInput label="Italic" value={config.font.italic} onChange={(v) => updateNested('font', 'italic', v)}/>
                    </div>
                </div>
              </div>
            </section>

            {/* Animation */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Video size={14}/> Animation Style
              </h3>
              <div className="bg-neutral-900 p-3 rounded-lg border border-white/5 space-y-3">
                <SelectInput 
                   label="In" 
                   value={config.animation.entrance} 
                   options={['random', 'fade', 'slide', 'slam', 'zoom', 'typewriter', 'spin', 'blur', 'glitch', 'elastic', 'drop', 'scramble', 'spiral', 'inflate', 'stretch', 'stack-pop']} 
                   onChange={(v) => updateNested('animation', 'entrance', v)} 
                />
                <SelectInput 
                   label="Active" 
                   value={config.animation.active} 
                   options={['random', 'pulse', 'jitter', 'bounce', 'neon', 'wave', 'rotate', 'skew', 'pop', 'flash', 'float', 'shiver', 'rainbow', 'heartbeat', 'swing', 'glitch-shake']} 
                   onChange={(v) => updateNested('animation', 'active', v)} 
                />
                <SelectInput 
                   label="Out" 
                   value={config.animation.exit} 
                   options={['fade', 'slide', 'slam', 'zoom', 'blur', 'glitch', 'drop', 'spiral', 'sink', 'burn']} 
                   onChange={(v) => updateNested('animation', 'exit', v)} 
                />
              </div>
            </section>

             {/* Camera */}
             <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Camera size={14}/> Camera Movement
              </h3>
              <div className="bg-neutral-900 p-3 rounded-lg border border-white/5 grid grid-cols-2 gap-x-4 gap-y-2">
                   <ToggleInput label="Shake" value={config.camera.shake} onChange={(v) => updateNested('camera', 'shake', v)} />
                   <ToggleInput label="Zoom Beat" value={config.camera.zoomBeat} onChange={(v) => updateNested('camera', 'zoomBeat', v)} />
                   <ToggleInput label="Rotate" value={config.camera.rotate} onChange={(v) => updateNested('camera', 'rotate', v)} />
                   <ToggleInput label="Sway" value={config.camera.sway} onChange={(v) => updateNested('camera', 'sway', v)} />
                   <ToggleInput label="Hard Kick" value={config.camera.hardKick} onChange={(v) => updateNested('camera', 'hardKick', v)} />
                   <ToggleInput label="Panic" value={config.camera.panic} onChange={(v) => updateNested('camera', 'panic', v)} />
                   <ToggleInput label="Screen Pump" value={config.camera.screenPump} onChange={(v) => updateNested('camera', 'screenPump', v)} />
              </div>
            </section>

            {/* Effects */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Aperture size={14}/> VFX
              </h3>
              <div className="bg-neutral-900 p-3 rounded-lg border border-white/5 space-y-3">
                 <div className="pb-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Glow</span>
                        <span>{Math.round(config.effects.glow * 100)}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.1" 
                        value={config.effects.glow} 
                        onChange={(e) => updateNested('effects', 'glow', parseFloat(e.target.value))}
                        className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <ToggleInput label="Blur" value={config.effects.blur} onChange={(v) => updateNested('effects', 'blur', v)} />
                    <ToggleInput label="Reactive CA" value={config.effects.chromaticAberration} onChange={(v) => updateNested('effects', 'chromaticAberration', v)} />
                    <ToggleInput label="Vignette" value={config.effects.vignette} onChange={(v) => updateNested('effects', 'vignette', v)} />
                    <ToggleInput label="Scanlines" value={config.effects.scanlines} onChange={(v) => updateNested('effects', 'scanlines', v)} />
                    <ToggleInput label="CRT Noise" value={config.effects.filmGrain} onChange={(v) => updateNested('effects', 'filmGrain', v)} />
                    <ToggleInput label="Mirror" value={config.effects.mirror} onChange={(v) => updateNested('effects', 'mirror', v)} />
                    <ToggleInput label="Inv. Beat" value={config.effects.invert} onChange={(v) => updateNested('effects', 'invert', v)} />
                    <ToggleInput label="Distort" value={config.effects.barrelDistortion} onChange={(v) => updateNested('effects', 'barrelDistortion', v)} />
                    <ToggleInput label="Pixelate" value={config.effects.mosaic} onChange={(v) => updateNested('effects', 'mosaic', v)} />
                    <ToggleInput label="Sepia" value={config.effects.sepia} onChange={(v) => updateNested('effects', 'sepia', v)} />
                    <ToggleInput label="Grayscale" value={config.effects.grayscale} onChange={(v) => updateNested('effects', 'grayscale', v)} />
                    <ToggleInput label="Halftone" value={config.effects.halftone} onChange={(v) => updateNested('effects', 'halftone', v)} />
                    <ToggleInput label="Old Movie" value={config.effects.oldMovie} onChange={(v) => updateNested('effects', 'oldMovie', v)} />
                    <ToggleInput label="Kaleidoscope" value={config.effects.kaleidoscope} onChange={(v) => updateNested('effects', 'kaleidoscope', v)} />
                    <ToggleInput label="RGB Split" value={config.effects.rgbSplit} onChange={(v) => updateNested('effects', 'rgbSplit', v)} />
                 </div>
              </div>
            </section>
            
            {/* Particles */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Grid size={14}/> Particles
              </h3>
              <div className="bg-neutral-900 p-3 rounded-lg border border-white/5 space-y-3">
                  <ToggleInput label="Enabled" value={config.particles.enabled} onChange={(v) => updateNested('particles', 'enabled', v)} />
                  
                  {config.particles.enabled && (
                      <>
                        <SelectInput 
                            label="Shape" 
                            value={config.particles.shape} 
                            options={['circle', 'square', 'star', 'hexagon', 'triangle', 'note', 'tetris']} 
                            onChange={(v) => updateNested('particles', 'shape', v)} 
                        />
                        <SelectInput 
                            label="Behavior" 
                            value={config.particles.particleBehavior || 'drift'} 
                            options={['drift', 'rise']} 
                            onChange={(v) => updateNested('particles', 'particleBehavior', v)} 
                        />
                        <div className="space-y-3 pt-2">
                            <div>
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>Count</span>
                                    <span>{config.particles.count}</span>
                                </div>
                                <input 
                                    type="range" min="0" max="300" step="10" 
                                    value={config.particles.count} 
                                    onChange={(e) => updateNested('particles', 'count', parseInt(e.target.value))}
                                    className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                />
                            </div>
                             <div>
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>Speed</span>
                                    <span>{config.particles.speed.toFixed(1)}</span>
                                </div>
                                <input 
                                    type="range" min="0" max="5.0" step="0.1" 
                                    value={config.particles.speed} 
                                    onChange={(e) => updateNested('particles', 'speed', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                />
                            </div>
                        </div>
                      </>
                  )}
              </div>
            </section>
          </div>
        )}

        {/* ... TIMELINE TAB (No changes needed) ... */}
      </div>
    </div>
  );
};