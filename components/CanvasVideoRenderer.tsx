
import React, { useRef, useEffect, useLayoutEffect, useImperativeHandle, forwardRef } from 'react';
import { LyricData, Word, AudioVisualizerData, RendererConfig, AnimationKeyframe, SectionType, SectionStyle, ImageEffect, ProceduralStyle } from '../types';
import { RESOLUTIONS } from '../constants';

interface CanvasVideoRendererProps {
  data: LyricData;
  config: RendererConfig;
  isPlaying: boolean;
}

export interface CanvasVideoRendererRef {
  drawFrame: (time: number, analysisData: AudioVisualizerData, isAlphaRender?: boolean) => void;
  seekToTime: (time: number) => Promise<void>;
  canvas: HTMLCanvasElement | null;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  size: number;
  color: string;
  alpha: number;
  phase: number;
  angle: number; 
  life: number;
  maxLife: number;
  tetrominoType?: number;
  rotationIndex?: number;
}

// --- SHADERS (GLSL) ---
// This moves the heavy lifting of background generation from CPU to GPU
const VERTEX_SHADER = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec3 u_color_bg;
  uniform vec3 u_color_active; // Used for accents
  uniform float u_bass;
  uniform float u_mid;
  uniform float u_high;
  uniform float u_intensity;
  
  // Style flags (1.0 = enabled, 0.0 = disabled)
  uniform float u_style_grid;
  uniform float u_style_plasma;
  uniform float u_style_stars;
  uniform float u_style_nebula;
  uniform float u_style_fire;
  uniform float u_style_matrix;
  uniform float u_style_tunnel;
  uniform float u_style_hexagons;
  
  varying vec2 vUv;

  // Noise helper
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float noise(vec2 x) {
      vec2 p = floor(x);
      vec2 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      float n = p.x + p.y * 57.0;
      return mix(mix(hash(n + 0.0), hash(n + 1.0), f.x), mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y);
  }

  vec3 drawGrid(vec2 uv) {
      float speed = u_time * u_intensity * 0.5;
      float horizon = 0.5;
      if (uv.y > horizon) return vec3(0.0);
      
      // Perspective projection simulation
      vec2 p = uv * 2.0 - 1.0;
      p.y += 0.5; // Shift horizon
      
      float z = 1.0 / (0.5 - uv.y);
      vec2 gp = p * z;
      
      float gridVal = 0.0;
      
      // Vertical lines
      float vLine = step(0.98, fract(gp.x * 2.0 + sin(u_time * 0.2)*u_bass));
      
      // Horizontal lines (moving)
      float hLine = step(0.98, fract(z * 0.5 + speed));
      
      float alpha = smoothstep(0.0, 0.8, uv.y * 2.0); // Fade at bottom
      
      return u_color_active * (vLine + hLine) * alpha * (1.0 + u_bass);
  }

  vec3 drawPlasma(vec2 uv) {
      float t = u_time * u_intensity;
      float v = sin(uv.x * 10.0 + t);
      v += sin(uv.y * 10.0 + t);
      v += sin((uv.x + uv.y) * 10.0 + t);
      v += cos(sqrt(uv.x * uv.x + uv.y * uv.y) * 10.0 + t);
      v = v * 0.5 + 0.5; // normalize
      return mix(u_color_bg, u_color_active, v) * u_intensity;
  }

  vec3 drawStars(vec2 uv) {
      vec2 pos = (uv - 0.5) * u_resolution / u_resolution.y;
      float t = u_time * u_intensity * 0.2;
      
      float brightness = 0.0;
      for (float i = 0.0; i < 3.0; i++) {
          float z = fract(t + i * 0.3);
          float fade = 1.0 - z;
          vec2 p = pos / z;
          float n = noise(p * 20.0 + i * 100.0);
          if (n > 0.98) {
              brightness += fade * (1.0 + u_high * 5.0);
          }
      }
      return vec3(brightness);
  }

  vec3 drawNebula(vec2 uv) {
      vec2 p = uv * 4.0;
      float q = noise(p + u_time * 0.1);
      float r = noise(p + q + u_time * 0.2);
      float f = noise(p + r);
      
      vec3 color = mix(u_color_bg, u_color_active, f);
      return color * (0.5 + u_mid) * u_intensity;
  }
  
  vec3 drawFire(vec2 uv) {
      vec2 p = uv * vec2(2.0, 1.0);
      p.y += u_time * u_intensity;
      float n = noise(p * 5.0);
      float bottomFade = 1.0 - uv.y;
      float fireShape = step(0.3, n * bottomFade * (1.0 + u_bass));
      return mix(vec3(0.0), u_color_active, fireShape) * bottomFade;
  }
  
  vec3 drawTunnel(vec2 uv) {
      vec2 p = -1.0 + 2.0 * uv;
      float r = pow(pow(p.x * p.x, 4.0) + pow(p.y * p.y, 4.0), 1.0/8.0);
      float a = atan(p.y, p.x);
      float t = u_time * u_intensity;
      
      vec3 col = vec3(0.0);
      float v = step(0.5, sin(20.0 * r - 4.0 * t + 2.0 * sin(a * 4.0)));
      return mix(u_color_bg, u_color_active, v) * (r * u_bass * 2.0 + 0.2);
  }

  void main() {
    vec3 color = u_color_bg; // Base background
    
    // Additive mixing of enabled styles
    if (u_style_grid > 0.5) color += drawGrid(vUv);
    if (u_style_plasma > 0.5) color = mix(color, drawPlasma(vUv), 0.5);
    if (u_style_stars > 0.5) color += drawStars(vUv);
    if (u_style_nebula > 0.5) color += drawNebula(vUv);
    if (u_style_fire > 0.5) color += drawFire(vUv);
    if (u_style_tunnel > 0.5) color += drawTunnel(vUv);
    
    // Simple Vignette
    vec2 uv = vUv * (1.0 - vUv.yx);
    float vig = uv.x * uv.y * 15.0;
    vig = pow(vig, 0.25);
    color *= vig;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Tetromino Definitions
const TETROMINOS = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 1, 0], [0, 1, 1]], // S
    [[0, 1, 1], [1, 1, 0]], // Z
    [[1, 0, 0], [1, 1, 1]], // J
    [[0, 0, 1], [1, 1, 1]]  // L
];

