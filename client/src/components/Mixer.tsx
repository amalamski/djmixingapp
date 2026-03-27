/**
 * Mixer.tsx - Central Mixer Component (Redesigned)
 * 
 * Modern mixer interface with improved visual hierarchy
 * - Clear organization of controls
 * - Better visual feedback
 * - Intuitive layout
 */

import React, { useState, useCallback, useEffect } from 'react';
import audioEngine from '@/lib/AudioEngine';

interface MixerProps {
  onStateChange?: (state: any) => void;
}

const Mixer = React.memo(({ onStateChange }: MixerProps) => {
  // EQ states (0-100 scale, 50 = neutral)
  const [eqA, setEqA] = useState({ high: 50, mid: 50, low: 50 });
  const [eqB, setEqB] = useState({ high: 50, mid: 50, low: 50 });

  // Gain states (0-100 scale)
  const [gainA, setGainA] = useState(80);
  const [gainB, setGainB] = useState(80);

  // Crossfader state (0-100 scale, 50 = center)
  const [crossfader, setCrossfader] = useState(50);

  /**
   * Handle EQ change for Deck A
   */
  const handleEqAChange = useCallback((band: 'high' | 'mid' | 'low', value: number) => {
    setEqA(prev => ({ ...prev, [band]: value }));
    audioEngine.setEQ('A', band, value);
  }, []);

  /**
   * Handle EQ change for Deck B
   */
  const handleEqBChange = useCallback((band: 'high' | 'mid' | 'low', value: number) => {
    setEqB(prev => ({ ...prev, [band]: value }));
    audioEngine.setEQ('B', band, value);
  }, []);

  /**
   * Handle gain change for Deck A
   */
  const handleGainAChange = useCallback((value: number) => {
    setGainA(value);
    audioEngine.setGain('A', value);
  }, []);

  /**
   * Handle gain change for Deck B
   */
  const handleGainBChange = useCallback((value: number) => {
    setGainB(value);
    audioEngine.setGain('B', value);
  }, []);

  /**
   * Handle crossfader change
   */
  const handleCrossfaderChange = useCallback((value: number) => {
    setCrossfader(value);
    audioEngine.setCrossfader(value);
  }, []);

  /**
   * Listen to AudioEngine events for state updates
   */
  useEffect(() => {
    const handleEQChange = (data: any) => {
      if (data.deckId === 'A') {
        setEqA(prev => ({ ...prev, [data.band]: data.value }));
      } else if (data.deckId === 'B') {
        setEqB(prev => ({ ...prev, [data.band]: data.value }));
      }
    };

    const handleGainChange = (data: any) => {
      if (data.deckId === 'A') {
        setGainA(data.value);
      } else if (data.deckId === 'B') {
        setGainB(data.value);
      }
    };

    const handleCrossfaderChange = (data: any) => {
      setCrossfader(data.value);
    };

    audioEngine.on('onEQChange', handleEQChange);
    audioEngine.on('onGainChange', handleGainChange);
    audioEngine.on('onCrossfaderChange', handleCrossfaderChange);

    return () => {
      audioEngine.off('onEQChange', handleEQChange);
      audioEngine.off('onGainChange', handleGainChange);
      audioEngine.off('onCrossfaderChange', handleCrossfaderChange);
    };
  }, []);

  /**
   * EQ Knob Component
   */
  const EQKnob = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => {
    const isActive = value !== 50;
    const rotation = (value - 50) * 2.7;

    return (
      <div className="eq-knob-container">
        <div className="knob-label">{label}</div>
        <div className="knob-wrapper">
          <div
            className={`knob ${isActive ? 'active' : ''}`}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="knob-indicator"></div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="knob-slider"
            title={`${label}: ${value}`}
          />
        </div>
        <div className="knob-value">{value}</div>
      </div>
    );
  };

  /**
   * Vertical Fader Component
   */
  const VerticalFader = ({ label, value, onChange, min = 0, max = 100 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) => {
    return (
      <div className="fader-container">
        <div className="fader-label">{label}</div>
        <div className="fader-track">
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="fader-slider"
            title={`${label}: ${value}`}
          />
        </div>
        <div className="fader-value">{value}</div>
      </div>
    );
  };

  return (
    <div className="mixer-container">
      {/* Mixer Header */}
      <div className="mixer-header">
        <h1 className="mixer-title">MIXER</h1>
      </div>

      {/* Main Mixer Layout */}
      <div className="mixer-layout">
        {/* Deck A Section */}
        <div className="deck-section deck-a">
          <div className="section-title">DECK A</div>

          {/* EQ Controls */}
          <div className="eq-section">
            <div className="eq-label">3-BAND EQ</div>
            <div className="eq-knobs">
              <EQKnob label="LOW" value={eqA.low} onChange={(v) => handleEqAChange('low', v)} />
              <EQKnob label="MID" value={eqA.mid} onChange={(v) => handleEqAChange('mid', v)} />
              <EQKnob label="HIGH" value={eqA.high} onChange={(v) => handleEqAChange('high', v)} />
            </div>
          </div>

          {/* Gain Control */}
          <div className="gain-section">
            <VerticalFader label="GAIN" value={gainA} onChange={handleGainAChange} />
          </div>
        </div>

        {/* Center: Crossfader */}
        <div className="crossfader-section">
          <div className="crossfader-label">CROSSFADER</div>
          <div className="crossfader-wrapper">
            <div className="crossfader-track">
              <input
                type="range"
                min="0"
                max="100"
                value={crossfader}
                onChange={(e) => handleCrossfaderChange(Number(e.target.value))}
                className="crossfader-slider"
                title={`Crossfader: ${crossfader}`}
              />
            </div>
            <div className="crossfader-labels">
              <span className="label-left">A</span>
              <span className="label-center">CENTER</span>
              <span className="label-right">B</span>
            </div>
          </div>
          <div className="crossfader-value">{crossfader}</div>
        </div>

        {/* Deck B Section */}
        <div className="deck-section deck-b">
          <div className="section-title">DECK B</div>

          {/* EQ Controls */}
          <div className="eq-section">
            <div className="eq-label">3-BAND EQ</div>
            <div className="eq-knobs">
              <EQKnob label="LOW" value={eqB.low} onChange={(v) => handleEqBChange('low', v)} />
              <EQKnob label="MID" value={eqB.mid} onChange={(v) => handleEqBChange('mid', v)} />
              <EQKnob label="HIGH" value={eqB.high} onChange={(v) => handleEqBChange('high', v)} />
            </div>
          </div>

          {/* Gain Control */}
          <div className="gain-section">
            <VerticalFader label="GAIN" value={gainB} onChange={handleGainBChange} />
          </div>
        </div>
      </div>
    </div>
  );
});

Mixer.displayName = 'Mixer';

export default Mixer;
