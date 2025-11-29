import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_LYRICS } from './constants';
import { CanvasVideoRenderer } from './components/CanvasVideoRenderer';
import { Controls } from './components/Controls';
import { LyricData } from './types';
import { UploadCloud, AlertCircle } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<LyricData>(DEFAULT_LYRICS);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Rendering State
  const [isRendering, setIsRendering] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Initialize Audio Context
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
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

  useEffect(() => {
    let frameId: number;

    const tick = () => {
      if (audioRef.current) {
        // High precision sync
        if (!audioRef.current.paused) {
           setCurrentTime(audioRef.current.currentTime);
        } else if (!isRendering && isPlaying) {
             // Fallback if audio loaded but stuck? 
             // Or mostly for the "No Audio File" demo mode
             if(!audioUrl) {
               setCurrentTime(prev => {
                  const n = prev + 0.016; // ~60fps
                  if(n > duration) {
                    setIsPlaying(false);
                    return 0;
                  }
                  return n;
               });
             }
        }
      }
      
      if (isPlaying || isRendering) {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
       // Establish max duration for demo mode
       if(!audioUrl) {
           const lastSegment = data.segments[data.segments.length - 1];
           setDuration(lastSegment ? lastSegment.end + 5 : 60);
       }
       tick();
    }

    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, isRendering, audioUrl, data, duration]);

  const togglePlay = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        initAudioContext();
        audioRef.current.play().catch(e => console.error("Playback error:", e));
      }
    } else {
        // No audio file, just demo toggle
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
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

  // --- RENDER LOGIC ---
  const startRendering = () => {
    if (!canvasRef.current || !audioRef.current) return;
    
    // 1. Setup
    setIsRendering(true);
    setIsPlaying(true);
    setCurrentTime(0);
    audioRef.current.currentTime = 0;
    chunksRef.current = [];

    initAudioContext();
    
    // 2. Capture Streams
    const canvasStream = canvasRef.current.captureStream(60); // 60 FPS recording
    
    // Create a destination to mix audio into the recorder
    // We need to connect the source to a stream destination specifically for recording
    const audioCtx = audioContextRef.current!;
    const dest = audioCtx.createMediaStreamDestination();
    if(sourceRef.current) {
        sourceRef.current.connect(dest);
    }

    const mixedTracks = [
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
    ];
    
    const combinedStream = new MediaStream(mixedTracks);

    // 3. Setup Recorder
    // Prefer vp9/opus for webm
    let options = { mimeType: 'video/webm; codecs=vp9,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' }; // Fallback
    }

    const recorder = new MediaRecorder(combinedStream, options);
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `videolyrics-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      
      setIsRendering(false);
      setIsPlaying(false);
      
      // Cleanup: disconnect destination
      // sourceRef.current?.disconnect(dest); // Optional, but good practice
    };

    mediaRecorderRef.current = recorder;
    
    // 4. Start
    recorder.start();
    audioRef.current.play().catch(console.error);
    
    // 5. Auto stop logic is handled by onEnded in <audio> or manual calculation?
    // We'll rely on audio.onended to stop the recording.
  };

  const onAudioEnded = () => {
      if (isRendering && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          // Also pause the audio element just in case
          if(audioRef.current) audioRef.current.pause();
      } else {
          setIsPlaying(false);
      }
  };

  return (
    <div className="bg-black min-h-screen text-white overflow-hidden flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onEnded={onAudioEnded}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        crossOrigin="anonymous"
      />

      <div className="relative flex-1 flex flex-col items-center justify-center bg-[#050505]">
        
        {/* Content Container */}
        <div className="z-10 w-full h-full max-w-7xl mx-auto px-4 pb-32 pt-10 flex flex-col items-center justify-center">
          
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/80 border border-red-500 text-red-100 px-4 py-2 rounded-lg flex items-center gap-2 z-50">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!audioUrl && currentTime === 0 && !isPlaying && !isRendering && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="text-center p-8 border border-white/10 bg-black/40 backdrop-blur-sm rounded-2xl pointer-events-auto">
                 <UploadCloud className="w-12 h-12 mx-auto mb-4 text-cyan-500 opacity-80" />
                 <h2 className="text-2xl font-bold mb-2">Ready to Render</h2>
                 <p className="text-gray-400 max-w-md">
                   Upload your JSON & Audio, or play the demo. <br/>
                   Click <span className="text-cyan-400 font-bold">Render Video</span> to export a WebM.
                 </p>
              </div>
            </div>
          )}

          {/* Main Canvas Renderer */}
          <div className="relative w-full aspect-video shadow-2xl border border-white/5 rounded-lg overflow-hidden bg-black">
              {/* Overlay info while rendering */}
              {isRendering && (
                  <div className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      <span className="text-xs font-bold uppercase tracking-wider">Recording</span>
                  </div>
              )}
              
              <CanvasVideoRenderer 
                  data={data} 
                  currentTime={currentTime} 
                  analyser={analyserRef.current}
                  forwardedRef={canvasRef}
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
        isRendering={isRendering}
      />
    </div>
  );
}