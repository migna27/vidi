

import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_LYRICS, TEMPLATES, RESOLUTIONS } from './constants';
import { CanvasVideoRenderer, CanvasVideoRendererRef } from './components/CanvasVideoRenderer';
import { Controls } from './components/Controls';
import { SettingsPanel } from './components/SettingsPanel';
import { LyricData, RenderStatus, AudioVisualizerData, Segment, Word, RendererConfig, ProjectFile, AudioLayer, EventBlock, CustomEffect } from './types';
import { Save, FolderOpen, Activity, Loader2, Video, Download, RotateCcw, Check, Zap, Trash2, FileVideo, Package } from 'lucide-react';

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

// Helper: Convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g. "data:audio/mp3;base64,") to get raw base64 if needed, 
      // but keeping it makes it easier to use directly.
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper: Convert Base64 to Blob
const base64ToBlob = async (base64: string): Promise<Blob> => {
  const res = await fetch(base64);
  return res.blob();
};

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
    
    const textLines = lines.slice(timeLineIndex + 1)
        .map(l => l.replace(/<[^>]*>/g, '').trim())
        .filter(l => l.length > 0);

    const fullText = textLines.join(' ');
    if (!fullText) return;

    const words: Word[] = [];
    const totalDuration = end - start;
    
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

// --- AUDIO ANALYSIS HELPER ---
const extractAudioAnalysis = (audioBuffer: AudioBuffer, fps: number, duration: number): AudioVisualizerData[] => {
    if (!duration || duration <= 0 || !Number.isFinite(duration)) return [];

    const totalFrames = Math.ceil(duration * fps);
    const result: AudioVisualizerData[] = new Array(totalFrames);
    const rawData = audioBuffer.getChannelData(0); 
    const sampleRate = audioBuffer.sampleRate;
    const samplesPerFrame = Math.floor(sampleRate / fps);
    const fftSize = 256;
    const frequencyBinCount = fftSize / 2;

    for (let i = 0; i < totalFrames; i++) {
        const startSample = i * samplesPerFrame;
        const endSample = Math.min(startSample + samplesPerFrame, rawData.length);
        
        let sum = 0;
        let diffSum = 0;
        let highFreqSum = 0;
        
        for (let j = startSample; j < endSample; j++) {
            const val = rawData[j];
            sum += val * val; 
            if (j > startSample) {
                const diff = val - rawData[j-1];
                diffSum += diff * diff; 
                if (j > startSample + 1) {
                     const diff2 = (val - rawData[j-1]) - (rawData[j-1] - rawData[j-2]);
                     highFreqSum += diff2 * diff2;
                }
            }
        }
        
        const rms = Math.sqrt(sum / (endSample - startSample)) || 0;
        const diffRms = Math.sqrt(diffSum / (endSample - startSample)) || 0;
        const highRms = Math.sqrt(highFreqSum / (endSample - startSample)) || 0;

        const bass = Math.min(1, rms * 4); 
        const mid = Math.min(1, diffRms * 8); 
        const high = Math.min(1, highRms * 16);

        const dataArray = new Uint8Array(frequencyBinCount);
        const bassBins = 10;
        const midBins = 90;

        for(let k=0; k<frequencyBinCount; k++) {
            if (k < bassBins) dataArray[k] = bass * 255;
            else if (k < bassBins + midBins) dataArray[k] = mid * 255;
            else dataArray[k] = high * 255;
        }

        result[i] = { bass, mid, high, raw: dataArray };
    }
    return result;
};


