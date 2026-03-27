export interface AudioMetadata {
  filename: string;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
}

export interface CacheEntry {
  fileHash: string;
  filename: string;
  fileSize: number;
  lastModified: number;
  peaks: Uint8Array;
  metadata: AudioMetadata;
  timestamp: number;
}

export interface AnalysisResult {
  peaks: Uint8Array;
  metadata: AudioMetadata;
  audioBuffer: AudioBuffer;
}

export interface CacheStats {
  totalEntries: number;
  entries: Array<{
    filename: string;
    duration: number;
    timestamp: string;
  }>;
}

export class WaveformCache {
  dbName: string;
  storeName: string;
  db: IDBDatabase | null;
  isInitialized: boolean;

  constructor(dbName?: string, storeName?: string);
  init(): Promise<void>;
  savePeaks(file: File, peaks: Uint8Array, metadata: AudioMetadata, audioBuffer?: AudioBuffer | null): Promise<void>;
  getPeaks(file: File): Promise<CacheEntry | null>;
  deletePeaks(file: File): Promise<void>;
  clearCache(): Promise<void>;
  getStats(): Promise<CacheStats>;
  analyzeAudio(audioFile: File, audioContext: AudioContext, samplesPerPixel?: number): Promise<AnalysisResult>;
  decodeAudio(audioFile: File, audioContext: AudioContext): Promise<AudioBuffer>;
}

export const waveformCache: WaveformCache;
export default waveformCache;
