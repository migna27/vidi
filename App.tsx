
import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_LYRICS } from './constants';
import { CanvasVideoRenderer, CanvasVideoRendererRef } from './components/CanvasVideoRenderer';
import { Controls } from './components/Controls';
import { LyricData, RenderStatus, AudioVisualizerData } from './types';
import { UploadCloud, AlertCircle } from 'lucide-react';
// @ts-ignore
import { Muxer, ArrayBufferTarget } from 'webm-muxer';

export default function App() {
  const [data, setData] = useState<LyricData>(DEFAULT_LYRICS);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Rendering State
  const [renderStatus, setRenderStatus] = useState<RenderStatus>({ state: 'idle', progress: 0 });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  
  const rendererRef = useRef<CanvasVideoRendererRef>(null);

  // Buffer used for realtime analysis
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      // Init data buffer
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

      if (audioRef.current) {
        if(!sourceRef.current) {
             sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
             sourceRef.current.connect(analyserRef.current);
             analyserRef.current.connect(audioContextRef.current.destination);
        }
      }
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // The main Loop for Preview
  useEffect(() => {
    const loop = () => {
      if (renderStatus.state !== 'idle') return;

      let time = 0;
      if (audioRef.current) {
         if (!audioRef.current.paused) {
             time = audioRef.current.currentTime;
             // Update React state for UI slider (maybe throttle this in production, but ok for now)
             setCurrentTime(time);
         } else if (isPlaying && !audioUrl) {
             // Demo mode fallback
             setCurrentTime(prev => {
                const n = prev + 0.016; 
                if(n > duration) {
                  setIsPlaying(false);
                  return 0;
                }
                time = n;
                return n;
             });
         } else {
             time = currentTime;
         }
      } else {
          time = currentTime;
      }

      // 1. Get Visualizer Data
      let analysis: AudioVisualizerData = { bass: 0, mid: 0, high: 0, raw: new Uint8Array(0) };
      
      if (analyserRef.current && dataArrayRef.current && isPlaying) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          
          let bass = 0, mid = 0, high = 0;
          const bufferLength = dataArrayRef.current.length;
          
          for (let i = 0; i < bufferLength; i++) {
              const val = dataArrayRef.current[i] / 255.0;
              if (i < 5) bass += val;
              else if (i < 20) mid += val;
              else high += val;
          }
          bass /= 5;
          mid /= 15;
          high /= (bufferLength > 20 ? bufferLength - 20 : 1);

          analysis = {
              bass,
              mid,
              high,
              raw: dataArrayRef.current
          };
      }

      // 2. Draw Frame
      if (rendererRef.current) {
          rendererRef.current.drawFrame(time, analysis);
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    };

    if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(loop);
    } else {
        // Draw one static frame when paused to ensure updates on seek
        if (rendererRef.current) {
            // We pass zero energy or last energy? Zero is safer for paused state
            rendererRef.current.drawFrame(currentTime, { bass: 0, mid: 0, high: 0, raw: new Uint8Array(0) });
        }
    }

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying, renderStatus.state, audioUrl, duration, currentTime]); // Note: currentTime dep might cause restart, but since we rely on ref loop for active play, it's mostly for pause updates.

  // Effect to handle seeking redraw specifically when paused
  useEffect(() => {
     if (!isPlaying && rendererRef.current && renderStatus.state === 'idle') {
         rendererRef.current.drawFrame(currentTime, { bass: 0, mid: 0, high: 0, raw: new Uint8Array(0) });
     }
  }, [currentTime, isPlaying, renderStatus.state]);


  const togglePlay = () => {
    if (renderStatus.state !== 'idle') return;

    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        initAudioContext();
        audioRef.current.play().catch(e => console.error("Playback error:", e));
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (renderStatus.state !== 'idle') return;
    setCurrentTime(time);
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = time;
    }
  };

  const handleJsonUpload = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.segments) {
        setData(parsed);
        setCurrentTime(0);
        if(audioRef.current) audioRef.current.currentTime = 0;
        const lastSeg = parsed.segments[parsed.segments.length - 1];
        if (lastSeg && !audioUrl) setDuration(lastSeg.end + 5);
        setError(null);
      } else {
        throw new Error("Invalid JSON structure: missing 'segments'.");
      }
    } catch (err) {
      setError("Failed to parse JSON.");
    }
  };

  const handleAudioUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const analyzeAudioBuffer = async (audioBuffer: AudioBuffer, fps: number): Promise<AudioVisualizerData[]> => {
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const samplesPerFrame = Math.floor(sampleRate / fps);
      const totalFrames = Math.ceil(audioBuffer.duration * fps);
      
      const analysisFrames: AudioVisualizerData[] = [];

      for(let i=0; i<totalFrames; i++) {
          const startSample = i * samplesPerFrame;
          const endSample = Math.min(startSample + samplesPerFrame, channelData.length);
          
          let sumSq = 0;
          for(let j=startSample; j<endSample; j++) {
              sumSq += channelData[j] * channelData[j];
          }
          const rms = Math.sqrt(sumSq / (endSample - startSample)) * 10; 
          
          const bass = Math.min(1, rms);
          const mid = Math.min(1, rms * 0.8 + Math.random() * 0.2 * rms);
          const high = Math.min(1, rms * 0.6 + Math.random() * 0.3 * rms);

          const raw = new Uint8Array(64);
          for(let k=0; k<64; k++) {
              const value = (rms * 255) * (1 - k/64);
              raw[k] = Math.min(255, value * (0.8 + Math.random()*0.4));
          }

          analysisFrames.push({ bass, mid, high, raw });
      }

      return analysisFrames;
  };

  const startRendering = async () => {
    if (!rendererRef.current?.canvas || !audioUrl) {
        setError("Audio required for rendering.");
        return;
    }

    try {
        setRenderStatus({ state: 'analyzing', progress: 0 });
        setIsPlaying(false);
        if(audioRef.current) audioRef.current.pause();

        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const FPS = 30; 
        const analysisData = await analyzeAudioBuffer(audioBuffer, FPS);

        setRenderStatus({ state: 'rendering', progress: 0, totalFrames: analysisData.length });

        const muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: {
                codec: 'V_VP9',
                width: 1920,
                height: 1080,
                frameRate: FPS
            },
            audio: {
                codec: 'A_OPUS',
                numberOfChannels: audioBuffer.numberOfChannels,
                sampleRate: audioBuffer.sampleRate
            }
        });

        const videoEncoder = new VideoEncoder({
            output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
            error: (e: any) => console.error(e)
        });

        videoEncoder.configure({
            codec: 'vp09.00.10.08',
            width: 1920,
            height: 1080,
            bitrate: 10_000_000
        });
        
        const audioEncoder = new AudioEncoder({
            output: (chunk: any, meta: any) => muxer.addAudioChunk(chunk, meta),
            error: (e: any) => console.error(e)
        });
        audioEncoder.configure({
            codec: 'opus',
            numberOfChannels: audioBuffer.numberOfChannels,
            sampleRate: audioBuffer.sampleRate,
            bitrate: 128000
        });

        const numberOfChannels = audioBuffer.numberOfChannels;
        const totalSamples = audioBuffer.length;
        const chunkSize = 1024 * 64; 
        
        for (let offset = 0; offset < totalSamples; offset += chunkSize) {
            const size = Math.min(chunkSize, totalSamples - offset);
            const destBuffer = new Float32Array(size * numberOfChannels);
            for(let ch=0; ch<numberOfChannels; ch++) {
                const chData = audioBuffer.getChannelData(ch);
                for(let i=0; i<size; i++) {
                    destBuffer[ch * size + i] = chData[offset + i];
                }
            }
            
            const audioData = new AudioData({
                format: 'f32-planar',
                sampleRate: audioBuffer.sampleRate,
                numberOfFrames: size,
                numberOfChannels: numberOfChannels,
                timestamp: (offset / audioBuffer.sampleRate) * 1_000_000, 
                data: destBuffer
            });
            
            audioEncoder.encode(audioData);
            audioData.close();
        }

        const totalFrames = analysisData.length;
        
        for (let i = 0; i < totalFrames; i++) {
            const time = i / FPS;
            const frameData = analysisData[i];
            
            rendererRef.current.drawFrame(time, frameData);
            
            await new Promise(r => setTimeout(r, 0));

            const frame = new VideoFrame(rendererRef.current.canvas, {
                timestamp: time * 1_000_000 
            });

            videoEncoder.encode(frame, { keyFrame: i % 150 === 0 });
            frame.close();

            if (i % 10 === 0) {
                setRenderStatus(prev => ({ ...prev, progress: Math.round((i / totalFrames) * 100) }));
                await new Promise(r => setTimeout(r, 0)); 
            }
        }

        await videoEncoder.flush();
        await audioEncoder.flush();
        muxer.finalize();

        const { buffer } = muxer.target;
        const blob = new Blob([buffer], { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kinetic-lyrics-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);

        setRenderStatus({ state: 'idle', progress: 0 });
        videoEncoder.close();
        audioEncoder.close();

    } catch (e: any) {
        console.error(e);
        setError(`Rendering Failed: ${e.message}. Ensure you are on a modern browser (Chrome/Edge/Desktop).`);
        setRenderStatus({ state: 'idle', progress: 0 });
    }
  };

  const isProcessing = renderStatus.state !== 'idle';

  return (
    <div className="bg-black min-h-screen text-white overflow-hidden flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        crossOrigin="anonymous"
      />

      <div className="relative flex-1 flex flex-col items-center justify-center bg-[#050505]">
        
        <div className="z-10 w-full h-full max-w-7xl mx-auto px-4 pb-32 pt-10 flex flex-col items-center justify-center">
          
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/80 border border-red-500 text-red-100 px-4 py-2 rounded-lg flex items-center gap-2 z-50">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!audioUrl && currentTime === 0 && !isPlaying && !isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="text-center p-8 border border-white/10 bg-black/40 backdrop-blur-sm rounded-2xl pointer-events-auto">
                 <UploadCloud className="w-12 h-12 mx-auto mb-4 text-cyan-500 opacity-80" />
                 <h2 className="text-2xl font-bold mb-2">Ready to Render</h2>
                 <p className="text-gray-400 max-w-md">
                   Upload your JSON & Audio.<br/>
                   Click <span className="text-cyan-400 font-bold">Render Video</span> for high-quality export.
                 </p>
              </div>
            </div>
          )}

          {isProcessing && (
             <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="w-64">
                    <div className="flex justify-between text-sm mb-2 text-cyan-400 font-bold uppercase tracking-widest">
                        <span>{renderStatus.state}</span>
                        <span>{renderStatus.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                           className="h-full bg-cyan-500 transition-all duration-300"
                           style={{ width: `${renderStatus.progress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4 text-center">
                        Generating Frame-by-Frame (WebM)
                    </p>
                </div>
             </div>
          )}

          <div className="relative w-full aspect-video shadow-2xl border border-white/5 rounded-lg overflow-hidden bg-black">
              <CanvasVideoRenderer 
                  ref={rendererRef}
                  data={data} 
              />
          </div>

        </div>
      </div>

      <Controls 
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onJsonUpload={handleJsonUpload}
        onAudioUpload={handleAudioUpload}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        onRender={startRendering}
        isRendering={isProcessing}
      />
    </div>
  );
}
