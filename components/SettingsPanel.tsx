
import React, { useState, useRef } from 'react';
import { X, Check, Sliders, LayoutTemplate, Palette, Sparkles, Video, Type, Image as ImageIcon, Upload, Grid, Music, Camera, Aperture } from 'lucide-react';
import { TEMPLATES, FONTS } from '../constants';
import { RendererConfig, AnimationStyle, ActiveStyle, ParticleShape, BackgroundType, ProceduralStyle } from '../types';

interface SettingsPanelProps {
  config: RendererConfig;
  onUpdate: (config: RendererConfig) => void;
  onClose: () => void;
}

// Helper Components
const ToggleInput = ({ label, value, onChange }: { label: string, value: boolean, onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-gray-300">{label}</span>
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full relative transition-colors ${value ? 'bg-cyan-500' : 'bg-gray-700'}`}
    >
      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
);

const SelectInput = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: any) => void }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-neutral-800 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white focus:border-cyan-500 outline-none"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
      ))}
    </select>
  </div>
);

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
  <div className="flex items-center justify-between bg-neutral-800 p-2 rounded-md border border-white/5">
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

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onUpdate, onClose }) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'customize'>('templates');
  const bgInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);

  const handleTemplateSelect = (template: RendererConfig) => {
    onUpdate(JSON.parse(JSON.stringify(template)));
  };

  const updateNested = (section: keyof RendererConfig, key: string, value: any) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    // @ts-ignore
    newConfig[section][key] = value;
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

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-neutral-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-[60] text-white flex flex-col transition-transform duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-lg font-bold flex items-center gap-2">
           <Sparkles className="text-cyan-400" size={20}/>
           Visual Config
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button 
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'templates' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-white/5' : 'text-gray-400 hover:text-white'}`}
        >
          <LayoutTemplate size={16} /> Templates
        </button>
        <button 
          onClick={() => setActiveTab('customize')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'customize' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-white/5' : 'text-gray-400 hover:text-white'}`}
        >
          <Sliders size={16} /> Customize
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        
        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <div className="p-4 grid grid-cols-1 gap-4">
            {TEMPLATES.map((t) => (
              <div 
                key={t.id}
                onClick={() => handleTemplateSelect(t)}
                className={`group relative overflow-hidden rounded-xl border-2 cursor-pointer transition-all duration-300 ${config.id === t.id ? 'border-cyan-400 bg-white/10' : 'border-white/10 hover:border-white/30 bg-black/40'}`}
              >
                <div className="p-4 relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg group-hover:text-cyan-300 transition-colors">{t.name}</h3>
                    {config.id === t.id && <Check size={18} className="text-cyan-400" />}
                  </div>
                  
                  {/* Color Preview Miniatures */}
                  <div className="flex gap-2">
                       <div className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ background: t.background.color }} title="Background"></div>
                       <div className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ background: t.colors.text }} title="Text"></div>
                       <div className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ background: t.colors.active }} title="Active"></div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-white/10 rounded-md text-gray-400">{t.animation.active}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-white/10 rounded-md text-gray-400">{t.background.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CUSTOMIZE TAB */}
        {activeTab === 'customize' && (
          <div className="p-4 space-y-6">
            
            {/* Audio Reactivity Section */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Music size={14}/> Audio Reactivity
              </h3>
              <div className="bg-white/5 p-3 rounded-lg space-y-3">
                 <ToggleInput 
                    label="Audio Reactive Effects" 
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
                                <span>Beat Sensitivity</span>
                                <span>{Math.round(config.audioReactivity.sensitivity * 100)}%</span>
                            </div>
                            <input 
                                type="range" min="0.5" max="2.0" step="0.1" 
                                value={config.audioReactivity.sensitivity} 
                                onChange={(e) => updateNested('audioReactivity', 'sensitivity', parseFloat(e.target.value))}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                        </div>
                    </>
                 )}
              </div>
            </section>

            {/* Background Section */}
            <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ImageIcon size={14}/> Background
                </h3>
                <div className="bg-white/5 p-3 rounded-lg space-y-3">
                    <SelectInput 
                      label="Type" 
                      value={config.background.type} 
                      options={['solid', 'image', 'video', 'procedural']} 
                      onChange={(v) => updateNested('background', 'type', v)} 
                    />

                    {config.background.type === 'solid' && (
                        <ColorInput label="Color" value={config.background.color} onChange={(v) => updateNested('background', 'color', v)} />
                    )}

                    {(config.background.type === 'image' || config.background.type === 'video') && (
                        <div>
                             <button 
                                onClick={() => bgInputRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-white/20 rounded-md hover:border-cyan-400 hover:text-cyan-400 transition-all text-sm font-bold"
                             >
                                <Upload size={16} />
                                {config.background.type === 'video' ? 'Upload Video' : 'Upload Image'}
                             </button>
                             <input type="file" ref={bgInputRef} onChange={handleBgUpload} accept="image/*,video/*" className="hidden"/>
                             {config.background.url && <div className="text-[10px] text-gray-500 mt-1 truncate">{config.background.url}</div>}
                        </div>
                    )}

                    {config.background.type === 'procedural' && (
                        <>
                             <ColorInput label="Base Color" value={config.background.color} onChange={(v) => updateNested('background', 'color', v)} />
                             <SelectInput 
                                label="Style" 
                                value={config.background.proceduralStyle || 'grid'} 
                                options={['grid', 'stars', 'plasma', 'tunnel', 'matrix']} 
                                onChange={(v) => updateNested('background', 'proceduralStyle', v)} 
                             />
                             <div className="pt-2">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>Intensity/Speed</span>
                                    <span>{Math.round((config.background.intensity || 0.5) * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0.1" max="2.0" step="0.1" 
                                    value={config.background.intensity || 0.5} 
                                    onChange={(e) => updateNested('background', 'intensity', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                />
                             </div>
                        </>
                    )}
                </div>
            </section>

            {/* Colors Section */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Palette size={14}/> Text Colors
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <ColorInput label="Text" value={config.colors.text} onChange={(v) => updateColor('text', v)} />
                <ColorInput label="Active" value={config.colors.active} onChange={(v) => updateColor('active', v)} />
                <ColorInput label="Secondary" value={config.colors.secondary} onChange={(v) => updateColor('secondary', v)} />
              </div>
            </section>

             {/* Font Section */}
             <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Type size={14}/> Typography
              </h3>
              <div className="bg-white/5 p-3 rounded-lg space-y-3">
                <SelectInput 
                   label="Font Family"
                   value={config.font.family}
                   options={[...FONTS]} // Using constants
                   onChange={(v) => updateNested('font', 'family', v)}
                />
                <button 
                  onClick={() => fontInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-1.5 text-xs bg-neutral-800 border border-white/10 rounded-md hover:text-cyan-400 transition-colors"
                >
                   <Upload size={12}/> Upload Font (.ttf/.woff)
                </button>
                <input type="file" ref={fontInputRef} onChange={handleFontUpload} accept=".ttf,.woff,.woff2,.otf" className="hidden"/>

                <div className="flex gap-3">
                    <SelectInput 
                        label="Weight" 
                        value={config.font.weight} 
                        options={['100', '300', '400', '700', '900']} 
                        onChange={(v) => updateNested('font', 'weight', v)}
                    />
                    <div className="flex-1 pt-6">
                        <ToggleInput label="Italic" value={config.font.italic} onChange={(v) => updateNested('font', 'italic', v)}/>
                    </div>
                </div>
              </div>
            </section>

            {/* Animation Section */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Video size={14}/> Animation
              </h3>
              <div className="bg-white/5 p-3 rounded-lg space-y-3">
                <SelectInput 
                   label="Entrance" 
                   value={config.animation.entrance} 
                   options={['fade', 'slide', 'slam', 'zoom', 'typewriter', 'spin', 'blur', 'glitch']} 
                   onChange={(v) => updateNested('animation', 'entrance', v)} 
                />
                <SelectInput 
                   label="Active" 
                   value={config.animation.active} 
                   options={['pulse', 'jitter', 'bounce', 'neon', 'wave', 'rotate']} 
                   onChange={(v) => updateNested('animation', 'active', v)} 
                />
                <SelectInput 
                   label="Exit" 
                   value={config.animation.exit} 
                   options={['fade', 'slide', 'slam', 'zoom', 'blur', 'glitch']} 
                   onChange={(v) => updateNested('animation', 'exit', v)} 
                />
              </div>
            </section>

            {/* Effects Section */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Aperture size={14}/> VFX & Post-Processing
              </h3>
              <div className="bg-white/5 p-3 rounded-lg space-y-3">
                 <div className="pb-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Glow Intensity</span>
                        <span>{Math.round(config.effects.glow * 100)}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.1" 
                        value={config.effects.glow} 
                        onChange={(e) => updateNested('effects', 'glow', parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <ToggleInput label="Blur" value={config.effects.blur} onChange={(v) => updateNested('effects', 'blur', v)} />
                    <ToggleInput label="Chromatic" value={config.effects.chromaticAberration} onChange={(v) => updateNested('effects', 'chromaticAberration', v)} />
                    <ToggleInput label="Vignette" value={config.effects.vignette} onChange={(v) => updateNested('effects', 'vignette', v)} />
                    <ToggleInput label="Scanlines" value={config.effects.scanlines} onChange={(v) => updateNested('effects', 'scanlines', v)} />
                    <ToggleInput label="Film Grain" value={config.effects.filmGrain} onChange={(v) => updateNested('effects', 'filmGrain', v)} />
                    <ToggleInput label="Mirror" value={config.effects.mirror} onChange={(v) => updateNested('effects', 'mirror', v)} />
                    <ToggleInput label="Invert (Beat)" value={config.effects.invert} onChange={(v) => updateNested('effects', 'invert', v)} />
                    <ToggleInput label="Distortion" value={config.effects.barrelDistortion} onChange={(v) => updateNested('effects', 'barrelDistortion', v)} />
                 </div>
              </div>
            </section>
            
            {/* Particles Section */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Grid size={14}/> Particles
              </h3>
              <div className="bg-white/5 p-3 rounded-lg space-y-3">
                  <ToggleInput label="Enabled" value={config.particles.enabled} onChange={(v) => updateNested('particles', 'enabled', v)} />
                  
                  {config.particles.enabled && (
                      <>
                        <SelectInput 
                            label="Shape" 
                            value={config.particles.shape} 
                            options={['circle', 'square', 'star', 'hexagon', 'triangle', 'note']} 
                            onChange={(v) => updateNested('particles', 'shape', v)} 
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
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
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
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                />
                            </div>
                        </div>
                      </>
                  )}
              </div>
            </section>
            
            {/* Camera Section */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Camera size={14}/> Camera
              </h3>
              <div className="bg-white/5 p-3 rounded-lg space-y-3">
                  <ToggleInput label="Bass Shake" value={config.camera.shake} onChange={(v) => updateNested('camera', 'shake', v)} />
                  <ToggleInput label="Zoom on Beat" value={config.camera.zoomBeat} onChange={(v) => updateNested('camera', 'zoomBeat', v)} />
                  <ToggleInput label="Rotation" value={config.camera.rotate} onChange={(v) => updateNested('camera', 'rotate', v)} />
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
};
