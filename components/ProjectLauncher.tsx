

import React, { useState, useRef } from 'react';
import { FolderOpen, Plus, Video, Disc, Type, HardDrive, ArrowRight, FileJson, Layers, Monitor, PlayCircle, Upload } from 'lucide-react';
import { AppProjectType } from '../types';

interface ProjectLauncherProps {
  workspaceName: string | null;
  projects: string[]; // List of project names
  onLoadProject: (name: string) => void;
  onCreateProject: (type: AppProjectType, name: string) => void;
  onImportProject: (file: File) => void;
  isLoading: boolean;
}

export const ProjectLauncher: React.FC<ProjectLauncherProps> = ({
  workspaceName,
  projects,
  onLoadProject,
  onCreateProject,
  onImportProject,
  isLoading
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedType, setSelectedType] = useState<AppProjectType>('video-lyrics');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    onCreateProject(selectedType, newProjectName.trim());
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportProject(file);
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="h-screen w-screen bg-neutral-950 flex flex-col items-center justify-center text-white p-8 font-sans">
        
      {/* Header */}
      <div className="mb-12 text-center animate-in fade-in slide-in-from-top-10 duration-700">
        <div className="flex items-center justify-center gap-3 mb-2">
            <Layers size={48} className="text-cyan-400" />
            <h1 className="text-5xl font-black tracking-tighter">APP<span className="text-cyan-400">MIGNA</span></h1>
        </div>
        <p className="text-gray-400 tracking-widest text-sm uppercase">Creative Visual Suite</p>
      </div>

      <div className="flex gap-8 w-full max-w-5xl h-[600px] animate-in slide-in-from-bottom-10 duration-500">
            
            {/* Left: Create New */}
            <div className="flex-1 bg-neutral-900/50 border border-white/10 rounded-2xl p-6 flex flex-col hover:border-white/20 transition-colors">
                <h2 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2">
                    <Plus className="text-cyan-400" /> Create New Project
                </h2>
                
                <div className="flex-1 space-y-4">
                    <div 
                        onClick={() => setSelectedType('video-lyrics')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedType === 'video-lyrics' ? 'bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.1)]' : 'bg-neutral-900 border-white/5 hover:border-white/20'}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${selectedType === 'video-lyrics' ? 'bg-cyan-500 text-black' : 'bg-neutral-800 text-gray-400'}`}>
                                <Video size={20} />
                            </div>
                            <span className="font-bold">Video Lyrics</span>
                        </div>
                        <p className="text-xs text-gray-500 ml-12">Kinetic typography renderer with audio reactivity and custom shaders.</p>
                    </div>

                    <div className="p-4 rounded-xl border border-white/5 bg-neutral-900 opacity-50 cursor-not-allowed grayscale">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-neutral-800 text-gray-400">
                                <Disc size={20} />
                            </div>
                            <span className="font-bold">Audio Visualizer</span>
                        </div>
                        <p className="text-xs text-gray-500 ml-12">Advanced spectrum and beat detection visualization suite. (Coming Soon)</p>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5">
                    <input 
                        type="text" 
                        placeholder="Project Name..." 
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="w-full bg-neutral-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-cyan-500 outline-none mb-3 placeholder-gray-600"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                    <button 
                        onClick={handleCreate}
                        disabled={!newProjectName.trim()}
                        className="w-full bg-white text-black hover:bg-cyan-400 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create Project <ArrowRight size={16} />
                    </button>
                </div>
            </div>

            {/* Right: Recent Projects */}
            <div className="flex-1 bg-neutral-900/50 border border-white/10 rounded-2xl p-6 flex flex-col hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                        <FileJson className="text-purple-400" /> 
                        Internal Storage
                    </h2>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleImportClick}
                            className="text-xs bg-neutral-800 hover:bg-neutral-700 text-gray-300 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10 transition-all hover:text-white"
                        >
                            <Upload size={14} /> Import JSON
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".json" 
                            className="hidden" 
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 space-y-3">
                            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-gray-500">Loading Database...</span>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 border-2 border-dashed border-white/5 rounded-xl">
                            <Monitor className="mx-auto mb-2 opacity-20" size={32} />
                            <p className="text-sm">No projects found.</p>
                            <p className="text-xs text-gray-600 mt-1">Create or Import one to start.</p>
                        </div>
                    ) : (
                        projects.map((projName) => (
                            <button 
                                key={projName}
                                onClick={() => onLoadProject(projName)}
                                className="w-full text-left p-4 rounded-xl bg-neutral-950 border border-white/5 hover:border-purple-500/50 hover:bg-neutral-900 transition-all group flex items-center justify-between"
                            >
                                <div>
                                    <span className="font-bold text-gray-300 group-hover:text-white block mb-1">
                                        {projName}
                                    </span>
                                    <span className="text-[10px] text-gray-600 bg-black/50 px-1.5 py-0.5 rounded border border-white/5">
                                        Video Lyrics
                                    </span>
                                </div>
                                <PlayCircle className="text-gray-600 group-hover:text-purple-400 transition-colors" size={20} />
                            </button>
                        ))
                    )}
                </div>
            </div>
      </div>
      
      <div className="mt-8 text-xs text-gray-600 flex items-center gap-4">
         <span>v1.3.1</span>
         <span>&bull;</span>
         <span className="flex items-center gap-1"><HardDrive size={10}/> AppMignaDB Active</span>
         <span>&bull;</span>
         <span>Secure Environment</span>
      </div>
    </div>
  );
};