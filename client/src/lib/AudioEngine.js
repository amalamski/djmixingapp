/**
 * AudioEngine.js - Core Web Audio API Engine
 * 
 * ARCHITECTURE PRINCIPLES:
 * - Pure JavaScript class (no React dependency)
 * - Single AudioContext instance (shared across app)
 * - Complete decoupling from React state management
 * - All audio operations happen here; React only sends commands
 * - Prevents UI re-renders from affecting audio playback
 * 
 * ROUTING GRAPH:
 * Deck A: AudioBufferSourceNode → 3-Band EQ → Gain → Crossfader → Master Out
 * Deck B: AudioBufferSourceNode → 3-Band EQ → Gain → Crossfader → Master Out
 * 
 * CROSSFADE: Equal-power algorithm prevents volume dips at center position
 */

class AudioEngine {
  constructor() {
    // Singleton pattern - only one AudioContext per app
    this.audioContext = null;
    this.masterGain = null;
    this.masterAnalyser = null;
    
    // Deck state objects
    this.decks = {
      A: this._createDeckState(),
      B: this._createDeckState(),
    };
    
    // Crossfader state (0 = Deck A, 0.5 = Center, 1 = Deck B)
    this.crossfaderPosition = 0.5;
    
    // Listeners for UI updates (React components register here)
    this.listeners = {
      onPlaybackStateChange: [],
      onCrossfaderChange: [],
      onEQChange: [],
      onGainChange: [],
      onPitchChange: [],
      onAnalyserUpdate: [],
    };
    
    // Initialize AudioContext on first use
    this._initializeAudioContext();
  }

  /**
   * Initialize the Web Audio API context and master routing
   */
  _initializeAudioContext() {
    if (this.audioContext) return;
    
    // Create AudioContext (use webkit prefix for Safari compatibility)
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass();
    
    // Create master gain node
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.8; // Prevent clipping
    this.masterGain.connect(this.audioContext.destination);
    
    // Create master analyser for visualization
    this.masterAnalyser = this.audioContext.createAnalyser();
    this.masterAnalyser.fftSize = 2048;
    this.masterGain.connect(this.masterAnalyser);
    
    console.log('AudioContext initialized:', {
      sampleRate: this.audioContext.sampleRate,
      state: this.audioContext.state,
    });
  }

  /**
   * Create a deck state object with all necessary nodes
   */
  _createDeckState() {
    return {
      // Audio buffer and source
      audioBuffer: null,
      sourceNode: null,
      
      // Playback control
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      startTime: 0,
      
      // 3-Band EQ nodes (High, Mid, Low)
      eqNodes: {
        high: null,  // Highpass filter ~3kHz
        mid: null,   // Peaking filter ~1kHz
        low: null,   // Lowpass filter ~100Hz
      },
      
      // EQ values (0-100 scale, 50 = neutral)
      eqValues: {
        high: 50,
        mid: 50,
        low: 50,
      },
      
      // Gain node for deck volume
      gainNode: null,
      gainValue: 0.8,
      
      // Pitch/playback rate
      playbackRate: 1.0,
      
      // Analyser for deck-level visualization
      analyser: null,
      
      // Cue point (for cueing before mixing)
      cuePoint: 0,
    };
  }