export default function App() {
  const [data, setData] = useState<LyricData>(DEFAULT_LYRICS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [eventBlocks, setEventBlocks] = useState<EventBlock[]>([]);
  const [audioLayers, setAudioLayers] = useState<AudioLayer[]>([]);
  
  // Custom Effects State
  const [customEffects, setCustomEffects] = useState<CustomEffect[]>([]);

  // Load Custom Effects from LocalStorage on mount
  useEffect(() => {
      const stored = localStorage.getItem('kf_custom_effects');
      if (stored) {
          try {
              setCustomEffects(JSON.parse(stored));
          } catch(e) { console.error("Failed to load custom effects", e); }
      }
  }, []);

  // Save Custom Effects to LocalStorage when changed
  useEffect(() => {
      if (customEffects.length > 0) {
          localStorage.setItem('kf_custom_effects', JSON.stringify(customEffects));
      }
  }, [customEffects]);
  
  // Temporary storage for non-audio assets to be bundled on save
  const backgroundFileRef = useRef<{ file: Blob, type: 'image' | 'video' } | null>(null);
  const fontFilesRef = useRef<Map<string, Blob>>(new Map());

  const [renderStatus, setRenderStatus] = useState<RenderStatus>({ state: 'idle', progress: 0 });
  const [audioVisualizerData, setAudioVisualizerData] = useState<AudioVisualizerData>({ bass: 0, mid: 0, high: 0, raw: new Uint8Array() });
  
  const [rendererConfig, setRendererConfig] = useState<RendererConfig>(TEMPLATES[0]);
  const [exportFormat, setExportFormat] = useState<'webm' | 'mp4'>('mp4');
  const [exportMode, setExportMode] = useState<'normal' | 'alpha'>('normal');

  const [cachedBlob, setCachedBlob] = useState<Blob | null>(null);
  const [isCaching, setIsCaching] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const gainsRef = useRef<Map<string, GainNode>>(new Map());
  
  const rendererRef = useRef<CanvasVideoRendererRef>(null);
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const initAudioEngine = () => {
      if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContext();
          audioContextRef.current = ctx;

          const masterGain = ctx.createGain();
          masterGain.connect(ctx.destination);
          masterGainRef.current = masterGain;

          const dest = ctx.createMediaStreamDestination();
          masterGain.connect(dest);
          audioDestinationRef.current = dest;

          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          masterGain.connect(analyser); 
          analyserRef.current = analyser;
      } else if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
      }
  };

  // Invalidate cache if PROJECT changes
  useEffect(() => {
    if (cachedBlob) setCachedBlob(null);
  }, [data, rendererConfig, audioLayers, eventBlocks, customEffects]);

  const handleResetProject = () => {
    if (confirm("Reset project? All unsaved changes will be lost.")) {
       setData(DEFAULT_LYRICS);
       setRendererConfig(TEMPLATES[0]);
       setAudioLayers([]);
       setEventBlocks([]);
       setCachedBlob(null);
       backgroundFileRef.current = null;
       fontFilesRef.current.clear();
       
       if (audioContextRef.current) {
           stopAllSources();
           audioContextRef.current.suspend();
           setIsPlaying(false);
           setCurrentTime(0);
       }
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
              duration: audioBuffer.duration,
              sourceFile: file, // Store for save
              mimeType: file.type
          };
          
          setAudioLayers(prev => {
              const updated = [...prev, newLayer];
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

  // Callback from SettingsPanel to store asset blobs for saving
  const handleAssetLoaded = (type: 'background' | 'font', file: File, meta?: string) => {
      if (type === 'background') {
          const fileType = file.type.startsWith('video') ? 'video' : 'image';
          backgroundFileRef.current = { file, type: fileType };
      } else if (type === 'font' && meta) {
          fontFilesRef.current.set(meta, file); // meta is font family name
      }
  };

  // Sync Audio Nodes
  useEffect(() => {
     if (!audioContextRef.current) return;
     const hasSolo = audioLayers.some(l => l.solo);
     audioLayers.forEach(layer => {
         if (!gainsRef.current.has(layer.id)) {
             const g = audioContextRef.current!.createGain();
             if (masterGainRef.current) g.connect(masterGainRef.current);
             gainsRef.current.set(layer.id, g);
         }
         const gainNode = gainsRef.current.get(layer.id);
         if (gainNode) {
             const effectiveMute = layer.muted || (hasSolo && !layer.solo);
             const currentTime = audioContextRef.current!.currentTime;
             gainNode.gain.cancelScheduledValues(currentTime);
             gainNode.gain.setTargetAtTime(effectiveMute ? 0 : layer.volume, currentTime, 0.05);
         }
     });
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
          if (gainNode) source.connect(gainNode);
          source.start(0, offset);
          sourcesRef.current.set(layer.id, source);
      });
  };

  const startRecordingCache = () => {
      if (!rendererRef.current?.canvas || !audioDestinationRef.current) return;
      try {
          const canvasStream = rendererRef.current.canvas.captureStream(60);
          const audioStream = audioDestinationRef.current.stream;
          const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
          const options: MediaRecorderOptions = {
              mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
              videoBitsPerSecond: 8000000
          };
          const recorder = new MediaRecorder(combinedStream, options);
          recordedChunksRef.current = [];
          recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
          recorder.start();
          mediaRecorderRef.current = recorder;
          setIsCaching(true);
      } catch (err) {
          console.error("Failed to start caching", err);
      }
  };

  const stopRecordingCache = (save: boolean) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          if (save && recordedChunksRef.current.length > 0) {
               const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
               setCachedBlob(blob);
          }
      }
      setIsCaching(false);
      mediaRecorderRef.current = null;
  };

  const togglePlay = () => {
    initAudioEngine();
    if (!audioContextRef.current) return;
    if (isPlaying) {
      if (isCaching) stopRecordingCache(false);
      audioContextRef.current.suspend();
      setIsPlaying(false);
    } else {
      audioContextRef.current.resume();
      if (sourcesRef.current.size === 0) {
          if (currentTime < 0.1) {
              setCachedBlob(null); 
              startRecordingCache();
          }
          startAllSources(currentTime);
          startTimeRef.current = audioContextRef.current.currentTime - currentTime;
      }
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
      if (!audioContextRef.current) return;
      if (isCaching) stopRecordingCache(false);
      const wasPlaying = isPlaying;
      audioContextRef.current.suspend();
      stopAllSources();
      setCurrentTime(time);
      startTimeRef.current = audioContextRef.current.currentTime - time;
      if (wasPlaying) {
          startAllSources(time);
          audioContextRef.current.resume();
      }
  };

  const analyzeAudio = () => {
    if (analyserRef.current) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
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
        const now = audioContextRef.current.currentTime;
        let syncedTime = now - startTimeRef.current;
        if (syncedTime >= duration && duration > 0) {
            syncedTime = duration;
            if (isCaching) stopRecordingCache(true);
            setIsPlaying(false);
            stopAllSources();
            audioContextRef.current.suspend();
        }
        setCurrentTime(syncedTime);
        analyzeAudio();
    }
    if (rendererRef.current) rendererRef.current.drawFrame(currentTime, audioVisualizerData, false);
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [currentTime, audioVisualizerData, isPlaying, duration, isCaching]);

  const handleJsonUpload = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.segments) setData(parsed);
      if (parsed.eventBlocks) setEventBlocks(parsed.eventBlocks);
    } catch (e) {
      alert("Error parsing JSON");
    }
  };

  const handleSrtUpload = (srtStr: string) => {
    try {
        const parsed = parseSrtToLyricData(srtStr);
        if (parsed.segments.length > 0) setData(parsed);
    } catch (e) {
        alert("Error parsing SRT");
    }
  };

  // --- SAVE / LOAD PROJECT WITH ASSETS ---

  const handleSaveProject = async () => {
      setRenderStatus({ state: 'saving', progress: 0 });
      try {
          // 1. Serialize Audio Layers
          const audioAssets = await Promise.all(audioLayers.map(async (layer) => {
              if (layer.sourceFile) {
                  return {
                      id: layer.id,
                      name: layer.name,
                      mimeType: layer.mimeType || 'audio/mp3',
                      data: await blobToBase64(layer.sourceFile),
                      volume: layer.volume,
                      muted: layer.muted,
                      solo: layer.solo
                  };
              }
              return null;
          }));

          // 2. Serialize Background
          let backgroundAsset = undefined;
          if (rendererConfig.background.type !== 'procedural' && rendererConfig.background.type !== 'solid' && backgroundFileRef.current) {
              backgroundAsset = {
                  type: backgroundFileRef.current.type,
                  mimeType: backgroundFileRef.current.file.type,
                  data: await blobToBase64(backgroundFileRef.current.file)
              };
          }

          // 3. Serialize Fonts
          const fontAssets = await Promise.all(Array.from(fontFilesRef.current.entries()).map(async ([name, blob]) => ({
              name,
              mimeType: blob.type,
              data: await blobToBase64(blob)
          })));

          const project: ProjectFile = {
              version: '1.2',
              timestamp: Date.now(),
              name: audioLayers.length > 0 ? audioLayers[0].name : 'Untitled Project',
              lyricData: data,
              config: rendererConfig,
              eventBlocks: eventBlocks,
              assets: {
                  audio: audioAssets.filter(a => a !== null) as any,
                  background: backgroundAsset,
                  fonts: fontAssets
              },
              customEffects: customEffects // Save custom FX too
          };
          
          const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `kinetic-project-bundled-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
      } catch (e) {
          console.error("Save Error:", e);
          alert("Failed to bundle project assets. See console.");
      } finally {
          setRenderStatus({ state: 'idle', progress: 0 });
      }
  };

  const handleLoadProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setRenderStatus({ state: 'loading', progress: 0 });
      handleResetProject(); // Clear current

      const reader = new FileReader();
      reader.onload = async (ev) => {
          try {
              if (ev.target?.result) {
                  const project = JSON.parse(ev.target.result as string) as ProjectFile;
                  
                  // Restore Data & Config
                  if (project.lyricData) setData(project.lyricData);
                  if (project.config) setRendererConfig(project.config);
                  if (project.eventBlocks) setEventBlocks(project.eventBlocks);
                  if (project.customEffects) setCustomEffects(project.customEffects);

                  // Initialize Audio Context
                  initAudioEngine();
                  if (!audioContextRef.current) throw new Error("No Audio Context");

                  // Restore Assets
                  if (project.assets) {
                      // 1. Restore Audio
                      const restoredLayers: AudioLayer[] = [];
                      for (const audioAsset of project.assets.audio) {
                          const blob = await base64ToBlob(audioAsset.data);
                          const arrayBuffer = await blob.arrayBuffer();
                          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                          
                          restoredLayers.push({
                              id: audioAsset.id,
                              name: audioAsset.name,
                              buffer: audioBuffer,
                              volume: audioAsset.volume,
                              muted: audioAsset.muted,
                              solo: audioAsset.solo,
                              duration: audioBuffer.duration,
                              sourceFile: blob,
                              mimeType: audioAsset.mimeType
                          });
                      }
                      setAudioLayers(restoredLayers);
                      if (restoredLayers.length > 0) {
                          setDuration(Math.max(...restoredLayers.map(l => l.duration)));
                      }

                      // 2. Restore Background
                      if (project.assets.background) {
                          const blob = await base64ToBlob(project.assets.background.data);
                          const url = URL.createObjectURL(blob);
                          
                          backgroundFileRef.current = { file: blob, type: project.assets.background.type };
                          
                          setRendererConfig(prev => ({
                              ...prev,
                              background: {
                                  ...prev.background,
                                  type: project.assets.background!.type,
                                  url: url
                              }
                          }));
                      }

                      // 3. Restore Fonts
                      for (const fontAsset of project.assets.fonts) {
                          const blob = await base64ToBlob(fontAsset.data);
                          fontFilesRef.current.set(fontAsset.name, blob);
                          
                          // Load into DOM
                          const url = URL.createObjectURL(blob);
                          const fontFace = new FontFace(fontAsset.name, `url(${url})`);
                          try {
                              const loadedFace = await fontFace.load();
                              document.fonts.add(loadedFace);
                          } catch (err) {
                              console.error("Failed to load font:", fontAsset.name);
                          }
                      }
                  } else {
                      alert("Project loaded (No assets found in bundle). Please re-add audio.");
                  }
              }
          } catch(err) {
              console.error("Load Error:", err);
              alert("Failed to load project file.");
          } finally {
              setRenderStatus({ state: 'idle', progress: 0 });
          }
      };
      reader.readAsText(file);
  };

  const downloadCachedVideo = () => {
      if (!cachedBlob) return;
      const url = URL.createObjectURL(cachedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kinetic-lyric-video-quick.${cachedBlob.type.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click();
      URL.revokeObjectURL(url);
  };

  // --- RENDERING LOGIC --- (Kept mostly same, consolidated for brevity)
  const startRendering = async () => {
    if (audioLayers.length === 0) { alert("Please add at least one audio layer."); return; }
    if (cachedBlob && exportMode === 'normal') {
        if (confirm("Download cached instant preview?")) { downloadCachedVideo(); return; }
    }
    if (renderStatus.state !== 'idle') return;

    const resConfig = RESOLUTIONS.find(r => r.id === rendererConfig.resolutionId) || RESOLUTIONS[0];
    const VIDEO_WIDTH = resConfig.width;
    const VIDEO_HEIGHT = resConfig.height;

    setRenderStatus({ state: 'analyzing', progress: 0 });
    
    if (isPlaying && audioContextRef.current) {
        audioContextRef.current.suspend();
        setIsPlaying(false);
    }

    try {
      const sampleRate = 44100;
      const FPS = 30;
      const totalFrames = Math.ceil(duration * FPS);
      const frameDuration = 1 / FPS;

      const safeDuration = Math.max(0.1, duration);
      const offlineCtx = new OfflineAudioContext(2, Math.ceil(safeDuration * sampleRate), sampleRate);
      const offlineMasterGain = offlineCtx.createGain();
      offlineMasterGain.connect(offlineCtx.destination);
      
      const hasSolo = audioLayers.some(l => l.solo);
      audioLayers.forEach(layer => {
           if (layer.muted || (hasSolo && !layer.solo)) return;
           const source = offlineCtx.createBufferSource();
           source.buffer = layer.buffer;
           const gain = offlineCtx.createGain();
           gain.gain.value = layer.volume;
           source.connect(gain);
           gain.connect(offlineMasterGain);
           source.start(0);
      });

      const renderedAudioBuffer = await offlineCtx.startRendering();
      const analysisFrames = extractAudioAnalysis(renderedAudioBuffer, FPS, duration);

      setRenderStatus({ state: 'rendering', progress: 0, totalFrames });
      const finalExportFormat = exportMode === 'alpha' ? 'webm' : exportFormat;

      let muxer: any;
      if (finalExportFormat === 'mp4') {
        muxer = new Mp4Muxer({ target: new Mp4ArrayBufferTarget(), video: { codec: 'avc', width: VIDEO_WIDTH, height: VIDEO_HEIGHT }, audio: { codec: 'aac', numberOfChannels: 2, sampleRate: sampleRate }, fastStart: false });
      } else {
        muxer = new WebMMuxer({ target: new WebMArrayBufferTarget(), video: { codec: 'V_VP9', width: VIDEO_WIDTH, height: VIDEO_HEIGHT, frameRate: FPS, alpha: exportMode === 'alpha' }, audio: { codec: 'A_OPUS', numberOfChannels: 2, sampleRate: sampleRate } });
      }

      let encoderError: Error | null = null;
      const videoEncoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { encoderError = e; } });
      
      const targetBitrate = Math.min(Math.ceil(VIDEO_WIDTH * VIDEO_HEIGHT * 30 * 0.1), 25_000_000); 
      const codecConfig: VideoEncoderConfig = finalExportFormat === 'mp4' 
      ? { codec: VIDEO_WIDTH > 1920 ? 'avc1.640033' : 'avc1.4d002a', width: VIDEO_WIDTH, height: VIDEO_HEIGHT, bitrate: targetBitrate }
      : { codec: 'vp09.00.10.08', width: VIDEO_WIDTH, height: VIDEO_HEIGHT, bitrate: targetBitrate, bitrateMode: exportMode === 'alpha' ? 'variable' : undefined, alpha: exportMode === 'alpha' ? 'keep' : 'discard' };

      await videoEncoder.configure(codecConfig);
      
      const canvas = rendererRef.current?.canvas;
      if (!canvas) throw new Error("Canvas not found");

      for (let i = 0; i < totalFrames; i++) {
         if (encoderError) throw new Error(`Encoding failed`);
         const time = i * frameDuration;
         const analysis = analysisFrames[i] || { bass: 0, mid: 0, high: 0, raw: new Uint8Array(128) };
         if (rendererRef.current?.seekToTime) await rendererRef.current.seekToTime(time);
         rendererRef.current?.drawFrame(time, analysis, exportMode === 'alpha');
         
         const frame = new VideoFrame(canvas, { timestamp: time * 1_000_000, alpha: exportMode === 'alpha' ? 'keep' : 'discard' });
         if (videoEncoder.encodeQueueSize > 5) await videoEncoder.flush();
         videoEncoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
         frame.close(); 
         
         if (i % 10 === 0) { setRenderStatus(prev => ({ ...prev, progress: i })); await new Promise(resolve => setTimeout(resolve, 0)); }
      }
      
      setRenderStatus({ state: 'encoding', progress: 100, totalFrames });
      await videoEncoder.flush();
      videoEncoder.close();

      const audioEncoder = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: (e) => console.error(e) });
      audioEncoder.configure({ codec: finalExportFormat === 'mp4' ? 'mp4a.40.2' : 'opus', numberOfChannels: 2, sampleRate: sampleRate, bitrate: 128000 });

      const chan0 = renderedAudioBuffer.getChannelData(0);
      const chan1 = renderedAudioBuffer.numberOfChannels > 1 ? renderedAudioBuffer.getChannelData(1) : chan0;
      const CHUNK_SIZE = 4096; 
      
      for (let i = 0; i < renderedAudioBuffer.length; i += CHUNK_SIZE) {
          const remaining = renderedAudioBuffer.length - i;
          const len = Math.min(CHUNK_SIZE, remaining);
          const chunkData = new Float32Array(len * 2);
          for (let j = 0; j < len; j++) { chunkData[j*2] = chan0[i+j]; chunkData[j*2+1] = chan1[i+j]; }
          const audioData = new AudioData({ format: 'f32', sampleRate: sampleRate, numberOfFrames: len, numberOfChannels: 2, timestamp: i / sampleRate * 1_000_000, data: chunkData });
          audioEncoder.encode(audioData);
          audioData.close();
      }
      await audioEncoder.flush();
      audioEncoder.close();

      muxer.finalize();
      const { buffer } = muxer.target;
      const blob = new Blob([buffer], { type: finalExportFormat === 'mp4' ? 'video/mp4' : 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `render.${finalExportFormat}`;
      a.click();
      
      setRenderStatus({ state: 'done', progress: 100 });
      setTimeout(() => setRenderStatus({ state: 'idle', progress: 0 }), 3000);

    } catch (e) {
      console.error(e);
      alert(`Rendering failed`);
      setRenderStatus({ state: 'idle', progress: 0 });
    }
  };
  
  const viewportResolution = RESOLUTIONS.find(r => r.id === rendererConfig.resolutionId) || RESOLUTIONS[0];
  const aspectRatio = viewportResolution.width / viewportResolution.height;

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 text-white overflow-hidden font-sans">
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-neutral-900 shrink-0 z-20">
        <div className="flex items-center gap-2">
           <Activity className="text-cyan-400" />
           <h1 className="font-black tracking-tighter text-lg">KINETIC<span className="text-cyan-400">FLOW</span></h1>
        </div>

        <div className="flex items-center gap-4">
             {isCaching && (
                 <div className="flex items-center gap-1.5 bg-red-950/50 border border-red-500/30 px-2 py-0.5 rounded-full animate-pulse">
                     <div className="w-2 h-2 rounded-full bg-red-500" />
                     <span className="text-[10px] text-red-200 font-bold uppercase tracking-wide">Caching for Export</span>
                 </div>
             )}
             
             {cachedBlob && !isCaching && (
                 <div className="flex items-center gap-1.5 bg-green-950/50 border border-green-500/30 px-2 py-0.5 rounded-full">
                     <Zap size={10} className="text-green-400 fill-current" />
                     <span className="text-[10px] text-green-200 font-bold uppercase tracking-wide">Instant Export Ready</span>
                 </div>
             )}
        </div>

        <div className="flex items-center gap-2">
             <div className="flex items-center bg-neutral-800 rounded-md border border-white/5 mr-4">
                  <button onClick={handleResetProject} title="Reset Project" className="p-2 hover:bg-neutral-700 text-gray-400 hover:text-red-400 transition-colors border-r border-white/5">
                      <RotateCcw size={18} />
                  </button>
                  <button 
                    onClick={handleSaveProject} 
                    title="Save Bundled Project" 
                    className="p-2 hover:bg-neutral-700 text-gray-400 hover:text-cyan-400 transition-colors border-r border-white/5 disabled:opacity-50"
                    disabled={renderStatus.state === 'saving'}
                  >
                      {renderStatus.state === 'saving' ? <Loader2 size={18} className="animate-spin text-cyan-400"/> : <Save size={18} />}
                  </button>
                  <label title="Load Project" className={`p-2 hover:bg-neutral-700 text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer ${renderStatus.state === 'loading' ? 'opacity-50 pointer-events-none' : ''}`}>
                      {renderStatus.state === 'loading' ? <Loader2 size={18} className="animate-spin text-cyan-400"/> : <FolderOpen size={18} />}
                      <input type="file" accept=".json" onChange={handleLoadProject} className="hidden" disabled={renderStatus.state === 'loading'}/>
                  </label>
             </div>

             <div className="flex items-center gap-2 bg-neutral-800 p-1 rounded-md border border-white/5">
                 <div className="flex items-center px-1 border-r border-white/5 mr-1">
                     <button onClick={() => setExportMode('normal')} className={`text-[10px] px-2 py-1 font-bold rounded ${exportMode === 'normal' ? 'bg-neutral-600 text-white' : 'text-gray-400 hover:text-white'}`}>NORMAL</button>
                     <button onClick={() => setExportMode('alpha')} className={`text-[10px] px-2 py-1 font-bold rounded flex items-center gap-1 ${exportMode === 'alpha' ? 'bg-neutral-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Transparent Background (WEBM)">ALPHA</button>
                 </div>

                 {!cachedBlob && exportMode === 'normal' && (
                    <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)} className="bg-transparent text-xs font-bold text-gray-300 outline-none px-2 py-1" disabled={renderStatus.state !== 'idle'}>
                        <option value="mp4">MP4</option>
                        <option value="webm">WEBM</option>
                    </select>
                 )}
                 <button
                    onClick={startRendering}
                    disabled={renderStatus.state !== 'idle' || audioLayers.length === 0}
                    className={`${cachedBlob && exportMode === 'normal' ? 'bg-green-600 hover:bg-green-500' : 'bg-cyan-600 hover:bg-cyan-500'} disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-1.5 rounded flex items-center gap-2 transition-all`}
                    title={cachedBlob && exportMode === 'normal' ? "Instant Download available" : "High quality render"}
                 >
                    {renderStatus.state === 'idle' ? (
                        <>
                            {cachedBlob && exportMode === 'normal' ? <Zap size={14} fill="currentColor"/> : <Video size={14} />} 
                            {cachedBlob && exportMode === 'normal' ? 'INSTANT EXPORT' : 'EXPORT'}
                        </>
                    ) : (
                        <>
                            <Loader2 size={14} className="animate-spin" /> 
                            {renderStatus.state === 'analyzing' ? 'PROCESSING' : 
                             renderStatus.state === 'encoding' ? 'ENCODING' :
                             `${Math.round((renderStatus.progress / (renderStatus.totalFrames || 1)) * 100)}%`}
                        </>
                    )}
                 </button>
             </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
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
                 onResetProject={handleResetProject}
                 eventBlocks={eventBlocks}
                 onUpdateEventBlocks={setEventBlocks}
                 onAssetLoaded={handleAssetLoaded}
                 // Custom FX Props
                 customEffects={customEffects}
                 onUpdateCustomEffects={setCustomEffects}
              />
          </div>

          <div className="flex-1 bg-neutral-950 relative flex flex-col min-w-0">
               <div className={`flex-1 flex items-center justify-center p-8 overflow-hidden ${exportMode === 'alpha' ? 'bg-[conic-gradient(#333_90deg,transparent_90deg)] bg-[length:20px_20px] bg-neutral-800' : 'bg-[radial-gradient(circle_at_center,_#1a1a1a_1px,_transparent_1px)] bg-[length:20px_20px]'}`}>
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
                          eventBlocks={eventBlocks}
                          customEffects={customEffects}
                       />
                       
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
