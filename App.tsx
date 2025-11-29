

import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_LYRICS, TEMPLATES, RESOLUTIONS } from './constants';
import { CanvasVideoRenderer, CanvasVideoRendererRef } from './components/CanvasVideoRenderer';
import { Controls } from './components/Controls';
import { SettingsPanel } from './components/SettingsPanel';
import { LyricData, RenderStatus, AudioVisualizerData, Segment, Word, RendererConfig, ProjectFile, AudioLayer } from './types';
import { Save, FolderOpen, Activity, Loader2, Video, Download, RotateCcw, Check } from 'lucide-react';

// @ts-ignore
import { Muxer as WebMMuxer, ArrayBufferTarget as WebMArrayBufferTarget } from 'webm-muxer';
// @ts-ignore
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from 'mp4-muxer';

// Declarations for missing WebCodecs types to satisfy TypeScript
declare class AudioEncoder {
  constructor(init: { output: (chunk: any, meta: any) => void; error: (e: any) => void });
  configure(config: any): void;
  encode(data: any): void;
  flush(): Promise<void>;
  close(): void;
}

declare class AudioData {
  constructor(init: any);
  close(): void;
}

// Helper to parse SRT timestamp "00:00:12,345" or "00:00:12.345" to seconds
const parseSrtTimestamp = (timestamp: string): number => {
  if (!timestamp) return 0;
  // Normalize comma to dot and trim
  const normalized = timestamp.replace(',', '.').trim();
  const parts = normalized.split(':');
  
  if (parts.length < 3) return 0; 

  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]);

  return (hours * 3600) + (minutes * 60) + seconds;
};

// Helper to parse SRT string to LyricData
const parseSrtToLyricData = (srtContent: string): LyricData => {
  const normalizedContent = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalizedContent.trim().split(/\n\s*\n/);
  
  const segments: Segment[] = [];
  
  blocks.forEach((block, index) => {
    const lines = block.split('\n');
    if (lines.length < 2) return;

    let timeLineIndex = lines.findIndex(l => l.includes('-->'));
    if (timeLineIndex === -1) return;

    const timeLine = lines[timeLineIndex];
    const [startStr, endStr] = timeLine.split('-->');
    
    if (!startStr || !endStr) return;

    const start = parseSrtTimestamp(startStr);
    const end = parseSrtTimestamp(endStr);
    
    // Extract text (lines after timestamp)
    // Remove HTML tags often found in SRTs
    const textLines = lines.slice(timeLineIndex + 1)
        .map(l => l.replace(/<[^>]*>/g, '').trim())
        .filter(l => l.length > 0);

    const fullText = textLines.join(' ');
    if (!fullText) return;

    // Create words with estimated timing
    const words: Word[] = [];
    const totalDuration = end - start;
    
    // Flatten words while keeping track of line numbers
    let allWords: {text: string, line: number}[] = [];
    textLines.forEach((line, lineIdx) => {
        const lineWords = line.split(/\s+/);
        lineWords.forEach(w => allWords.push({ text: w, line: lineIdx }));
    });

    const wordDuration = totalDuration / allWords.length;

    allWords.forEach((wObj, i) => {
      words.push({
        word: wObj.text,
        start: start + (i * wordDuration),
        end: start + ((i + 1) * wordDuration),
        probability: 1.0,
        line_number: wObj.line
      });
    });

    segments.push({
      id: index.toString(),
      start,
      end,
      text: fullText,
      section: 'verse',
      words
    });
  });

  return { segments };
};

