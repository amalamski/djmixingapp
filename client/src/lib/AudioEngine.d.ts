export interface DeckState {
  audioElement: HTMLAudioElement | null;
  sourceNode: MediaElementAudioSourceNode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  eqNodes: {
    high: BiquadFilterNode | null;
    mid: BiquadFilterNode | null;
    low: BiquadFilterNode | null;
  };
  eqValues: {
    high: number;
    mid: number;
    low: number;
  };
  gainNode: GainNode | null;
  gainValue: number;
  playbackRate: number;
  cuePoint: number;
  analyser: AnalyserNode | null;
}

export interface EngineState {
  audioContextState: AudioContextState;
  sampleRate: number;
  crossfaderPosition: number;
  decks: {
    A: {
      isPlaying: boolean;
      currentTime: number;
      duration: number;
      gainValue: number;
      playbackRate: number;
      eqValues: {
        high: number;
        mid: number;
        low: number;
      };
    };
    B: {
      isPlaying: boolean;
      currentTime: number;
      duration: number;
      gainValue: number;
      playbackRate: number;
      eqValues: {
        high: number;
        mid: number;
        low: number;
      };
    };
  };
}

export class AudioEngine {
  audioContext: AudioContext | null;
  masterGain: GainNode | null;
  masterAnalyser: AnalyserNode | null;
  decks: {
    A: DeckState;
    B: DeckState;
  };
  crossfaderPosition: number;

  constructor();
  loadAudioFile(deckId: 'A' | 'B', audioFile: File): Promise<void>;
  play(deckId: 'A' | 'B'): void;
  pause(deckId: 'A' | 'B'): void;
  seek(deckId: 'A' | 'B', time: number): void;
  setEQ(deckId: 'A' | 'B', band: 'high' | 'mid' | 'low', value: number): void;
  setGain(deckId: 'A' | 'B', value: number): void;
  setPitch(deckId: 'A' | 'B', semitones: number): void;
  setCrossfader(value: number): void;
  getCurrentTime(deckId: 'A' | 'B'): number;
  getDuration(deckId: 'A' | 'B'): number;
  getFrequencyData(): Uint8Array;
  getDeckFrequencyData(deckId: 'A' | 'B'): Uint8Array;
  on(eventType: string, callback: Function): void;
  off(eventType: string, callback: Function): void;
  getState(): EngineState;
}

export const audioEngine: AudioEngine;
export default audioEngine;
