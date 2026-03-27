/**
 * WaveformCache.js - IndexedDB Utility for Waveform Peak Caching
 * 
 * PURPOSE:
 * - Cache waveform peaks and audio metadata in IndexedDB
 * - Avoid re-decoding/re-analyzing the same audio files
 * - Enable instant waveform rendering on repeated file loads
 * 
 * DATABASE SCHEMA:
 * - Store: "audioFiles" - Stores file metadata and waveform peaks
 * - Key: File hash (SHA-256 of file name + size + last modified)
 * - Value: { peaks, metadata, timestamp, audioBuffer }
 */

class WaveformCache {
  constructor(dbName = 'DJMixerDB', storeName = 'audioFiles') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize IndexedDB connection
   * @returns {Promise<void>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('IndexedDB initialization failed:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB initialized:', this.dbName);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'fileHash' });
          
          // Create indices for faster queries
          objectStore.createIndex('filename', 'metadata.filename', { unique: false });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          
          console.log(`Created object store: ${this.storeName}`);
        }
      };
    });
  }

  /**
   * Generate a unique hash for a file
   * Uses SHA-256 for consistent hashing
   * @param {File} file - Audio file
   * @returns {Promise<string>} File hash
   */
  async _generateFileHash(file) {
    const buffer = await file.slice(0, 1024 * 1024).arrayBuffer(); // Hash first 1MB
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Save waveform peaks and metadata to cache
   * @param {File} file - Audio file
   * @param {Uint8Array} peaks - Waveform peak data
   * @param {Object} metadata - Audio metadata (duration, sampleRate, etc.)
   * @param {AudioBuffer} audioBuffer - Decoded audio buffer (optional, for re-use)
   * @returns {Promise<void>}
   */
  async savePeaks(file, peaks, metadata, audioBuffer = null) {
    if (!this.isInitialized) await this.init();

    const fileHash = await this._generateFileHash(file);
    
    const cacheEntry = {
      fileHash,
      filename: file.name,
      fileSize: file.size,
      lastModified: file.lastModified,
      peaks: peaks, // Store as Uint8Array
      metadata: {
        filename: file.name,
        duration: metadata.duration,
        sampleRate: metadata.sampleRate,
        numberOfChannels: metadata.numberOfChannels,
        length: metadata.length,
      },
      timestamp: Date.now(),
      // Optionally store the full AudioBuffer for instant playback
      // Note: AudioBuffer cannot be directly serialized, so we skip it
      // Instead, we'll re-decode from the file on load
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.put(cacheEntry);

      request.onerror = () => {
        console.error('Failed to save peaks to cache:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log(`Peaks cached for: ${file.name} (hash: ${fileHash})`);
        resolve();
      };
    });
  }

  /**
   * Retrieve cached peaks for a file
   * @param {File} file - Audio file
   * @returns {Promise<Object|null>} Cached entry or null if not found
   */
  async getPeaks(file) {
    if (!this.isInitialized) await this.init();

    const fileHash = await this._generateFileHash(file);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(fileHash);

      request.onerror = () => {
        console.error('Failed to retrieve peaks from cache:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        if (request.result) {
          console.log(`Peaks retrieved from cache: ${file.name}`);
          resolve(request.result);
        } else {
          console.log(`No cached peaks found for: ${file.name}`);
          resolve(null);
        }
      };
    });
  }

  /**
   * Delete cached entry for a file
   * @param {File} file - Audio file
   * @returns {Promise<void>}
   */
  async deletePeaks(file) {
    if (!this.isInitialized) await this.init();

    const fileHash = await this._generateFileHash(file);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(fileHash);

      request.onerror = () => {
        console.error('Failed to delete peaks from cache:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log(`Deleted cached peaks for: ${file.name}`);
        resolve();
      };
    });
  }

  /**
   * Clear all cached entries
   * @returns {Promise<void>}
   */
  async clearCache() {
    if (!this.isInitialized) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.clear();

      request.onerror = () => {
        console.error('Failed to clear cache:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('Cache cleared');
        resolve();
      };
    });
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats (count, size, etc.)
   */
  async getStats() {
    if (!this.isInitialized) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.getAll();

      request.onerror = () => {
        console.error('Failed to get cache stats:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const entries = request.result;
        const stats = {
          totalEntries: entries.length,
          entries: entries.map(entry => ({
            filename: entry.metadata.filename,
            duration: entry.metadata.duration,
            timestamp: new Date(entry.timestamp).toLocaleString(),
          })),
        };
        resolve(stats);
      };
    });
  }

  /**
   * Analyze audio file and generate waveform peaks
   * @param {File} audioFile - Audio file to analyze
   * @param {AudioContext} audioContext - Web Audio API context
   * @param {number} samplesPerPixel - Resolution of peak data (default: 512)
   * @returns {Promise<Object>} { peaks, metadata }
   */
  async analyzeAudio(audioFile, audioContext, samplesPerPixel = 512) {
    // Decode audio file
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Extract peaks from audio buffer
    const peaks = this._extractPeaks(audioBuffer, samplesPerPixel);

    // Collect metadata
    const metadata = {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      length: audioBuffer.length,
    };

    return { peaks, metadata, audioBuffer };
  }

  /**
   * Extract peak data from audio buffer
   * Calculates min/max values for each sample bucket
   * @private
   * @param {AudioBuffer} audioBuffer - Decoded audio buffer
   * @param {number} samplesPerPixel - Samples per peak point
   * @returns {Uint8Array} Peak data (0-255 range)
   */
  _extractPeaks(audioBuffer, samplesPerPixel) {
    const rawData = audioBuffer.getChannelData(0); // Use first channel
    const blockSize = Math.floor(rawData.length / samplesPerPixel);
    const peaks = new Uint8Array(samplesPerPixel);

    for (let i = 0; i < samplesPerPixel; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[i * blockSize + j]);
      }
      // Normalize to 0-255 range
      peaks[i] = Math.min(255, Math.floor((sum / blockSize) * 255));
    }

    return peaks;
  }

  /**
   * Decode audio file to AudioBuffer (without caching)
   * @param {File} audioFile - Audio file
   * @param {AudioContext} audioContext - Web Audio API context
   * @returns {Promise<AudioBuffer>}
   */
  async decodeAudio(audioFile, audioContext) {
    const arrayBuffer = await audioFile.arrayBuffer();
    return audioContext.decodeAudioData(arrayBuffer);
  }
}

// Export singleton instance
export const waveformCache = new WaveformCache();

export default waveformCache;
