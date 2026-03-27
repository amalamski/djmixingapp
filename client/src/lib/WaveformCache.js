/**
 * WaveformCache - IndexedDB caching utility for waveform peaks
 * Caches decoded audio peaks to enable instant waveform rendering on repeated loads
 */

const DB_NAME = 'DJMixerWaveformCache';
const DB_VERSION = 1;
const STORE_NAME = 'waveforms';

class WaveformCache {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize IndexedDB connection
   */
  async init() {
    if (this.initialized) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[WaveformCache] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        console.log('[WaveformCache] IndexedDB initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('filename', 'filename', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[WaveformCache] Created object store:', STORE_NAME);
        }
      };
    });
  }

  /**
   * Generate a cache key from file metadata
   * Uses SHA-256 hash of file name + size + lastModified
   */
  async generateCacheKey(file) {
    const data = `${file.name}-${file.size}-${file.lastModified}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Analyze audio file and extract waveform peaks
   * @param {File} audioFile - The audio file to analyze
   * @param {AudioContext} audioContext - Web Audio API context
   * @param {number} samplesPerPixel - Resolution of waveform (default: 100)
   * @returns {Object} - { peaks, duration, sampleRate }
   */
  async analyzeAudio(audioFile, audioContext, samplesPerPixel = 100) {
    console.log('[WaveformCache] Analyzing audio file:', audioFile.name);
    
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const length = audioBuffer.length;
    
    // Calculate peaks
    const samples = length / samplesPerPixel;
    const peaks = [];
    
    for (let channel = 0; channel < channels; channel++) {
      const data = audioBuffer.getChannelData(channel);
      const channelPeaks = [];
      
      for (let i = 0; i < samples; i++) {
        const start = Math.floor(i * samples);
        const end = Math.min(start + samples, length);
        let min = 1.0;
        let max = -1.0;
        
        for (let j = start; j < end; j++) {
          const value = data[j];
          if (value < min) min = value;
          if (value > max) max = value;
        }
        
        channelPeaks.push(min);
        channelPeaks.push(max);
      }
      
      peaks.push(channelPeaks);
    }

    console.log('[WaveformCache] Analysis complete:', {
      duration: duration.toFixed(2) + 's',
      sampleRate,
      channels,
      peakCount: peaks[0]?.length || 0
    });

    return { peaks, duration, sampleRate };
  }

  /**
   * Save waveform peaks to cache
   * @param {File} file - Source audio file
   * @param {Array} peaks - Waveform peaks array
   * @param {Object} metadata - Additional metadata { duration, sampleRate }
   */
  async savePeaks(file, peaks, metadata = {}) {
    await this.init();

    const cacheKey = await this.generateCacheKey(file);
    const entry = {
      id: cacheKey,
      filename: file.name,
      size: file.size,
      lastModified: file.lastModified,
      peaks,
      duration: metadata.duration,
      sampleRate: metadata.sampleRate,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => {
        console.log('[WaveformCache] Saved peaks for:', file.name, '(key:', cacheKey.substring(0, 8) + '...)');
        resolve(cacheKey);
      };

      request.onerror = () => {
        console.error('[WaveformCache] Failed to save peaks:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Retrieve waveform peaks from cache
   * @param {File} file - Source audio file
   * @returns {Object|null} - { peaks, duration, sampleRate } or null if not found
   */
  async getPeaks(file) {
    await this.init();

    const cacheKey = await this.generateCacheKey(file);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(cacheKey);

      request.onsuccess = () => {
        if (request.result) {
          console.log('[WaveformCache] Cache HIT for:', file.name);
          resolve({
            peaks: request.result.peaks,
            duration: request.result.duration,
            sampleRate: request.result.sampleRate
          });
        } else {
          console.log('[WaveformCache] Cache MISS for:', file.name);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[WaveformCache] Failed to get peaks:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all cached entries
   */
  async clearCache() {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[WaveformCache] Cache cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('[WaveformCache] Failed to clear cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get cache statistics
   * @returns {Object} - { count, totalSize }
   */
  async getStats() {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        resolve({ count: countRequest.result });
      };

      countRequest.onerror = () => {
        reject(countRequest.error);
      };
    });
  }
}

// Export singleton instance
export const waveformCache = new WaveformCache();
export default waveformCache;
