
export interface Word {
  word: string;
  start: number;
  end: number;
  probability: number;
  line_number: number;
}

export interface Segment {
  id: string;
  start: number;
  end: number;
  text: string;
  words: Word[];
}

export interface LyricData {
  createdAt?: string;
  segments: Segment[];
}

export interface AudioVisualizerData {
  bass: number;
  mid: number;
  high: number;
  raw: Uint8Array;
}

export interface RenderStatus {
  state: 'idle' | 'analyzing' | 'rendering' | 'encoding' | 'done';
  progress: number;
  totalFrames?: number;
}
