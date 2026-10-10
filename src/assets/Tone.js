import * as Tone from 'tone';

// 1. Create the main instrument: a bright, bouncy marimba sound.
const marimba = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "triangle" }, // A warm, clear triangle wave.
  envelope: {
    attack: 0.005,  // 快速起音，营造敲击感
    decay: 0.2,     // 短衰减，像木块被敲击
    sustain: 0.01,
    release: 0.2
  }
}).toDestination();
marimba.volume.value = -8; // Main instrument volume.

// 2. Create the bass instrument.
const bass = new Tone.MonoSynth({
  oscillator: { type: "sine" },
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.2,
    release: 0.2
  }
}).toDestination();
bass.volume.value = -10; // Keep the bass slightly quieter.

// Set the combined background music output to 25%.
Tone.Destination.volume.value = -10;

// 3. Set the global tempo (128 BPM).
Tone.Transport.bpm.value = 128;

// 4. Extended Melody sequence (16-bar loop: A - B - A' - C structure).
const melodyEvents = [
  // ==========================================
  // --- Section A (Bars 1 - 4): Main Theme ---
  // ==========================================
  // Bar 1 (C)
  { time: "0:0:0", note: "E4", duration: "8n" },
  { time: "0:0:2", note: "G4", duration: "8n" },
  { time: "0:1:0", note: "C5", duration: "8n" },
  { time: "0:1:2", note: "E5", duration: "4n" },
  { time: "0:2:2", note: "D5", duration: "8n" },
  { time: "0:3:0", note: "C5", duration: "8n" },
  { time: "0:3:2", note: "G4", duration: "8n" },

  // Bar 2 (Am)
  { time: "1:0:0", note: "A4", duration: "8n" },
  { time: "1:0:2", note: "C5", duration: "8n" },
  { time: "1:1:0", note: "E5", duration: "8n" },
  { time: "1:1:2", note: "G5", duration: "4n" },
  { time: "1:2:2", note: "F5", duration: "8n" },
  { time: "1:3:0", note: "E5", duration: "8n" },
  { time: "1:3:2", note: "C5", duration: "8n" },

  // Bar 3 (Dm7)
  { time: "2:0:0", note: "D4", duration: "8n" },
  { time: "2:0:2", note: "F4", duration: "8n" },
  { time: "2:1:0", note: "A4", duration: "8n" },
  { time: "2:2:0", note: "D5", duration: "4n" },
  { time: "2:3:0", note: "C5", duration: "8n" },
  { time: "2:3:2", note: "B4", duration: "8n" },

  // Bar 4 (G7)
  { time: "3:0:0", note: "G4", duration: "8n" },
  { time: "3:0:2", note: "B4", duration: "8n" },
  { time: "3:1:0", note: "D5", duration: "8n" },
  { time: "3:2:0", note: "F5", duration: "4n" },
  { time: "3:3:0", note: "E5", duration: "8n" },
  { time: "3:3:2", note: "D5", duration: "8n" },

  // ==========================================
  // --- Section B (Bars 5 - 8): Light & High ---
  // ==========================================
  // Bar 5 (C)
  { time: "4:0:0", note: "G5", duration: "4n." },
  { time: "4:1:3", note: "E5", duration: "8n" },
  { time: "4:2:2", note: "C5", duration: "8n" },
  { time: "4:3:0", note: "D5", duration: "8n" },
  { time: "4:3:2", note: "E5", duration: "8n" },

  // Bar 6 (Am)
  { time: "5:0:0", note: "C5", duration: "4n" },
  { time: "5:1:0", note: "A4", duration: "8n" },
  { time: "5:1:2", note: "C5", duration: "8n" },
  { time: "5:2:0", note: "E5", duration: "4n" },
  { time: "5:3:0", note: "A5", duration: "4n" },

  // Bar 7 (Dm7)
  { time: "6:0:0", note: "F5", duration: "8n" },
  { time: "6:0:2", note: "D5", duration: "8n" },
  { time: "6:1:2", note: "A4", duration: "4n" },
  { time: "6:2:2", note: "C5", duration: "8n" },
  { time: "6:3:0", note: "D5", duration: "8n" },

  // Bar 8 (G7)
  { time: "7:0:0", note: "B4", duration: "8n" },
  { time: "7:0:2", note: "G4", duration: "8n" },
  { time: "7:1:0", note: "D5", duration: "8n" },
  { time: "7:1:2", note: "F5", duration: "8n" },
  { time: "7:2:0", note: "E5", duration: "8n" },
  { time: "7:2:2", note: "D5", duration: "8n" },

  // ==================================================
  // --- Section A' (Bars 9 - 12): Theme Variation ---
  // ==================================================
  // Bar 9 (C)
  { time: "8:0:0", note: "E4", duration: "8n" },
  { time: "8:0:2", note: "G4", duration: "8n" },
  { time: "8:1:0", note: "C5", duration: "8n" },
  { time: "8:1:2", note: "E5", duration: "4n" },
  { time: "8:2:2", note: "G5", duration: "8n" },
  { time: "8:3:0", note: "E5", duration: "8n" },
  { time: "8:3:2", note: "C5", duration: "8n" },

  // Bar 10 (Am)
  { time: "9:0:0", note: "A4", duration: "8n" },
  { time: "9:0:2", note: "C5", duration: "8n" },
  { time: "9:1:0", note: "E5", duration: "8n" },
  { time: "9:1:2", note: "A5", duration: "4n" },
  { time: "9:2:2", note: "G5", duration: "8n" },
  { time: "9:3:0", note: "E5", duration: "8n" },
  { time: "9:3:2", note: "C5", duration: "8n" },

  // Bar 11 (Dm7) - Dynamic Climb
  { time: "10:0:0", note: "F4", duration: "8n" },
  { time: "10:0:2", note: "A4", duration: "8n" },
  { time: "10:1:0", note: "D5", duration: "8n" },
  { time: "10:1:2", note: "F5", duration: "4n" },
  { time: "10:2:2", note: "E5", duration: "8n" },
  { time: "10:3:0", note: "D5", duration: "8n" },

  // Bar 12 (G7)
  { time: "11:0:0", note: "G4", duration: "8n" },
  { time: "11:0:2", note: "B4", duration: "8n" },
  { time: "11:1:0", note: "D5", duration: "8n" },
  { time: "11:2:0", note: "G5", duration: "4n" },
  { time: "11:3:0", note: "F5", duration: "4n" },

  // ====================================================
  // --- Section C (Bars 13 - 16): Relaxing Outro/Bridge ---
  // ====================================================
  // Bar 13 (C) - Spacious Syncopation
  { time: "12:0:0", note: "E5", duration: "2n" },
  { time: "12:2:0", note: "C5", duration: "4n" },
  { time: "12:3:0", note: "G4", duration: "4n" },

  // Bar 14 (Am)
  { time: "13:0:0", note: "A4", duration: "2n" },
  { time: "13:2:0", note: "C5", duration: "4n" },
  { time: "13:3:0", note: "E5", duration: "4n" },

  // Bar 15 (Dm7)
  { time: "14:0:0", note: "F5", duration: "4n" },
  { time: "14:1:0", note: "E5", duration: "4n" },
  { time: "14:2:0", note: "D5", duration: "4n" },
  { time: "14:3:0", note: "C5", duration: "4n" },

  // Bar 16 (G7) - Fast Turnaround Scale to reset loop
  { time: "15:0:0", note: "B4", duration: "8n" },
  { time: "15:0:2", note: "C5", duration: "8n" },
  { time: "15:1:0", note: "D5", duration: "8n" },
  { time: "15:1:2", note: "E5", duration: "8n" },
  { time: "15:2:0", note: "F5", duration: "8n" },
  { time: "15:2:2", note: "D5", duration: "8n" },
  { time: "15:3:0", note: "B4", duration: "8n" },
  { time: "15:3:2", note: "G4", duration: "8n" },
];

