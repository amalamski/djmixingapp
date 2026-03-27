/**
 * Home.tsx - Main DJ Mixer Application Page
 * 
 * ARCHITECTURE:
 * - Orchestrates Deck, Mixer, and PitchControl components
 * - Initializes AudioEngine and WaveformCache on mount
 * - Manages overall application state
 * - Brutalist Pro Audio design philosophy
 * 
 * LAYOUT:
 * - Top: Waveforms for both decks (side-by-side)
 * - Middle: Mixer controls (EQ, Gain, Crossfader)
 * - Bottom: Pitch controls for each deck
 */

import React, { useEffect, useState } from 'react';
import Deck from '@/components/Deck';
import Mixer from '@/components/Mixer';
import PitchControl from '@/components/PitchControl';
import audioEngine from '@/lib/AudioEngine';
import waveformCache from '@/lib/WaveformCache';

export default function Home() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Prevent browser default drag-and-drop behavior
   * This prevents audio files from opening in a new window
   */
  useEffect(() => {
    const preventDefaultDragDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer!.dropEffect = 'none';
    };

    const preventDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Prevent default behavior on document
    document.addEventListener('dragover', preventDefaultDragDrop, true);
    document.addEventListener('drop', preventDefaultDragDrop, true);
    document.addEventListener('dragenter', preventDragEnter, true);
    document.addEventListener('dragleave', preventDragEnter, true);

    return () => {
      document.removeEventListener('dragover', preventDefaultDragDrop, true);
      document.removeEventListener('drop', preventDefaultDragDrop, true);
      document.removeEventListener('dragenter', preventDragEnter, true);
      document.removeEventListener('dragleave', preventDragEnter, true);
    };
  }, []);

  /**
   * Initialize audio engine and waveform cache on component mount
   */
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize WaveformCache (IndexedDB)
        await waveformCache.init();
        console.log('WaveformCache initialized');

        // AudioEngine initializes automatically on first use
        // but we can verify it here
        if (!audioEngine.audioContext) {
          console.warn('AudioContext not yet initialized (will initialize on first user interaction)');
        }

        setIsInitialized(true);
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize audio system. Please refresh the page.');
      }
    };

    initializeApp();
  }, []);

  if (!isInitialized) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Initializing DJ Mixer...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }

  return (
    <div className="dj-mixer-app">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">PROFESSIONAL DJ MIXER</h1>
        <p className="app-subtitle">Web Audio Engine • Low-Latency • Real-Time Mixing</p>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Waveform Section - Top */}
        <section className="waveforms-section">
          <div className="waveforms-container">
            <div className="deck-wrapper deck-a-wrapper">
              <Deck deckId="A" />
            </div>
            <div className="deck-wrapper deck-b-wrapper">
              <Deck deckId="B" />
            </div>
          </div>
        </section>

        {/* Mixer Section - Middle */}
        <section className="mixer-section">
          <Mixer />
        </section>

        {/* Pitch Control Section - Bottom */}
        <section className="pitch-section">
          <div className="pitch-controls-container">
            <div className="pitch-control-wrapper">
              <PitchControl deckId="A" />
            </div>
            <div className="pitch-control-wrapper">
              <PitchControl deckId="B" />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p className="footer-text">
          Drop .mp3 or .wav files onto the decks to load audio. Use the mixer to blend tracks seamlessly.
        </p>
      </footer>
    </div>
  );
}
