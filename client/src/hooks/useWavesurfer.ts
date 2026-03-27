import { useEffect, useRef, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface UseWavesurferOptions {
  containerRef: React.RefObject<HTMLElement>;
  audioElement?: HTMLAudioElement | null;
  peaks?: number[][];
  duration?: number;
  onReady?: (wavesurfer: WaveSurfer) => void;
}

/**
 * Custom hook for Wavesurfer.js integration
 * Handles initialization, cleanup, and synchronization with AudioEngine
 */
export function useWavesurfer({
  containerRef,
  audioElement,
  peaks,
  duration,
  onReady
}: UseWavesurferOptions) {
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const isInitializedRef = useRef(false);

  /**
   * Initialize Wavesurfer instance
   */
  const initWavesurfer = useCallback(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#3b82f6',
      progressColor: '#00d9ff',
      cursorColor: '#00d9ff',
      barWidth: 2,
      barGap: 1,
      barRadius: 0,
      height: 120,
      normalize: true,
      responsive: true,
      autoplay: false,
      interact: true,
      hideScrollbar: false,
      minPxPerSec: 50,
      fillParent: true,
      partialRender: true,
      plugins: []
    });

    wavesurferRef.current = ws;
    isInitializedRef.current = true;

    ws.on('ready', () => {
      console.log('[useWavesurfer] Wavesurfer ready');
      onReady?.(ws);
    });

    ws.on('error', (error) => {
      console.error('[useWavesurfer] Error:', error);
    });

    ws.on('interaction', () => {
      console.log('[useWavesurfer] User interaction detected');
    });

    return ws;
  }, [containerRef, onReady]);

  /**
   * Load audio into Wavesurfer
   */
  const loadAudio = useCallback(async (
    url: string,
    peaksData?: number[][],
    durationSec?: number
  ) => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    try {
      if (peaksData && peaksData.length > 0) {
        // Load with pre-computed peaks (from cache)
        console.log('[useWavesurfer] Loading with cached peaks');
        ws.load(url, peaksData, durationSec);
      } else {
        // Load normally - Wavesurfer will analyze the audio
        console.log('[useWavesurfer] Loading audio for analysis');
        ws.load(url);
      }
    } catch (error) {
      console.error('[useWavesurfer] Failed to load audio:', error);
    }
  }, []);

  /**
   * Sync Wavesurfer playback position with external audio element
   */
  const syncWithAudioElement = useCallback((audioEl: HTMLAudioElement) => {
    const ws = wavesurferRef.current;
    if (!ws || !audioEl) return;

    // Update Wavesurfer progress based on audio element currentTime
    const updateProgress = () => {
      if (audioEl.duration && ws.getDuration() > 0) {
        const progress = audioEl.currentTime / audioEl.duration;
        ws.setProgress(progress);
      }
    };

    audioEl.addEventListener('timeupdate', updateProgress);
    
    return () => {
      audioEl.removeEventListener('timeupdate', updateProgress);
    };
  }, []);

  /**
   * Set peaks manually (for cached waveform data)
   */
  const setPeaks = useCallback((peaksData: number[][], durationSec?: number) => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    try {
      ws.setPeaks(peaksData, durationSec);
      console.log('[useWavesurfer] Peaks set successfully');
    } catch (error) {
      console.error('[useWavesurfer] Failed to set peaks:', error);
    }
  }, []);

  /**
   * Seek to a specific position
   */
  const seekTo = useCallback((progress: number) => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    ws.seekTo(progress);
  }, []);

  /**
   * Zoom in/out
   */
  const zoom = useCallback((minPxPerSec: number) => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    ws.zoom(minPxPerSec);
  }, []);

  /**
   * Destroy Wavesurfer instance
   */
  useEffect(() => {
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
        isInitializedRef.current = false;
        console.log('[useWavesurfer] Destroyed');
      }
    };
  }, []);

  /**
   * Re-initialize when container changes
   */
  useEffect(() => {
    if (containerRef.current && !isInitializedRef.current) {
      initWavesurfer();
    }
  }, [containerRef, initWavesurfer]);

  /**
   * Load audio when URL or peaks change
   */
  useEffect(() => {
    if (audioElement && wavesurferRef.current) {
      const cleanup = syncWithAudioElement(audioElement);
      return cleanup;
    }
  }, [audioElement, syncWithAudioElement]);

  return {
    wavesurfer: wavesurferRef.current,
    initWavesurfer,
    loadAudio,
    setPeaks,
    seekTo,
    zoom,
    syncWithAudioElement
  };
}

export default useWavesurfer;