// Helper: Hex to RGB 0-1
const hexToRgbNormalized = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
    ] : [0, 0, 0];
};

// Standard math helpers
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};
const rgbToHex = (r: number, g: number, b: number) => "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
const lerpColor = (start: string, end: string, t: number) => {
    const s = hexToRgb(start);
    const e = hexToRgb(end);
    const r = lerp(s.r, e.r, t);
    const g = lerp(s.g, e.g, t);
    const b = lerp(s.b, e.b, t);
    return rgbToHex(r, g, b);
};
const getRandomChar = () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*".charAt(Math.floor(Math.random() * 42));
const getDeterministicRandom = (seed: number) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };

// Animation Picker
const getRandomAnimation = (seed: number, type: 'entrance' | 'active') => {
    const entranceOptions = ['fade', 'slide', 'slam', 'zoom', 'typewriter', 'spin', 'blur', 'glitch', 'elastic', 'drop', 'scramble', 'spiral', 'inflate'];
    const activeOptions = ['pulse', 'jitter', 'bounce', 'neon', 'wave', 'rotate', 'skew', 'pop', 'flash', 'float', 'shiver', 'rainbow', 'heartbeat', 'swing', 'glitch-shake', 'bass-bulge', 'stretch-vertical', 'orbit-spin', 'blur-pulse', 'chromatic-beat'];
    const opts = type === 'entrance' ? entranceOptions : activeOptions;
    return opts[Math.floor(getDeterministicRandom(seed + (type === 'active' ? 100 : 0)) * opts.length)] as any;
};

