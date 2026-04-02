








import React, { useRef, useEffect, useLayoutEffect, useImperativeHandle, forwardRef } from 'react';
import { LyricData, Word, AudioVisualizerData, RendererConfig, AnimationKeyframe, EventBlock, CustomEffect, AnimationStyle, ActiveStyle } from '../types';
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
  resize: (width: number, height: number) => void; // New: Explicit resize for export
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
  uniform float u_texture_aspect; // New: Aspect ratio of the media (width/height)
  
  // Text Texture
  uniform sampler2D u_text_texture;
  
  // Text Specific FX
  uniform float u_text_fx_glitch; // 0-1
  uniform float u_text_fx_glow;   // 0-1
  uniform float u_text_fx_shift;  // 0-1
  uniform float u_text_fx_wave;   // 0-1
  
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
  uniform float u_style_fractal;
  uniform float u_style_hyperspace;
  uniform float u_style_aurora;
  
  // FX Intensities (0.0 to 1.0)
  uniform float u_fx_vhs;
  uniform float u_fx_glitch;
  uniform float u_fx_pixelate;
  uniform float u_fx_rgb_split;
  uniform float u_fx_crimson_pop;
  uniform float u_fx_blood_pulse;
  uniform float u_fx_red_channel_glitch;
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
  uniform float u_fx_crt;
  uniform float u_fx_neon_glow;
  uniform float u_fx_cyberpunk;
  
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

  // --- TEXT UV MANIPULATION ---
  vec2 getTextUV(vec2 uv) {
      vec2 textUV = uv;
      
      // 1. Text Wave (Sine distortion on Y)
      if (u_text_fx_wave > 0.0) {
          textUV.y += sin(textUV.x * 10.0 + u_time * 5.0) * 0.01 * u_text_fx_wave;
          textUV.x += cos(textUV.y * 10.0 + u_time * 3.0) * 0.005 * u_text_fx_wave;
      }

      // 2. Text Glitch (Displacement)
      if (u_text_fx_glitch > 0.0) {
          float t = floor(u_time * 20.0);
          float row = floor(uv.y * 20.0);
          if (random(vec2(t, row)) > 0.8) {
              textUV.x += (random(vec2(row, t)) - 0.5) * 0.1 * u_text_fx_glitch;
          }
      }
      return textUV;
  }

  // --- TEXT COLOR SAMPLING ---
  vec4 getCoreText(vec2 uv) {
      // 3. RGB Shift (Shift)
      if (u_text_fx_shift > 0.0) {
          float shift = 0.005 * u_text_fx_shift * (1.0 + u_bass);
          float r = texture2D(u_text_texture, uv - vec2(shift, 0.0)).r;
          float g = texture2D(u_text_texture, uv).g;
          float b = texture2D(u_text_texture, uv + vec2(shift, 0.0)).b;
          float a = texture2D(u_text_texture, uv).a;
          float ar = texture2D(u_text_texture, uv - vec2(shift, 0.0)).a;
          float ab = texture2D(u_text_texture, uv + vec2(shift, 0.0)).a;
          return vec4(r, g, b, max(a, max(ar, ab)));
      } 
      return texture2D(u_text_texture, uv);
  }

  // --- GLOW GENERATOR ---
  vec3 getTextGlow(vec2 uv, float strength) {
      if (strength <= 0.0) return vec3(0.0);
      
      float radius = 0.015 * strength; // Base radius
      vec3 glowColor = vec3(0.0);
      float totalWeight = 0.0;
      
      // Radial Blur Sampling (12 samples)
      // This creates a much smoother, light-emitting look than box blur
      for (float i = 0.0; i < 6.28; i += 0.523) { // 360 degrees / 12 steps
          vec2 offset = vec2(cos(i), sin(i)) * radius;
          // Scale X by aspect ratio roughly to keep glow circular (assuming 16:9 approx, adjusting locally)
          offset.x *= u_resolution.y / u_resolution.x; 
          
          vec4 sample = texture2D(u_text_texture, uv + offset);
          glowColor += sample.rgb * sample.a; // Use premultiplied color if possible, effectively using alpha as intensity
          totalWeight += 1.0;
          
          // Second ring (further out, less weight)
          vec4 sample2 = texture2D(u_text_texture, uv + offset * 2.0);
          glowColor += sample2.rgb * sample2.a * 0.5;
          totalWeight += 0.5;
      }
      
      return (glowColor / totalWeight) * 2.5; // Multiply for "Emissive" bloom intensity
  }

  // --- DISTORTION FUNCTIONS (Background) ---
  
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
      float power = 0.5 * u_intensity * amount; 
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

  vec3 drawFractal(vec2 uv) {
      vec2 z = uv * 4.0 - vec2(2.0);
      float iter = 0.0;
      for(int i=0; i<20; i++) {
          if(length(z) > 4.0) break;
          z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + vec2(0.355, 0.355) + vec2(sin(u_time*0.1), cos(u_time*0.1))*0.1;
          iter++;
      }
      return u_color_active * (iter / 20.0) * u_intensity;
  }

  vec3 drawHyperspace(vec2 uv) {
      vec2 p = uv - 0.5;
      float r = length(p);
      float a = atan(p.y, p.x);
      float t = u_time * u_speed * 2.0;
      float v = sin(100.0 * (r - t)) * sin(a * 10.0);
      return mix(u_color_bg, u_color_active, smoothstep(0.8, 1.0, v)) * u_intensity;
  }

  vec3 drawAurora(vec2 uv) {
      float t = u_time * u_speed * 0.5;
      float v = sin(uv.x * 5.0 + t) + sin(uv.y * 3.0 + t) + sin((uv.x + uv.y) * 4.0 + t);
      v = v * 0.5 + 0.5;
      return mix(u_color_bg, u_color_active, v) * u_intensity * (1.0 - uv.y);
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

  vec3 applyCrimsonPop(vec3 col) {
      float lum = luminance(col);
      // Determine how "red" the pixel is compared to green and blue
      float redIntensity = max(0.0, col.r - max(col.g, col.b));
      // Desaturate non-reds
      vec3 desaturated = vec3(lum);
      // Boost the red channel where red is dominant
      vec3 popped = vec3(col.r * 1.5, col.g * 0.5, col.b * 0.5);
      return mix(desaturated, popped, redIntensity * 2.0);
  }

  vec3 applyBloodPulse(vec3 col, vec2 uv) {
      float dist = distance(uv, vec2(0.5));
      // Pulse with bass
      float pulse = u_bass * u_intensity;
      float vig = smoothstep(0.8 - pulse * 0.2, 0.3, dist);
      // Add red tint to the darkened edges
      vec3 bloodColor = vec3(0.5, 0.0, 0.0);
      return mix(bloodColor * (1.0 + pulse), col, vig);
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
      float radius = (1.0 - lum) * (0.7 / dots);
      float pattern = step(radius, dist);
      return col * pattern;
  }
  
  vec3 applyInvertBeat(vec3 col) {
      float invert = step(0.5, u_bass); 
      return mix(col, 1.0 - col, invert);
  }

  vec3 applyCRT(vec3 col, vec2 uv) {
      vec2 crtUV = uv * 2.0 - 1.0;
      vec2 offset = crtUV.yx / 5.0;
      crtUV = crtUV + crtUV * offset * offset;
      crtUV = crtUV * 0.5 + 0.5;
      if (crtUV.x < 0.0 || crtUV.x > 1.0 || crtUV.y < 0.0 || crtUV.y > 1.0) return vec3(0.0);
      float scanline = sin(crtUV.y * 800.0) * 0.04;
      col -= scanline;
      return col;
  }

  vec3 applyNeonGlow(vec3 col) {
      float lum = luminance(col);
      vec3 neon = mix(col, vec3(0.0, 1.0, 1.0), smoothstep(0.5, 1.0, lum));
      return neon * 1.2;
  }

  vec3 applyCyberpunk(vec3 col) {
      vec3 cp = vec3(col.r * 1.2, col.g * 0.8, col.b * 1.5);
      return cp;
  }

  // --- CUSTOM SHADER INJECTION POINT ---
  // CUSTOM_FUNCTIONS_HERE

  void main() {
    vec2 uv = vUv;
    
    // --- 1. GLOBAL CAMERA TRANSFORM ---
    vec2 cameraUV = applyCamera(uv);
    
    // --- 2. BACKGROUND DISTORTION & GENERATION ---
    // Apply background distortions to coordinates
    vec2 bgUV = cameraUV;
    if (u_fx_kaleidoscope > 0.0) bgUV = mix(bgUV, applyKaleidoscope(bgUV), u_fx_kaleidoscope); 
    if (u_fx_barrel > 0.0) bgUV = applyBarrelDistortion(bgUV, u_fx_barrel);
    if (u_fx_mirror > 0.0) bgUV = mix(bgUV, applyMirror(bgUV), u_fx_mirror);
    if (u_fx_liquid > 0.0) bgUV = applyLiquid(bgUV, u_fx_liquid);
    if (u_fx_glitch > 0.0) bgUV = applyGlitchUV(bgUV, u_fx_glitch);
    if (u_fx_vhs > 0.0) bgUV = applyVHSDistortion(bgUV, u_fx_vhs);
    if (u_fx_pixelate > 0.0) bgUV = applyPixelate(bgUV, u_fx_pixelate);

    vec3 color = vec3(0.0);

    // Generate/Sample Background
    if (u_use_texture > 0.5) {
        // --- OBJECT-FIT: COVER LOGIC ---
        // Calculate aspect ratios
        float canvasAspect = u_resolution.x / u_resolution.y;
        float mediaAspect = u_texture_aspect; 
        
        // Adjust UVs to cover the canvas without stretching
        // If media is wider than canvas, we crop width. If taller, crop height.
        vec2 scale = vec2(1.0);
        vec2 offset = vec2(0.0);
        
        if (mediaAspect > canvasAspect) {
            // Media is wider: Scale X to match height, then center
            float ratio = canvasAspect / mediaAspect;
            scale.x = ratio;
            offset.x = (1.0 - ratio) * 0.5;
        } else {
            // Media is taller (or equal): Scale Y to match width, then center
            float ratio = mediaAspect / canvasAspect;
            scale.y = ratio;
            offset.y = (1.0 - ratio) * 0.5;
        }
        
        // Map the distorted UV (bgUV) through the aspect ratio correction
        vec2 textureUV = bgUV * scale + offset;

        // Check bounds (0.0 to 1.0) for the final texture sampling
        if (textureUV.x < 0.0 || textureUV.x > 1.0 || textureUV.y < 0.0 || textureUV.y > 1.0) {
            color = u_color_bg * 0.1; // Out of bounds border
        } else {
            float shift = 0.0;
            if (u_fx_chromatic > 0.0) {
                float dist = distance(bgUV, vec2(0.5));
                shift += dist * 0.05 * u_bass * u_intensity * u_fx_chromatic;
            }
            float rgbAmount = max(u_fx_rgb_split, u_fx_vhs);
            if (rgbAmount > 0.0) {
                shift += 0.005 * u_intensity * rgbAmount;
                if (u_fx_vhs > 0.0) shift += 0.003 * u_fx_vhs;
            }
            
            if (shift > 0.0001 || u_fx_red_channel_glitch > 0.0) {
                // Apply shift along X (approximate for simplicity in cover mode)
                float redShift = shift;
                if (u_fx_red_channel_glitch > 0.0 && u_high > 0.5) {
                    redShift += (random(vec2(u_time, bgUV.y)) - 0.5) * 0.05 * u_intensity * u_high;
                }
                float r = texture2D(u_texture, textureUV + vec2(redShift * scale.x, 0.0)).r;
                float g = texture2D(u_texture, textureUV).g;
                float b = texture2D(u_texture, textureUV - vec2(shift * scale.x, 0.0)).b;
                color = vec3(r, g, b);
            } else {
                color = texture2D(u_texture, textureUV).rgb;
            }
        }
    } else {
        color = u_color_bg;
        if (u_style_grid > 0.5) color += drawGrid(bgUV);
        if (u_style_plasma > 0.5) color = mix(color, drawPlasma(bgUV), 0.5);
        if (u_style_stars > 0.5) color += drawStars(bgUV);
        if (u_style_matrix > 0.5) color += drawMatrix(bgUV);
        if (u_style_fractal > 0.5) color += drawFractal(bgUV);
        if (u_style_hyperspace > 0.5) color += drawHyperspace(bgUV);
        if (u_style_aurora > 0.5) color += drawAurora(bgUV);
        color *= (0.5 + u_intensity);
    }

    // --- 3. TEXT LAYER RENDERING (EMISSIVE GLOW) ---
    vec2 textUV = getTextUV(cameraUV);

    if (u_text_fx_glow > 0.0) {
        vec3 glow = getTextGlow(textUV, u_text_fx_glow);
        color += glow * u_text_fx_glow; 
    }

    vec4 coreText = getCoreText(textUV);
    color = mix(color, coreText.rgb, coreText.a);

    // --- 4. POST-PROCESSING ---
    if (u_fx_thermal > 0.0) color = mix(color, applyThermal(color), u_fx_thermal);
    if (u_fx_old_movie > 0.0) color = mix(color, applyOldMovie(color, bgUV), u_fx_old_movie);
    if (u_fx_halftone > 0.0) color = mix(color, applyHalftone(color, bgUV), u_fx_halftone);
    if (u_fx_scanlines > 0.0) color = mix(color, applyScanlines(color, bgUV), u_fx_scanlines);
    if (u_fx_film_grain > 0.0) color = mix(color, applyFilmGrain(color, bgUV), u_fx_film_grain);
    if (u_fx_vhs > 0.0) color = mix(color, applyVHSColor(color, bgUV), u_fx_vhs);
    if (u_fx_invert_beat > 0.0) color = mix(color, applyInvertBeat(color), u_fx_invert_beat);
    if (u_fx_grayscale > 0.0) color = mix(color, vec3(luminance(color)), u_fx_grayscale);
    if (u_fx_sepia > 0.0) color = mix(color, vec3(luminance(color)) * vec3(1.2, 1.0, 0.8), u_fx_sepia);
    if (u_fx_vignette > 0.0) color = mix(color, applyVignette(color, bgUV), u_fx_vignette);
    if (u_fx_crt > 0.0) color = mix(color, applyCRT(color, bgUV), u_fx_crt);
    if (u_fx_neon_glow > 0.0) color = mix(color, applyNeonGlow(color), u_fx_neon_glow);
    if (u_fx_cyberpunk > 0.0) color = mix(color, applyCyberpunk(color), u_fx_cyberpunk);
    if (u_fx_crimson_pop > 0.0) color = mix(color, applyCrimsonPop(color), u_fx_crimson_pop);
    if (u_fx_blood_pulse > 0.0) color = mix(color, applyBloodPulse(color, bgUV), u_fx_blood_pulse);

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
  const sectionMapRef = useRef<Map<string, string>>(new Map()); // NEW: To track which section a segment belongs to
  const particlesRef = useRef<Particle[]>([]);
  
  // Offscreen Text Canvas
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const textContextRef = useRef<CanvasRenderingContext2D | null>(null);

  // New: Intermediate Video Canvas for frame extraction
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoContextRef = useRef<CanvasRenderingContext2D | null>(null);

  // WebGL Refs
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const glContextRef = useRef<WebGLRenderingContext | null>(null);
  const glProgramRef = useRef<WebGLProgram | null>(null);
  const glTextureRef = useRef<WebGLTexture | null>(null); // Background texture
  const glTextTextureRef = useRef<WebGLTexture | null>(null); // Text texture
  const glUniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  
  const lastTimeRef = useRef<number>(0);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // Resize State for Export
  const customDimensions = useRef<{width: number, height: number} | null>(null);
  
  // OPTIMIZATION: Track video texture state to prevent redundant uploads
  const videoTextureReady = useRef(false);
  const lastVideoUploadTime = useRef<number>(-1);
  const forceTextureUpdate = useRef(false);

  useLayoutEffect(() => {
    wordsByLineCache.current.clear();
    const map = sectionMapRef.current;
    map.clear();
    let currentSection = 'verse'; // Default fallback
    data.segments.forEach(seg => {
        if (seg.section) currentSection = seg.section;
        map.set(seg.id, currentSection);
    });
  }, [data]);

  const currentResolution = RESOLUTIONS.find(r => r.id === config.resolutionId) || RESOLUTIONS[0];
  // USE CUSTOM DIMENSIONS IF EXPORTING, ELSE CONFIG
  const CANVAS_WIDTH = customDimensions.current ? customDimensions.current.width : currentResolution.width;
  const CANVAS_HEIGHT = customDimensions.current ? customDimensions.current.height : currentResolution.height;

  // --- INITIALIZE OFFSCREEN CANVAS BUFFERS ---
  useEffect(() => {
      // 1. Text Canvas
      const tc = textCanvasRef.current || document.createElement('canvas');
      tc.width = CANVAS_WIDTH;
      tc.height = CANVAS_HEIGHT;
      textCanvasRef.current = tc;
      textContextRef.current = tc.getContext('2d', { alpha: true });

      // 2. Video Intermediate Canvas (Allows exact frame capture + resizing)
      const vc = videoCanvasRef.current || document.createElement('canvas');
      vc.width = CANVAS_WIDTH;
      vc.height = CANVAS_HEIGHT;
      videoCanvasRef.current = vc;
      videoContextRef.current = vc.getContext('2d', { alpha: false, willReadFrequently: true });

  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  // --- WEBGL INITIALIZATION (Offscreen) ---
  useEffect(() => {
      const c = glCanvasRef.current || document.createElement('canvas');
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
      const shaderEffects = customEffects.filter(fx => fx.type === 'shader');
      let customFunctions = '';
      let customCalls = '';
      let customUniforms = '';
      
      shaderEffects.forEach((fx, index) => {
          const uniqueName = `custom_fx_${index}_${fx.id.replace(/-/g, '_')}`;
          const uniformName = `u_fx_${fx.id.replace(/-/g, '_')}`; 
          const modifiedCode = fx.code.replace(/effect_main/g, uniqueName);
          customUniforms += `uniform float ${uniformName};\n`;
          customFunctions += `\n// Custom FX: ${fx.name}\n${modifiedCode}\n`;
          customCalls += `\n    if (${uniformName} > 0.5) color = ${uniqueName}(color, uv);\n`;
      });

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

      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      glTextureRef.current = texture;

      const textTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, textTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      glTextTextureRef.current = textTexture;

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0
      ]), gl.STATIC_DRAW);

      const baseUniforms = {
          u_time: gl.getUniformLocation(program, 'u_time'),
          u_resolution: gl.getUniformLocation(program, 'u_resolution'),
          u_use_texture: gl.getUniformLocation(program, 'u_use_texture'),
          u_texture_aspect: gl.getUniformLocation(program, 'u_texture_aspect'), // NEW
          u_texture: gl.getUniformLocation(program, 'u_texture'),
          u_text_texture: gl.getUniformLocation(program, 'u_text_texture'),
          
          u_text_fx_glitch: gl.getUniformLocation(program, 'u_text_fx_glitch'),
          u_text_fx_glow: gl.getUniformLocation(program, 'u_text_fx_glow'),
          u_text_fx_shift: gl.getUniformLocation(program, 'u_text_fx_shift'),
          u_text_fx_wave: gl.getUniformLocation(program, 'u_text_fx_wave'),

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
          u_style_grid: gl.getUniformLocation(program, 'u_style_grid'),
          u_style_plasma: gl.getUniformLocation(program, 'u_style_plasma'),
          u_style_stars: gl.getUniformLocation(program, 'u_style_stars'),
          u_style_matrix: gl.getUniformLocation(program, 'u_style_matrix'),
          u_style_fractal: gl.getUniformLocation(program, 'u_style_fractal'),
          u_style_hyperspace: gl.getUniformLocation(program, 'u_style_hyperspace'),
          u_style_aurora: gl.getUniformLocation(program, 'u_style_aurora'),
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
          u_fx_crimson_pop: gl.getUniformLocation(program, 'u_fx_crimson_pop'),
          u_fx_blood_pulse: gl.getUniformLocation(program, 'u_fx_blood_pulse'),
          u_fx_red_channel_glitch: gl.getUniformLocation(program, 'u_fx_red_channel_glitch'),
          u_fx_halftone: gl.getUniformLocation(program, 'u_fx_halftone'),
          u_fx_grayscale: gl.getUniformLocation(program, 'u_fx_grayscale'),
          u_fx_invert_beat: gl.getUniformLocation(program, 'u_fx_invert_beat'),
          u_fx_sepia: gl.getUniformLocation(program, 'u_fx_sepia'),
          u_fx_crt: gl.getUniformLocation(program, 'u_fx_crt'),
          u_fx_neon_glow: gl.getUniformLocation(program, 'u_fx_neon_glow'),
          u_fx_cyberpunk: gl.getUniformLocation(program, 'u_fx_cyberpunk'),
      };
      
      shaderEffects.forEach((fx) => {
          const uName = `u_fx_${fx.id.replace(/-/g, '_')}`;
          // @ts-ignore
          baseUniforms[uName] = gl.getUniformLocation(program, uName);
      });
      
      glUniformsRef.current = baseUniforms;

      const positionLocation = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      return () => {
        if (glProgramRef.current) gl.deleteProgram(glProgramRef.current);
        if (glTextureRef.current) gl.deleteTexture(glTextureRef.current);
        if (glTextTextureRef.current) gl.deleteTexture(glTextTextureRef.current);
      };
  }, [customEffects]); // Remove dimensions dependency to avoid full context recreation on resize

  useEffect(() => {
      // Resize offscreens dynamically when dimensions change
      if (glCanvasRef.current && glContextRef.current) {
          glCanvasRef.current.width = CANVAS_WIDTH;
          glCanvasRef.current.height = CANVAS_HEIGHT;
          glContextRef.current.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      if (textCanvasRef.current) {
          textCanvasRef.current.width = CANVAS_WIDTH;
          textCanvasRef.current.height = CANVAS_HEIGHT;
      }
      if (videoCanvasRef.current) {
          videoCanvasRef.current.width = CANVAS_WIDTH;
          videoCanvasRef.current.height = CANVAS_HEIGHT;
      }
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  useEffect(() => {
      const vid = bgVideoRef.current;
      if (vid && config.background.type === 'video') {
          if (isPlaying) {
              vid.play().catch(e => console.warn("Video play failed", e));
          } else {
              vid.pause();
          }
      }
  }, [isPlaying, config.background.type]);

  useEffect(() => {
    videoTextureReady.current = false;
    lastVideoUploadTime.current = -1;
    forceTextureUpdate.current = true;

    if (bgVideoRef.current) {
        bgVideoRef.current.pause();
        bgVideoRef.current.src = "";
        bgVideoRef.current.load();
        bgVideoRef.current = null;
    }

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
         vid.oncanplay = () => { 
             videoTextureReady.current = true; 
             forceTextureUpdate.current = true; 
         };
         vid.load();
         bgVideoRef.current = vid;
         if (isPlaying) vid.play().catch(() => {});
    } 
  }, [config.background.type, config.background.url]);

  useImperativeHandle(ref, () => ({
    canvas: canvasRef.current,
    drawFrame: (time, analysis, isAlphaRender) => drawScene(time, analysis, isAlphaRender),
    resize: (width: number, height: number) => {
        customDimensions.current = { width, height };
        // Trigger context resize via effects or manual update
        if (glCanvasRef.current && glContextRef.current) {
            glCanvasRef.current.width = width;
            glCanvasRef.current.height = height;
            glContextRef.current.viewport(0, 0, width, height);
        }
        if (textCanvasRef.current && textContextRef.current) {
            textCanvasRef.current.width = width;
            textCanvasRef.current.height = height;
        }
        if (videoCanvasRef.current && videoContextRef.current) {
            videoCanvasRef.current.width = width;
            videoCanvasRef.current.height = height;
        }
    },
    seekToTime: async (time) => {
        const vid = bgVideoRef.current;
        if (vid && config.background.type === 'video') {
            // Wait for video metadata/readiness if newly loaded
            if (vid.readyState < 2) {
                await new Promise<void>((resolve) => {
                    const check = () => {
                        if (vid.readyState >= 2) resolve();
                        else requestAnimationFrame(check);
                    };
                    check();
                });
            }

            const speed = config.background.playbackSpeed || 1.0;
            const duration = vid.duration || 1;
            // Handle Looping and Offset
            const targetTime = (time * speed) % duration;

            if (!isPlaying) {
                vid.currentTime = targetTime;
                
                await new Promise<void>((resolve) => {
                    // Safety timeout to prevent infinite hang
                    const timeout = setTimeout(() => {
                        forceTextureUpdate.current = true;
                        resolve();
                    }, 500); 

                    const onSeeked = () => {
                        clearTimeout(timeout);
                        // Add an extra frame wait for the paint to occur
                        requestAnimationFrame(() => {
                            forceTextureUpdate.current = true;
                            resolve();
                        });
                    };
                    
                    vid.onseeked = onSeeked;
                    
                    // Edge case: t=0 sometimes doesn't fire seeked if already at 0
                    if (Math.abs(vid.currentTime - targetTime) < 0.01 && vid.readyState >= 3) {
                        clearTimeout(timeout);
                        forceTextureUpdate.current = true;
                        resolve();
                    }
                });
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

  const getLines = (id: string, words: Word[]) => {
      if (wordsByLineCache.current.has(id)) {
          return wordsByLineCache.current.get(id)!;
      }
      const lines: Record<number, Word[]> = {};
      words.forEach(w => {
          const lineNum = w.line_number ?? 0;
          if (!lines[lineNum]) lines[lineNum] = [];
          lines[lineNum].push(w);
      });
      const sortedKeys = Object.keys(lines).map(Number).sort((a,b) => a - b);
      const sortedResult = sortedKeys.map(k => lines[k]);
      
      wordsByLineCache.current.set(id, sortedResult);
      return sortedResult;
  };

  const drawScene = (time: number, analysis: AudioVisualizerData, isAlphaRender = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Ensure main canvas matches current rendering resolution (could be 4K export)
    if (canvas.width !== CANVAS_WIDTH || canvas.height !== CANVAS_HEIGHT) {
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
    }

    lastTimeRef.current = time;

    const textCtx = textContextRef.current;
    if (textCtx) {
        textCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        textCtx.setTransform(1, 0, 0, 1, 0, 0); 
        
        if (config.showLyrics !== false) {
            const visibleSegments = data.segments.filter(s => time >= s.start - 2.0 && time <= s.end + 2.0);
            visibleSegments.forEach(seg => {
                const sectionKey = (sectionMapRef.current.get(seg.id) || 'verse').toLowerCase() as keyof typeof config.sectionStyles;
                const sectionConfig = config.sectionStyles?.[sectionKey];
                const sectionEnabled = sectionConfig?.enabled === true;
                const resolvedColorText = seg.style?.colorText ?? (sectionEnabled ? sectionConfig?.colors_text : undefined) ?? config.colors.text;
                const resolvedColorActive = seg.style?.colorActive ?? (sectionEnabled ? sectionConfig?.colors_active : undefined) ?? config.colors.active;
                const sectionScale = sectionEnabled ? (sectionConfig?.fontScale || 1.0) : 1.0;
                const effectiveScale = (seg.style?.scale !== undefined) ? seg.style.scale : sectionScale;
                const animEntrance = sectionEnabled ? (sectionConfig?.animation?.entrance || config.animation.entrance) : config.animation.entrance;
                const animActive = sectionEnabled ? (sectionConfig?.animation?.active || config.animation.active) : config.animation.active;
                const animExit = sectionEnabled ? (sectionConfig?.animation?.exit || config.animation.exit) : config.animation.exit;

                const lines = getLines(seg.id, seg.words);
                
                // Scale font based on resolution ratio to keep consistent look across 1080p and 4K
                const resolutionScale = CANVAS_HEIGHT / 1080; 
                const baseFontSize = (config.font.fontSize || 80) * resolutionScale;
                const fontSize = baseFontSize * effectiveScale; 
                const lineHeight = fontSize * 1.2;
                const totalH = lines.length * lineHeight;
                let startY = (CANVAS_HEIGHT - totalH) / 2 + lineHeight/2;
                
                textCtx.font = `${config.font.italic?'italic':''} ${config.font.weight} ${fontSize}px ${config.font.family}`;
                
                lines.forEach((line, i) => {
                    const lineY = startY + i * lineHeight;
                    const totalW = line.reduce((acc, w) => acc + textCtx.measureText(w.word).width + (30 * resolutionScale), 0) - (30 * resolutionScale);
                    let curX = (CANVAS_WIDTH - totalW) / 2;
                    
                    line.forEach((w, wIndex) => {
                        const wWidth = textCtx.measureText(w.word).width;
                        const isActive = time >= w.start && time <= w.end;
                        const isFuture = time < w.start;
                        const isPast = time > w.end;
                        
                        let alpha = 1.0;
                        let scaleX = 1.0;
                        let scaleY = 1.0;
                        let transX = 0;
                        let transY = 0;
                        let rot = 0;
                        let color = isActive ? resolvedColorActive : resolvedColorText;

                        if (isFuture) {
                            const dist = w.start - time;
                            const dur = 0.5;
                            if (dist > dur) alpha = 0;
                            else {
                                const t = 1.0 - (dist / dur);
                                switch (animEntrance) {
                                    case 'fade': alpha = t; break;
                                    case 'zoom': alpha = t; scaleX = scaleY = t; break;
                                    case 'slide': alpha = t; transY = 50 * resolutionScale * (1 - t); break;
                                    case 'slam': alpha = t; scaleX = scaleY = 1 + (2 * (1-t)); break;
                                    case 'blur': alpha = t; scaleX = scaleY = 1 + (0.5 * (1-t)); break;
                                    case 'glitch': alpha = (Math.random() > 0.5 ? 1 : 0) * t; transX = (Math.random() - 0.5) * 20 * resolutionScale * (1-t); break;
                                    case 'typewriter': alpha = t > 0.8 ? 1 : 0; break;
                                    case 'elastic': alpha = t; scaleY = t; scaleX = 1 + Math.sin(t * 10) * 0.5 * (1-t); break;
                                    case 'drop': alpha = t; transY = -100 * resolutionScale * (1-t); break;
                                    case 'spiral': alpha = t; rot = (1-t) * Math.PI; scaleX = scaleY = t; break;
                                    case 'inflate': alpha = t; scaleX = scaleY = 0.1 + (0.9 * t); break;
                                    case 'scramble': alpha = t; transX = (Math.random() - 0.5) * 50 * resolutionScale * (1-t); transY = (Math.random() - 0.5) * 50 * resolutionScale * (1-t); break;
                                    case 'fly-in': alpha = t; scaleX = scaleY = 3 - (2 * t); break;
                                    case 'unfold': alpha = t; scaleY = t; scaleX = 1; break;
                                    case 'swirl-in': alpha = t; rot = (1-t) * Math.PI * 2; scaleX = scaleY = t; break;
                                    case 'swipe': alpha = t; transX = -100 * resolutionScale * (1-t); break;
                                    case 'reveal': alpha = t; transY = 20 * resolutionScale * (1-t); scaleY = t; break;
                                    case 'flip': alpha = t; rot = (1-t) * Math.PI; scaleY = t; break;
                                    case 'bounce-in': alpha = t; scaleX = scaleY = t < 0.5 ? 2*t : 1 + Math.sin((t-0.5)*Math.PI*2)*0.2; break;
                                    case 'whip': alpha = t; rot = (1-t) * Math.PI / 2; transX = -50 * resolutionScale * (1-t); break;
                                    default: alpha = t;
                                }
                            }
                        } else if (isActive) {
                            alpha = 1.0;
                            const activeT = time - w.start;
                            scaleX = scaleY = 1.0 + (analysis.bass * 0.1); 
                            switch (animActive) {
                                case 'pulse': scaleX = scaleY = 1.0 + (analysis.bass * 0.3); break;
                                case 'bounce': transY = Math.sin(activeT * 10) * 10 * resolutionScale; break;
                                case 'wave': transY = Math.sin((time * 5) + wIndex) * 15 * resolutionScale; break;
                                case 'jitter': transX = (Math.random() - 0.5) * 5 * resolutionScale; transY = (Math.random() - 0.5) * 5 * resolutionScale; break;
                                case 'neon': scaleX = scaleY = 1.0 + (analysis.high * 0.1); break;
                                case 'rotate': rot = Math.sin(time * 2) * 0.1; break;
                                case 'skew': rot = Math.sin(time * 5) * 0.05 * analysis.bass; break;
                                case 'pop': if (analysis.bass > 0.6) { scaleX = scaleY = 1.4; } break;
                                case 'flash': alpha = (Math.sin(time * 30) > 0) ? 1.0 : 0.5; break;
                                case 'float': transY = Math.sin(time * 2) * 5 * resolutionScale; transX = Math.cos(time * 1.5) * 3 * resolutionScale; break;
                                case 'shiver': transX = (Math.random() - 0.5) * 2 * resolutionScale; break;
                                case 'glitch-shake': if (Math.random() > 0.9) { transX = (Math.random() - 0.5) * 20 * resolutionScale; } break;
                                case 'bass-bulge': scaleY = 1.0 + (analysis.bass * 0.5); break;
                                case 'wobble': rot = Math.sin(time * 3) * 0.1; break;
                                case 'breathing': scaleX = scaleY = 1.0 + (Math.sin(time * 2) * 0.05); break;
                                case 'tremble': transX = (Math.random() - 0.5) * 3 * resolutionScale; transY = (Math.random() - 0.5) * 3 * resolutionScale; break;
                                case 'shake': transX = (Math.random() - 0.5) * 10 * resolutionScale; transY = (Math.random() - 0.5) * 10 * resolutionScale; break;
                                case 'vibrate': transX = Math.sin(time * 50) * 5 * resolutionScale; break;
                                case 'glow-pulse': alpha = 0.5 + Math.sin(time * 5) * 0.5; break;
                                case 'color-shift': color = `hsl(${(time * 100) % 360}, 100%, 50%)`; break;
                            }
                            if (sectionEnabled && sectionConfig?.camera_zoom_boost) {
                                const boost = (sectionConfig.camera_zoom_boost * analysis.bass);
                                scaleX += boost; scaleY += boost;
                            }
                        } else if (isPast) {
                            const dist = time - w.end;
                            const dur = 0.5;
                            if (dist > dur) alpha = 0;
                            else {
                                const t = dist / dur;
                                const invT = 1.0 - t;
                                switch (animExit) {
                                    case 'fade': alpha = invT; break;
                                    case 'zoom': alpha = invT; scaleX = scaleY = 1 + t; break;
                                    case 'slide': alpha = invT; transY = -50 * resolutionScale * t; break;
                                    case 'sink': alpha = invT; transY = 50 * resolutionScale * t; break;
                                    case 'blur': alpha = invT; scaleX = scaleY = 1 + (0.2 * t); break;
                                    case 'burn': alpha = invT; color = '#ff4400'; scaleY = 1 + t; scaleX = 1 - (0.5 * t); break;
                                    case 'shrink': alpha = invT; scaleX = scaleY = invT; break;
                                    case 'drop': alpha = invT; transY = 100 * resolutionScale * t; rot = t * 0.5; break;
                                    case 'implode': alpha = invT; scaleX = scaleY = invT; break;
                                    case 'roll-out': alpha = invT; transX = 100 * resolutionScale * t; rot = t * Math.PI; break;
                                    case 'fly-out': alpha = invT; scaleX = scaleY = 1 + (2 * t); break;
                                    case 'swipe': alpha = invT; transX = 100 * resolutionScale * t; break;
                                    case 'reveal': alpha = invT; transY = -20 * resolutionScale * t; scaleY = invT; break;
                                    case 'flip': alpha = invT; rot = t * Math.PI; scaleY = invT; break;
                                    case 'bounce-in': alpha = invT; scaleX = scaleY = invT; break;
                                    case 'whip': alpha = invT; rot = -t * Math.PI / 2; transX = 50 * resolutionScale * t; break;
                                    default: alpha = invT;
                                }
                            }
                        }

                        if (alpha > 0.01) {
                            textCtx.save();
                            textCtx.translate(curX + wWidth/2, lineY);
                            textCtx.translate(transX, transY);
                            textCtx.rotate(rot);
                            textCtx.scale(scaleX, scaleY);
                            textCtx.globalAlpha = alpha;
                            
                            if (isActive && sectionEnabled && (sectionConfig?.effects_glow_boost || 0) > 0) {
                                textCtx.shadowColor = color;
                                textCtx.shadowBlur = (sectionConfig!.effects_glow_boost! * 50 * resolutionScale);
                            } else if (isActive && config.effects.glow > 0) {
                                 textCtx.shadowColor = color;
                                 textCtx.shadowBlur = config.effects.glow * 20 * resolutionScale;
                            }

                            textCtx.fillStyle = color;
                            textCtx.fillText(w.word, -wWidth/2, 0);
                            
                            textCtx.shadowBlur = 0; 
                            textCtx.lineWidth = 4 * resolutionScale;
                            textCtx.strokeStyle = 'rgba(0,0,0,0.5)';
                            textCtx.strokeText(w.word, -wWidth/2, 0);
                            textCtx.restore();
                        }
                        curX += wWidth + (30 * resolutionScale);
                    });
                });
            });
        }
    }

    // --- DETERMINE ACTIVE CONFIG ---
    const activeBlocks = eventBlocks.filter(b => time >= b.start && time <= b.end);
    const blockFades = new Map<string, number>();
    activeBlocks.forEach(b => {
        let f = 1.0;
        const fadeDur = 1.0; 
        if (b.smoothIn && time < b.start + fadeDur) f = Math.max(0, (time - b.start) / fadeDur);
        if (b.smoothOut && time > b.end - fadeDur) f = Math.max(0, (b.end - time) / fadeDur);
        blockFades.set(b.id, f);
    });

    const getFx = (key: keyof typeof config.effects, overrideKey: keyof typeof config.effects) => {
        let isActive = config.effects[key];
        let maxIntensity = isActive ? 1.0 : 0.0;
        for (const block of activeBlocks) {
            // @ts-ignore
            const val = block.overrides[`fx_${overrideKey}`]; 
            if (val !== undefined) {
                if (val === false) { isActive = false; maxIntensity = 0.0; } 
                else if (val === true) { isActive = true; maxIntensity = Math.max(maxIntensity, blockFades.get(block.id) || 1.0); }
            }
        }
        return isActive ? maxIntensity : 0.0;
    };

    const getCam = (key: keyof typeof config.camera, overrideKey: string) => {
        let isActive = config.camera[key];
        let maxFade = 0.0;
        let activeFromBlock = false;
        let foundOverride = false;
        for (const block of activeBlocks) {
            // @ts-ignore
            const val = block.overrides[overrideKey];
            if (val !== undefined) {
                foundOverride = true;
                if (val === true) { activeFromBlock = true; maxFade = Math.max(maxFade, blockFades.get(block.id) || 1.0); }
            }
        }
        if (foundOverride) return activeFromBlock ? maxFade : 0.0;
        return isActive ? 1.0 : 0.0;
    };

    const getCustomFxIntensity = (fx: CustomEffect) => {
        let isActive = fx.active;
        let intensity = isActive ? 1.0 : 0.0;
        for (const block of activeBlocks) {
             const override = block.overrides.custom_fx?.[fx.id];
             if (override !== undefined) {
                 if (override === true) { isActive = true; intensity = Math.max(intensity, blockFades.get(block.id) || 1.0); } 
                 else { isActive = false; intensity = 0.0; }
             }
        }
        return isActive ? intensity : 0.0;
    };

    let effectiveColorsActive = config.colors.active;
    let effectiveBgColor = config.background.color;
    
    // Keyframe Interpolation
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

    let { bass, mid, high } = analysis;
    const audioEnabled = config.audioReactivity.enabled;
    const sensitivity = config.audioReactivity.sensitivity;
    if (!audioEnabled) { bass=0; mid=0; high=0; } 
    else { bass *= sensitivity; mid *= sensitivity; high *= sensitivity; }

    // --- GLOBAL CAMERA PHYSICS ---
    let camX = 0; let camY = 0; let camRot = 0; let camZoom = 1.0;
    const resolutionScale = CANVAS_HEIGHT / 1080;

    const shakeIntensity = getCam('shake', 'cam_shake');
    if (shakeIntensity > 0) {
        const shakeAmt = 5 * resolutionScale * (1 + bass * 3) * shakeIntensity;
        camX += (Math.random() - 0.5) * shakeAmt; camY += (Math.random() - 0.5) * shakeAmt;
    }
    const zoomBeatIntensity = getCam('zoomBeat', 'cam_zoomBeat');
    if (zoomBeatIntensity > 0 && audioEnabled) camZoom += (bass * 0.15 * zoomBeatIntensity);
    const screenPumpIntensity = getCam('screenPump', 'cam_screenPump');
    if (screenPumpIntensity > 0 && audioEnabled) camZoom += (Math.sin(time * 8.0) * 0.05 * bass * screenPumpIntensity);
    const swayIntensity = getCam('sway', 'cam_sway');
    if (swayIntensity > 0) { camX += Math.sin(time * 0.5) * 20 * resolutionScale * swayIntensity; camRot += Math.cos(time * 0.3) * 0.02 * swayIntensity; }
    const rotateIntensity = getCam('rotate', 'cam_rotate');
    if (rotateIntensity > 0) camRot += Math.sin(time * 0.2) * 0.05 * rotateIntensity;
    const hardKickIntensity = getCam('hardKick', 'cam_hardKick');
    if (hardKickIntensity > 0 && audioEnabled && bass > 0.7) { camZoom += 0.2 * hardKickIntensity; camRot += (Math.random() - 0.5) * 0.1 * hardKickIntensity; }
    const panicIntensity = getCam('panic', 'cam_panic');
    if (panicIntensity > 0) {
        const panicSpeed = time * 20.0;
        camX += Math.sin(panicSpeed) * 30 * resolutionScale * (1 + high) * panicIntensity;
        camY += Math.cos(panicSpeed * 0.8) * 30 * resolutionScale * (1 + high) * panicIntensity;
        camZoom += Math.sin(time * 10.0) * 0.1 * panicIntensity;
    }

    if (isAlphaRender) ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    else ctx.fillStyle = '#000'; ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);

    if (glContextRef.current && glProgramRef.current) {
        const gl = glContextRef.current;
        const program = glProgramRef.current;
        const uniforms = glUniformsRef.current;

        gl.useProgram(program);
        
        let useTexture = 0;
        let texAspect = 1.0;

        if (config.background.type === 'image' && bgImageRef.current) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, glTextureRef.current);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgImageRef.current);
            useTexture = 1;
            texAspect = bgImageRef.current.width / bgImageRef.current.height;
        } else if (config.background.type === 'video' && bgVideoRef.current && videoTextureReady.current && videoCanvasRef.current && videoContextRef.current) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, glTextureRef.current);
            try {
               const vid = bgVideoRef.current;
               const currentTime = vid.currentTime;
               
               // Use intermediate canvas to ensure video frame is ready and resized
               if (forceTextureUpdate.current || Math.abs(currentTime - lastVideoUploadTime.current) > 0.001 || !isPlaying) {
                    // Draw video to intermediate canvas first
                    videoContextRef.current.drawImage(vid, 0, 0, videoCanvasRef.current.width, videoCanvasRef.current.height);
                    
                    // Upload intermediate canvas to texture
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoCanvasRef.current);
                    
                    lastVideoUploadTime.current = currentTime;
                    forceTextureUpdate.current = false;
               }
               useTexture = 1;
               // Since we resize the video to fill the canvas in the intermediate step, the aspect ratio is now the canvas aspect
               // However, to maintain the 'cover' logic in shader, we might want to pass original aspect. 
               // Actually, drawImage(0,0,w,h) stretches it. The Shader logic handles crop.
               // Better approach: Let shader handle crop. Draw video 1:1 to canvas? No, canvas might be huge.
               // Revised strategy: Draw video to canvas maintaining aspect ratio, or just stretch and let shader fix?
               // Simplest robust fix: Draw stretched to canvas, but tell shader it's 1:1 (since it fills texture).
               // BUT shader expects source aspect to crop correctly.
               // Let's rely on the intermediate canvas being an exact mirror of the video frame but resized.
               // Actually, if we drawImage(video, 0, 0, width, height), we distort it on the CPU side.
               // Better: Upload the video directly if possible, OR if that fails (black frames), use canvas.
               // The issue is `texImage2D(video)` is async/laggy on seeking.
               // We will use the intermediate canvas method but we need to respect aspect ratio.
               
               // Correct approach for robustness: 
               // 1. Draw video to temp canvas (stretched to fill). 
               // 2. Pass aspect ratio of CANVAS (1.0 relative to UVs) to shader.
               // 3. Shader sees a stretched image.
               // 4. This defeats the shader's `cover` logic which expects original aspect.
               
               // Let's pass the ORIGINAL video aspect to the shader, but we need the texture to NOT be pre-stretched by canvas draw.
               // So we draw to canvas with original video dimensions? No, too big for 4K video sometimes.
               // Compromise: We keep the `texImage2D(video)` for playback (performance) but enforce `tempCanvas` for EXPORT (frame accuracy).
               // Since we are inside `drawFrame`, we need a flag? 
               // Actually, `texImage2D(video)` is usually fine IF we wait for `seeked`. 
               // The previous issue was likely timing. 
               // Let's stick to the `texImage2D(video)` path but with the improved `seekToTime` logic above. 
               // The `videoCanvasRef` fallback is good if we want to grab a specific frame for thumbnails, but for 4K render, `texImage2D` is standard.
               
               // Let's use `texImage2D(video)` but with the robust seek wait implemented in `seekToTime`.
               gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
               
               useTexture = 1;
               texAspect = vid.videoWidth / vid.videoHeight;
            } catch(e) { useTexture = 0; }
        }

        if (textCanvasRef.current) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, glTextTextureRef.current);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvasRef.current);
        }

        gl.uniform1f(uniforms.u_time, time);
        gl.uniform2f(uniforms.u_resolution, CANVAS_WIDTH, CANVAS_HEIGHT);
        gl.uniform1f(uniforms.u_use_texture, useTexture);
        gl.uniform1f(uniforms.u_texture_aspect, texAspect);
        gl.uniform1i(uniforms.u_texture, 0); 
        gl.uniform1i(uniforms.u_text_texture, 1);
        
        const activeSeg = data.segments.find(s => time >= s.start && time <= s.end);
        let txtGlitch = 0, txtGlow = 0, txtShift = 0, txtWave = 0;
        if (activeSeg) {
            const secKey = (sectionMapRef.current.get(activeSeg.id) || 'verse').toLowerCase() as keyof typeof config.sectionStyles;
            const secConf = config.sectionStyles?.[secKey];
            if (secConf && secConf.textEffects) {
                txtGlitch = secConf.textEffects.glitch || 0;
                txtGlow = secConf.textEffects.glow || 0;
                txtShift = secConf.textEffects.shift || 0;
                txtWave = secConf.textEffects.wave || 0;
            }
        }
        gl.uniform1f(uniforms.u_text_fx_glitch, txtGlitch);
        gl.uniform1f(uniforms.u_text_fx_glow, txtGlow);
        gl.uniform1f(uniforms.u_text_fx_shift, txtShift);
        gl.uniform1f(uniforms.u_text_fx_wave, txtWave);

        gl.uniform2f(uniforms.u_cam_offset, camX / CANVAS_WIDTH, camY / CANVAS_HEIGHT);
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

        const styles = Array.isArray(config.background.proceduralStyle) ? config.background.proceduralStyle : (config.background.proceduralStyle ? [config.background.proceduralStyle] : ['grid']);
        gl.uniform1f(uniforms.u_style_grid, styles.includes('grid') ? 1.0 : 0.0);
        gl.uniform1f(uniforms.u_style_plasma, styles.includes('plasma') ? 1.0 : 0.0);
        gl.uniform1f(uniforms.u_style_stars, styles.includes('stars') ? 1.0 : 0.0);
        gl.uniform1f(uniforms.u_style_matrix, styles.includes('matrix') ? 1.0 : 0.0);
        gl.uniform1f(uniforms.u_style_fractal, styles.includes('fractal') ? 1.0 : 0.0);
        gl.uniform1f(uniforms.u_style_hyperspace, styles.includes('hyperspace') ? 1.0 : 0.0);
        gl.uniform1f(uniforms.u_style_aurora, styles.includes('aurora') ? 1.0 : 0.0);

        const effects = config.background.imageEffects ?? [];
        const vhsOverrideVal = activeBlocks.reduce((acc, b) => b.overrides.fx_vhs === true ? Math.max(acc, blockFades.get(b.id) || 0) : acc, 0);
        gl.uniform1f(uniforms.u_fx_vhs, (vhsOverrideVal > 0 || effects.includes('vhs-stripes')) ? (vhsOverrideVal || 1.0) : 0.0);
        gl.uniform1f(uniforms.u_fx_glitch, (effects.includes('red-error') || effects.includes('dark-error')) ? 1.0 : 0.0);
        const pixelateVal = getFx('mosaic', 'mosaic');
        gl.uniform1f(uniforms.u_fx_pixelate, (effects.includes('pixel-noise') || pixelateVal > 0) ? (pixelateVal || 1.0) : 0.0);
        gl.uniform1f(uniforms.u_fx_rgb_split, getFx('rgbSplit', 'rgbSplit'));
        gl.uniform1f(uniforms.u_fx_crimson_pop, getFx('crimsonPop', 'crimsonPop'));
        gl.uniform1f(uniforms.u_fx_blood_pulse, getFx('bloodPulse', 'bloodPulse'));
        gl.uniform1f(uniforms.u_fx_red_channel_glitch, getFx('redChannelGlitch', 'redChannelGlitch'));
        const chromVal = getFx('chromaticAberration', 'chromaticAberration');
        gl.uniform1f(uniforms.u_fx_chromatic, (effects.includes('chromatic-shift') || chromVal > 0) ? (chromVal || 1.0) : 0.0);
        const thermalVal = getFx('effects' as any, 'thermal' as any);
        gl.uniform1f(uniforms.u_fx_thermal, (effects.includes('thermal') || thermalVal > 0) ? (thermalVal || 1.0) : 0.0); 
        gl.uniform1f(uniforms.u_fx_liquid, effects.includes('liquid-warp') ? 1.0 : 0.0);
        const mirrorVal = getFx('mirror', 'mirror');
        gl.uniform1f(uniforms.u_fx_mirror, (effects.includes('mirror-x') || mirrorVal > 0) ? (mirrorVal || 1.0) : 0.0);
        const scanVal = getFx('scanlines', 'scanlines');
        gl.uniform1f(uniforms.u_fx_scanlines, (effects.includes('scan-drift') || scanVal > 0) ? (scanVal || 1.0) : 0.0);
        gl.uniform1f(uniforms.u_fx_film_grain, getFx('filmGrain', 'filmGrain'));
        gl.uniform1f(uniforms.u_fx_vignette, getFx('vignette', 'vignette'));
        gl.uniform1f(uniforms.u_fx_barrel, getFx('barrelDistortion', 'barrelDistortion'));
        gl.uniform1f(uniforms.u_fx_old_movie, getFx('oldMovie', 'oldMovie'));
        gl.uniform1f(uniforms.u_fx_kaleidoscope, getFx('kaleidoscope', 'kaleidoscope'));
        gl.uniform1f(uniforms.u_fx_halftone, getFx('halftone', 'halftone'));
        gl.uniform1f(uniforms.u_fx_grayscale, getFx('grayscale', 'grayscale'));
        gl.uniform1f(uniforms.u_fx_invert_beat, getFx('invert', 'invert'));
        gl.uniform1f(uniforms.u_fx_sepia, getFx('sepia', 'sepia'));
        gl.uniform1f(uniforms.u_fx_crt, effects.includes('crt') ? 1.0 : 0.0);
        gl.uniform1f(uniforms.u_fx_neon_glow, effects.includes('neon-glow') ? 1.0 : 0.0);
        gl.uniform1f(uniforms.u_fx_cyberpunk, effects.includes('cyberpunk') ? 1.0 : 0.0);
        
        customEffects.forEach(fx => {
            if (fx.type === 'shader') {
                const uName = `u_fx_${fx.id.replace(/-/g, '_')}`;
                // @ts-ignore
                const loc = uniforms[uName];
                if (loc) {
                    const intensity = getCustomFxIntensity(fx);
                    gl.uniform1f(loc, intensity);
                }
            }
        });
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (!isAlphaRender) {
            ctx.drawImage(glCanvasRef.current!, 0, 0);
        }
    }

    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.rotate(camRot);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-camX, -camY);
    
    if (customEffects && customEffects.length > 0) {
        customEffects.forEach(fx => {
            if (fx.type === 'camera') {
                const intensity = getCustomFxIntensity(fx);
                if (intensity > 0) {
                    try {
                        const cameraFunc = new Function('ctx', 'time', 'width', 'height', 'bass', 'mid', 'high', 'intensity', fx.code);
                        cameraFunc(ctx, time, CANVAS_WIDTH, CANVAS_HEIGHT, bass, mid, high, intensity);
                    } catch (e) { }
                }
            }
        });
    }
    
    ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);

    let particlesEnabled = config.particles.enabled;
    for (const block of activeBlocks) {
        if (block.overrides.part_enabled === true) particlesEnabled = true;
        else if (block.overrides.part_enabled === false) particlesEnabled = false;
    }

    if (particlesEnabled && !isAlphaRender) {
         particlesRef.current.forEach(p => {
             const isTetris = config.particles.shape === 'tetris';
             if (isTetris) {
                 p.y += p.speed * (1 + bass * 0.5) * resolutionScale;
                 if (p.y > CANVAS_HEIGHT + 100) { p.y = -100; p.x = Math.random() * CANVAS_WIDTH; }
             } else {
                 p.x += (p.vx + Math.sin(time + p.phase) * bass) * resolutionScale;
                 p.y += (p.vy + Math.cos(time + p.phase) * bass) * resolutionScale;
                 if (p.x < -50) p.x = CANVAS_WIDTH+50; else if (p.x > CANVAS_WIDTH+50) p.x = -50;
                 if (p.y < -50) p.y = CANVAS_HEIGHT+50; else if (p.y > CANVAS_HEIGHT+50) p.y = -50;
             }

             ctx.save();
             ctx.translate(p.x, p.y);
             ctx.rotate(p.angle);
             ctx.fillStyle = p.color;
             ctx.globalAlpha = p.alpha;
             const size = p.size * (1 + high) * resolutionScale;

             if (isTetris) {
                 const shape = TETROMINOS[p.tetrominoType || 0];
                 const bs = size * 2;
                 shape.forEach((row, rY) => row.forEach((val, rX) => {
                     if(val) ctx.fillRect(rX * bs, rY * bs, bs, bs);
                 }));
             } else if (config.particles.shape === 'circle') {
                 ctx.beginPath(); ctx.arc(0,0,size,0,Math.PI*2); ctx.fill();
             } else if (config.particles.shape === 'cross') {
                 ctx.fillRect(-size/3, -size, size*2/3, size*2);
                 ctx.fillRect(-size, -size/3, size*2, size*2/3);
             } else if (config.particles.shape === 'heart') {
                 ctx.beginPath();
                 ctx.moveTo(0, size * 0.3);
                 ctx.bezierCurveTo(0, 0, -size, 0, -size, size * 0.3);
                 ctx.bezierCurveTo(-size, size, 0, size * 1.5, 0, size * 2);
                 ctx.bezierCurveTo(0, size * 1.5, size, size, size, size * 0.3);
                 ctx.bezierCurveTo(size, 0, 0, 0, 0, size * 0.3);
                 ctx.closePath();
                 ctx.fill();
             } else {
                 ctx.fillRect(-size, -size, size*2, size*2);
             }
             ctx.restore();
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