import React, { useState, useCallback, useEffect } from 'react';
import { audioEngine } from '../lib/AudioEngine';

interface MixerProps {
  // Optional callbacks for UI updates
  onEQChange?: (deckId: string, band: string, value: number) => void;
  onGainChange?: (deckId: string, value: number) => void;
  onCrossfaderChange?: (value: number) => void;
}

/**
 * Mixer Component - Central mixing controls
 * Features:
 * - 3-band EQ knobs per deck (High, Mid, Low)
 * - Vertical gain faders per deck
 * - Horizontal crossfader with equal-power algorithm
 * - Real-time visual feedback
 */
export const Mixer: React.FC<MixerProps> = ({
  onEQChange,
  onGainChange,
  onCrossfaderChange
}) => {
  // EQ values (0-100, 50 = neutral)
  const [eqValues, setEqValues] = useState({
    A: { low: 50, mid: 50, high: 50 },
    B: { low: 50, mid: 50, high: 50 }
  });

  // Gain values (0-100)
  const [gainValues, setGainValues] = useState({
    A: 100,
    B: 100
  });

  // Crossfader position (0-100, 50 = center)
  const [crossfaderValue, setCrossfaderValue] = useState(50);

  /**
   * Handle EQ change
   */
  const handleEQChange = useCallback((deckId: 'A' | 'B', band: 'low' | 'mid' | 'high', value: number) => {
    setEqValues(prev => ({
      ...prev,
      [deckId]: {
        ...prev[deckId],
        [band]: value
      }
    }));

    audioEngine.setEQ(deckId, band, value);
    onEQChange?.(deckId, band, value);
  }, [onEQChange]);

  /**
   * Handle gain change
   */
  const handleGainChange = useCallback((deckId: 'A' | 'B', value: number) => {
    setGainValues(prev => ({
      ...prev,
      [deckId]: value
    }));

    audioEngine.setGain(deckId, value);
    onGainChange?.(deckId, value);
  }, [onGainChange]);

  /**
   * Handle crossfader change
   */
  const handleCrossfaderChange = useCallback((value: number) => {
    setCrossfaderValue(value);
    audioEngine.setCrossfader(value);
    onCrossfaderChange?.(value);
  }, [onCrossfaderChange]);

  /**
   * Render EQ knob component
   */
  const renderEQKnob = (deckId: 'A' | 'B', band: 'low' | 'mid' | 'high', label: string) => {
    const value = eqValues[deckId][band];
    
    return (
      <div className="eq-knob flex flex-col items-center gap-1">
        <label className="text-xs font-mono text-gray-400">{label}</label>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => handleEQChange(deckId, band, parseInt(e.target.value))}
          className="w-24 h-2 appearance-none bg-gray-700 accent-neon-cyan cursor-pointer"
          style={{ writingMode: 'horizontal-tb' }}
        />
        <span className="text-xs font-mono text-neon-cyan w-8 text-center">{value}</span>
      </div>
    );
  };

  /**
   * Render vertical gain fader
   */
  const renderGainFader = (deckId: 'A' | 'B') => {
    const value = gainValues[deckId];
    
    return (
      <div className="gain-fader flex flex-col items-center gap-2">
        <label className="text-xs font-mono text-gray-400">GAIN</label>
        <div className="relative h-48 w-12 bg-gray-800 border border-gray-600">
          <input
            type="range"
            min="0"
            max="100"
            value={value}
            onChange={(e) => handleGainChange(deckId, parseInt(e.target.value))}
            className="absolute w-48 h-12 -rotate-90 origin-bottom-left left-0 top-[50%] 
                       appearance-none bg-transparent accent-neon-cyan cursor-pointer"
            style={{ 
              transformOrigin: 'left center',
              transform: 'rotate(-90deg) translateX(-50%)',
              left: '50%',
              top: '50%'
            }}
          />
          {/* Visual indicator */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-neon-cyan/30 transition-all"
            style={{ height: `${value}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-mono text-white">{value}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mixer-container bg-[#0a0e27] border-2 border-gray-700 p-6 rounded-none">
      <h2 className="text-xl font-mono text-neon-cyan font-bold mb-6 text-center">MIXER</h2>
      
      <div className="mixer-controls flex gap-8 justify-center">
        {/* Deck A Controls */}
        <div className="deck-controls flex flex-col items-center gap-4">
          <h3 className="text-sm font-mono text-gray-400 mb-2">DECK A</h3>
          
          {/* EQ Section */}
          <div className="eq-section bg-[#0f1530] p-3 border border-gray-600 mb-4">
            <div className="flex gap-4">
              {renderEQKnob('A', 'high', 'HIGH')}
              {renderEQKnob('A', 'mid', 'MID')}
              {renderEQKnob('A', 'low', 'LOW')}
            </div>
          </div>
          
          {/* Gain Fader */}
          {renderGainFader('A')}
        </div>

        {/* Crossfader Section */}
        <div className="crossfader-section flex flex-col items-center justify-end pb-8">
          <label className="text-xs font-mono text-gray-400 mb-4">CROSSFADER</label>
          <div className="relative w-64 h-16 bg-gray-800 border border-gray-600">
            <input
              type="range"
              min="0"
              max="100"
              value={crossfaderValue}
              onChange={(e) => handleCrossfaderChange(parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full appearance-none bg-transparent 
                         cursor-pointer [&::-webkit-slider-thumb]:appearance-none 
                         [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-12 
                         [&::-webkit-slider-thumb]:bg-neon-cyan 
                         [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                         [&::-webkit-slider-thumb]:cursor-grab
                         [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:h-12 
                         [&::-moz-range-thumb]:bg-neon-cyan 
                         [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
                         [&::-moz-range-thumb]:cursor-grab"
            />
            {/* Center marker */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/50 transform -translate-x-1/2" />
            {/* Labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs font-mono text-gray-500">
              <span>A</span>
              <span>B</span>
            </div>
          </div>
          <div className="mt-2 text-sm font-mono text-neon-cyan">{crossfaderValue}</div>
        </div>

        {/* Deck B Controls */}
        <div className="deck-controls flex flex-col items-center gap-4">
          <h3 className="text-sm font-mono text-gray-400 mb-2">DECK B</h3>
          
          {/* EQ Section */}
          <div className="eq-section bg-[#0f1530] p-3 border border-gray-600 mb-4">
            <div className="flex gap-4">
              {renderEQKnob('B', 'high', 'HIGH')}
              {renderEQKnob('B', 'mid', 'MID')}
              {renderEQKnob('B', 'low', 'LOW')}
            </div>
          </div>
          
          {/* Gain Fader */}
          {renderGainFader('B')}
        </div>
      </div>
    </div>
  );
};

export default Mixer;
