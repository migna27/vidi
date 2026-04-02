




import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_LYRICS, TEMPLATES, RESOLUTIONS } from './constants';
import { CanvasVideoRenderer, CanvasVideoRendererRef } from './components/CanvasVideoRenderer';
import { Controls } from './components/Controls';
import { SettingsPanel } from './components/SettingsPanel';
import { ProjectLauncher } from './components/ProjectLauncher';
import { LyricData, RenderStatus, AudioVisualizerData, Segment, Word, RendererConfig, ProjectFile, AudioLayer, EventBlock, CustomEffect, AppProjectType, LoadedAsset } from './types';
import { Save, FolderOpen, Activity, Loader2, Video, Download, RotateCcw, Check, Zap, Trash2, FileVideo, Package, Home, HardDrive, X } from 'lucide-react';

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

// --- INDEXED DB HELPER ---
const DB_NAME = 'AppMignaDB';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'name' });
      if (!db.objectStoreNames.contains('shaders')) db.createObjectStore('shaders', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('renders')) db.createObjectStore('renders', { keyPath: 'name' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const dbGetAllKeys = (db: IDBDatabase, storeName: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAllKeys();
        request.onsuccess = () => resolve(request.result as string[]);
        request.onerror = () => reject(request.error);
    });
};

const dbGet = (db: IDBDatabase, storeName: string, key: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const dbPut = (db: IDBDatabase, storeName: string, value: any): Promise<void> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Helper: Convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
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

const parseSrtTimestamp = (timestamp: string): number => {
  if (!timestamp) return 0;
  const normalized = timestamp.replace(',', '.').trim();
  const parts = normalized.split(':');
  if (parts.length < 3) return 0; 
  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]);
  return (hours * 3600) + (minutes * 60) + seconds;
};

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
    const textLines = lines.slice(timeLineIndex + 1).map(l => l.replace(/<[^>]*>/g, '').trim()).filter(l => l.length > 0);
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
      words.push({ word: wObj.text, start: start + (i * wordDuration), end: start + ((i + 1) * wordDuration), probability: 1.0, line_number: wObj.line });
    });
    segments.push({ id: index.toString(), start, end, text: fullText, section: 'verse', words });
  });
  return { segments };
};

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
        let sum = 0; let diffSum = 0; let highFreqSum = 0;
        for (let j = startSample; j < endSample; j++) {
            const val = rawData[j]; sum += val * val; 
            if (j > startSample) { const diff = val - rawData[j-1]; diffSum += diff * diff; 
                if (j > startSample + 1) { const diff2 = (val - rawData[j-1]) - (rawData[j-1] - rawData[j-2]); highFreqSum += diff2 * diff2; } }
        }
        const rms = Math.sqrt(sum / (endSample - startSample)) || 0;
        const diffRms = Math.sqrt(diffSum / (endSample - startSample)) || 0;
        const highRms = Math.sqrt(highFreqSum / (endSample - startSample)) || 0;
        const bass = Math.min(1, rms * 4); const mid = Math.min(1, diffRms * 8); const high = Math.min(1, highRms * 16);
        const dataArray = new Uint8Array(frequencyBinCount);
        const bassBins = 10; const midBins = 90;
        for(let k=0; k<frequencyBinCount; k++) {
            if (k < bassBins) dataArray[k] = bass * 255;
            else if (k < bassBins + midBins) dataArray[k] = mid * 255;
            else dataArray[k] = high * 255;
        }
        result[i] = { bass, mid, high, raw: dataArray };
    }
    return result;
};

// --- EXPORT MODAL ---
interface ExportConfig {
    fileName: string;
    resolution: { id: string, width: number, height: number, name: string };
    fps: number;
    bitrate: number;
    format: 'mp4' | 'webm';
}

const ExportModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    defaultName 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    onConfirm: (config: ExportConfig) => void, 
    defaultName: string 
}) => {
    const [fileName, setFileName] = useState(defaultName);
    const [resId, setResId] = useState('16:9');
    const [fps, setFps] = useState(30);
    const [bitrateLevel, setBitrateLevel] = useState(1e7); // 10 Mbps
    const [format, setFormat] = useState<'mp4' | 'webm'>('mp4');

    if (!isOpen) return null;

    const selectedRes = RESOLUTIONS.find(r => r.id === resId) || RESOLUTIONS[0];

    const handleExport = () => {
        onConfirm({
            fileName: fileName || 'video_export',
            resolution: selectedRes,
            fps,
            bitrate: bitrateLevel,
            format
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Video size={20} className="text-cyan-400"/> Export Configuration</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"><X size={18}/></button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">File Name</label>
                        <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white outline-none focus:border-cyan-500"/>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Resolution</label>
                            <select value={resId} onChange={(e) => setResId(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white outline-none">
                                {RESOLUTIONS.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Format</label>
                            <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white outline-none">
                                <option value="mp4">MP4 (H.264)</option>
                                <option value="webm">WEBM (VP9)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Frame Rate</label>
                            <select value={fps} onChange={(e) => setFps(Number(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white outline-none">
                                <option value={30}>30 FPS</option>
                                <option value={60}>60 FPS</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Quality</label>
                            <select value={bitrateLevel} onChange={(e) => setBitrateLevel(Number(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white outline-none">
                                <option value={5e6}>Draft (5 Mbps)</option>
                                <option value={1e7}>Standard (10 Mbps)</option>
                                <option value={2.5e7}>High (25 Mbps)</option>
                                <option value={5e7}>Ultra (50 Mbps)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-bold transition-colors">Cancel</button>
                    <button onClick={handleExport} className="flex-1 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2">
                        Start Export <Zap size={16} fill="currentColor"/>
                    </button>
                </div>
            </div>
        </div>
    )
};

export default function App() {
  // --- APP STATE ---
  const [viewMode, setViewMode] = useState<'launcher' | 'editor'>('launcher');
  
  // Database State
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [projectsList, setProjectsList] = useState<string[]>([]);
  const [fsLoading, setFsLoading] = useState(true);
  const [currentProjectName, setCurrentProjectName] = useState<string>('Untitled');

  // Editor State
  const [data, setData] = useState<LyricData>(DEFAULT_LYRICS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [eventBlocks, setEventBlocks] = useState<EventBlock[]>([]);
  const [audioLayers, setAudioLayers] = useState<AudioLayer[]>([]);
  const [customEffects, setCustomEffects] = useState<CustomEffect[]>([]);
  const [assets, setAssets] = useState<LoadedAsset[]>([]); 
  
  const backgroundFileRef = useRef<{ file: Blob, type: 'image' | 'video' } | null>(null);
  const fontFilesRef = useRef<Map<string, Blob>>(new Map());
  const [renderStatus, setRenderStatus] = useState<RenderStatus>({ state: 'idle', progress: 0 });
  const [audioVisualizerData, setAudioVisualizerData] = useState<AudioVisualizerData>({ bass: 0, mid: 0, high: 0, raw: new Uint8Array() });
  const [rendererConfig, setRendererConfig] = useState<RendererConfig>(TEMPLATES[0]);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const [cachedBlob, setCachedBlob] = useState<Blob | null>(null);
  const [isCaching, setIsCaching] = useState(false);
  
  // Refs
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

  // --- INITIALIZE DB ---
  useEffect(() => {
      const init = async () => {
          try {
              const database = await openDB();
              setDb(database);
              await refreshProjectsList(database);
              
              const transaction = database.transaction(['shaders'], 'readonly');
              const store = transaction.objectStore('shaders');
              const request = store.getAll();
              request.onsuccess = () => {
                  if (request.result && request.result.length > 0) {
                      setCustomEffects(request.result);
                  }
              };
          } catch(e) {
              console.error("DB Error", e);
          } finally {
              setFsLoading(false);
          }
      };
      init();
  }, []);

  const refreshProjectsList = async (database: IDBDatabase) => {
      const keys = await dbGetAllKeys(database, 'projects');
      setProjectsList(keys);
  };

  // --- LAUNCHER ACTIONS ---

  const handleCreateProject = (type: AppProjectType, name: string) => {
      setData(DEFAULT_LYRICS);
      setRendererConfig(TEMPLATES[0]);
      setAudioLayers([]);
      setEventBlocks([]);
      setCachedBlob(null);
      setAssets([]);
      backgroundFileRef.current = null;
      fontFilesRef.current.clear();
      setCurrentProjectName(name);
      setViewMode('editor');
  };

  const handleLoadProjectFromDisk = async (name: string) => {
      if (!db) return;
      setFsLoading(true);
      try {
          const project = await dbGet(db, 'projects', name) as ProjectFile;
          if (!project) throw new Error("Project not found");

          setCurrentProjectName(project.name);
          if (project.lyricData) setData(project.lyricData);
          if (project.config) setRendererConfig(project.config);
          if (project.eventBlocks) setEventBlocks(project.eventBlocks);
          
          if (project.customEffects) {
              setCustomEffects(prev => {
                  const combined = [...prev];
                  project.customEffects?.forEach(pFx => {
                      if (!combined.find(c => c.id === pFx.id)) combined.push(pFx);
                  });
                  return combined;
              });
          }

          if (project.assets) {
              initAudioEngine();
              const restoredLayers: AudioLayer[] = [];
              for (const audioAsset of project.assets.audio) {
                  const blob = await base64ToBlob(audioAsset.data);
                  const arrayBuffer = await blob.arrayBuffer();
                  const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
                  restoredLayers.push({
                      id: audioAsset.id, name: audioAsset.name, buffer: audioBuffer,
                      volume: audioAsset.volume, muted: audioAsset.muted, solo: audioAsset.solo,
                      duration: audioBuffer.duration, sourceFile: blob, mimeType: audioAsset.mimeType
                  });
              }
              setAudioLayers(restoredLayers);
              if (restoredLayers.length > 0) setDuration(Math.max(...restoredLayers.map(l => l.duration)));

              const loadedAssetsList: LoadedAsset[] = [];

              if (project.assets.background) {
                  const blob = await base64ToBlob(project.assets.background.data);
                  const url = URL.createObjectURL(blob);
                  backgroundFileRef.current = { file: blob, type: project.assets.background.type };
                  setRendererConfig(prev => ({ ...prev, background: { ...prev.background, type: project.assets.background!.type, url: url } }));
                  
                  loadedAssetsList.push({
                      id: 'bg-' + Date.now(),
                      type: project.assets.background.type,
                      name: 'Restored Background',
                      url,
                      file: blob,
                      mimeType: project.assets.background.mimeType
                  });
              }
              
              for (const fontAsset of project.assets.fonts) {
                  const blob = await base64ToBlob(fontAsset.data);
                  fontFilesRef.current.set(fontAsset.name, blob);
                  const url = URL.createObjectURL(blob);
                  const fontFace = new FontFace(fontAsset.name, `url(${url})`);
                  try { const loaded = await fontFace.load(); document.fonts.add(loaded); } catch(e) {}
                  
                  loadedAssetsList.push({
                      id: 'font-' + fontAsset.name,
                      type: 'font',
                      name: fontAsset.name,
                      url,
                      file: blob,
                      mimeType: fontAsset.mimeType
                  });
              }
              
              setAssets(loadedAssetsList);
          }
          setViewMode('editor');
      } catch (e) {
          console.error(e);
          alert("Failed to load project.");
      } finally {
          setFsLoading(false);
      }
  };

  const handleImportProject = async (file: File) => {
      if (!db) return;
      try {
          const text = await file.text();
          const project = JSON.parse(text);
          
          if (!project.name || !project.version) {
             throw new Error("Invalid project structure");
          }
          
          await dbPut(db, 'projects', project);
          await refreshProjectsList(db);
          alert(`Project "${project.name}" imported successfully!`);
      } catch (e) {
          console.error("Import failed", e);
          alert("Failed to import project file. Ensure it is a valid .json project.");
      }
  };

  const handleCustomEffectsUpdate = (fx: CustomEffect[]) => {
      setCustomEffects(fx);
      if (db) {
          fx.forEach(effect => dbPut(db, 'shaders', effect));
      }
  };

  // --- APP LOGIC ---
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

  useEffect(() => { if (cachedBlob) setCachedBlob(null); }, [data, rendererConfig, audioLayers, eventBlocks, customEffects]);

  const handleAudioLayerAdd = async (file: File) => {
      initAudioEngine();
      if (!audioContextRef.current) return;
      try {
          const arrayBuffer = await file.arrayBuffer();
          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          const newLayer: AudioLayer = {
              id: Date.now().toString() + Math.random().toString(),
              name: file.name, buffer: audioBuffer, volume: 1.0, muted: false, solo: false,
              duration: audioBuffer.duration, sourceFile: file, mimeType: file.type
          };
          setAudioLayers(prev => {
              const updated = [...prev, newLayer];
              setDuration(Math.max(...updated.map(l => l.duration)));
              return updated;
          });
      } catch (e) { console.error(e); alert("Failed to load audio"); }
  };

  const updateLayer = (id: string, updates: Partial<AudioLayer>) => {
      setAudioLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };
  const removeLayer = (id: string) => {
      setAudioLayers(prev => {
          const updated = prev.filter(l => l.id !== id);
          const maxDur = Math.max(...updated.map(l => l.duration), 0);
          setDuration(maxDur);
          return updated;
      });
  };

  const handleAssetLoaded = (type: 'background' | 'font', file: File, meta?: string) => {
      const url = URL.createObjectURL(file);
      let assetType: 'image' | 'video' | 'font' = 'image';
      if (type === 'font') {
          assetType = 'font';
      } else {
          assetType = file.type.startsWith('video') ? 'video' : 'image';
      }

      const newAsset: LoadedAsset = {
          id: `asset-${Date.now()}-${Math.random()}`,
          type: assetType,
          name: file.name,
          url,
          file,
          mimeType: file.type
      };
      setAssets(prev => [...prev, newAsset]);

      if (type === 'background') {
          backgroundFileRef.current = { file, type: assetType === 'video' ? 'video' : 'image' };
      }
      else if (type === 'font' && meta) fontFilesRef.current.set(meta, file);
  };

  const handleSelectAsset = (asset: LoadedAsset) => {
      if (asset.type === 'image' || asset.type === 'video') {
          const newType = asset.type;
          backgroundFileRef.current = { file: asset.file, type: newType };
          setRendererConfig(prev => ({
              ...prev,
              background: {
                  ...prev.background,
                  type: newType,
                  url: asset.url
              }
          }));
      }
  };

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
             gainNode.gain.setTargetAtTime(effectiveMute ? 0 : layer.volume, audioContextRef.current!.currentTime, 0.05);
         }
     });
     gainsRef.current.forEach((val, key) => { if (!audioLayers.find(l => l.id === key)) { val.disconnect(); gainsRef.current.delete(key); } });
  }, [audioLayers]);

  const stopAllSources = () => { sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} s.disconnect(); }); sourcesRef.current.clear(); };
  const startAllSources = (offset: number) => {
      if (!audioContextRef.current) return;
      stopAllSources();
      audioLayers.forEach(layer => {
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = layer.buffer;
          const gain = gainsRef.current.get(layer.id);
          if (gain) source.connect(gain);
          source.start(0, offset);
          sourcesRef.current.set(layer.id, source);
      });
  };

  const startRecordingCache = () => {
      if (!rendererRef.current?.canvas || !audioDestinationRef.current) return;
      try {
          const combined = new MediaStream([...rendererRef.current.canvas.captureStream(60).getVideoTracks(), ...audioDestinationRef.current.stream.getAudioTracks()]);
          const recorder = new MediaRecorder(combined, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 8000000 });
          recordedChunksRef.current = [];
          recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
          recorder.start();
          mediaRecorderRef.current = recorder;
          setIsCaching(true);
      } catch (err) {}
  };

  const stopRecordingCache = (save: boolean) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          if (save && recordedChunksRef.current.length > 0) setCachedBlob(new Blob(recordedChunksRef.current, { type: 'video/webm' }));
      }
      setIsCaching(false); mediaRecorderRef.current = null;
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
          if (currentTime < 0.1) { setCachedBlob(null); startRecordingCache(); }
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
      if (wasPlaying) { startAllSources(time); audioContextRef.current.resume(); }
  };

  const analyzeAudio = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const avg = (arr: Uint8Array) => arr.reduce((a, b) => a + b, 0) / arr.length;
      setAudioVisualizerData({ bass: avg(dataArray.slice(0, 10)) / 255, mid: avg(dataArray.slice(10, 100)) / 255, high: avg(dataArray.slice(100, 200)) / 255, raw: dataArray });
    }
  };

  const loop = () => {
    if (isPlaying && audioContextRef.current) {
        let syncedTime = audioContextRef.current.currentTime - startTimeRef.current;
        if (syncedTime >= duration && duration > 0) { syncedTime = duration; if (isCaching) stopRecordingCache(true); setIsPlaying(false); stopAllSources(); audioContextRef.current.suspend(); }
        setCurrentTime(syncedTime); analyzeAudio();
    }
    if (rendererRef.current) rendererRef.current.drawFrame(currentTime, audioVisualizerData, false);
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => { requestRef.current = requestAnimationFrame(loop); return () => cancelAnimationFrame(requestRef.current); }, [currentTime, audioVisualizerData, isPlaying, duration, isCaching]);

  const handleSaveProject = async () => {
      setRenderStatus({ state: 'saving', progress: 0 });
      try {
          const audioAssets = await Promise.all(audioLayers.map(async (layer) => {
              if (layer.sourceFile) return { id: layer.id, name: layer.name, mimeType: layer.mimeType || 'audio/mp3', data: await blobToBase64(layer.sourceFile), volume: layer.volume, muted: layer.muted, solo: layer.solo };
              return null;
          }));
          let backgroundAsset = undefined;
          if (rendererConfig.background.type !== 'procedural' && rendererConfig.background.type !== 'solid' && backgroundFileRef.current) {
              backgroundAsset = { type: backgroundFileRef.current.type, mimeType: backgroundFileRef.current.file.type, data: await blobToBase64(backgroundFileRef.current.file) };
          }
          const fontAssets = await Promise.all(Array.from(fontFilesRef.current.entries()).map(async ([name, blob]) => ({ name, mimeType: blob.type, data: await blobToBase64(blob) })));
          
          const project: ProjectFile = {
              version: '1.3',
              type: 'video-lyrics',
              timestamp: Date.now(),
              name: currentProjectName,
              lyricData: data,
              config: rendererConfig,
              eventBlocks: eventBlocks,
              assets: { audio: audioAssets.filter(a => a !== null) as any, background: backgroundAsset, fonts: fontAssets },
              customEffects: customEffects
          };

          const jsonString = JSON.stringify(project);

          if (db) {
              await dbPut(db, 'projects', project);
              alert("Project saved to internal storage!");
              await refreshProjectsList(db);
          } else {
              const blob = new Blob([jsonString], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${currentProjectName}.json`;
              a.click();
              URL.revokeObjectURL(url);
          }
      } catch (e) { console.error("Save Error:", e); alert("Failed to save project."); } 
      finally { setRenderStatus({ state: 'idle', progress: 0 }); }
  };

  const startRendering = async (exportConfig: ExportConfig) => {
    if (audioLayers.length === 0) return alert("No audio layers.");
    if (renderStatus.state !== 'idle') return;
    
    setShowExportModal(false); // Close Modal
    
    // Use selected export resolution instead of current view resolution
    const resConfig = exportConfig.resolution;
    
    setRenderStatus({ state: 'analyzing', progress: 0 });
    if (isPlaying && audioContextRef.current) { audioContextRef.current.suspend(); setIsPlaying(false); }

    try {
      const sampleRate = 44100; 
      const FPS = exportConfig.fps;
      const totalFrames = Math.ceil(duration * FPS);
      
      const offlineCtx = new OfflineAudioContext(2, Math.ceil(Math.max(0.1, duration) * sampleRate), sampleRate);
      const offlineMaster = offlineCtx.createGain(); offlineMaster.connect(offlineCtx.destination);
      audioLayers.forEach(l => { if (l.muted || (audioLayers.some(al=>al.solo) && !l.solo)) return; const s = offlineCtx.createBufferSource(); s.buffer = l.buffer; const g = offlineCtx.createGain(); g.gain.value = l.volume; s.connect(g); g.connect(offlineMaster); s.start(0); });
      const renderedBuffer = await offlineCtx.startRendering();
      const analysisFrames = extractAudioAnalysis(renderedBuffer, FPS, duration);
      
      setRenderStatus({ state: 'rendering', progress: 0, totalFrames });
      
      const format = exportConfig.format;
      let muxer = format === 'mp4' ? new Mp4Muxer({ target: new Mp4ArrayBufferTarget(), video: { codec: 'avc', width: resConfig.width, height: resConfig.height }, audio: { codec: 'aac', numberOfChannels: 2, sampleRate }, fastStart: 'in-memory' }) : new WebMMuxer({ target: new WebMArrayBufferTarget(), video: { codec: 'V_VP9', width: resConfig.width, height: resConfig.height, frameRate: FPS, alpha: false }, audio: { codec: 'A_OPUS', numberOfChannels: 2, sampleRate } });
      const vEnc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => console.error(e) });
      await vEnc.configure({ codec: format === 'mp4' ? 'avc1.4d002a' : 'vp09.00.10.08', width: resConfig.width, height: resConfig.height, bitrate: exportConfig.bitrate, alpha: 'discard' });
      
      const canvas = rendererRef.current?.canvas;
      if (!canvas) throw new Error("No Canvas");

      // RESIZE CANVAS FOR EXPORT
      if (rendererRef.current?.resize) {
          rendererRef.current.resize(resConfig.width, resConfig.height);
          // Wait for a tick to allow WebGL context to update viewport inside resize
          await new Promise(r => setTimeout(r, 100));
      }

      for (let i = 0; i < totalFrames; i++) {
         const t = i / FPS;
         if (rendererRef.current?.seekToTime) await rendererRef.current.seekToTime(t);
         rendererRef.current?.drawFrame(t, analysisFrames[i] || {bass:0,mid:0,high:0,raw:new Uint8Array(128)}, false);
         const frame = new VideoFrame(canvas, { timestamp: t * 1e6, alpha: 'discard' });
         if (vEnc.encodeQueueSize > 5) await vEnc.flush();
         vEnc.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
         frame.close();
         
         if (i % 15 === 0) { 
             setRenderStatus(prev => ({ ...prev, progress: i })); 
             await new Promise(r => setTimeout(r, 0)); 
         }
      }
      
      // RESTORE CANVAS SIZE
      const previewRes = RESOLUTIONS.find(r => r.id === rendererConfig.resolutionId) || RESOLUTIONS[0];
      if (rendererRef.current?.resize) {
          rendererRef.current.resize(previewRes.width, previewRes.height);
      }

      setRenderStatus({ state: 'encoding', progress: 100 });
      await vEnc.flush(); vEnc.close();
      const aEnc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: console.error });
      aEnc.configure({ codec: format === 'mp4' ? 'mp4a.40.2' : 'opus', numberOfChannels: 2, sampleRate });
      const c0 = renderedBuffer.getChannelData(0); const c1 = renderedBuffer.numberOfChannels > 1 ? renderedBuffer.getChannelData(1) : c0;
      for (let i = 0; i < renderedBuffer.length; i += 4096) {
          const len = Math.min(4096, renderedBuffer.length - i);
          const d = new Float32Array(len * 2);
          for (let j = 0; j < len; j++) { d[j*2] = c0[i+j]; d[j*2+1] = c1[i+j]; }
          const ad = new AudioData({ format: 'f32', sampleRate, numberOfFrames: len, numberOfChannels: 2, timestamp: i / sampleRate * 1e6, data: d });
          aEnc.encode(ad); ad.close();
      }
      await aEnc.flush(); aEnc.close();
      muxer.finalize();
      const blob = new Blob([muxer.target.buffer], { type: format === 'mp4' ? 'video/mp4' : 'video/webm' });
      
      if (db) {
          const fileName = `${exportConfig.fileName}.${format}`;
          await dbPut(db, 'renders', { name: fileName, blob, date: new Date() });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
      } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `${exportConfig.fileName}.${format}`; a.click();
      }
      setRenderStatus({ state: 'done', progress: 100 });
      setTimeout(() => setRenderStatus({ state: 'idle', progress: 0 }), 3000);
    } catch (e) { 
        console.error(e); 
        setRenderStatus({ state: 'idle', progress: 0 }); 
        alert("Render Failed"); 
        // Attempt Restore
        const previewRes = RESOLUTIONS.find(r => r.id === rendererConfig.resolutionId) || RESOLUTIONS[0];
        if (rendererRef.current?.resize) rendererRef.current.resize(previewRes.width, previewRes.height);
    }
  };

  const viewportResolution = RESOLUTIONS.find(r => r.id === rendererConfig.resolutionId) || RESOLUTIONS[0];

  // --- RENDER ---

  if (viewMode === 'launcher') {
      return (
          <ProjectLauncher 
             workspaceName={db ? "AppMignaDB (Internal)" : "Connecting..."}
             projects={projectsList}
             onLoadProject={handleLoadProjectFromDisk}
             onCreateProject={handleCreateProject}
             onImportProject={handleImportProject}
             isLoading={fsLoading}
          />
      );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 text-white overflow-hidden font-sans">
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        onConfirm={startRendering}
        defaultName={currentProjectName}
      />

      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-neutral-900 shrink-0 z-20">
        <div className="flex items-center gap-4">
           <button onClick={() => setViewMode('launcher')} className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-gray-400 hover:text-white transition-colors">
               <Home size={18} />
           </button>
           <div className="flex items-center gap-2">
               <Activity className="text-cyan-400" />
               <h1 className="font-black tracking-tighter text-lg">MIGNA <span className="text-neutral-500 text-xs font-normal">/ {currentProjectName}</span></h1>
           </div>
        </div>

        <div className="flex items-center gap-4">
             {isCaching && <div className="flex items-center gap-1.5 bg-red-950/50 border border-red-500/30 px-2 py-0.5 rounded-full animate-pulse"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] text-red-200 font-bold uppercase">Caching</span></div>}
             {cachedBlob && !isCaching && <div className="flex items-center gap-1.5 bg-green-950/50 border border-green-500/30 px-2 py-0.5 rounded-full"><Zap size={10} className="text-green-400 fill-current" /><span className="text-[10px] text-green-200 font-bold uppercase">Instant Ready</span></div>}
        </div>

        <div className="flex items-center gap-2">
             <div className="flex items-center bg-neutral-800 rounded-md border border-white/5 mr-4">
                  <button onClick={() => { if(confirm("Clear workspace?")) { setData(DEFAULT_LYRICS); setAudioLayers([]); }}} title="Clear" className="p-2 hover:bg-neutral-700 text-gray-400 hover:text-red-400 transition-colors border-r border-white/5"><RotateCcw size={18} /></button>
                  <button onClick={handleSaveProject} disabled={renderStatus.state === 'saving'} title="Save Project" className="p-2 hover:bg-neutral-700 text-gray-400 hover:text-cyan-400 transition-colors disabled:opacity-50">{renderStatus.state === 'saving' ? <Loader2 size={18} className="animate-spin text-cyan-400"/> : <Save size={18} />}</button>
             </div>

             <div className="flex items-center gap-2 bg-neutral-800 p-1 rounded-md border border-white/5">
                 <button onClick={() => setShowExportModal(true)} disabled={renderStatus.state !== 'idle'} className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 rounded flex items-center gap-2 transition-all">
                    {renderStatus.state === 'idle' ? <><Video size={14} /> EXPORT</> : <><Loader2 size={14} className="animate-spin" /> {renderStatus.state === 'analyzing' ? 'PROCESSING' : renderStatus.state === 'encoding' ? 'ENCODING' : `${Math.round((renderStatus.progress / (renderStatus.totalFrames || 1)) * 100)}%`}</>}
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
                 onJsonUpload={(j) => setData(JSON.parse(j))}
                 onSrtUpload={(s) => { try { const p = parseSrtToLyricData(s); if(p.segments.length > 0) setData(p); } catch(e){} }}
                 onAudioLayerAdd={handleAudioLayerAdd}
                 audioLayers={audioLayers}
                 onUpdateLayer={updateLayer}
                 onRemoveLayer={removeLayer}
                 onResetProject={() => {}}
                 eventBlocks={eventBlocks}
                 onUpdateEventBlocks={setEventBlocks}
                 onAssetLoaded={handleAssetLoaded}
                 customEffects={customEffects}
                 onUpdateCustomEffects={handleCustomEffectsUpdate}
                 assets={assets}
                 onSelectAsset={handleSelectAsset}
              />
          </div>

          <div className="flex-1 bg-neutral-950 relative flex flex-col min-w-0">
               <div className={`flex-1 flex items-center justify-center p-8 overflow-hidden bg-[radial-gradient(circle_at_center,_#1a1a1a_1px,_transparent_1px)] bg-[length:20px_20px]`}>
                   <div className="relative shadow-2xl border border-white/10" style={{ aspectRatio: `${viewportResolution.width/viewportResolution.height}`, height: viewportResolution.width/viewportResolution.height > 1 ? 'auto' : '90%', width: viewportResolution.width/viewportResolution.height > 1 ? '90%' : 'auto', maxHeight: '90%', maxWidth: '90%' }}>
                       <CanvasVideoRenderer ref={rendererRef} data={data} config={rendererConfig} isPlaying={isPlaying} eventBlocks={eventBlocks} customEffects={customEffects} />
                   </div>
               </div>
               <div className="shrink-0 z-20"><Controls isPlaying={isPlaying} onTogglePlay={togglePlay} currentTime={currentTime} duration={duration} onSeek={handleSeek} isRendering={renderStatus.state !== 'idle'} /></div>
          </div>
      </div>
    </div>
  );
}