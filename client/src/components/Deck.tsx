import React, { useRef, useState, useCallback, useEffect } from 'react';
import { audioEngine } from '../lib/AudioEngine';
import { waveformCache } from '../lib/WaveformCache';
import { useWavesurfer } from '../hooks/useWavesurfer';

interface DeckProps {
  deckId: 'A' | 'B';
  onFileLoaded?: (filename: string) => void;
}

/**
 * Deck Component - Individual deck UI with waveform display and playback controls
 * Features:
 * - Drag-and-drop audio file loading
 * - Waveform visualization (Wavesurfer.js)
 * - Play, Pause, Cue buttons
 * - Real-time playback position display
 * - Loading state indicator
 */
export const Deck: React.FC<DeckProps> = ({ deckId, onFileLoaded }) => {
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filename, setFilename] = useState<string>('');
  const [loadedUrl, setLoadedUrl] = useState<string>('');

  const { wavesurfer, loadAudio, setPeaks } = useWavesurfer({
    containerRef: waveformContainerRef,
    onReady: () => {
      console.log('[Deck] Wavesurfer ready for deck', deckId);
    }
  });

  /**
   * Handle file drop or selection
   */
  const handleFileLoad = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      console.error('[Deck] Invalid file type:', file.type);
      return;
    }

    setIsLoading(true);
    setFilename(file.name);

    try {
      // Check cache first
      const cachedData = await waveformCache.getPeaks(file);
      
      if (cachedData) {
        console.log('[Deck] Using cached waveform for deck', deckId);
        // Load audio into AudioEngine
        await audioEngine.loadAudioFile(deckId, file);
        
        // Create object URL for wavesurfer
        const url = URL.createObjectURL(file);
        setLoadedUrl(url);
        setPeaks(cachedData.peaks, cachedData.duration);
      } else {
        console.log('[Deck] No cache found, analyzing deck', deckId);
        // Load and analyze
        const audioContext = audioEngine.getAudioContext();
        const analysis = await waveformCache.analyzeAudio(file, audioContext, 100);
        
        // Save to cache
        await waveformCache.savePeaks(file, analysis.peaks, {
          duration: analysis.duration,
          sampleRate: analysis.sampleRate
        });
        
        // Load audio into AudioEngine
        await audioEngine.loadAudioFile(deckId, file);
        
        // Create object URL for wavesurfer
        const url = URL.createObjectURL(file);
        setLoadedUrl(url);
        loadAudio(url, analysis.peaks, analysis.duration);
      }

      setDuration(audioEngine.getPlaybackState(deckId)?.duration || 0);
      onFileLoaded?.(file.name);
    } catch (error) {
      console.error('[Deck] Failed to load file:', error);
    } finally {
      setIsLoading(false);
    }
  }, [deckId, onFileLoaded, loadAudio, setPeaks]);

  /**
   * Handle drag and drop
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileLoad(file);
    }
  }, [handleFileLoad]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * Handle file input
   */
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileLoad(file);
    }
  }, [handleFileLoad]);

  /**
   * Play/Pause toggle
   */
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      audioEngine.pause(deckId);
    } else {
      audioEngine.play(deckId);
    }
  }, [deckId, isPlaying]);

  /**
   * Cue - reset to beginning
   */
  const handleCue = useCallback(() => {
    audioEngine.seek(deckId, 0);
    if (wavesurfer) {
      wavesurfer.seekTo(0);
    }
  }, [deckId, wavesurfer]);

  /**
   * Format time display (MM:SS)
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Listen to AudioEngine events
   */
  useEffect(() => {
    const handlePlaybackChange = (data: any) => {
      if (data.deckId === deckId) {
        setIsPlaying(data.isPlaying ?? false);
        setCurrentTime(data.currentTime ?? 0);
        if (data.duration) setDuration(data.duration);
      }
    };

    audioEngine.on('onPlaybackStateChange', handlePlaybackChange);

    // Update current time periodically
    const interval = setInterval(() => {
      const state = audioEngine.getPlaybackState(deckId);
      if (state) {
        setCurrentTime(state.currentTime);
      }
    }, 100);

    return () => {
      audioEngine.off('onPlaybackStateChange', handlePlaybackChange);
      clearInterval(interval);
    };
  }, [deckId]);

  /**
   * Cleanup object URLs
   */
  useEffect(() => {
    return () => {
      if (loadedUrl) {
        URL.revokeObjectURL(loadedUrl);
      }
    };
  }, [loadedUrl]);

  return (
    <div className="deck-container bg-[#0a0e27] border-2 border-gray-700 p-4 rounded-none">
      {/* Deck Header */}
      <div className="deck-header flex justify-between items-center mb-4">
        <h2 className="text-xl font-mono text-neon-cyan font-bold">DECK {deckId}</h2>
        {filename && (
          <span className="text-xs font-mono text-gray-400 truncate max-w-[200px]">
            {filename}
          </span>
        )}
      </div>

      {/* Waveform Display */}
      <div
        className="waveform-container border border-gray-600 bg-[#0f1530] relative"
        ref={waveformContainerRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{ minHeight: '120px' }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-neon-cyan font-mono animate-pulse">LOADING...</div>
          </div>
        )}
        {!filename && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-mono text-sm">
            DROP AUDIO FILE HERE
          </div>
        )}
      </div>

      {/* Time Display */}
      <div className="time-display flex justify-between mt-2 font-mono text-neon-cyan">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Playback Controls */}
      <div className="playback-controls flex gap-2 mt-4">
        <button
          onClick={handleCue}
          disabled={!filename}
          className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 
                     text-white font-mono py-3 px-4 border border-gray-600 transition-colors"
        >
          CUE
        </button>
        <button
          onClick={handlePlayPause}
          disabled={!filename}
          className={`flex-1 font-mono py-3 px-4 border transition-colors
            ${isPlaying 
              ? 'bg-neon-cyan text-[#0a0e27] border-neon-cyan' 
              : 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600'}
            disabled:bg-gray-900 disabled:text-gray-600 disabled:border-gray-700`}
        >
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        accept="audio/*"
        onChange={handleFileInput}
        className="hidden"
        id={`file-input-${deckId}`}
      />
      <label
        htmlFor={`file-input-${deckId}`}
        className="block mt-2 text-center text-xs font-mono text-gray-500 hover:text-neon-cyan cursor-pointer"
      >
        or click to browse
      </label>
    </div>
  );
};

export default Deck;
