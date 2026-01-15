

import React, { useRef, useEffect, useLayoutEffect, useImperativeHandle, forwardRef } from 'react';
import { LyricData, Word, AudioVisualizerData, RendererConfig, AnimationKeyframe, EventBlock, CustomEffect } from '../types';
import { RESOLUTIONS } from '../constants';

interface CanvasVideoRendererProps {
  data: LyricData;
  config: RendererConfig;
  isPlaying: boolean;
  eventBlocks?: EventBlock[];
  customEffects?: CustomEffect[]; // New prop for custom FX
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
const VERTEX_SHADER = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    // Flip Y for WebGL texture coordinates compatibility
    vUv.y = 1.0 - vUv.y; 
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_BASE = `
  precision mediump float;
  
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform sampler2D u_texture;
  uniform float u_use_texture;
  
  // Camera/Transform Uniforms
  uniform vec2 u_cam_offset;
  uniform float u_cam_zoom;
  uniform float u_cam_rotate;
  
  uniform vec3 u_color_bg;
  uniform vec3 u_color_active;
  uniform float u_bass;
  uniform float u_mid;
  uniform float u_high;
  uniform float u_intensity;
  uniform float u_speed; 
  
  // Flags
  uniform float u_style_grid;
  uniform float u_style_plasma;
  uniform float u_style_stars;
  uniform float u_style_matrix;
  
  // FX Intensities (0.0 to 1.0)
  uniform float u_fx_vhs;
  uniform float u_fx_glitch;
  uniform float u_fx_pixelate;
  uniform float u_fx_rgb_split;
  uniform float u_fx_chromatic;
  uniform float u_fx_thermal;
  uniform float u_fx_liquid;
  uniform float u_fx_mirror;
  uniform float u_fx_scanlines;
  uniform float u_fx_film_grain;
  uniform float u_fx_vignette;
  uniform float u_fx_barrel;
  uniform float u_fx_old_movie;
  uniform float u_fx_kaleidoscope;
  uniform float u_fx_halftone;
  uniform float u_fx_grayscale;
  uniform float u_fx_invert_beat;
  uniform float u_fx_sepia;
  
  varying vec2 vUv;

  // --- UTILS ---
  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }
  float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float luminance(vec3 col) {
      return dot(col, vec3(0.299, 0.587, 0.114));
  }

  // --- TRANSFORM FUNCTIONS ---
  
  vec2 applyCamera(vec2 uv) {
      vec2 p = uv - 0.5;
      float s = sin(u_cam_rotate);
      float c = cos(u_cam_rotate);
      p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
      p /= u_cam_zoom;
      p -= u_cam_offset;
      return p + 0.5;
  }

  // --- DISTORTION FUNCTIONS ---
  
  vec2 applyKaleidoscope(vec2 uv) {
      vec2 p = uv - 0.5;
      float r = length(p);
      float a = atan(p.y, p.x);
      float sides = 6.0;
      float tau = 6.28318;
      a = mod(a, tau/sides);
      a = abs(a - tau/sides/2.0);
      return r * vec2(cos(a), sin(a)) + 0.5;
  }

  vec2 applyBarrelDistortion(vec2 uv, float amount) {
      vec2 p = uv - 0.5;
      float d = length(p);
      float power = 0.5 * u_intensity * amount; // Scale by effect amount
      
      vec2 distorted = p * (1.0 + d * d * power);
      float zoom = 1.0 / (1.0 + 0.25 * power);
      return (distorted * zoom) + 0.5;
  }

  vec2 applyMirror(vec2 uv) {
      return vec2(abs(uv.x - 0.5) + 0.5, uv.y);
  }

  vec2 applyLiquid(vec2 uv, float amount) {
      float t = u_time * u_speed;
      float xOffset = sin(uv.y * 10.0 + t) * 0.02 * u_intensity * amount;
      float yOffset = cos(uv.x * 8.0 + t * 1.5) * 0.02 * u_intensity * amount;
      return uv + vec2(xOffset, yOffset);
  }

  vec2 applyGlitchUV(vec2 uv, float amount) {
      float t = floor(u_time * 15.0 * u_speed); 
      float block = noise(vec2(0.0, uv.y * 10.0 + t)); 
      float displacement = 0.0;
      if (block > 0.8) {
          displacement = (random(vec2(t, uv.y)) - 0.5) * 0.2 * u_intensity * amount * (1.0 + u_bass);
      }
      return vec2(uv.x + displacement, uv.y);
  }

  vec2 applyPixelate(vec2 uv, float amount) {
      // Logic: if amount is 0, pixels is HUGE (no pixelation). If amount is 1, pixels is small.
      // We map amount 0..1 to a scale factor.
      // Base pixels = 2000.0 (high res). Target pixels = 50.0 (low res).
      float pFactor = mix(2048.0, 32.0, amount);
      vec2 d = vec2(1.0 / pFactor, 1.0 / pFactor);
      return vec2(floor(uv.x / d.x) * d.x, floor(uv.y / d.y) * d.y);
  }
  
  vec2 applyVHSDistortion(vec2 uv, float amount) {
     float tracking = 0.0;
     if (uv.y < 0.1) tracking = sin(uv.y * 100.0 + u_time * 20.0) * 0.02 * u_intensity * amount;
     float jitter = 0.0;
     if (random(vec2(u_time, 0.0)) > 0.95) jitter = (random(vec2(u_time, 1.0)) - 0.5) * 0.01 * u_intensity * amount;
     return vec2(uv.x + tracking, uv.y + jitter);
  }

  // --- PROCEDURAL GENERATORS ---
  
  vec3 drawGrid(vec2 uv) {
      vec2 gridUV = uv * (10.0 + sin(u_time * 0.2)*5.0);
      vec2 grid = fract(gridUV);
      float line = step(0.95, max(grid.x, grid.y));
      return u_color_active * line * u_intensity;
  }
  
  vec3 drawPlasma(vec2 uv) {
      float t = u_time * u_speed;
      float v = sin(uv.x * 10.0 + t) + sin(uv.y * 10.0 + t) + sin((uv.x + uv.y) * 10.0 + t);
      v = v * 0.5 + 0.5;
      return mix(u_color_bg, u_color_active, v);
  }
  
  vec3 drawStars(vec2 uv) {
      float brightness = 0.0;
      float t = u_time * 0.1 * u_speed;
      for (float i=0.0; i<3.0; i++) {
         float z = fract(t + i*0.3);
         vec2 p = (uv - 0.5) * (1.0/z) + 0.5;
         float star = step(0.995, random(floor(p * 50.0)));
         brightness += star * (1.0 - z) * u_high;
      }
      return vec3(brightness);
  }

  vec3 drawMatrix(vec2 uv) {
      vec2 cell = floor(uv * 40.0);
      float r = random(cell);
      float drop = fract(r + u_time * u_speed);
      float trail = smoothstep(0.5, 1.0, drop); 
      return u_color_active * trail * u_intensity * step(0.5, random(cell + vec2(1.0)));
  }

  // --- POST-PROCESSING COLORS ---

  vec3 applyThermal(vec3 col) {
     float lum = luminance(col);
     vec3 heat = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 1.0, 0.0), smoothstep(0.0, 0.5, lum));
     heat = mix(heat, vec3(1.0, 0.0, 0.0), smoothstep(0.5, 1.0, lum));
     return heat;
  }

  vec3 applyScanlines(vec3 col, vec2 uv) {
     float count = u_resolution.y * 0.8;
     float sl = sin(uv.y * count + u_time * 10.0);
     return col * (0.9 + 0.1 * sl);
  }
  
  vec3 applyFilmGrain(vec3 col, vec2 uv) {
      float n = random(uv + mod(u_time, 10.0));
      // Use mix instead of add to make sure it's visible on white
      float amount = 0.15 * u_intensity;
      return mix(col, vec3(n), amount);
  }
  
  vec3 applyVHSColor(vec3 col, vec2 uv) {
      float lum = luminance(col);
      col = mix(col, vec3(lum), 0.3);
      float line = step(0.99, sin(uv.y * 5.0 + u_time * 10.0));
      col += line * 0.2;
      return col;
  }

  vec3 applyVignette(vec3 col, vec2 uv) {
      float dist = distance(uv, vec2(0.5));
      float vig = smoothstep(0.75, 0.2, dist);
      return col * vig;
  }

  vec3 applyOldMovie(vec3 col, vec2 uv) {
      vec3 sepia = vec3(1.2, 1.0, 0.8);
      float gray = luminance(col);
      vec3 final = vec3(gray) * sepia;
      float flicker = 0.9 + 0.1 * sin(u_time * 20.0);
      float scratch = 0.0;
      if (random(vec2(floor(u_time * 10.0), uv.x)) > 0.998) scratch = 1.0; 
      return final * flicker + scratch;
  }

  vec3 applyHalftone(vec3 col, vec2 uv) {
      float dots = 50.0; 
      vec2 center = floor(uv * dots) / dots + (0.5 / dots);
      float dist = distance(uv, center);
      float lum = luminance(col);
      // Dot radius depends on luminance
      float radius = (1.0 - lum) * (0.7 / dots);
      float pattern = step(radius, dist);
      return col * pattern;
  }
  
  vec3 applyInvertBeat(vec3 col) {
      // Invert if bass is kicking hard ( > 0.5)
      float invert = step(0.5, u_bass); 
      return mix(col, 1.0 - col, invert);
  }

  // --- CUSTOM SHADER INJECTION POINT ---
  // CUSTOM_FUNCTIONS_HERE

  void main() {
    vec2 uv = vUv;
    
    // --- 1. GLOBAL CAMERA TRANSFORM ---
    uv = applyCamera(uv);
    
    // --- 2. UV DISTORTION (Order Matters) ---
    // Note: For distortion, we mix UV coordinates if needed, or scale the distortion amount
    
    // Kaleidoscope: Just mix UVs if fading
    if (u_fx_kaleidoscope > 0.0) {
        uv = mix(uv, applyKaleidoscope(uv), u_fx_kaleidoscope); 
    }
    
    if (u_fx_barrel > 0.0) uv = applyBarrelDistortion(uv, u_fx_barrel);
    
    // Mirror: Mix UVs
    if (u_fx_mirror > 0.0) {
        uv = mix(uv, applyMirror(uv), u_fx_mirror);
    }
    
    if (u_fx_liquid > 0.0) uv = applyLiquid(uv, u_fx_liquid);
    if (u_fx_glitch > 0.0) uv = applyGlitchUV(uv, u_fx_glitch);
    if (u_fx_vhs > 0.0) uv = applyVHSDistortion(uv, u_fx_vhs);
    
    // Pixelate: We use the uniform to control pixel count inside the function
    if (u_fx_pixelate > 0.0) uv = applyPixelate(uv, u_fx_pixelate);

    vec3 color = vec3(0.0);

    // --- 3. SAMPLING / GENERATION ---
    if (u_use_texture > 0.5) {
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            color = u_color_bg * 0.1; 
        } else {
            // CHROMATIC ABERRATION (Reactive vs Static)
            float shift = 0.0;
            
            // Reactive CA (distance based * bass)
            if (u_fx_chromatic > 0.0) {
                float dist = distance(uv, vec2(0.5));
                shift += dist * 0.05 * u_bass * u_intensity * u_fx_chromatic;
            }
            
            // Static RGB Split or VHS
            float rgbAmount = max(u_fx_rgb_split, u_fx_vhs);
            if (rgbAmount > 0.0) {
                shift += 0.005 * u_intensity * rgbAmount;
                if (u_fx_vhs > 0.0) shift += 0.003 * u_fx_vhs;
            }
            
            if (shift > 0.0001) {
                float r = texture2D(u_texture, uv + vec2(shift, 0.0)).r;
                float g = texture2D(u_texture, uv).g;
                float b = texture2D(u_texture, uv - vec2(shift, 0.0)).b;
                color = vec3(r, g, b);
            } else {
                color = texture2D(u_texture, uv).rgb;
            }
        }
    } else {
        color = u_color_bg;
        if (u_style_grid > 0.5) color += drawGrid(uv);
        if (u_style_plasma > 0.5) color = mix(color, drawPlasma(uv), 0.5);
        if (u_style_stars > 0.5) color += drawStars(uv);
        if (u_style_matrix > 0.5) color += drawMatrix(uv);
        color *= (0.5 + u_intensity);
    }

    // --- 4. COLOR FX (Using Mix for smooth transitions) ---
    if (u_fx_thermal > 0.0) color = mix(color, applyThermal(color), u_fx_thermal);
    if (u_fx_old_movie > 0.0) color = mix(color, applyOldMovie(color, uv), u_fx_old_movie);
    if (u_fx_halftone > 0.0) color = mix(color, applyHalftone(color, uv), u_fx_halftone);
    
    if (u_fx_scanlines > 0.0) color = mix(color, applyScanlines(color, uv), u_fx_scanlines);
    if (u_fx_film_grain > 0.0) color = mix(color, applyFilmGrain(color, uv), u_fx_film_grain);
    if (u_fx_vhs > 0.0) color = mix(color, applyVHSColor(color, uv), u_fx_vhs);
    
    if (u_fx_invert_beat > 0.0) color = mix(color, applyInvertBeat(color), u_fx_invert_beat);
    
    if (u_fx_grayscale > 0.0) color = mix(color, vec3(luminance(color)), u_fx_grayscale);
    if (u_fx_sepia > 0.0) color = mix(color, vec3(luminance(color)) * vec3(1.2, 1.0, 0.8), u_fx_sepia);
    
    if (u_fx_vignette > 0.0) color = mix(color, applyVignette(color, uv), u_fx_vignette);

    // --- CUSTOM EFFECTS PIPELINE ---
    // CUSTOM_CALLS_HERE

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

export const CanvasVideoRenderer = forwardRef<CanvasVideoRendererRef, CanvasVideoRendererProps>(({
  data,
  config,
  isPlaying,
  eventBlocks = [],
  customEffects = []
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordsByLineCache = useRef<Map<string, Word[][]>>(new Map());
  const particlesRef = useRef<Particle[]>([]);
  
  // WebGL Refs
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const glContextRef = useRef<WebGLRenderingContext | null>(null);
  const glProgramRef = useRef<WebGLProgram | null>(null);
  const glTextureRef = useRef<WebGLTexture | null>(null);
  const glUniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  
  const lastTimeRef = useRef<number>(0);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoTextureReady = useRef(false);

  useLayoutEffect(() => {
    wordsByLineCache.current.clear();
  }, [data]);

  const currentResolution = RESOLUTIONS.find(r => r.id === config.resolutionId) || RESOLUTIONS[0];
  const CANVAS_WIDTH = currentResolution.width;
  const CANVAS_HEIGHT = currentResolution.height;

  // --- WEBGL INITIALIZATION (Offscreen) ---
  useEffect(() => {
      const c = document.createElement('canvas');
      c.width = CANVAS_WIDTH;
      c.height = CANVAS_HEIGHT;
      glCanvasRef.current = c;
      
      const gl = c.getContext('webgl', { preserveDrawingBuffer: true });
      if (!gl) return;
      glContextRef.current = gl;

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

      // --- DYNAMIC SHADER CONSTRUCTION ---
      // 1. Identify ALL custom shaders (so we can toggle them via uniforms)
      const shaderEffects = customEffects.filter(fx => fx.type === 'shader');
      
      // 2. Build injection strings
      let customFunctions = '';
      let customCalls = '';
      let customUniforms = '';
      
      shaderEffects.forEach((fx, index) => {
          const uniqueName = `custom_fx_${index}_${fx.id.replace(/-/g, '_')}`;
          const uniformName = `u_fx_${fx.id.replace(/-/g, '_')}`; // Safe uniform name
          
          // Rename function body
          const modifiedCode = fx.code.replace(/effect_main/g, uniqueName);
          
          customUniforms += `uniform float ${uniformName};\n`;
          customFunctions += `\n// Custom FX: ${fx.name}\n${modifiedCode}\n`;
          customCalls += `\n    if (${uniformName} > 0.5) color = ${uniqueName}(color, uv);\n`;
      });

      // 3. Assemble Fragment Shader
      const finalFragmentShader = FRAGMENT_SHADER_BASE
          .replace('// CUSTOM_FUNCTIONS_HERE', customUniforms + customFunctions)
          .replace('// CUSTOM_CALLS_HERE', customCalls);

      const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
      const fs = createShader(gl.FRAGMENT_SHADER, finalFragmentShader);
      
      if (!vs || !fs) return;

      const program = gl.createProgram();
      if (!program) return;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      glProgramRef.current = program;

      // Create Texture Object
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Set parameters so we can handle any size image (non-power-of-2)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      glTextureRef.current = texture;

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

      const baseUniforms = {
          u_time: gl.getUniformLocation(program, 'u_time'),
          u_resolution: gl.getUniformLocation(program, 'u_resolution'),
          u_use_texture: gl.getUniformLocation(program, 'u_use_texture'),
          u_texture: gl.getUniformLocation(program, 'u_texture'),
          
          // Camera Uniforms
          u_cam_offset: gl.getUniformLocation(program, 'u_cam_offset'),
          u_cam_zoom: gl.getUniformLocation(program, 'u_cam_zoom'),
          u_cam_rotate: gl.getUniformLocation(program, 'u_cam_rotate'),

          u_color_bg: gl.getUniformLocation(program, 'u_color_bg'),
          u_color_active: gl.getUniformLocation(program, 'u_color_active'),
          u_bass: gl.getUniformLocation(program, 'u_bass'),
          u_mid: gl.getUniformLocation(program, 'u_mid'),
          u_high: gl.getUniformLocation(program, 'u_high'),
          u_intensity: gl.getUniformLocation(program, 'u_intensity'),
          u_speed: gl.getUniformLocation(program, 'u_speed'),
          // Styles
          u_style_grid: gl.getUniformLocation(program, 'u_style_grid'),
          u_style_plasma: gl.getUniformLocation(program, 'u_style_plasma'),
          u_style_stars: gl.getUniformLocation(program, 'u_style_stars'),
          u_style_matrix: gl.getUniformLocation(program, 'u_style_matrix'),
          // Effects
          u_fx_vhs: gl.getUniformLocation(program, 'u_fx_vhs'),
          u_fx_glitch: gl.getUniformLocation(program, 'u_fx_glitch'),
          u_fx_pixelate: gl.getUniformLocation(program, 'u_fx_pixelate'),
          u_fx_rgb_split: gl.getUniformLocation(program, 'u_fx_rgb_split'),
          u_fx_chromatic: gl.getUniformLocation(program, 'u_fx_chromatic'),
          u_fx_thermal: gl.getUniformLocation(program, 'u_fx_thermal'),
          u_fx_liquid: gl.getUniformLocation(program, 'u_fx_liquid'),
          u_fx_mirror: gl.getUniformLocation(program, 'u_fx_mirror'),
          u_fx_scanlines: gl.getUniformLocation(program, 'u_fx_scanlines'),
          u_fx_film_grain: gl.getUniformLocation(program, 'u_fx_film_grain'),
          u_fx_vignette: gl.getUniformLocation(program, 'u_fx_vignette'),
          u_fx_barrel: gl.getUniformLocation(program, 'u_fx_barrel'),
          u_fx_old_movie: gl.getUniformLocation(program, 'u_fx_old_movie'),
          u_fx_kaleidoscope: gl.getUniformLocation(program, 'u_fx_kaleidoscope'),
          u_fx_halftone: gl.getUniformLocation(program, 'u_fx_halftone'),
          u_fx_grayscale: gl.getUniformLocation(program, 'u_fx_grayscale'),
          u_fx_invert_beat: gl.getUniformLocation(program, 'u_fx_invert_beat'),
          u_fx_sepia: gl.getUniformLocation(program, 'u_fx_sepia'),
      };
      
      // Store dynamic uniforms for custom FX
      shaderEffects.forEach((fx) => {
          const uName = `u_fx_${fx.id.replace(/-/g, '_')}`;
          // @ts-ignore
          baseUniforms[uName] = gl.getUniformLocation(program, uName);
      });
      
      glUniformsRef.current = baseUniforms;

      const positionLocation = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Re-compile logic triggers when customEffects change
  }, [customEffects]);

  useEffect(() => {
      if (glCanvasRef.current && glContextRef.current) {
          glCanvasRef.current.width = CANVAS_WIDTH;
          glCanvasRef.current.height = CANVAS_HEIGHT;
          glContextRef.current.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  useEffect(() => {
    // Reset video ready flag when URL changes
    videoTextureReady.current = false;

    if (config.background.type === 'image' && config.background.url) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = config.background.url;
        img.onload = () => { bgImageRef.current = img; };
        bgImageRef.current = null;
    } 

    if (config.background.type === 'video' && config.background.url) {
         const vid = document.createElement('video');
         vid.crossOrigin = "anonymous";
         vid.src = config.background.url;
         vid.loop = true;
         vid.muted = true;
         vid.playsInline = true;
         vid.preload = "auto";
         vid.oncanplay = () => { videoTextureReady.current = true; };
         vid.load();
         bgVideoRef.current = vid;
         vid.play().catch(() => {}); // Ensure play is called
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

    lastTimeRef.current = time;

    // --- DETERMINE ACTIVE CONFIG (EventBlock Overrides) ---
    // Find active block. If overlapping, the last one takes precedence.
    const activeBlock = eventBlocks.find(b => time >= b.start && time <= b.end);
    
    // CALCULATE FADE FACTOR FOR SMOOTH TRANSITIONS
    let fadeFactor = 1.0;
    if (activeBlock) {
        const fadeDur = 1.0; // 1 second default fade duration
        // Fade In
        if (activeBlock.smoothIn && time < activeBlock.start + fadeDur) {
            fadeFactor = Math.max(0, (time - activeBlock.start) / fadeDur);
        }
        // Fade Out
        if (activeBlock.smoothOut && time > activeBlock.end - fadeDur) {
            fadeFactor = Math.max(0, (activeBlock.end - time) / fadeDur);
        }
    }

    // Helper to get effective boolean value as intensity (0..1)
    const getFx = (key: keyof typeof config.effects, overrideKey: keyof typeof activeBlock.overrides) => {
        let val = config.effects[key] ? 1.0 : 0.0;
        
        if (activeBlock && activeBlock.overrides && activeBlock.overrides[overrideKey] !== undefined) {
            // If overridden, we use the override value scaled by fadeFactor
            // If block says TRUE, we fade from global to 1 (or 0 to 1 if global was 0)
            // But simplifying: If override exists, it becomes the target state.
            // We transition from 'Global State' to 'Override State'.
            // Actually, the simpler implementation requested: "Fade the effect".
            // So if Override is TRUE, intensity is fadeFactor. If False, it stays 0.
            
            // Simpler approach for this version: If overridden to TRUE, return fadeFactor.
            const override = activeBlock.overrides[overrideKey];
            if (override === true) return fadeFactor;
            if (override === false) return 0.0;
        }
        return val;
    };
    
    const getCam = (key: keyof typeof config.camera, overrideKey: keyof typeof activeBlock.overrides) => {
        let val = config.camera[key];
        if (activeBlock && activeBlock.overrides && activeBlock.overrides[overrideKey] !== undefined) {
             const override = activeBlock.overrides[overrideKey];
             // If override is TRUE, return true (we handle intensity via fadeFactor later)
             if (override !== undefined) return override; 
        }
        return val;
    };
    
    // Helper for Custom Effects Override (Global vs EventBlock)
    const getCustomFxActive = (fx: CustomEffect) => {
        if (activeBlock && activeBlock.overrides && activeBlock.overrides.custom_fx) {
             const override = activeBlock.overrides.custom_fx[fx.id];
             if (override !== undefined) return override;
        }
        return fx.active;
    };

    let effectiveColorsActive = config.colors.active;
    let effectiveColorsText = config.colors.text;
    let effectiveBgColor = config.background.color;
    // For now, let's keep Keyframe Interpolation for colors only
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

    // --- GLOBAL CAMERA PHYSICS (With Overrides & Fading) ---
    let camX = 0;
    let camY = 0;
    let camRot = 0; 
    let camZoom = 1.0;

    const camIntensity = activeBlock ? fadeFactor : 1.0; 

    // 1. Shake
    if (getCam('shake', 'cam_shake')) {
        const shakeAmt = 5 * (1 + bass * 3) * camIntensity;
        camX += (Math.random() - 0.5) * shakeAmt;
        camY += (Math.random() - 0.5) * shakeAmt;
    }

    // 2. Zoom Beat / Screen Pump
    if (getCam('zoomBeat', 'cam_zoomBeat') && audioEnabled) {
        camZoom += (bass * 0.15 * camIntensity);
    }
    if (getCam('screenPump', 'cam_screenPump') && audioEnabled) {
        camZoom += (Math.sin(time * 8.0) * 0.05 * bass * camIntensity);
    }

    // 3. Sway
    if (getCam('sway', 'cam_sway')) {
        camX += Math.sin(time * 0.5) * 20 * camIntensity;
        camRot += Math.cos(time * 0.3) * 0.02 * camIntensity;
    }

    // 4. Rotate (Auto)
    if (getCam('rotate', 'cam_rotate')) {
        camRot += Math.sin(time * 0.2) * 0.05 * camIntensity;
    }

    // 5. Hard Kick (Bass trigger)
    if (getCam('hardKick', 'cam_hardKick') && audioEnabled && bass > 0.7) {
        camZoom += 0.2 * camIntensity;
        camRot += (Math.random() - 0.5) * 0.1 * camIntensity;
    }

    // 6. Panic
    if (getCam('panic', 'cam_panic')) {
        const panicSpeed = time * 20.0;
        camX += Math.sin(panicSpeed) * 30 * (1 + high) * camIntensity;
        camY += Math.cos(panicSpeed * 0.8) * 30 * (1 + high) * camIntensity;
        camZoom += Math.sin(time * 10.0) * 0.1 * camIntensity;
    }

    // ===========================
    // LAYER 1: GPU BACKGROUND (WebGL)
    // ===========================
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    
    if (isAlphaRender) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        // ALWAYS use WebGL now for background to support unified effects
        if (glContextRef.current && glProgramRef.current) {
            const gl = glContextRef.current;
            const program = glProgramRef.current;
            const uniforms = glUniformsRef.current;

            gl.useProgram(program);
            
            // 1. Upload Texture if needed
            let useTexture = 0;
            if (config.background.type === 'image' && bgImageRef.current) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, glTextureRef.current);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgImageRef.current);
                useTexture = 1;
            } else if (config.background.type === 'video' && bgVideoRef.current && videoTextureReady.current) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, glTextureRef.current);
                try {
                   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgVideoRef.current);
                   useTexture = 1;
                } catch(e) {
                   // Sometimes video isn't ready in Safari/Firefox immediately
                   useTexture = 0; 
                }
            }

            // 2. Set Uniforms
            gl.uniform1f(uniforms.u_time, time);
            gl.uniform2f(uniforms.u_resolution, CANVAS_WIDTH, CANVAS_HEIGHT);
            gl.uniform1f(uniforms.u_use_texture, useTexture);
            gl.uniform1i(uniforms.u_texture, 0);
            
            // PASS CAMERA TO SHADER FOR SYNC
            gl.uniform2f(uniforms.u_cam_offset, camX / CANVAS_WIDTH, camY / CANVAS_HEIGHT); // Normalize offset 0..1
            gl.uniform1f(uniforms.u_cam_zoom, camZoom);
            gl.uniform1f(uniforms.u_cam_rotate, camRot);

            const colBg = hexToRgbNormalized(effectiveBgColor);
            gl.uniform3f(uniforms.u_color_bg, colBg[0], colBg[1], colBg[2]);
            
            const colAct = hexToRgbNormalized(effectiveColorsActive);
            gl.uniform3f(uniforms.u_color_active, colAct[0], colAct[1], colAct[2]);
            
            gl.uniform1f(uniforms.u_bass, bass);
            gl.uniform1f(uniforms.u_mid, mid);
            gl.uniform1f(uniforms.u_high, high);
            gl.uniform1f(uniforms.u_intensity, config.background.intensity || 0.5);
            gl.uniform1f(uniforms.u_speed, config.background.imageEffectSpeed || 1.0);

            // Procedural Styles
            const styles = Array.isArray(config.background.proceduralStyle) 
                ? config.background.proceduralStyle 
                : (config.background.proceduralStyle ? [config.background.proceduralStyle] : ['grid']);

            gl.uniform1f(uniforms.u_style_grid, styles.includes('grid') ? 1.0 : 0.0);
            gl.uniform1f(uniforms.u_style_plasma, styles.includes('plasma') ? 1.0 : 0.0);
            gl.uniform1f(uniforms.u_style_stars, styles.includes('stars') ? 1.0 : 0.0);
            gl.uniform1f(uniforms.u_style_matrix, styles.includes('matrix') ? 1.0 : 0.0);

            // Post-Processing Effects - Resolve with Overrides
            const effects = activeBlock?.overrides.bg_imageEffects ?? config.background.imageEffects ?? [];
            
            // Updated VHS Logic to support Override
            const vhsOverride = activeBlock?.overrides.fx_vhs;
            const vhsEnabled = vhsOverride !== undefined ? vhsOverride : effects.includes('vhs-stripes');
            // We can't really "fade" the boolean flag check for VHS logic easily without shader mixing
            // But we can fade the intensity inside applyVHSColor
            gl.uniform1f(uniforms.u_fx_vhs, vhsEnabled ? fadeFactor : 0.0);
            
            gl.uniform1f(uniforms.u_fx_glitch, (effects.includes('red-error') || effects.includes('dark-error')) ? 1.0 : 0.0);
            
            // Pixelate / Mosaic
            gl.uniform1f(uniforms.u_fx_pixelate, (effects.includes('pixel-noise') || getFx('mosaic', 'fx_mosaic') > 0) ? getFx('mosaic', 'fx_mosaic') : 0.0);
            
            gl.uniform1f(uniforms.u_fx_rgb_split, getFx('rgbSplit', 'fx_rgbSplit'));
            gl.uniform1f(uniforms.u_fx_chromatic, (effects.includes('chromatic-shift') || getFx('chromaticAberration', 'fx_chromaticAberration') > 0) ? getFx('chromaticAberration', 'fx_chromaticAberration') : 0.0);
            gl.uniform1f(uniforms.u_fx_thermal, (effects.includes('thermal') || getFx('thermal', 'fx_thermal' as any) > 0) ? getFx('thermal', 'fx_thermal' as any) : 0.0); 
            gl.uniform1f(uniforms.u_fx_liquid, effects.includes('liquid-warp') ? 1.0 : 0.0);
            gl.uniform1f(uniforms.u_fx_mirror, (effects.includes('mirror-x') || getFx('mirror', 'fx_mirror') > 0) ? getFx('mirror', 'fx_mirror') : 0.0);
            gl.uniform1f(uniforms.u_fx_scanlines, (effects.includes('scan-drift') || getFx('scanlines', 'fx_scanlines') > 0) ? getFx('scanlines', 'fx_scanlines') : 0.0);
            
            gl.uniform1f(uniforms.u_fx_film_grain, getFx('filmGrain', 'fx_filmGrain'));
            gl.uniform1f(uniforms.u_fx_vignette, getFx('vignette', 'fx_vignette'));
            gl.uniform1f(uniforms.u_fx_barrel, getFx('barrelDistortion', 'fx_barrelDistortion'));
            gl.uniform1f(uniforms.u_fx_old_movie, getFx('oldMovie', 'fx_oldMovie'));
            
            gl.uniform1f(uniforms.u_fx_kaleidoscope, getFx('kaleidoscope', 'fx_kaleidoscope'));
            gl.uniform1f(uniforms.u_fx_halftone, getFx('halftone', 'fx_halftone'));
            gl.uniform1f(uniforms.u_fx_grayscale, getFx('grayscale', 'fx_grayscale'));
            gl.uniform1f(uniforms.u_fx_invert_beat, getFx('invert', 'fx_invert'));
            gl.uniform1f(uniforms.u_fx_sepia, getFx('sepia', 'fx_sepia'));
            
            // Custom Shader FX Toggles
            customEffects.forEach(fx => {
                if (fx.type === 'shader') {
                    const uName = `u_fx_${fx.id.replace(/-/g, '_')}`;
                    // @ts-ignore
                    const loc = uniforms[uName];
                    if (loc) {
                        const active = getCustomFxActive(fx);
                        gl.uniform1f(loc, active ? 1.0 : 0.0);
                    }
                }
            });
            
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            
            // Draw WebGL Canvas onto Main 2D Canvas
            // Note: Since we applied camera in shader, we draw this 1:1.
            ctx.drawImage(glCanvasRef.current!, 0, 0);
        }
        
        // Darken overlay
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // ===========================
    // LAYER 2 & 3: CANVAS 2D CAMERA TRANSFORM
    // ===========================
    // Apply the same camera transforms to the 2D context for Particles and Text
    ctx.save();
    
    // 1. Center
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    // 2. Rotate
    ctx.rotate(camRot);
    // 3. Zoom
    ctx.scale(camZoom, camZoom);
    // 4. Translate (Inverse)
    ctx.translate(-camX, -camY);

    // --- CUSTOM JS CAMERA EFFECTS ---
    // Injected here to affect the canvas transform context before drawing text/particles
    if (customEffects && customEffects.length > 0) {
        customEffects.forEach(fx => {
            if (fx.type === 'camera') {
                const isActive = getCustomFxActive(fx);
                if (isActive) {
                    try {
                        // Safe-ish eval: create a function with specific parameters
                        // params: ctx, time, width, height, bass, mid, high
                        const cameraFunc = new Function('ctx', 'time', 'width', 'height', 'bass', 'mid', 'high', fx.code);
                        cameraFunc(ctx, time, CANVAS_WIDTH, CANVAS_HEIGHT, bass, mid, high);
                    } catch (e) {
                        // Silently fail or console log once? Better not to spam console in render loop
                    }
                }
            }
        });
    }

    // 5. Un-Center
    ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);

    // --- PARTICLES ---
    const particlesEnabled = activeBlock?.overrides.part_enabled ?? config.particles.enabled;

    if (particlesEnabled && !isAlphaRender) {
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

    // --- TEXT RENDERING (With Camera Applied) ---
    if (config.showLyrics !== false) {
        // ... Text Rendering Logic (Identical to previous for feature parity) ...
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

    ctx.restore(); // End Camera for 2D Layers
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
