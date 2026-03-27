/**
 * useWavesurfer.ts - Custom Hook for Wavesurfer.js Integration
 * 
 * PURPOSE:
 * - Encapsulate Wavesurfer.js initialization and lifecycle
 * - Sync waveform visualization with AudioEngine playback
 * - Prevent unnecessary re-renders while maintaining audio sync
 * 
 * IMPORTANT:
 * - Wavesurfer is used for VISUALIZATION ONLY
 * - AudioEngine handles all PLAYBACK
 * - This prevents conflicts with Web Audio API
 */

import { useEffect, useRef, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import audioEngine from '@/lib/AudioEngine';

interface UseWavesurferOptions {
  deckId: 'A' | 'B';
  container: HTMLDivElement | null;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Custom hook for Wavesurfer integration
 */
export const useWavesurfer = ({ deckId, container, onReady, onError }: UseWavesurferOptions) => {
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize Wavesurfer instance
   */
  useEffect(() => {
    if (!container) return;

    try {
      // Create Wavesurfer instance with Brutalist Pro Audio styling
      // IMPORTANT: Use 'MediaElement' backend but don't attach to any media element
      // This allows us to render the waveform without playback conflicts
      const wavesurfer = WaveSurfer.create({
        container: container,
        waveColor: '#6366f1', // Indigo for modern design
        progressColor: '#ff6b35', // Orange for progress
        cursorColor: '#6366f1',
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 0,
        height: 120,
        normalize: true,
        interact: true,
        dragToSeek: false, // Disable drag to seek - we handle seeking in AudioEngine
        autoScroll: true,
        autoCenter: true,
        // Use MediaElement backend but without attaching to any element
        // This prevents Wavesurfer from trying to manage playback
        backend: 'MediaElement',
        media: undefined, // Don't attach to any media element
      });

      wavesurferRef.current = wavesurfer;

      // Handle errors
      wavesurfer.on('error', (err: any) => {
        console.error(`Wavesurfer error on Deck ${deckId}:`, err);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      });

      console.log(`Wavesurfer initialized for Deck ${deckId}`);
      onReady?.();

      return () => {
        // Cleanup on unmount
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
          wavesurferRef.current = null;
        }
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    } catch (error) {
      console.error(`Failed to initialize Wavesurfer for Deck ${deckId}:`, error);
      onError?.(error as Error);
    }
  }, [container, deckId, onReady, onError]);

  /**
   * Sync Wavesurfer playback position with AudioEngine
   */
  useEffect(() => {
    if (!wavesurferRef.current) return;

    // Update Wavesurfer position every 100ms to match AudioEngine
    syncIntervalRef.current = setInterval(() => {
      const currentTime = audioEngine.getCurrentTime(deckId);
      const duration = audioEngine.getDuration(deckId);

      if (duration > 0 && wavesurferRef.current) {
        wavesurferRef.current.setTime(currentTime);
      }
    }, 100);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [deckId]);

  /**
   * Load audio file into Wavesurfer for visualization only
   * AudioEngine handles the actual playback
   */
  const loadAudio = useCallback(async (audioFile: File) => {
    if (!wavesurferRef.current) {
      throw new Error('Wavesurfer not initialized');
    }

    try {
      // Create blob URL for the audio file
      const blobUrl = URL.createObjectURL(audioFile);

      // Load into Wavesurfer for visualization
      const promise = wavesurferRef.current.load(blobUrl);
      if (promise instanceof Promise) {
        await promise;
      }

      console.log(`Audio loaded into Wavesurfer for Deck ${deckId}: ${audioFile.name}`);
    } catch (error) {
      console.error(`Failed to load audio into Wavesurfer for Deck ${deckId}:`, error);
      throw error;
    }
  }, [deckId]);

  /**
   * Play audio - delegates to AudioEngine
   */
  const play = useCallback(() => {
    audioEngine.play(deckId);
  }, [deckId]);

  /**
   * Pause audio - delegates to AudioEngine
   */
  const pause = useCallback(() => {
    audioEngine.pause(deckId);
  }, [deckId]);

  /**
   * Seek to specific time - delegates to AudioEngine
   */
  const seek = useCallback((time: number) => {
    audioEngine.seek(deckId, time);
  }, [deckId]);

  return {
    wavesurfer: wavesurferRef.current,
    loadAudio,
    play,
    pause,
    seek,
  };
};

export default useWavesurfer;
