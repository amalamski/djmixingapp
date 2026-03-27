/**
 * Deck.tsx - Individual Deck Component (Redesigned)
 * 
 * Modern, easy-to-use interface with improved visual hierarchy
 * - Large, touch-friendly controls
 * - Clear visual feedback
 * - Intuitive drag-and-drop
 * - Responsive layout
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import audioEngine from '@/lib/AudioEngine';
import waveformCache from '@/lib/WaveformCache';
import useWavesurfer from '@/hooks/useWavesurfer';
import { Play, Pause, RotateCcw, Music } from 'lucide-react';

interface DeckProps {
  deckId: 'A' | 'B';
  onFileLoaded?: (filename: string) => void;
}

interface DeckState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  filename: string;
  isLoading: boolean;
}

const Deck = React.memo(({ deckId, onFileLoaded }: DeckProps) => {
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const wavesurferReadyRef = useRef(false);
  
  const [deckState, setDeckState] = useState<DeckState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    filename: 'No file loaded',
    isLoading: false,
  });

  // Initialize Wavesurfer with a small delay to ensure DOM is ready
  const { loadAudio: loadAudioToWavesurfer } = useWavesurfer({
    deckId,
    container: waveformContainerRef.current,
    onReady: () => {
      wavesurferReadyRef.current = true;
      console.log(`✓ Wavesurfer ready for Deck ${deckId}`);
    },
    onError: (error) => {
      console.error(`Wavesurfer error on Deck ${deckId}:`, error);
    },
  });

  /**
   * Handle file drop on deck - with comprehensive error handling
   */
  const handleFileDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Remove drag-over styling
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('drag-over');
    }
    
    const files = event.dataTransfer.files;
    if (files.length === 0) {
      console.warn('No files in drag event');
      return;
    }
    
    const audioFile = files[0];
    
    // Validate file type
    if (!audioFile.type.startsWith('audio/')) {
      console.warn('Invalid file type:', audioFile.type);
      alert('Please drop an audio file (.mp3, .wav, etc.)');
      return;
    }

    // Wait for Wavesurfer to be ready
    if (!wavesurferReadyRef.current) {
      console.warn('Wavesurfer not ready yet');
      alert('Waveform display is still initializing. Please try again in a moment.');
      return;
    }
    
    setDeckState(prev => ({ ...prev, isLoading: true }));
    
    try {
      console.log(`Loading audio file to Deck ${deckId}:`, audioFile.name);
      
      // Load audio into AudioEngine
      await audioEngine.loadAudioFile(deckId, audioFile);
      console.log(`✓ AudioEngine loaded: ${audioFile.name}`);
      
      // Load into Wavesurfer for visualization
      await loadAudioToWavesurfer(audioFile);
      console.log(`✓ Wavesurfer loaded: ${audioFile.name}`);
      
      // Analyze and cache waveform peaks
      if (!audioEngine.audioContext) {
        throw new Error('AudioContext not initialized');
      }
      
      const { peaks, metadata } = await waveformCache.analyzeAudio(
        audioFile,
        audioEngine.audioContext,
        512
      );
      
      // Save to cache for instant loading next time
      await waveformCache.savePeaks(audioFile, peaks, metadata);
      console.log(`✓ Waveform cached for: ${audioFile.name}`);
      
      // Update deck state
      const duration = audioEngine.getDuration(deckId);
      setDeckState(prev => ({
        ...prev,
        filename: audioFile.name,
        duration: duration,
        isLoading: false,
      }));
      
      onFileLoaded?.(audioFile.name);
      
      console.log(`✓ Deck ${deckId} ready:`, {
        filename: audioFile.name,
        duration: duration,
      });
    } catch (error) {
      console.error(`✗ Error loading audio file to Deck ${deckId}:`, error);
      alert(`Error loading audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDeckState(prev => ({ ...prev, isLoading: false }));
    }
  }, [deckId, onFileLoaded, loadAudioToWavesurfer]);

  /**
   * Handle drag over effect
   */
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add('drag-over');
    }
  }, []);

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('drag-over');
    }
  }, []);

  /**
   * Play button handler
   */
  const handlePlay = useCallback(() => {
    if (deckState.duration === 0) {
      alert('No audio loaded. Please drop an audio file first.');
      return;
    }
    audioEngine.play(deckId);
    setDeckState(prev => ({ ...prev, isPlaying: true }));
  }, [deckId, deckState.duration]);

  /**
   * Pause button handler
   */
  const handlePause = useCallback(() => {
    audioEngine.pause(deckId);
    setDeckState(prev => ({ ...prev, isPlaying: false }));
  }, [deckId]);

  /**
   * Cue button handler (reset to start)
   */
  const handleCue = useCallback(() => {
    audioEngine.seek(deckId, 0);
    audioEngine.pause(deckId);
    setDeckState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, [deckId]);

  /**
   * Listen to AudioEngine events
   */
  useEffect(() => {
    const handlePlaybackStateChange = (data: any) => {
      if (data.deckId === deckId) {
        if (data.state === 'playing') {
          setDeckState(prev => ({ ...prev, isPlaying: true }));
        } else if (data.state === 'paused' || data.state === 'ended') {
          setDeckState(prev => ({ ...prev, isPlaying: false }));
        }
      }
    };

    audioEngine.on('onPlaybackStateChange', handlePlaybackStateChange);

    return () => {
      audioEngine.off('onPlaybackStateChange', handlePlaybackStateChange);
    };
  }, [deckId]);

  /**
   * Update playback time periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = audioEngine.getCurrentTime(deckId);
      setDeckState(prev => ({ ...prev, currentTime }));
    }, 100);

    return () => clearInterval(interval);
  }, [deckId]);

  /**
   * Format time as MM:SS
   */
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Calculate progress percentage
   */
  const progressPercent = deckState.duration > 0 
    ? (deckState.currentTime / deckState.duration) * 100 
    : 0;

  return (
    <div className="deck-container">
      {/* Deck Header */}
      <div className="deck-header">
        <div className="deck-label-section">
          <div className="deck-badge">{deckId}</div>
          <div>
            <h2 className="deck-title">DECK {deckId}</h2>
            <p className="deck-filename">
              {deckState.filename === 'No file loaded' ? (
                <span className="text-muted">Drop audio file here</span>
              ) : (
                deckState.filename
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Waveform Display */}
      <div
        ref={dropZoneRef}
        className={`waveform-drop-zone ${deckState.isLoading ? 'loading' : ''}`}
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnter={handleDragOver}
      >
        {deckState.isLoading ? (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Loading audio...</span>
          </div>
        ) : (
          <>
            <div ref={waveformContainerRef} className="waveform-container" />
            {deckState.duration === 0 && (
              <div className="drop-hint">
                <Music size={32} strokeWidth={1.5} />
                <p>Drop your track here</p>
                <p className="drop-hint-small">.mp3 • .wav • .ogg</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Progress Bar */}
      {deckState.duration > 0 && (
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Time Display */}
      <div className="time-display">
        <span className="current-time">{formatTime(deckState.currentTime)}</span>
        <span className="time-separator">•</span>
        <span className="duration">{formatTime(deckState.duration)}</span>
      </div>

      {/* Playback Controls */}
      <div className="playback-controls">
        <button
          className={`control-btn play-btn ${deckState.isPlaying ? 'active' : ''}`}
          onClick={handlePlay}
          disabled={deckState.duration === 0}
          title="Play"
        >
          <Play size={18} />
          <span>PLAY</span>
        </button>

        <button
          className={`control-btn pause-btn ${!deckState.isPlaying && deckState.duration > 0 ? 'active' : ''}`}
          onClick={handlePause}
          disabled={deckState.duration === 0}
          title="Pause"
        >
          <Pause size={18} />
          <span>PAUSE</span>
        </button>

        <button
          className="control-btn cue-btn"
          onClick={handleCue}
          disabled={deckState.duration === 0}
          title="Cue (Reset to Start)"
        >
          <RotateCcw size={18} />
          <span>CUE</span>
        </button>
      </div>
    </div>
  );
});

Deck.displayName = 'Deck';

export default Deck;
