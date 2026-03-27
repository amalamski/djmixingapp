# DJ Mixer Application - Quick Start Guide

## Installation

```bash
cd /home/ubuntu/dj_mixer_app
pnpm install
pnpm dev
```

Open http://localhost:3000 in your browser.

---

## Basic Workflow

### 1. Load Audio Files

**Drag and drop** .mp3 or .wav files onto the waveform areas:
- **Left Deck (A)**: Drop your first track
- **Right Deck (B)**: Drop your second track

The waveform will render instantly (or from cache if you've loaded it before).

### 2. Play & Control

- **PLAY**: Start playback
- **PAUSE**: Stop playback
- **CUE**: Reset to start
- **Time Display**: Shows current position / total duration

### 3. Mix the Tracks

**Adjust Levels**:
- Drag the **GAIN** faders up/down to set individual deck volumes
- Start with both at 80 for balanced mixing

**EQ the Tracks**:
- **LOW**: Adjust bass (turn right to boost, left to cut)
- **MID**: Adjust midrange
- **HIGH**: Adjust treble
- Center position (50) = neutral (no EQ)

**Blend with Crossfader**:
- Drag the **CROSSFADER** left for Deck A, right for Deck B
- Center position (50) = equal blend of both decks
- Smooth transitions without volume dips

**Adjust Tempo**:
- Use **PITCH** sliders to match tempos
- Range: -12 to +12 semitones
- Shows playback rate multiplier (e.g., 1.059x)

---

## Tips for Professional Mixing

### Smooth Transitions

1. Load both tracks
2. Start playing Deck A
3. Cue Deck B (listen on headphones)
4. When ready, slowly move crossfader from A to B
5. Use EQ to blend frequencies smoothly

### Tempo Matching

1. Listen to both tracks
2. Adjust Deck B pitch to match Deck A's tempo
3. Use the playback rate display as reference
4. Fine-tune by ear

### EQ Mixing

- **Subtle is Better**: Small adjustments (±10-20) sound more professional
- **Cut Before Boost**: Cutting frequencies is less harsh than boosting
- **Listen on Headphones**: For accurate frequency perception
- **Avoid Extreme Values**: Extreme EQ can introduce artifacts

### Volume Management

- Keep deck gains between 60-100 for headroom
- Use crossfader for smooth blending, not gain changes
- Watch for clipping (red indicators if implemented)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause (when focused on waveform) |
| `R` | Reset to start (Cue) |

---

## Troubleshooting

### No Sound?

1. Check browser volume
2. Check deck gain sliders (not at 0)
3. Ensure audio file is valid
4. Click any button to resume AudioContext (browser policy)

### Waveform Not Showing?

1. Wait a moment for file to decode
2. Try a different audio file
3. Check browser console for errors

### Audio Stuttering?

1. Close other browser tabs
2. Check system CPU usage
3. Try a smaller audio file
4. Restart the browser

---

## File Format Support

- ✅ **MP3** (.mp3)
- ✅ **WAV** (.wav)
- ✅ **OGG** (.ogg)
- ✅ **FLAC** (.flac)
- ✅ **AAC** (.aac)

*Supported formats depend on browser and system codecs.*

---

## Performance Notes

- **First Load**: Waveform takes 1-2 seconds to render
- **Cached Load**: Subsequent loads of same file < 100ms
- **Latency**: Audio latency < 50ms (typical)
- **CPU**: Minimal CPU usage during playback

---

## Design Elements

**Color Scheme**:
- **Neon Cyan** (#00d9ff): Active controls, waveforms
- **Deep Charcoal** (#0a0e27): Background
- **Red** (#ff1744): Warnings, progress indicators
- **Gray** (#808080): Inactive elements

**Typography**:
- **IBM Plex Mono**: Monospace font for technical authenticity
- **All-caps labels**: For professional audio console feel

---

## Next Steps

1. **Experiment**: Load different tracks and practice mixing
2. **Learn EQ**: Understand how each band affects the sound
3. **Master Crossfader**: Practice smooth transitions
4. **Tempo Matching**: Get comfortable with pitch shifting
5. **Advanced**: Explore the codebase and add custom features

---

## Resources

- **Web Audio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- **Wavesurfer.js**: https://wavesurfer.xyz/
- **IndexedDB**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

---

**Enjoy mixing! 🎵**
