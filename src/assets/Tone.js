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

// 4. Main melody sequence (16th-note rhythm across four bars).
const melodyEvents = [
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
  { time: "2:1:2", note: "D5", duration: "4n" },
  { time: "2:2:2", note: "C5", duration: "8n" },
  { time: "2:3:0", note: "B4", duration: "8n" },
  { time: "2:3:2", note: "A4", duration: "8n" },

  // Bar 4 (G7)
  { time: "3:0:0", note: "G4", duration: "8n" },
  { time: "3:0:2", note: "B4", duration: "8n" },
  { time: "3:1:0", note: "D5", duration: "8n" },
  { time: "3:1:2", note: "F5", duration: "4n" },
  { time: "3:2:2", note: "E5", duration: "8n" },
  { time: "3:3:0", note: "D5", duration: "8n" },
  { time: "3:3:2", note: "B4", duration: "8n" },
];

// 5. Bass part.
const bassEvents = [
  { time: "0:0:0", note: "C3" }, { time: "0:2:0", note: "C3" },
  { time: "1:0:0", note: "A2" }, { time: "1:2:0", note: "A2" },
  { time: "2:0:0", note: "D3" }, { time: "2:2:0", note: "D3" },
  { time: "3:0:0", note: "G2" }, { time: "3:2:0", note: "G2" },
];

// 6. Bind the events to Tone.Part and enable seamless looping.
const melodyPart = new Tone.Part((time, value) => {
  marimba.triggerAttackRelease(value.note, value.duration, time);
}, melodyEvents).start(0);

const bassPart = new Tone.Part((time, value) => {
  bass.triggerAttackRelease(value.note, "8n", time);
}, bassEvents).start(0);

// Loop every four bars (4m).
melodyPart.loop = true;
melodyPart.loopEnd = "4m";

bassPart.loop = true;
bassPart.loopEnd = "4m";

// 7. Playback controls, connected to the game music button.
export const startBGM = async () => {
  await Tone.start(); // Required by the browser's user-interaction policy.
  Tone.Transport.start();
};

export const stopBGM = () => {
  Tone.Transport.stop();
};