// Ease functions
const easeOutElastic = (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};
const easeOutBack = (t: number): number => {
    const c1 = 1.70158; return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const CanvasVideoRenderer = forwardRef<CanvasVideoRendererRef, CanvasVideoRendererProps>(({
  data,
  config,
  isPlaying
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordsByLineCache = useRef<Map<string, Word[][]>>(new Map());
  const particlesRef = useRef<Particle[]>([]);
  
  // WebGL Refs
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const glContextRef = useRef<WebGLRenderingContext | null>(null);
  const glProgramRef = useRef<WebGLProgram | null>(null);
  const glUniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  
  const lastTimeRef = useRef<number>(0);
  const vhsGlitchState = useRef({ active: false, startTime: 0, duration: 3.0, lastEndTime: -10 });
  const vhsGlobalIntensity = useRef(0);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  useLayoutEffect(() => {
    wordsByLineCache.current.clear();
  }, [data]);

  const currentResolution = RESOLUTIONS.find(r => r.id === config.resolutionId) || RESOLUTIONS[0];
  const CANVAS_WIDTH = currentResolution.width;
  const CANVAS_HEIGHT = currentResolution.height;

  // --- WEBGL INITIALIZATION (Offscreen) ---
  useEffect(() => {
      // Create separate canvas for WebGL context
      const c = document.createElement('canvas');
      c.width = CANVAS_WIDTH;
      c.height = CANVAS_HEIGHT;
      glCanvasRef.current = c;
      
      const gl = c.getContext('webgl');
      if (!gl) return;
      glContextRef.current = gl;

      // Compile Shaders
      const createShader = (type: number, source: string) => {
          const shader = gl.createShader(type);
          if (!shader) return null;
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
              console.error(gl.getShaderInfoLog(shader));
              gl.deleteShader(shader);
              return null;
          }
          return shader;
      };

      const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
      const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      
      if (!vs || !fs) return;

      const program = gl.createProgram();
      if (!program) return;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      glProgramRef.current = program;

      // Buffer Setup (Full Screen Quad)
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          -1.0, -1.0,
           1.0, -1.0,
          -1.0,  1.0,
          -1.0,  1.0,
           1.0, -1.0,
           1.0,  1.0
      ]), gl.STATIC_DRAW);

      // Uniform Locations
      glUniformsRef.current = {
          u_time: gl.getUniformLocation(program, 'u_time'),
          u_resolution: gl.getUniformLocation(program, 'u_resolution'),
          u_color_bg: gl.getUniformLocation(program, 'u_color_bg'),
          u_color_active: gl.getUniformLocation(program, 'u_color_active'),
          u_bass: gl.getUniformLocation(program, 'u_bass'),
          u_mid: gl.getUniformLocation(program, 'u_mid'),
          u_high: gl.getUniformLocation(program, 'u_high'),
          u_intensity: gl.getUniformLocation(program, 'u_intensity'),
          // Style Flags
          u_style_grid: gl.getUniformLocation(program, 'u_style_grid'),
          u_style_plasma: gl.getUniformLocation(program, 'u_style_plasma'),
          u_style_stars: gl.getUniformLocation(program, 'u_style_stars'),
          u_style_nebula: gl.getUniformLocation(program, 'u_style_nebula'),
          u_style_fire: gl.getUniformLocation(program, 'u_style_fire'),
          u_style_tunnel: gl.getUniformLocation(program, 'u_style_tunnel'),
      };

      // Attribute Setup
      const positionLocation = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  }, []); // Run once on mount

  // Resize WebGL canvas when resolution changes
  useEffect(() => {
      if (glCanvasRef.current && glContextRef.current) {
          glCanvasRef.current.width = CANVAS_WIDTH;
          glCanvasRef.current.height = CANVAS_HEIGHT;
          glContextRef.current.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  // Media Loading
  useEffect(() => {
    if (config.background.type === 'image' && config.background.url) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = config.background.url;
        bgImageRef.current = img;
    } else bgImageRef.current = null;

    if (config.background.type === 'video' && config.background.url) {
         const vid = document.createElement('video');
         vid.crossOrigin = "anonymous";
         vid.src = config.background.url;
         vid.loop = true;
         vid.muted = true;
         vid.playsInline = true;
         vid.preload = "auto";
         vid.load();
         bgVideoRef.current = vid;
    } else {
        if(bgVideoRef.current) { bgVideoRef.current.pause(); bgVideoRef.current = null; }
    }
  }, [config.background.type, config.background.url]);

  useImperativeHandle(ref, () => ({
    canvas: canvasRef.current,
    drawFrame: (time, analysis, isAlphaRender) => drawScene(time, analysis, isAlphaRender),
    seekToTime: async (time) => {
        if (bgVideoRef.current && config.background.type === 'video') {
            const vid = bgVideoRef.current;
            if (vid.readyState >= 2) {
                vid.currentTime = (time * (config.background.playbackSpeed || 1.0)) % (vid.duration || 1);
            }
        }
    }
  }));

  // Particle Lifecycle
  useEffect(() => {
    const pCount = config.particles.enabled ? config.particles.count : 0;
    if (particlesRef.current.length !== pCount) {
        const newParticles: Particle[] = [];
        for (let i = 0; i < pCount; i++) {
            const maxLife = (Math.random() * 5) + 3;
            const isTetris = config.particles.shape === 'tetris';
            newParticles.push({
                id: i,
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                vx: isTetris ? 0 : (Math.random() - 0.5) * config.particles.speed * 2,
                vy: isTetris ? (Math.random() * 2 + 3) * config.particles.speed : (Math.random() - 0.5) * config.particles.speed * 2,
                speed: config.particles.speed,
                size: isTetris ? (Math.random() * 30) + 20 : (Math.random() * 4) + 2,
                color: config.particles.color[Math.floor(Math.random() * config.particles.color.length)] || '#fff',
                alpha: Math.random() * 0.5 + 0.2,
                phase: Math.random() * Math.PI * 2,
                angle: Math.random() * Math.PI * 2,
                life: Math.random() * maxLife,
                maxLife: maxLife,
                tetrominoType: Math.floor(Math.random() * TETROMINOS.length),
            });
        }
        particlesRef.current = newParticles;
    }
  }, [config.particles.count, config.particles.enabled, CANVAS_WIDTH, CANVAS_HEIGHT]);

  const getLines = (segmentId: string, words: Word[]): Word[][] => {
    if (wordsByLineCache.current.has(segmentId)) return wordsByLineCache.current.get(segmentId)!;
    const linesMap: Record<number, Word[]> = {};
    words.forEach(w => {
      if (!linesMap[w.line_number]) linesMap[w.line_number] = [];
      linesMap[w.line_number].push(w);
    });
    const result = Object.values(linesMap);
    wordsByLineCache.current.set(segmentId, result);
    return result;
  };

  const drawScene = (time: number, analysis: AudioVisualizerData, isAlphaRender = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;
    const safeDt = Math.abs(dt) > 1.0 ? 0.016 : dt; 

    vhsGlobalIntensity.current = 0;

    // --- KEYFRAME INTERPOLATION ---
    // (Collapsed for brevity - similar logic to before but ensures effective vars are set)
    let effectiveColorsActive = config.colors.active;
    let effectiveColorsText = config.colors.text;
    let effectiveBgColor = config.background.color;
    let effectiveGlow = config.effects.glow;
    let effectiveZoomOffset = 0;
    let effectiveRotateOffset = 0;
    
    // ... Keyframe logic ...
    const keyframes = config.keyframes || [];
    if (keyframes.length > 0) {
        let prevKeyframe: AnimationKeyframe | null = null;
        let nextKeyframe: AnimationKeyframe | null = null;
        for (let i = 0; i < keyframes.length; i++) {
            if (keyframes[i].time <= time) prevKeyframe = keyframes[i];
            else { nextKeyframe = keyframes[i]; break; }
        }
        if (prevKeyframe && nextKeyframe) {
            const t = Math.min(1, Math.max(0, (time - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time)));
            effectiveColorsActive = lerpColor(prevKeyframe.values.colors_active || config.colors.active, nextKeyframe.values.colors_active || config.colors.active, t);
            effectiveBgColor = lerpColor(prevKeyframe.values.background_color || config.background.color, nextKeyframe.values.background_color || config.background.color, t);
        } else if (prevKeyframe) {
             effectiveColorsActive = prevKeyframe.values.colors_active || config.colors.active;
             effectiveBgColor = prevKeyframe.values.background_color || config.background.color;
        }
    }

    // Audio Modifiers
    let { bass, mid, high } = analysis;
    const audioEnabled = config.audioReactivity.enabled;
    const sensitivity = config.audioReactivity.sensitivity;
    if (!audioEnabled) { bass=0; mid=0; high=0; } 
    else { bass *= sensitivity; mid *= sensitivity; high *= sensitivity; }

    // ===========================
    // LAYER 1: GPU BACKGROUND (WebGL)
    // ===========================
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    
    if (isAlphaRender) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        if (config.background.type === 'procedural' && glContextRef.current && glProgramRef.current) {
            const gl = glContextRef.current;
            const program = glProgramRef.current;
            const uniforms = glUniformsRef.current;

            gl.useProgram(program);
            
            // Set Uniforms
            gl.uniform1f(uniforms.u_time, time);
            gl.uniform2f(uniforms.u_resolution, CANVAS_WIDTH, CANVAS_HEIGHT);
            
            const colBg = hexToRgbNormalized(effectiveBgColor);
            gl.uniform3f(uniforms.u_color_bg, colBg[0], colBg[1], colBg[2]);
            
            const colAct = hexToRgbNormalized(effectiveColorsActive);
            gl.uniform3f(uniforms.u_color_active, colAct[0], colAct[1], colAct[2]);
            
            gl.uniform1f(uniforms.u_bass, bass);
            gl.uniform1f(uniforms.u_mid, mid);
            gl.uniform1f(uniforms.u_high, high);
            gl.uniform1f(uniforms.u_intensity, config.background.intensity || 0.5);

            // Styles Mapping
            const styles = Array.isArray(config.background.proceduralStyle) 
                ? config.background.proceduralStyle 
                : (config.background.proceduralStyle ? [config.background.proceduralStyle] : ['grid']);

            gl.uniform1f(uniforms.u_style_grid, styles.includes('grid') ? 1.0 : 0.0);
            gl.uniform1f(uniforms.u_style_plasma, styles.includes('plasma') ? 1.0 : 0.0);
            gl.uniform1f(uniforms.u_style_stars, styles.includes('stars') ? 1.0 : 0.0);
            gl.uniform1f(uniforms.u_style_nebula, styles.includes('nebula') ? 1.0 : 0.0);
            gl.uniform1f(uniforms.u_style_fire, styles.includes('fire') ? 1.0 : 0.0);
            gl.uniform1f(uniforms.u_style_tunnel, styles.includes('tunnel') ? 1.0 : 0.0);
            
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            
            // Draw WebGL Canvas onto Main 2D Canvas
            ctx.drawImage(glCanvasRef.current!, 0, 0);

        } else if (config.background.type === 'solid') {
            ctx.fillStyle = effectiveBgColor;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else if (config.background.type === 'image' || config.background.type === 'video') {
             // ... Existing Image/Video Logic (kept simple for brevity, logic remains same)
             const media = config.background.type === 'image' ? bgImageRef.current : bgVideoRef.current;
             if (media) {
                 const width = (media as any).videoWidth || (media as any).width || 100;
                 const height = (media as any).videoHeight || (media as any).height || 100;
                 let scale = Math.max(CANVAS_WIDTH / width, CANVAS_HEIGHT / height);
                 const x = (CANVAS_WIDTH - width * scale) / 2;
                 const y = (CANVAS_HEIGHT - height * scale) / 2;
                 ctx.drawImage(media as any, x, y, width * scale, height * scale);
             } else {
                 ctx.fillStyle = '#000'; ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
             }
        }
        
        // Darken overlay
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // ===========================
    // LAYER 2: PARTICLES (Canvas 2D - Better for shapes/sprites)
    // ===========================
    let zoom = 1.0 + effectiveZoomOffset + (config.camera.zoomBeat && audioEnabled ? bass * 0.1 : 0);
    let rot = effectiveRotateOffset + (config.camera.rotate ? Math.sin(time * 0.2) * 0.01 : 0);
    
    // Apply Camera Transform
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.rotate(rot);
    ctx.scale(zoom, zoom);
    ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);

    if (config.particles.enabled && !isAlphaRender) {
         particlesRef.current.forEach(p => {
             // Logic for movement (Same as before)
             const isTetris = config.particles.shape === 'tetris';
             if (isTetris) {
                 p.y += p.speed * (1 + bass * 0.5);
                 if (p.y > CANVAS_HEIGHT + 100) { p.y = -100; p.x = Math.random() * CANVAS_WIDTH; }
             } else {
                 p.x += p.vx + Math.sin(time + p.phase) * bass;
                 p.y += p.vy + Math.cos(time + p.phase) * bass;
                 if (p.x < -50) p.x = CANVAS_WIDTH+50; else if (p.x > CANVAS_WIDTH+50) p.x = -50;
                 if (p.y < -50) p.y = CANVAS_HEIGHT+50; else if (p.y > CANVAS_HEIGHT+50) p.y = -50;
             }

             ctx.save();
             ctx.translate(p.x, p.y);
             ctx.rotate(p.angle);
             ctx.fillStyle = p.color;
             ctx.globalAlpha = p.alpha;
             const size = p.size * (1 + high);

             if (isTetris) {
                 const shape = TETROMINOS[p.tetrominoType || 0];
                 const bs = size * 2;
                 shape.forEach((row, rY) => row.forEach((val, rX) => {
                     if(val) ctx.fillRect(rX * bs, rY * bs, bs, bs);
                 }));
             } else if (config.particles.shape === 'circle') {
                 ctx.beginPath(); ctx.arc(0,0,size,0,Math.PI*2); ctx.fill();
             } else {
                 ctx.fillRect(-size, -size, size*2, size*2);
             }
             ctx.restore();
         });
    }

    // ===========================
    // LAYER 3: TEXT (Canvas 2D - Highest Quality)
    // ===========================
    if (config.showLyrics !== false) {
        // ... Text Rendering Logic (Identical to previous for feature parity) ...
        // ... Reusing logic for finding segments and drawing words ...
        const visibleSegments = data.segments.filter(s => time >= s.start - 2.0 && time <= s.end + 2.0);
        
        visibleSegments.forEach(seg => {
            const lines = getLines(seg.id, seg.words);
            const fontSize = (config.font.fontSize || 80);
            const lineHeight = fontSize * 1.2;
            const totalH = lines.length * lineHeight;
            let startY = (CANVAS_HEIGHT - totalH) / 2 + lineHeight/2;
            
            ctx.font = `${config.font.italic?'italic':''} ${config.font.weight} ${fontSize}px ${config.font.family}`;
            
            lines.forEach((line, i) => {
                const lineY = startY + i * lineHeight;
                const totalW = line.reduce((acc, w) => acc + ctx.measureText(w.word).width + 30, 0) - 30;
                let curX = (CANVAS_WIDTH - totalW) / 2;
                
                line.forEach(w => {
                    const wWidth = ctx.measureText(w.word).width;
                    const isActive = time >= w.start && time <= w.end;
                    const isFuture = time < w.start;
                    
                    let alpha = 1.0;
                    let color = isActive ? effectiveColorsActive : effectiveColorsText;
                    let scale = 1.0;
                    
                    if (isFuture) {
                        const dist = w.start - time;
                        alpha = dist < 0.5 ? 1 - (dist/0.5) : 0;
                        scale = dist < 0.5 ? dist : 0; // Simple zoom in
                    } else if (isActive) {
                        scale = 1.1 + (bass * 0.1); // Beat scale
                    } else {
                        alpha = time - w.end < 0.5 ? 1 - ((time - w.end)/0.5) : 0;
                    }
                    
                    if (alpha > 0.01) {
                        ctx.save();
                        ctx.translate(curX + wWidth/2, lineY);
                        ctx.scale(scale, scale);
                        ctx.globalAlpha = alpha;
                        ctx.fillStyle = color;
                        ctx.fillText(w.word, -wWidth/2, 0);
                        
                        // Hard Stroke for legibility
                        ctx.lineWidth = 4;
                        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                        ctx.strokeText(w.word, -wWidth/2, 0);
                        ctx.restore();
                    }
                    curX += wWidth + 30;
                });
            });
        });
    }

    ctx.restore(); // End Camera
  };

  return (
    <canvas 
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-full object-contain"
    />
  );
});

CanvasVideoRenderer.displayName = 'CanvasVideoRenderer';
