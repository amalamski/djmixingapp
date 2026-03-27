/**
 * PitchControl.tsx - Pitch/Tempo Control Component (Redesigned)
 * 
 * Modern pitch control with clear visual feedback
 */

import React, { useState, useCallback, useEffect } from 'react';
import audioEngine from '@/lib/AudioEngine';
import { RotateCcw } from 'lucide-react';

interface PitchControlProps {
  deckId: 'A' | 'B';
}

const PitchControl = React.memo(({ deckId }: PitchControlProps) => {
  const [pitch, setPitch] = useState(0);

  /**
   * Handle pitch change
   */
  const handlePitchChange = useCallback((value: number) => {
    setPitch(value);
    audioEngine.setPitch(deckId, value);
  }, [deckId]);

  /**
   * Reset pitch to 0
   */
  const handleResetPitch = useCallback(() => {
    setPitch(0);
    audioEngine.setPitch(deckId, 0);
  }, [deckId]);

  /**
   * Listen to AudioEngine pitch changes
   */
  useEffect(() => {
    const handlePitchChange = (data: any) => {
      if (data.deckId === deckId) {
        setPitch(data.semitones);
      }
    };

    audioEngine.on('onPitchChange', handlePitchChange);

    return () => {
      audioEngine.off('onPitchChange', handlePitchChange);
    };
  }, [deckId]);

  /**
   * Format pitch display
   */
  const formatPitch = (semitones: number) => {
    const sign = semitones > 0 ? '+' : '';
    return `${sign}${semitones}`;
  };

  const playbackRate = Math.pow(2, pitch / 12);

  return (
    <div className="pitch-control-container">
      <div className="pitch-header">
        <h3 className="pitch-title">PITCH {deckId}</h3>
        <button
          className="pitch-reset-btn"
          onClick={handleResetPitch}
          title="Reset pitch to 0"
        >
          <RotateCcw size={14} />
          <span>RESET</span>
        </button>
      </div>

      <div className="pitch-slider-wrapper">
        <div className="pitch-label">SEMITONES</div>
        <input
          type="range"
          min="-12"
          max="12"
          value={pitch}
          onChange={(e) => handlePitchChange(Number(e.target.value))}
          className="pitch-slider"
          title={`Pitch: ${formatPitch(pitch)} semitones`}
        />
      </div>

      <div className="pitch-display">
        <span className="pitch-value">{formatPitch(pitch)}</span>
        <span className="pitch-unit">ST</span>
      </div>

      <div className="playback-rate-display">
        <span className="rate-label">SPEED:</span>
        <span className="rate-value">{playbackRate.toFixed(3)}x</span>
      </div>
    </div>
  );
});

PitchControl.displayName = 'PitchControl';

export default PitchControl;
