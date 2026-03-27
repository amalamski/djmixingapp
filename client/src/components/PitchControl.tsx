import React, { useState, useCallback } from 'react';
import { audioEngine } from '../lib/AudioEngine';

interface PitchControlProps {
  deckId: 'A' | 'B';
}

/**
 * PitchControl Component - Pitch/tempo adjustment per deck
 * Features:
 * - Semitone-based pitch shifting (-12 to +12)
 * - Playback rate display
 * - Reset button to return to 0 semitones (1.0x)
 */
export const PitchControl: React.FC<PitchControlProps> = ({ deckId }) => {
  const [semitones, setSemitones] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  /**
   * Handle pitch change
   */
  const handlePitchChange = useCallback((value: number) => {
    setSemitones(value);
    
    // Calculate playback rate from semitones
    // Each semitone = 2^(1/12) ≈ 1.0595
    const rate = Math.pow(2, value / 12);
    setPlaybackRate(rate);
    
    // Apply to audio engine
    audioEngine.setPitch(deckId, value);
  }, [deckId]);

  /**
   * Reset pitch to 0
   */
  const handleReset = useCallback(() => {
    handlePitchChange(0);
  }, [handlePitchChange]);

  return (
    <div className="pitch-control bg-[#0a0e27] border-2 border-gray-700 p-4 rounded-none">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-mono text-neon-cyan font-bold">PITCH DECK {deckId}</h3>
        <button
          onClick={handleReset}
          disabled={semitones === 0}
          className="text-xs font-mono px-2 py-1 border border-gray-600 
                     hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent
                     text-white transition-colors"
        >
          RESET
        </button>
      </div>

      {/* Pitch Slider */}
      <div className="pitch-slider relative h-48 w-16 mx-auto bg-gray-800 border border-gray-600 mb-4">
        <input
          type="range"
          min="-12"
          max="12"
          step="0.1"
          value={semitones}
          onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
          className="absolute w-48 h-12 -rotate-90 origin-bottom-left left-0 top-[50%]
                     appearance-none bg-transparent accent-neon-cyan cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-8
                     [&::-webkit-slider-thumb]:bg-neon-cyan
                     [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white
                     [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-8
                     [&::-moz-range-thumb]:bg-neon-cyan
                     [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white"
          style={{
            transformOrigin: 'left center',
            transform: 'rotate(-90deg) translateX(-50%)',
            left: '50%',
            top: '50%'
          }}
        />
        
        {/* Center marker (0 position) */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white/50 transform -translate-y-1/2" />
        
        {/* Visual indicator */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div 
            className="absolute left-0 right-0 bg-neon-cyan/20 transition-all"
            style={{
              bottom: semitones >= 0 ? '50%' : `${50 + (semitones / 12) * 50}%`,
              height: semitones >= 0 
                ? `${(semitones / 12) * 50}%` 
                : `${50 - ((semitones / 12) * 50)}%`,
              top: semitones < 0 ? 'auto' : '50%'
            }}
          />
        </div>
      </div>

      {/* Value Display */}
      <div className="value-display text-center space-y-2">
        <div className="semitones text-2xl font-mono text-neon-cyan">
          {semitones >= 0 ? '+' : ''}{semitones.toFixed(1)} ST
        </div>
        <div className="playback-rate text-sm font-mono text-gray-400">
          {playbackRate.toFixed(3)}x
        </div>
      </div>

      {/* Scale Markers */}
      <div className="scale-markers flex justify-between mt-2 text-xs font-mono text-gray-500">
        <span>-12</span>
        <span>0</span>
        <span>+12</span>
      </div>
    </div>
  );
};

export default PitchControl;
