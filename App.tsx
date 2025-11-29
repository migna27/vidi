

import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_LYRICS, TEMPLATES } from './constants';
import { CanvasVideoRenderer, CanvasVideoRendererRef } from './components/CanvasVideoRenderer';
import { Controls } from './components/Controls';
import { SettingsPanel } from './components/SettingsPanel';
import { LyricData, RenderStatus, AudioVisualizerData, Segment, Word, RendererConfig } from './types';
// @ts-ignore
import { Muxer as WebMMuxer, ArrayBufferTarget as WebMArrayBufferTarget } from 'webm-muxer';
// @ts-ignore
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from 'mp4-muxer';

// Helper to parse SRT timestamp "00:00:12,345" or "00:00:12.345" to seconds
const parseSrtTimestamp = (timestamp: string): number => {
  if (!timestamp) return 0;
  // Normalize comma to dot and trim
  const normalized = timestamp.replace(',', '.').trim();
  const parts = normalized.split(':');
  
  if (parts.length < 3) return 0; 

  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]); // parseFloat handles "12.345" correctly

  return (hours * 3600) + (minutes * 60) + seconds;
};

// Helper to parse SRT string to LyricData
const parseSrtToLyricData = (srtContent: string): LyricData => {
  // Normalize line endings
  const normalizedContent = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalizedContent.trim().split(/\n\s*\n/);
  
  const segments: Segment[] = [];
  
  blocks.forEach((block, index) => {
    const lines = block.split('\n');
    if (lines.length < 2) return;

    // Find the timestamp line
    let timeLineIndex = lines.findIndex(l => l.includes('-->'));
    if (timeLineIndex === -1) return;

    const timeLine = lines[timeLineIndex];
    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
    
    const start = parseSrtTimestamp(startStr);
    const end = parseSrtTimestamp(endStr);
    
    if (isNaN(start) || isNaN(end)) return;

    // Get content lines, skipping timestamp and index lines
    const rawLines = lines.slice(timeLineIndex + 1);
    
    // Clean tags (like <i>, <b>, <font>) and empty lines
    const cleanLines = rawLines
        .map(l => l.replace(/<[^>]*>/g, '').trim())
        .filter(l => l.length > 0);

    if (cleanLines.length === 0) return;

    const text = cleanLines.join('\n');
    
    // Word calculation: Distribute time across all words in the block
    let totalWords = 0;
    cleanLines.forEach(l => totalWords += l.split(/\s+/).length);
    
    const duration = end - start;
    const timePerWord = totalWords > 0 ? duration / totalWords : 0;
    
    const words: Word[] = [];
    let currentTime = start;

    cleanLines.forEach((lineText, lineIdx) => {
        const lineWords = lineText.split(/\s+/);
        lineWords.forEach(w => {
            words.push({
                word: w,
                start: currentTime,
                end: currentTime + timePerWord,
                probability: 1.0,
                line_number: lineIdx // Preserve visual line structure from SRT
            });
            currentTime += timePerWord;
        });
    });

    segments.push({
      id: index.toString(),
      start,
      end,
      text,
      words
    });
  });

  return {
    createdAt: new Date().toISOString(),
    segments
  };
};