// 5. Extended Bass part (16 bars).
const bassEvents = [
  // Section A
  { time: "0:0:0", note: "C3" }, { time: "0:2:0", note: "C3" },
  { time: "1:0:0", note: "A2" }, { time: "1:2:0", note: "A2" },
  { time: "2:0:0", note: "D3" }, { time: "2:2:0", note: "D3" },
  { time: "3:0:0", note: "G2" }, { time: "3:2:0", note: "G2" },

  // Section B
  { time: "4:0:0", note: "C3" }, { time: "4:2:0", note: "G2" },
  { time: "5:0:0", note: "A2" }, { time: "5:2:0", note: "E2" },
  { time: "6:0:0", note: "D3" }, { time: "6:2:0", note: "F2" },
  { time: "7:0:0", note: "G2" }, { time: "7:2:0", note: "B2" },

  // Section A'
  { time: "8:0:0", note: "C3" }, { time: "8:2:0", note: "C3" },
  { time: "9:0:0", note: "A2" }, { time: "9:2:0", note: "A2" },
  { time: "10:0:0", note: "D3" }, { time: "10:2:0", note: "D3" },
  { time: "11:0:0", note: "G2" }, { time: "11:2:0", note: "G2" },

  // Section C (Longer sustained bass notes for contrast)
  { time: "12:0:0", note: "C3" },
  { time: "13:0:0", note: "A2" },
  { time: "14:0:0", note: "D3" },
  { time: "15:0:0", note: "G2" }, { time: "15:2:0", note: "G2" },
];

// 6. Bind the events to Tone.Part and enable seamless looping.
const melodyPart = new Tone.Part((time, value) => {
  marimba.triggerAttackRelease(value.note, value.duration, time);
}, melodyEvents).start(0);

const bassPart = new Tone.Part((time, value) => {
  bass.triggerAttackRelease(value.note, "8n", time);
}, bassEvents).start(0);

// Loop every sixteen bars (16m).
melodyPart.loop = true;
melodyPart.loopEnd = "16m";

bassPart.loop = true;
bassPart.loopEnd = "16m";

// 7. Playback controls.
export const startBGM = async () => {
  await Tone.start();
  Tone.Transport.start();
};

export const stopBGM = () => {
  Tone.Transport.stop();
};