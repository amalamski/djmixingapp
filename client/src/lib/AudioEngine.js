/**
 * AudioEngine - Core Web Audio API engine
 * Completely decoupled from React - pure JavaScript class
 * Handles all audio routing, playback, and effects
 */

class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.decks = {};
    this.masterGain = null;
    this.masterAnalyser = null;
    this.crossfaderValue = 50; // 0-100, 50 = center
    this.eventListeners = {};
    this.initialized = false;
  }

  /**
   * Initialize the audio engine
   * Must be called after user interaction (browser autoplay policy)
   */
  async init() {
    if (this.initialized) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext();
    
    // Create master gain and analyser
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 1.0;
    
    this.masterAnalyser = this.audioContext.createAnalyser();
    this.masterAnalyser.fftSize = 256;
    
    // Connect to destination
    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.audioContext.destination);
    
    // Initialize both decks
    this._createDeck('A');
    this._createDeck('B');
    
    this.initialized = true;
    console.log('[AudioEngine] Initialized with AudioContext sample rate:', this.audioContext.sampleRate);
  }

  /**
   * Create a deck with full signal chain
   * MediaElementAudioSource -> EQ (Low, Mid, High) -> Gain -> Crossfader
   */
  _createDeck(deckId) {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    
    const sourceNode = this.audioContext.createMediaElementSource(audio);
    
    // Create 3-band EQ
    const lowEQ = this.audioContext.createBiquadFilter();
    lowEQ.type = 'lowshelf';
    lowEQ.frequency.value = 100;
    lowEQ.gain.value = 0;
    
    const midEQ = this.audioContext.createBiquadFilter();
    midEQ.type = 'peaking';
    midEQ.frequency.value = 1000;
    midEQ.Q.value = 1;
    midEQ.gain.value = 0;
    
    const highEQ = this.audioContext.createBiquadFilter();
    highEQ.type = 'highshelf';
    highEQ.frequency.value = 3000;
    highEQ.gain.value = 0;
    
    // Create deck gain node
    const deckGain = this.audioContext.createGain();
    deckGain.gain.value = 1.0;
    
    // Connect the signal chain
    sourceNode.connect(lowEQ);
    lowEQ.connect(midEQ);
    midEQ.connect(highEQ);
    highEQ.connect(deckGain);
    
    // Store deck references
    this.decks[deckId] = {
      audio,
      sourceNode,
      lowEQ,
      midEQ,
      highEQ,
      deckGain,
      isPlaying: false,
      pitch: 0, // semitones
      gain: 100 // 0-100 scale
    };
    
    // Connect deck to crossfader (will be updated when crossfader changes)
    this._updateCrossfaderConnections();
    
    console.log('[AudioEngine] Created deck:', deckId);
  }

  /**
   * Update crossfader connections using equal-power algorithm
   */
  _updateCrossfaderConnections() {
    const position = this.crossfaderValue / 100; // 0 to 1
    
    // Equal-power crossfade: cos/sin prevents volume dip at center
    const deckAGain = Math.cos(position * Math.PI / 2);
    const deckBGain = Math.sin(position * Math.PI / 2);
    
    // Disconnect previous connections
    if (this.decks.A) {
      try {
        this.decks.A.deckGain.disconnect();
      } catch (e) {
        // Already disconnected
      }
    }
    if (this.decks.B) {
      try {
        this.decks.B.deckGain.disconnect();
      } catch (e) {
        // Already disconnected
      }
    }
    
    // Reconnect with appropriate gain
    if (this.decks.A) {
      const crossfadeGainA = this.audioContext.createGain();
      crossfadeGainA.gain.value = deckAGain;
      this.decks.A.deckGain.connect(crossfadeGainA);
      crossfadeGainA.connect(this.masterGain);
      this.decks.A.crossfadeGain = crossfadeGainA;
    }
    
    if (this.decks.B) {
      const crossfadeGainB = this.audioContext.createGain();
      crossfadeGainB.gain.value = deckBGain;
      this.decks.B.deckGain.connect(crossfadeGainB);
      crossfadeGainB.connect(this.masterGain);
      this.decks.B.crossfadeGain = crossfadeGainB;
    }
    
    this._emit('onCrossfaderChange', { 
      value: this.crossfaderValue,
      deckAGain,
      deckBGain
    });
  }

  /**
   * Load an audio file into a deck
   * @param {string} deckId - 'A' or 'B'
   * @param {File} audioFile - Audio file to load
   * @returns {Promise<{duration: number}>}
   */
  async loadAudioFile(deckId, audioFile) {
    if (!this.initialized) await this.init();
    
    const deck = this.decks[deckId];
    if (!deck) throw new Error(`Deck ${deckId} does not exist`);
    
    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Create object URL for the file
    const url = URL.createObjectURL(audioFile);
    deck.audio.src = url;
    
    // Clean up old URL if exists
    if (deck.objectUrl) {
      URL.revokeObjectURL(deck.objectUrl);
    }
    deck.objectUrl = url;
    
    // Wait for metadata to load
    await new Promise((resolve, reject) => {
      deck.audio.onloadedmetadata = () => resolve();
      deck.audio.onerror = reject;
    });
    
    this._emit('onPlaybackStateChange', {
      deckId,
      isPlaying: false,
      duration: deck.audio.duration
    });
    
    console.log('[AudioEngine] Loaded file into deck', deckId, ':', audioFile.name);
    
    return { duration: deck.audio.duration };
  }

  /**
   * Start playback on a deck
   * @param {string} deckId - 'A' or 'B'
   */
  play(deckId) {
    const deck = this.decks[deckId];
    if (!deck) throw new Error(`Deck ${deckId} does not exist`);
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    deck.audio.play();
    deck.isPlaying = true;
    
    this._emit('onPlaybackStateChange', {
      deckId,
      isPlaying: true,
      currentTime: deck.audio.currentTime,
      duration: deck.audio.duration
    });
    
    console.log('[AudioEngine] Playing deck:', deckId);
  }

  /**
   * Pause playback on a deck
   * @param {string} deckId - 'A' or 'B'
   */
  pause(deckId) {
    const deck = this.decks[deckId];
    if (!deck) throw new Error(`Deck ${deckId} does not exist`);
    
    deck.audio.pause();
    deck.isPlaying = false;
    
    this._emit('onPlaybackStateChange', {
      deckId,
      isPlaying: false,
      currentTime: deck.audio.currentTime
    });
    
    console.log('[AudioEngine] Paused deck:', deckId);
  }

  /**
   * Seek to a specific time in the track
   * @param {string} deckId - 'A' or 'B'
   * @param {number} time - Time in seconds
   */
  seek(deckId, time) {
    const deck = this.decks[deckId];
    if (!deck) throw new Error(`Deck ${deckId} does not exist`);
    
    deck.audio.currentTime = time;
    
    this._emit('onPlaybackStateChange', {
      deckId,
      currentTime: time,
      duration: deck.audio.duration
    });
  }

  /**
   * Set EQ for a deck
   * @param {string} deckId - 'A' or 'B'
   * @param {string} band - 'low', 'mid', or 'high'
   * @param {number} value - Value from 0-100 (50 = neutral)
   */
  setEQ(deckId, band, value) {
    const deck = this.decks[deckId];
    if (!deck) throw new Error(`Deck ${deckId} does not exist`);
    
    // Convert 0-100 scale to dB (-20 to +20)
    const dbValue = (value - 50) * 0.4;
    
    const eqNode = band === 'low' ? deck.lowEQ : band === 'mid' ? deck.midEQ : deck.highEQ;
    
    // Smooth transition to prevent clicks
    eqNode.gain.setTargetAtTime(dbValue, this.audioContext.currentTime, 0.01);
    
    this._emit('onEQChange', {
      deckId,
      band,
      value,
      dbValue
    });
  }

  /**
   * Set gain for a deck
   * @param {string} deckId - 'A' or 'B'
   * @param {number} value - Value from 0-100
   */
  setGain(deckId, value) {
    const deck = this.decks[deckId];
    if (!deck) throw new Error(`Deck ${deckId} does not exist`);
    
    deck.gain = value;
    const linearGain = value / 100;
    
    // Smooth transition
    deck.deckGain.gain.setTargetAtTime(linearGain, this.audioContext.currentTime, 0.01);
    
    this._emit('onGainChange', {
      deckId,
      value,
      linearGain
    });
  }

  /**
   * Set pitch/tempo for a deck
   * @param {string} deckId - 'A' or 'B'
   * @param {number} semitones - Pitch shift in semitones (-12 to +12)
   */
  setPitch(deckId, semitones) {
    const deck = this.decks[deckId];
    if (!deck) throw new Error(`Deck ${deckId} does not exist`);
    
    deck.pitch = semitones;
    
    // Convert semitones to playback rate
    // Each semitone = 2^(1/12) ≈ 1.0595
    const playbackRate = Math.pow(2, semitones / 12);
    
    deck.audio.playbackRate = playbackRate;
    
    this._emit('onPitchChange', {
      deckId,
      semitones,
      playbackRate
    });
  }

  /**
   * Set crossfader position
   * @param {number} value - Position from 0-100 (50 = center)
   */
  setCrossfader(value) {
    this.crossfaderValue = Math.max(0, Math.min(100, value));
    this._updateCrossfaderConnections();
  }

  /**
   * Get current playback state for a deck
   * @param {string} deckId - 'A' or 'B'
   * @returns {Object} - { isPlaying, currentTime, duration }
   */
  getPlaybackState(deckId) {
    const deck = this.decks[deckId];
    if (!deck) return null;
    
    return {
      isPlaying: deck.isPlaying,
      currentTime: deck.audio.currentTime,
      duration: deck.audio.duration
    };
  }

  /**
   * Get frequency data from master analyser for visualization
   * @returns {Uint8Array} - Frequency data array
   */
  getFrequencyData() {
    if (!this.masterAnalyser) return new Uint8Array(0);
    
    const dataArray = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * Register an event listener
   * @param {string} eventType - Event type (onPlaybackStateChange, onEQChange, etc.)
   * @param {Function} callback - Callback function
   */
  on(eventType, callback) {
    if (!this.eventListeners[eventType]) {
      this.eventListeners[eventType] = [];
    }
    this.eventListeners[eventType].push(callback);
  }

  /**
   * Remove an event listener
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function to remove
   */
  off(eventType, callback) {
    if (!this.eventListeners[eventType]) return;
    
    this.eventListeners[eventType] = this.eventListeners[eventType].filter(
      cb => cb !== callback
    );
  }

  /**
   * Emit an event to all listeners
   * @private
   */
  _emit(eventType, data) {
    if (this.eventListeners[eventType]) {
      this.eventListeners[eventType].forEach(callback => callback(data));
    }
  }

  /**
   * Get the underlying AudioContext (for waveform analysis)
   * @returns {AudioContext}
   */
  getAudioContext() {
    return this.audioContext;
  }

  /**
   * Get the HTMLAudioElement for a deck (for wavesurfer integration)
   * @param {string} deckId - 'A' or 'B'
   * @returns {HTMLAudioElement}
   */
  getAudioElement(deckId) {
    const deck = this.decks[deckId];
    return deck ? deck.audio : null;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    Object.values(this.decks).forEach(deck => {
      if (deck.objectUrl) {
        URL.revokeObjectURL(deck.objectUrl);
      }
      deck.audio.pause();
      deck.audio.src = '';
      
      // Disconnect nodes
      try {
        deck.sourceNode.disconnect();
        deck.lowEQ.disconnect();
        deck.midEQ.disconnect();
        deck.highEQ.disconnect();
        deck.deckGain.disconnect();
        if (deck.crossfadeGain) deck.crossfadeGain.disconnect();
      } catch (e) {
        // Already disconnected
      }
    });
    
    if (this.masterAnalyser) {
      this.masterAnalyser.disconnect();
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.decks = {};
    this.eventListeners = {};
    this.initialized = false;
    
    console.log('[AudioEngine] Destroyed');
  }
}

// Export singleton instance
export const audioEngine = new AudioEngine();
export default audioEngine;
