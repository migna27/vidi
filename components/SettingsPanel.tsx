
import React, { useState } from 'react';
import { X, Check, Sliders, LayoutTemplate, Palette, Sparkles, Video, Type } from 'lucide-react';
import { TEMPLATES } from '../constants';
import { RendererConfig, AnimationStyle, ActiveStyle, ParticleShape } from '../types';

interface SettingsPanelProps {
  config: RendererConfig;
  onUpdate: (config: RendererConfig) => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onUpdate, onClose }) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'customize'>('templates');

  const handleTemplateSelect = (template: RendererConfig) => {
    // Create deep copy to avoid mutation issues
    onUpdate(JSON.parse(JSON.stringify(template)));
  };

  const updateNested = (section: keyof RendererConfig, key: string, value: any) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    newConfig[section][key] = value;
    onUpdate(newConfig);
  };

  const updateColor = (key: keyof RendererConfig['colors'], value: string) => {
    updateNested('colors', key, value);
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
                       <div className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ background: t.colors.background }} title="Background"></div>
                       <div className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ background: t.colors.text }} title="Text"></div>
                       <div className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ background: t.colors.active }} title="Active"></div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-white/10 rounded-md text-gray-400">{t.animation.active}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-white/10 rounded-md text-gray-400">{t.animation.entrance}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CUSTOMIZE TAB */}
        {activeTab === 'customize' && (
          <div className="p-4 space-y-6">
            
            {/* Colors Section */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Palette size={14}/> Colors
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <ColorInput label="Background" value={config.colors.background} onChange={(v) => updateColor('background', v)} />
                <ColorInput label="Text" value={config.colors.text} onChange={(v) => updateColor('text', v)} />
                <ColorInput label="Active Word" value={config.colors.active} onChange={(v) => updateColor('active', v)} />
                <ColorInput label="Secondary" value={config.colors.secondary} onChange={(v) => updateColor('secondary', v)} />
              </div>
            </section>

            {/* Animation Section */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Type size={14}/> Typography Animation
              </h3>
              <div className="space-y-3">
                <SelectInput 
                  label="Entrance" 
                  value={config.animation.entrance} 
                  options={['fade', 'slide', 'slam', 'zoom', 'typewriter']} 
                  onChange={(v) => updateNested('animation', 'entrance', v)} 
                />
                <SelectInput 
                  label="Active Style" 
                  value={config.animation.active} 
                  options={['neon', 'pulse', 'jitter', 'bounce']} 
                  onChange={(v) => updateNested('animation', 'active', v)} 
                />
                <SelectInput 
                  label="Exit" 
                  value={config.animation.exit} 
                  options={['fade', 'slide', 'slam', 'zoom']} 
                  onChange={(v) => updateNested('animation', 'exit', v)} 
                />
              </div>
            </section>

            {/* Effects Section */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Sparkles size={14}/> Effects & Post-Processing
              </h3>
              <div className="space-y-3 bg-white/5 p-3 rounded-lg">
                <ToggleInput label="Chromatic Aberration (Glitch)" value={config.effects.chromaticAberration} onChange={(v) => updateNested('effects', 'chromaticAberration', v)} />
                <ToggleInput label="Scanlines" value={config.effects.scanlines} onChange={(v) => updateNested('effects', 'scanlines', v)} />
                <ToggleInput label="Film Grain" value={config.effects.filmGrain} onChange={(v) => updateNested('effects', 'filmGrain', v)} />
                <ToggleInput label="Vignette" value={config.effects.vignette} onChange={(v) => updateNested('effects', 'vignette', v)} />
                
                <div className="pt-2">
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
              </div>
            </section>

             {/* Particles Section */}
             <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Sparkles size={14}/> Particles
              </h3>
              <div className="space-y-3 bg-white/5 p-3 rounded-lg">
                <ToggleInput label="Enabled" value={config.particles.enabled} onChange={(v) => updateNested('particles', 'enabled', v)} />
                {config.particles.enabled && (
                  <>
                    <SelectInput 
                      label="Shape" 
                      value={config.particles.shape} 
                      options={['circle', 'square', 'star']} 
                      onChange={(v) => updateNested('particles', 'shape', v)} 
                    />
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Speed</span>
                        <span>{config.particles.speed.toFixed(1)}x</span>
                      </div>
                      <input 
                        type="range" min="0" max="5" step="0.5" 
                        value={config.particles.speed} 
                        onChange={(e) => updateNested('particles', 'speed', parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Camera Section */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Video size={14}/> Camera Movement
              </h3>
              <div className="space-y-2">
                <ToggleInput label="Bass Shake" value={config.camera.shake} onChange={(v) => updateNested('camera', 'shake', v)} />
                <ToggleInput label="Beat Zoom" value={config.camera.zoomBeat} onChange={(v) => updateNested('camera', 'zoomBeat', v)} />
                <ToggleInput label="Dynamic Rotate" value={config.camera.rotate} onChange={(v) => updateNested('camera', 'rotate', v)} />
              </div>
            </section>

            <div className="h-20"></div> {/* Spacer */}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
  <div className="bg-white/5 p-2 rounded-lg flex items-center justify-between border border-white/5 hover:border-white/10 transition-colors">
    <span className="text-xs font-medium text-gray-300">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-gray-500 uppercase">{value}</span>
      <input 
        type="color" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
      />
    </div>
  </div>
);

const ToggleInput = ({ label, value, onChange }: { label: string, value: boolean, onChange: (v: boolean) => void }) => (
  <label className="flex items-center justify-between cursor-pointer group">
    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{label}</span>
    <div className={`w-10 h-5 rounded-full relative transition-colors ${value ? 'bg-cyan-500' : 'bg-gray-700'}`}>
       <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="hidden" />
       <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200 ${value ? 'left-6' : 'left-1'}`} />
    </div>
  </label>
);

const SelectInput = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs text-gray-400">{label}</span>
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="bg-neutral-800 border border-white/10 rounded-md px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 capitalize"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);
