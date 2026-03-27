/**
 * TypeScript type declarations for AudioEngine
 */

export interface PlaybackState {
  deckId: string;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
}

export interface EQChange {
  deckId: string;
  band: 'low' | 'mid' | 'high';
  value: number;
  dbValue: number;
}

export interface GainChange {
  deckId: string;
  value: number;
  linearGain: number;
}

export interface PitchChange {
  deckId: string;
  semitones: number;
  playbackRate: number;
}

export interface CrossfaderChange {
  value: number;
  deckAGain: number;
  deckBGain: number;
}

export type AudioEngineEventType =
  | 'onPlaybackStateChange'
  | 'onEQChange'
  | 'onGainChange'
  | 'onPitchChange'
  | 'onCrossfaderChange';

export class AudioEngine {
  constructor();
  
  init(): Promise<void>;
  
  loadAudioFile(deckId: string, audioFile: File): Promise<{ duration: number }>;
  
  play(deckId: string): void;
  
  pause(deckId: string): void;
  
  seek(deckId: string, time: number): void;
  
  setEQ(deckId: string, band: 'low' | 'mid' | 'high', value: number): void;
  
  setGain(deckId: string, value: number): void;
  
  setPitch(deckId: string, semitones: number): void;
  
  setCrossfader(value: number): void;
  
  getPlaybackState(deckId: string): PlaybackState | null;
  
  getFrequencyData(): Uint8Array;
  
  on(eventType: AudioEngineEventType, callback: (data: any) => void): void;
  
  off(eventType: AudioEngineEventType, callback: (data: any) => void): void;
  
  getAudioContext(): AudioContext;
  
  getAudioElement(deckId: string): HTMLAudioElement | null;
  
  destroy(): void;
}

export const audioEngine: AudioEngine;
export default audioEngine;