export default function App() {
  const [data, setData] = useState<LyricData>(DEFAULT_LYRICS);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'webm' | 'mp4'>('mp4');
  
  // Customization State
  const [rendererConfig, setRendererConfig] = useState<RendererConfig>(TEMPLATES[0]);
  const [showSettings, setShowSettings] = useState(false);

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
            rendererRef.current.drawFrame(currentTime, { bass: 0, mid: 0, high: 0, raw: new Uint8Array(0) });
        }
    }

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying, renderStatus.state, audioUrl, duration, currentTime, rendererConfig]); // Added rendererConfig dep

  // Effect to handle seeking redraw specifically when paused
  useEffect(() => {
     if (!isPlaying && rendererRef.current && renderStatus.state === 'idle') {
         rendererRef.current.drawFrame(currentTime, { bass: 0, mid: 0, high: 0, raw: new Uint8Array(0) });
     }
  }, [currentTime, isPlaying, renderStatus.state, rendererConfig]); // Added rendererConfig dep


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
      alert("Invalid JSON file");
    }
  };

  const handleSrtUpload = (srtStr: string) => {
    try {
      const lyricData = parseSrtToLyricData(srtStr);
      if (lyricData.segments.length > 0) {
        setData(lyricData);
        setCurrentTime(0);
        if (audioRef.current) audioRef.current.currentTime = 0;
        const lastSeg = lyricData.segments[lyricData.segments.length - 1];
        if (lastSeg && !audioUrl) setDuration(lastSeg.end + 5);
        setError(null);
      } else {
        throw new Error("No segments found in SRT.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to parse SRT.");
      alert("Invalid SRT file");
    }
  };

  const handleAudioUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.load();
    }
    setIsPlaying(false);
  };

  const startRendering = async () => {
    if (!audioUrl || !rendererRef.current || !data.segments.length) {
      alert("Please load audio and lyrics first.");
      return;
    }
    setIsPlaying(false);
    setRenderStatus({ state: 'analyzing', progress: 0 });

    try {
        // 1. Prepare Audio Buffer
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        // 2. Prepare Offline Context for Analysis (FFT)
        // We will extract FFT data frame-by-frame
        const offlineCtx = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        );
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        const analyser = offlineCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyser.connect(offlineCtx.destination);
        source.start(0);

        // 3. Setup Muxer & Encoders
        const width = 1920;
        const height = 1080;
        const fps = 30;
        const duration = audioBuffer.duration;
        const totalFrames = Math.floor(duration * fps);
        const frameInterval = 1 / fps;

        let muxer: any;
        let videoEncoder: VideoEncoder;
        let audioEncoder: any;

        // Configuration based on format
        const isMp4 = exportFormat === 'mp4';
        const videoCodec = isMp4 ? 'avc1.4d002a' : 'vp09.00.10.08'; 
        const audioCodec = isMp4 ? 'mp4a.40.2' : 'opus';
        
        if (isMp4) {
            muxer = new Mp4Muxer({
                target: new Mp4ArrayBufferTarget(),
                video: { codec: 'avc', width, height },
                audio: { codec: 'aac', numberOfChannels: audioBuffer.numberOfChannels, sampleRate: audioBuffer.sampleRate },
                fastStart: false
            });
        } else {
            muxer = new WebMMuxer({
                target: new WebMArrayBufferTarget(),
                video: { codec: 'V_VP9', width, height, frameRate: fps },
                audio: { codec: 'A_OPUS', numberOfChannels: audioBuffer.numberOfChannels, sampleRate: audioBuffer.sampleRate }
            });
        }

        videoEncoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => console.error("Video Encoder Error", e)
        });
        
        await videoEncoder.configure({
            codec: videoCodec,
            width,
            height,
            bitrate: 8_000_000, // 8 Mbps
            framerate: fps
        });

        // @ts-ignore
        audioEncoder = new AudioEncoder({
            output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
            error: (e) => console.error("Audio Encoder Error", e)
        });
        
        await audioEncoder.configure({
            codec: audioCodec,
            numberOfChannels: audioBuffer.numberOfChannels,
            sampleRate: audioBuffer.sampleRate,
            bitrate: 192_000
        });

        // 4. Encode Audio Track
        setRenderStatus({ state: 'encoding', progress: 0 });
        
        // Chunk and encode audio
        const numberOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        const sampleRate = audioBuffer.sampleRate;
        const chunkSize = sampleRate; // 1 second chunks

        for (let frameOffset = 0; frameOffset < length; frameOffset += chunkSize) {
            const currentChunkSize = Math.min(chunkSize, length - frameOffset);
            const dataBuffer = new Float32Array(currentChunkSize * numberOfChannels);
            
            // Interleave logic or Planar copy? AudioData 'f32-planar' expects channel planes
            let offset = 0;
            for (let c = 0; c < numberOfChannels; c++) {
                const channelData = audioBuffer.getChannelData(c);
                dataBuffer.set(channelData.slice(frameOffset, frameOffset + currentChunkSize), offset);
                offset += currentChunkSize;
            }
            
            // @ts-ignore
            const audioData = new AudioData({
                format: 'f32-planar',
                sampleRate,
                numberOfFrames: currentChunkSize,
                numberOfChannels,
                timestamp: (frameOffset / sampleRate) * 1e6,
                data: dataBuffer
            });
            
            audioEncoder.encode(audioData);
            audioData.close();
        }

        // 5. Render Video Frames with Synchronized Analysis
        setRenderStatus({ state: 'rendering', progress: 0 });
        
        const fftBuffer = new Uint8Array(analyser.frequencyBinCount);
        
        // We schedule suspends for every frame to grab FFT data
        for (let i = 0; i < totalFrames; i++) {
            const t = i * frameInterval;
            
            // Schedule a suspend at the exact frame time
            // The callbacks will be executed sequentially as the context renders
            offlineCtx.suspend(t).then(async () => {
                analyser.getByteFrequencyData(fftBuffer);
                
                // Calculate buckets
                 let bass = 0, mid = 0, high = 0;
                  const bLen = fftBuffer.length;
                  for (let k = 0; k < bLen; k++) {
                      const val = fftBuffer[k] / 255.0;
                      if (k < 5) bass += val;
                      else if (k < 20) mid += val;
                      else high += val;
                  }
                  bass /= 5;
                  mid /= 15;
                  high /= (bLen > 20 ? bLen - 20 : 1);

                  const analysis: AudioVisualizerData = {
                      bass,
                      mid,
                      high,
                      raw: fftBuffer
                  };

                  // Draw
                  if (rendererRef.current) {
                      rendererRef.current.drawFrame(t, analysis);
                      
                      // Encode Video Frame
                      const canvas = rendererRef.current.canvas;
                      if (canvas) {
                          const frame = new VideoFrame(canvas, { timestamp: t * 1e6 });
                          
                          // Keyframe every 2 seconds
                          const keyFrame = i % (fps * 2) === 0;
                          videoEncoder.encode(frame, { keyFrame });
                          frame.close();
                      }
                  }
                  
                  // Update Progress
                  setRenderStatus(prev => ({ ...prev, progress: (i / totalFrames) * 100 }));
                  
                  // Resume audio processing to proceed to next suspend
                  offlineCtx.resume();
            });
        }

        // Start the offline processing. This will trigger all the suspend callbacks in order.
        await offlineCtx.startRendering();
        
        // Flush encoders to finish pending frames
        await videoEncoder.flush();
        await audioEncoder.flush();
        
        // Finalize File
        muxer.finalize();

        const { buffer } = muxer.target;
        const blob = new Blob([buffer], { type: isMp4 ? 'video/mp4' : 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = isMp4 ? 'kinetic-lyrics.mp4' : 'kinetic-lyrics.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setRenderStatus({ state: 'done', progress: 100 });
        setTimeout(() => setRenderStatus({ state: 'idle', progress: 0 }), 2000);

    } catch (e) {
        console.error(e);
        setError("Rendering failed. See console.");
        setRenderStatus({ state: 'idle', progress: 0 });
    }
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden flex flex-col">
      <div className="flex-1 relative">
        <CanvasVideoRenderer ref={rendererRef} data={data} config={rendererConfig} isPlaying={isPlaying} />
        
        {/* Loading/Error Overlay */}
        {(renderStatus.state !== 'idle' || error) && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center flex-col gap-4 backdrop-blur-sm">
             {error ? (
                <div className="text-red-500 font-bold text-xl">{error}</div>
             ) : (
                <>
                  <div className="text-cyan-400 font-bold text-2xl animate-pulse">
                     {renderStatus.state === 'analyzing' && 'Analyzing Audio...'}
                     {renderStatus.state === 'encoding' && 'Encoding Audio...'}
                     {renderStatus.state === 'rendering' && `Rendering Video: ${Math.round(renderStatus.progress)}%`}
                     {renderStatus.state === 'done' && 'Download Ready!'}
                  </div>
                  <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${renderStatus.progress}%` }}
                    />
                  </div>
                </>
             )}
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <SettingsPanel 
             config={rendererConfig} 
             onUpdate={setRendererConfig} 
             onClose={() => setShowSettings(false)}
             currentTime={currentTime}
          />
        )}
      </div>

      <audio 
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={() => {
           if (audioRef.current && isPlaying) {
             setCurrentTime(audioRef.current.currentTime);
           }
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        className="hidden"
      />

      <Controls
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onJsonUpload={handleJsonUpload}
        onSrtUpload={handleSrtUpload}
        onAudioUpload={handleAudioUpload}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        onRender={startRendering}
        isRendering={renderStatus.state !== 'idle'}
        exportFormat={exportFormat}
        onExportFormatChange={setExportFormat}
        onOpenSettings={() => setShowSettings(true)}
      />
    </div>
  );
}