  /**
   * Load an audio file into a specific deck
   * @param {string} deckId - 'A' or 'B'
   * @param {File} audioFile - Audio file from drag-drop
   * @returns {Promise<void>}
   */
  async loadAudioFile(deckId, audioFile) {
    const deck = this.decks[deckId];
    if (!deck) throw new Error(`Invalid deck: ${deckId}`);
    
    // Resume AudioContext if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    try {
      // Decode audio file to AudioBuffer
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Stop any currently playing audio on this deck
      if (deck.sourceNode) {
        try {
          deck.sourceNode.stop();
        } catch (e) {
          // Already stopped, ignore
        }
        deck.sourceNode.disconnect();
      }
      
      // Create EQ nodes if they don't exist
      if (!deck.eqNodes.high) {
        this._createEQNodes(deckId);
      }
      
      // Store audio buffer
      deck.audioBuffer = audioBuffer;
      deck.duration = audioBuffer.duration;
      deck.currentTime = 0;
      deck.isPlaying = false;
      
      console.log(`Audio loaded into Deck ${deckId}:`, {
        filename: audioFile.name,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
      });
      
      this._notifyListeners('onPlaybackStateChange', { deckId, state: 'loaded' });
    } catch (error) {
      console.error(`Error decoding audio for Deck ${deckId}:`, error);
      throw error;
    }
  }

  /**
   * Create 3-band EQ nodes for a deck
   */
  _createEQNodes(deckId) {
    const deck = this.decks[deckId];
    
    // Low EQ: Lowshelf filter around 100Hz
    deck.eqNodes.low = this.audioContext.createBiquadFilter();
    deck.eqNodes.low.type = 'lowshelf';
    deck.eqNodes.low.frequency.value = 100;
    deck.eqNodes.low.gain.value = 0;
    
    // Mid EQ: Peaking filter around 1kHz
    deck.eqNodes.mid = this.audioContext.createBiquadFilter();
    deck.eqNodes.mid.type = 'peaking';
    deck.eqNodes.mid.frequency.value = 1000;
    deck.eqNodes.mid.Q.value = 0.5;
    deck.eqNodes.mid.gain.value = 0;
    
    // High EQ: Highshelf filter around 3kHz
    deck.eqNodes.high = this.audioContext.createBiquadFilter();
    deck.eqNodes.high.type = 'highshelf';
    deck.eqNodes.high.frequency.value = 3000;
    deck.eqNodes.high.gain.value = 0;
    
    // Gain node for deck volume
    deck.gainNode = this.audioContext.createGain();
    deck.gainNode.gain.value = deck.gainValue;
    
    // Analyser for deck visualization
    deck.analyser = this.audioContext.createAnalyser();
    deck.analyser.fftSize = 2048;
    deck.gainNode.connect(deck.analyser);
    
    // Connect gain to master
    deck.gainNode.connect(this.masterGain);
    
    // Connect EQ chain
    deck.eqNodes.low.connect(deck.eqNodes.mid);
    deck.eqNodes.mid.connect(deck.eqNodes.high);
    deck.eqNodes.high.connect(deck.gainNode);
  }

  /**
   * Play audio on a specific deck
   * @param {string} deckId - 'A' or 'B'
   */
  play(deckId) {
    const deck = this.decks[deckId];
    if (!deck || !deck.audioBuffer) {
      console.warn(`Cannot play: Deck ${deckId} has no audio loaded`);
      return;
    }
    
    if (deck.isPlaying) {
      console.warn(`Deck ${deckId} is already playing`);
      return;
    }
    
    // Resume AudioContext if suspended (required by browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    try {
      // Stop existing source if any
      if (deck.sourceNode) {
        try {
          deck.sourceNode.stop();
        } catch (e) {
          // Already stopped
        }
        deck.sourceNode.disconnect();
      }
      
      // Create new source node
      deck.sourceNode = this.audioContext.createBufferSource();
      deck.sourceNode.buffer = deck.audioBuffer;
      deck.sourceNode.playbackRate.value = deck.playbackRate;
      
      // Connect to EQ chain
      deck.sourceNode.connect(deck.eqNodes.low);
      
      // Start playback from current time
      deck.startTime = this.audioContext.currentTime - deck.currentTime;
      deck.sourceNode.start(0, deck.currentTime);
      
      // Handle when source finishes
      deck.sourceNode.onended = () => {
        deck.isPlaying = false;
        this._notifyListeners('onPlaybackStateChange', { deckId, state: 'ended' });
      };
      
      deck.isPlaying = true;
      
      console.log(`Deck ${deckId} playing from ${deck.currentTime}s`);
      this._notifyListeners('onPlaybackStateChange', { deckId, state: 'playing' });
    } catch (error) {
      console.error(`Error playing Deck ${deckId}:`, error);
    }
  }

  /**
   * Pause audio on a specific deck
   * @param {string} deckId - 'A' or 'B'
   */
  pause(deckId) {
    const deck = this.decks[deckId];
    if (!deck || !deck.sourceNode) return;
    
    try {
      // Store current playback position
      deck.currentTime = this.audioContext.currentTime - deck.startTime;
      
      // Stop the source
      deck.sourceNode.stop();
      deck.sourceNode.disconnect();
      deck.sourceNode = null;
      
      deck.isPlaying = false;
      
      console.log(`Deck ${deckId} paused at ${deck.currentTime}s`);
      this._notifyListeners('onPlaybackStateChange', { deckId, state: 'paused' });
    } catch (error) {
      console.error(`Error pausing Deck ${deckId}:`, error);
    }
  }

  /**
   * Set playback position (seek)
   * @param {string} deckId - 'A' or 'B'
   * @param {number} time - Time in seconds
   */
  seek(deckId, time) {
    const deck = this.decks[deckId];
    if (!deck || !deck.audioBuffer) return;
    
    // Clamp time to valid range
    deck.currentTime = Math.max(0, Math.min(time, deck.duration));
    
    // If playing, restart from new position
    if (deck.isPlaying) {
      this.pause(deckId);
      this.play(deckId);
    }
  }

  /**
   * Set EQ value for a specific band
   * @param {string} deckId - 'A' or 'B'
   * @param {string} band - 'high', 'mid', or 'low'
   * @param {number} value - 0-100 scale (50 = neutral)
   */
  setEQ(deckId, band, value) {
    const deck = this.decks[deckId];
    if (!deck || !deck.eqNodes[band]) return;
    
    // Convert 0-100 scale to dB gain (-12 to +12)
    const gainDb = (value - 50) * 0.48; // 0.48dB per unit
    
    // Smooth gain transition (100ms)
    const now = this.audioContext.currentTime;
    deck.eqNodes[band].gain.setTargetAtTime(gainDb, now, 0.05);
    
    deck.eqValues[band] = value;
    
    this._notifyListeners('onEQChange', { deckId, band, value });
  }

  /**
   * Set deck volume
   * @param {string} deckId - 'A' or 'B'
   * @param {number} value - 0-100 scale
   */
  setGain(deckId, value) {
    const deck = this.decks[deckId];
    if (!deck || !deck.gainNode) return;
    
    // Convert 0-100 to 0-1 range
    const gainValue = value / 100;
    
    // Smooth gain transition
    const now = this.audioContext.currentTime;
    deck.gainNode.gain.setTargetAtTime(gainValue, now, 0.05);
    
    deck.gainValue = gainValue;
    
    this._notifyListeners('onGainChange', { deckId, value });
  }

  /**
   * Set pitch/playback rate (without affecting tempo)
   * @param {string} deckId - 'A' or 'B'
   * @param {number} semitones - Pitch shift in semitones (-12 to +12)
   */
  setPitch(deckId, semitones) {
    const deck = this.decks[deckId];
    if (!deck) return;
    
    // Convert semitones to playback rate
    // Each semitone = 2^(1/12) ≈ 1.0595
    const playbackRate = Math.pow(2, semitones / 12);
    
    // Clamp playback rate to reasonable range
    const clampedRate = Math.max(0.5, Math.min(2.0, playbackRate));
    
    deck.playbackRate = clampedRate;
    
    // Update source if currently playing
    if (deck.sourceNode) {
      deck.sourceNode.playbackRate.value = clampedRate;
    }
    
    this._notifyListeners('onPitchChange', { deckId, semitones });
  }

  /**
   * Set crossfader position
   * Uses equal-power crossfade algorithm to prevent volume dips
   * @param {number} value - 0-100 scale (0 = Deck A, 50 = Center, 100 = Deck B)
   */
  setCrossfader(value) {
    // Normalize to 0-1 range
    const position = value / 100;
    this.crossfaderPosition = position;
    
    // Equal-power crossfade: prevents volume dip at center
    // Deck A gain: cos(position * π/2)
    // Deck B gain: sin(position * π/2)
    const deckAGain = Math.cos(position * Math.PI / 2);
    const deckBGain = Math.sin(position * Math.PI / 2);
    
    // Apply gains with smooth transitions
    const now = this.audioContext.currentTime;
    const smoothTime = 0.05; // 50ms smooth transition
    
    this.decks.A.gainNode.gain.setTargetAtTime(deckAGain * this.decks.A.gainValue, now, smoothTime);
    this.decks.B.gainNode.gain.setTargetAtTime(deckBGain * this.decks.B.gainValue, now, smoothTime);
    
    this._notifyListeners('onCrossfaderChange', { value });
  }

  /**
   * Get current playback time for a deck
   * @param {string} deckId - 'A' or 'B'
   * @returns {number} Current time in seconds
   */
  getCurrentTime(deckId) {
    const deck = this.decks[deckId];
    if (!deck) return 0;
    
    if (deck.isPlaying && deck.sourceNode) {
      return this.audioContext.currentTime - deck.startTime;
    }
    
    return deck.currentTime;
  }

  /**
   * Get deck duration
   * @param {string} deckId - 'A' or 'B'
   * @returns {number} Duration in seconds
   */
  getDuration(deckId) {
    const deck = this.decks[deckId];
    if (!deck) return 0;
    return deck.duration;
  }

  /**
   * Get frequency data from master output for visualization
   * @returns {Uint8Array} Frequency data
   */
  getFrequencyData() {
    if (!this.masterAnalyser) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * Get frequency data from a specific deck
   * @param {string} deckId - 'A' or 'B'
   * @returns {Uint8Array} Frequency data
   */
  getDeckFrequencyData(deckId) {
    const deck = this.decks[deckId];
    if (!deck || !deck.analyser) return new Uint8Array(0);
    const dataArray = new Uint8Array(deck.analyser.frequencyBinCount);
    deck.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * Register a listener for audio engine events
   * @param {string} eventType - Event type (e.g., 'onPlaybackStateChange')
   * @param {Function} callback - Callback function
   */
  on(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].push(callback);
    }
  }

  /**
   * Unregister a listener
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   */
  off(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    }
  }

  /**
   * Notify all listeners of an event
   * @private
   */
  _notifyListeners(eventType, data) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Get current AudioContext state
   * @returns {Object} Engine state
   */
  getState() {
    return {
      audioContextState: this.audioContext?.state,
      sampleRate: this.audioContext?.sampleRate,
      crossfaderPosition: this.crossfaderPosition,
      decks: {
        A: {
          isPlaying: this.decks.A.isPlaying,
          currentTime: this.getCurrentTime('A'),
          duration: this.getDuration('A'),
          gainValue: this.decks.A.gainValue,
          playbackRate: this.decks.A.playbackRate,
          eqValues: this.decks.A.eqValues,
        },
        B: {
          isPlaying: this.decks.B.isPlaying,
          currentTime: this.getCurrentTime('B'),
          duration: this.getDuration('B'),
          gainValue: this.decks.B.gainValue,
          playbackRate: this.decks.B.playbackRate,
          eqValues: this.decks.B.eqValues,
        },
      },
    };
  }
}

// Export singleton instance
export const audioEngine = new AudioEngine();

export default audioEngine;
