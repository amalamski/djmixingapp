import React from 'react';
import { Deck } from './components/Deck';
import { Mixer } from './components/Mixer';
import { PitchControl } from './components/PitchControl';

/**
 * Home Page - Main DJ Mixer Application
 * Layout:
 * - Top: Two decks (A and B) with waveform displays
 * - Middle: Mixer section with EQ, gain, and crossfader
 * - Bottom: Pitch controls for each deck
 */
const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0e27] text-white p-4">
      {/* Header */}
      <header className="mb-6 border-b-2 border-gray-700 pb-4">
        <h1 className="text-3xl font-mono text-neon-cyan font-bold tracking-wider">
          DJ MIXER PRO
        </h1>
        <p className="text-xs font-mono text-gray-500 mt-1">
          PROFESSIONAL BROWSER-BASED DJ MIXING SYSTEM
        </p>
      </header>

      {/* Main Content */}
      <main className="space-y-6">
        {/* Decks Section */}
        <section className="decks-section grid grid-cols-1 md:grid-cols-2 gap-6">
          <Deck deckId="A" />
          <Deck deckId="B" />
        </section>

        {/* Mixer Section */}
        <section className="mixer-section">
          <Mixer />
        </section>

        {/* Pitch Controls Section */}
        <section className="pitch-section grid grid-cols-1 md:grid-cols-2 gap-6 max-w-md mx-auto">
          <PitchControl deckId="A" />
          <PitchControl deckId="B" />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t-2 border-gray-700 pt-4 text-center">
        <p className="text-xs font-mono text-gray-600">
          Built with React + Web Audio API + Wavesurfer.js
        </p>
        <p className="text-xs font-mono text-gray-600 mt-1">
          Drag & drop audio files (.mp3, .wav) onto decks to begin mixing
        </p>
      </footer>
    </div>
  );
};

export default Home;
