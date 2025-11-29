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
  averageFrequency: number;
  frequencyData: Uint8Array;
}