export default function App() {
  const [data, setData] = useState<LyricData>(DEFAULT_LYRICS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Multi-track State
  const [audioLayers, setAudioLayers] = useState<AudioLayer[]>([]);
  
  const [renderStatus, setRenderStatus] = useState<RenderStatus>({ state: 'idle', progress: 0 });
  const [audioVisualizerData, setAudioVisualizerData] = useState<AudioVisualizerData>({ bass: 0, mid: 0, high: 0, raw: new Uint8Array() });
  
  const [rendererConfig, setRendererConfig] = useState<RendererConfig>(TEMPLATES[0]);
  const [exportFormat, setExportFormat] = useState<'webm' | 'mp4'>('mp4');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Web Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const gainsRef = useRef<Map<string, GainNode>>(new Map());
  
  const rendererRef = useRef<CanvasVideoRendererRef>(null);
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  // Initialize Audio Engine
  const initAudioEngine = () => {
      if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContext();
          audioContextRef.current = ctx;

          // Master Gain
          const masterGain = ctx.createGain();
          masterGain.connect(ctx.destination);
          masterGainRef.current = masterGain;

          // Analyser
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          masterGain.connect(analyser); // Master -> Analyser
          analyserRef.current = analyser;
      } else if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
      }
  };

  // Auto-Load Project
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kinetic-flow-autosave');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lyricData) setData(parsed.lyricData);
        if (parsed.config) {
             const loadedConfig = parsed.config;
             // Handle expired blob URLs for background which cannot persist across sessions
             if ((loadedConfig.background.type === 'image' || loadedConfig.background.type === 'video') && 
                  loadedConfig.background.url?.startsWith('blob:')) {
                  loadedConfig.background.type = 'solid';
                  loadedConfig.background.url = undefined;
             }
             setRendererConfig(loadedConfig);
        }
        if (parsed.timestamp) setLastSaved(new Date(parsed.timestamp));
        // Note: Audio layers contain AudioBuffers which cannot be serialized to localStorage. 
        // Users must re-add audio, but settings and lyrics are restored.
      }
    } catch (e) {
      console.error("Autosave load failed", e);
    }
  }, []);

  // Auto-Save Project
  useEffect(() => {
    const timer = setTimeout(() => {
      const saveState = {
        version: '1.0',
        timestamp: Date.now(),
        lyricData: data,
        config: rendererConfig
        // We omit audioLayers as we cannot save buffers
      };
      localStorage.setItem('kinetic-flow-autosave', JSON.stringify(saveState));
      setLastSaved(new Date());
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [data, rendererConfig]);

  const handleResetProject = () => {
    if (confirm("Are you sure you want to reset the project? This will clear all changes and your auto-save.")) {
       localStorage.removeItem('kinetic-flow-autosave');
       setData(DEFAULT_LYRICS);
       setRendererConfig(TEMPLATES[0]);
       setAudioLayers([]);
       setLastSaved(null);
    }
  };

  // Handle Layer Upload
  const handleAudioLayerAdd = async (file: File) => {
      initAudioEngine();
      if (!audioContextRef.current) return;

      try {
          const arrayBuffer = await file.arrayBuffer();
          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          
          const newLayer: AudioLayer = {
              id: Date.now().toString() + Math.random().toString(),
              name: file.name,
              buffer: audioBuffer,
              volume: 1.0,
              muted: false,
              solo: false,
              duration: audioBuffer.duration
          };
          
          setAudioLayers(prev => {
              const updated = [...prev, newLayer];
              // Update master duration based on longest track
              const maxDur = Math.max(...updated.map(l => l.duration));
              setDuration(maxDur);
              return updated;
          });
      } catch (e) {
          console.error("Error decoding audio", e);
          alert("Failed to load audio file.");
      }
  };

  const updateLayer = (id: string, updates: Partial<AudioLayer>) => {
      setAudioLayers(prev => prev.map(l => {
          if (l.id === id) return { ...l, ...updates };
          return l;
      }));
  };

  const removeLayer = (id: string) => {
      setAudioLayers(prev => {
          const updated = prev.filter(l => l.id !== id);
          const maxDur = Math.max(...updated.map(l => l.duration), 0);
          setDuration(maxDur);
          return updated;
      });
  };

  // Sync Audio Nodes with React State (Volume/Mute)
  useEffect(() => {
     if (!audioContextRef.current) return;
     
     const hasSolo = audioLayers.some(l => l.solo);

     audioLayers.forEach(layer => {
         // Create gain node if missing
         if (!gainsRef.current.has(layer.id)) {
             const g = audioContextRef.current!.createGain();
             if (masterGainRef.current) g.connect(masterGainRef.current);
             gainsRef.current.set(layer.id, g);
         }

         const gainNode = gainsRef.current.get(layer.id);
         if (gainNode) {
             // Logic: Muted if layer.muted OR (there is a solo mode active and this layer is NOT soloed)
             const effectiveMute = layer.muted || (hasSolo && !layer.solo);
             
             // Smooth transition to avoid clicking
             const currentTime = audioContextRef.current!.currentTime;
             gainNode.gain.cancelScheduledValues(currentTime);
             gainNode.gain.setTargetAtTime(effectiveMute ? 0 : layer.volume, currentTime, 0.05);
         }
     });
     
     // Cleanup unused gains
     gainsRef.current.forEach((val, key) => {
         if (!audioLayers.find(l => l.id === key)) {
             val.disconnect();
             gainsRef.current.delete(key);
         }
     });

  }, [audioLayers]);


  const stopAllSources = () => {
      sourcesRef.current.forEach(source => {
          try { source.stop(); } catch(e) {}
          source.disconnect();
      });
      sourcesRef.current.clear();
  };

  const startAllSources = (offset: number) => {
      if (!audioContextRef.current) return;
      stopAllSources();

      audioLayers.forEach(layer => {
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = layer.buffer;
          
          const gainNode = gainsRef.current.get(layer.id);
          if (gainNode) {
              source.connect(gainNode);
          }

          source.start(0, offset);
          sourcesRef.current.set(layer.id, source);
      });
  };

  const togglePlay = () => {
    initAudioEngine();
    if (!audioContextRef.current) return;

    if (isPlaying) {
      // Pause
      audioContextRef.current.suspend();
      setIsPlaying(false);
    } else {
      // Play
      audioContextRef.current.resume();
      
      // If sources aren't running (stopped or first play), start them
      if (sourcesRef.current.size === 0) {
          startAllSources(currentTime);
          startTimeRef.current = audioContextRef.current.currentTime - currentTime;
      }
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
      if (!audioContextRef.current) return;
      
      const wasPlaying = isPlaying;
      
      // Always stop and restart for precise seek
      audioContextRef.current.suspend(); // Pause briefly while seeking logic runs
      stopAllSources();
      
      setCurrentTime(time);
      startTimeRef.current = audioContextRef.current.currentTime - time;

      if (wasPlaying) {
          startAllSources(time);
          audioContextRef.current.resume();
      } else {
          // If paused, just reset logic so next play starts here
          // No op needed as startAllSources will be called in togglePlay
      }
  };

  const analyzeAudio = () => {
    if (analyserRef.current) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Simple frequency bands
      const bassRange = dataArray.slice(0, 10);
      const midRange = dataArray.slice(10, 100);
      const highRange = dataArray.slice(100, 200);

      const avg = (arr: Uint8Array) => arr.reduce((a, b) => a + b, 0) / arr.length;

      setAudioVisualizerData({
        bass: avg(bassRange) / 255,
        mid: avg(midRange) / 255,
        high: avg(highRange) / 255,
        raw: dataArray
      });
    }
  };

  const loop = () => {
    if (isPlaying && audioContextRef.current) {
        // Sync time
        const now = audioContextRef.current.currentTime;
        let syncedTime = now - startTimeRef.current;
        
        if (syncedTime >= duration && duration > 0) {
            syncedTime = duration;
            setIsPlaying(false);
            stopAllSources();
            audioContextRef.current.suspend();
        }
        
        setCurrentTime(syncedTime);
        analyzeAudio();
    }
    
    // Always render frame
    if (rendererRef.current) {
        rendererRef.current.drawFrame(currentTime, audioVisualizerData);
    }

    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [currentTime, audioVisualizerData, isPlaying, duration]);


  const handleJsonUpload = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.segments) {
        setData(parsed);
      } else {
        alert("Invalid JSON format: missing 'segments'");
      }
    } catch (e) {
      alert("Error parsing JSON");
    }
  };

  const handleSrtUpload = (srtStr: string) => {
    try {
        const parsed = parseSrtToLyricData(srtStr);
        if (parsed.segments.length > 0) {
            setData(parsed);
        } else {
            alert("No valid segments found in SRT");
        }
    } catch (e) {
        alert("Error parsing SRT");
    }
  };

  const handleSaveProject = () => {
      const project: ProjectFile = {
          version: '1.0',
          timestamp: Date.now(),
          name: audioLayers.length > 0 ? audioLayers[0].name : 'Untitled Project',
          lyricData: data,
          config: rendererConfig
      };
      
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kinetic-project-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              if (ev.target?.result) {
                  const project = JSON.parse(ev.target.result as string) as ProjectFile;
                  if (project.lyricData && project.config) {
                      setData(project.lyricData);
                      setRendererConfig(project.config);
                      alert("Project loaded! Please re-add your audio layers.");
                  } else {
                      alert("Invalid project file structure.");
                  }
              }
          } catch(err) {
              alert("Failed to parse project file.");
          }
      };
      reader.readAsText(file);
  };

  const startRendering = async () => {
    if (audioLayers.length === 0) {
      alert("Please add at least one audio layer.");
      return;
    }
    
    if (renderStatus.state !== 'idle') return;

    const resConfig = RESOLUTIONS.find(r => r.id === rendererConfig.resolutionId) || RESOLUTIONS[0];
    const VIDEO_WIDTH = resConfig.width;
    const VIDEO_HEIGHT = resConfig.height;

    setRenderStatus({ state: 'analyzing', progress: 0 });
    
    // Pause playback to free resources
    if (isPlaying && audioContextRef.current) {
        audioContextRef.current.suspend();
        setIsPlaying(false);
    }

    try {
      const sampleRate = 44100;
      // Use standard sample rate for compatibility
      const offlineCtx = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
      
      const offlineMasterGain = offlineCtx.createGain();
      offlineMasterGain.connect(offlineCtx.destination);
      
      const offlineAnalyser = offlineCtx.createAnalyser();
      offlineAnalyser.fftSize = 256;
      offlineMasterGain.connect(offlineAnalyser);

      const hasSolo = audioLayers.some(l => l.solo);
      
      audioLayers.forEach(layer => {
           const effectiveMute = layer.muted || (hasSolo && !layer.solo);
           if (effectiveMute) return;

           const source = offlineCtx.createBufferSource();
           source.buffer = layer.buffer;
           
           const gain = offlineCtx.createGain();
           gain.gain.value = layer.volume;
           
           source.connect(gain);
           gain.connect(offlineMasterGain);
           source.start(0);
      });

      const FPS = 30;
      const totalFrames = Math.floor(duration * FPS);
      
      let muxer: any;
      if (exportFormat === 'mp4') {
        muxer = new Mp4Muxer({
            target: new Mp4ArrayBufferTarget(),
            video: {
                codec: 'avc',
                width: VIDEO_WIDTH,
                height: VIDEO_HEIGHT
            },
            audio: {
                codec: 'aac',
                numberOfChannels: 2,
                sampleRate: sampleRate
            },
            fastStart: false 
        });
      } else {
        muxer = new WebMMuxer({
            target: new WebMArrayBufferTarget(),
            video: {
                codec: 'V_VP9',
                width: VIDEO_WIDTH,
                height: VIDEO_HEIGHT,
                frameRate: FPS
            },
            audio: {
                codec: 'A_OPUS',
                numberOfChannels: 2,
                sampleRate: sampleRate
            }
        });
      }

      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error("VideoEncoder error:", e)
      });
      
      const codecConfig: VideoEncoderConfig = exportFormat === 'mp4' 
      ? {
        codec: 'avc1.4d002a', // Main Profile Level 4.2 (Up to 1080p60)
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        bitrate: 6_000_000 
      } : {
        codec: 'vp09.00.10.08',
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        bitrate: 5_000_000
      };

      videoEncoder.configure(codecConfig);

      setRenderStatus({ state: 'rendering', progress: 0, totalFrames });
      
      const canvas = rendererRef.current?.canvas;
      if (!canvas) throw new Error("Canvas not found");

      const dataArray = new Uint8Array(offlineAnalyser.frequencyBinCount);
      const frameDuration = 1 / FPS;

      // Schedule Suspend Callbacks
      // We iterate and schedule ALL suspensions. 
      // The callbacks will fire sequentially as offlineCtx processes.
      for (let i = 0; i < totalFrames; i++) {
         const time = i * frameDuration;
         
         offlineCtx.suspend(time).then(async () => {
             // 1. Audio Analysis
             offlineAnalyser.getByteFrequencyData(dataArray);
             const bass = dataArray.slice(0, 10).reduce((a,b)=>a+b,0) / 10 / 255;
             const mid = dataArray.slice(10, 100).reduce((a,b)=>a+b,0) / 90 / 255;
             const high = dataArray.slice(100, 200).reduce((a,b)=>a+b,0) / 100 / 255;
             
             // 2. Draw Frame
             // We use 'await' implicitly by synchronous execution but drawing is fast.
             // If drawing is heavy, it blocks the callback thread.
             rendererRef.current?.drawFrame(time, { bass, mid, high, raw: dataArray });
             
             // 3. Encode Frame
             const frame = new VideoFrame(canvas, { timestamp: time * 1000000 });
             // Keyframe every 2 seconds
             const keyFrame = i % (FPS * 2) === 0;
             videoEncoder.encode(frame, { keyFrame });
             frame.close();
             
             // Update UI every 30 frames to avoid spamming state updates
             if (i % 30 === 0) {
                 setRenderStatus(prev => ({ ...prev, progress: i }));
             }
             
             // 4. Resume Processing
             offlineCtx.resume();
         }).catch(e => console.error("Suspend error", e));
      }
      
      // Start processing audio (which triggers the suspensions)
      const renderedBuffer = await offlineCtx.startRendering();

      // Final progress update
      setRenderStatus(prev => ({ ...prev, progress: totalFrames }));

      // Audio Encoding
      const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => console.error("AudioEncoder error:", e)
      });
      
      const audioCodecString = exportFormat === 'mp4' ? 'mp4a.40.2' : 'opus';
      audioEncoder.configure({
        codec: audioCodecString,
        numberOfChannels: 2,
        sampleRate: sampleRate,
        bitrate: 128000
      });

      const numberOfFrames = renderedBuffer.length;
      const numberOfChannels = renderedBuffer.numberOfChannels;
      const interleaved = new Float32Array(numberOfFrames * numberOfChannels);
      const channel0 = renderedBuffer.getChannelData(0);
      const channel1 = renderedBuffer.getChannelData(1);
      
      for(let i=0; i<numberOfFrames; i++) {
          interleaved[i*2] = channel0[i];
          interleaved[i*2+1] = channel1[i];
      }

      const audioData = new AudioData({
        format: 'f32',
        sampleRate: sampleRate,
        numberOfFrames: numberOfFrames,
        numberOfChannels: numberOfChannels,
        timestamp: 0,
        data: interleaved
      });

      audioEncoder.encode(audioData);
      await audioEncoder.flush();
      audioEncoder.close();

      await videoEncoder.flush();
      videoEncoder.close();
      
      muxer.finalize();
      const { buffer } = muxer.target;
      const blob = new Blob([buffer], { type: exportFormat === 'mp4' ? 'video/mp4' : 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kinetic-lyric-video.${exportFormat}`;
      a.click();
      
      setRenderStatus({ state: 'done', progress: 100 });
      setTimeout(() => setRenderStatus({ state: 'idle', progress: 0 }), 3000);

    } catch (e) {
      console.error("Export failed", e);
      alert("Rendering failed. Please check the console for details.");
      setRenderStatus({ state: 'idle', progress: 0 });
    }
  };
  
  // Calculate dynamic aspect ratio for the viewport
  const viewportResolution = RESOLUTIONS.find(r => r.id === rendererConfig.resolutionId) || RESOLUTIONS[0];
  const aspectRatio = viewportResolution.width / viewportResolution.height;

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 text-white overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-neutral-900 shrink-0 z-20">
        <div className="flex items-center gap-2">
           <Activity className="text-cyan-400" />
           <h1 className="font-black tracking-tighter text-lg">KINETIC<span className="text-cyan-400">FLOW</span></h1>
        </div>

        <div className="flex items-center gap-2">
             
             {/* Autosave Status */}
             {lastSaved && (
                <div className="text-[10px] text-gray-500 mr-2 flex items-center gap-1 animate-in fade-in duration-500">
                    <Check size={10} className="text-green-500"/>
                    <span className="hidden md:inline">Saved {lastSaved.toLocaleTimeString()}</span>
                </div>
             )}

             {/* Project Actions */}
             <div className="flex items-center bg-neutral-800 rounded-md border border-white/5 mr-4">
                  <button 
                    onClick={handleResetProject}
                    title="Reset Project"
                    className="p-2 hover:bg-neutral-700 text-gray-400 hover:text-red-400 transition-colors border-r border-white/5"
                  >
                      <RotateCcw size={18} />
                  </button>
                  <button 
                    onClick={handleSaveProject}
                    title="Save Project"
                    className="p-2 hover:bg-neutral-700 text-gray-400 hover:text-cyan-400 transition-colors border-r border-white/5"
                  >
                      <Save size={18} />
                  </button>
                  <label 
                    title="Load Project"
                    className="p-2 hover:bg-neutral-700 text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                      <FolderOpen size={18} />
                      <input type="file" accept=".json" onChange={handleLoadProject} className="hidden"/>
                  </label>
             </div>

             {/* Export Actions */}
             <div className="flex items-center gap-2 bg-neutral-800 p-1 rounded-md border border-white/5">
                 <select 
                   value={exportFormat}
                   onChange={(e) => setExportFormat(e.target.value as any)}
                   className="bg-transparent text-xs font-bold text-gray-300 outline-none px-2 py-1"
                   disabled={renderStatus.state !== 'idle'}
                 >
                    <option value="mp4">MP4 (H.264)</option>
                    <option value="webm">WEBM (VP9)</option>
                 </select>
                 <button
                    onClick={startRendering}
                    disabled={renderStatus.state !== 'idle' || audioLayers.length === 0}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-1.5 rounded flex items-center gap-2 transition-all"
                 >
                    {renderStatus.state === 'idle' ? (
                        <>
                            <Video size={14} /> EXPORT
                        </>
                    ) : (
                        <>
                            <Loader2 size={14} className="animate-spin" /> 
                            {renderStatus.state === 'analyzing' ? 'ANALYZING' : `${Math.round((renderStatus.progress / (renderStatus.totalFrames || 1)) * 100)}%`}
                        </>
                    )}
                 </button>
             </div>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 flex overflow-hidden">
          
          {/* SIDEBAR (INSPECTOR) */}
          <div className="w-96 bg-neutral-900 border-r border-white/5 flex flex-col shrink-0 z-10">
              <SettingsPanel 
                 config={rendererConfig} 
                 onUpdate={setRendererConfig}
                 data={data}
                 onUpdateData={setData}
                 currentTime={currentTime}
                 onSeek={handleSeek}
                 onJsonUpload={handleJsonUpload}
                 onSrtUpload={handleSrtUpload}
                 onAudioLayerAdd={handleAudioLayerAdd}
                 audioLayers={audioLayers}
                 onUpdateLayer={updateLayer}
                 onRemoveLayer={removeLayer}
              />
          </div>

          {/* VIEWPORT (PROGRAM MONITOR) */}
          <div className="flex-1 bg-neutral-950 relative flex flex-col min-w-0">
               {/* Canvas Container */}
               <div className="flex-1 flex items-center justify-center p-8 overflow-hidden bg-[radial-gradient(circle_at_center,_#1a1a1a_1px,_transparent_1px)] bg-[length:20px_20px]">
                   <div 
                      className="relative shadow-2xl border border-white/10"
                      style={{
                          aspectRatio: `${aspectRatio}`,
                          height: aspectRatio > 1 ? 'auto' : '90%',
                          width: aspectRatio > 1 ? '90%' : 'auto',
                          maxHeight: '90%',
                          maxWidth: '90%'
                      }}
                   >
                       <CanvasVideoRenderer
                          ref={rendererRef}
                          data={data}
                          config={rendererConfig}
                          isPlaying={isPlaying}
                       />
                       
                       {/* Overlay info */}
                       {audioLayers.length === 0 && (
                           <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                               <div className="text-center">
                                   <p className="text-gray-400 font-mono text-sm mb-2">No Audio Layers</p>
                                   <p className="text-xs text-gray-600">Add an instrumental or vocal track in the Project tab</p>
                               </div>
                           </div>
                       )}
                   </div>
               </div>

               {/* Transport Bar (Bottom of Viewport) */}
               <div className="shrink-0 z-20">
                    <Controls
                        isPlaying={isPlaying}
                        onTogglePlay={togglePlay}
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={handleSeek}
                        isRendering={renderStatus.state !== 'idle'}
                    />
               </div>
          </div>

      </div>
    </div>
  );
}