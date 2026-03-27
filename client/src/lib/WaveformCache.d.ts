/**
 * TypeScript type declarations for WaveformCache
 */

export interface WaveformPeaks {
  peaks: number[][];
  duration: number;
  sampleRate: number;
}

export interface CacheStats {
  count: number;
}

export class WaveformCache {
  constructor();
  
  init(): Promise<IDBDatabase>;
  
  generateCacheKey(file: File): Promise<string>;
  
  analyzeAudio(
    audioFile: File,
    audioContext: AudioContext,
    samplesPerPixel?: number
  ): Promise<WaveformPeaks>;
  
  savePeaks(file: File, peaks: number[][], metadata?: { duration?: number; sampleRate?: number }): Promise<string>;
  
  getPeaks(file: File): Promise<WaveformPeaks | null>;
  
  clearCache(): Promise<void>;
  
  getStats(): Promise<CacheStats>;
}

export const waveformCache: WaveformCache;
export default waveformCache;
