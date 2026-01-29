import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';

// Relaxed pentatonic scale - naturally pleasant, no tension
const MELODY_NOTES = [
  392.00, // G4
  440.00, // A4
  493.88, // B4
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.00, // A5
  987.77, // B5
];

// Dreamy, relaxing chord progressions (G major based)
const CHORD_PROGRESSIONS = [
  [196.00, 246.94, 293.66], // G major (low)
  [220.00, 277.18, 329.63], // A minor
  [261.63, 329.63, 392.00], // C major
  [196.00, 246.94, 293.66], // G major
  [174.61, 220.00, 261.63], // F major (sus feel)
  [196.00, 246.94, 293.66], // G major
];

// Gentle, flowing melody pattern - longer notes, relaxed feel
const MELODY_PATTERN = [
  { note: 0, duration: 0.8 },
  { note: 2, duration: 0.4 },
  { note: 4, duration: 0.8 },
  { note: 3, duration: 0.4 },
  { note: 2, duration: 0.8 },
  { note: 0, duration: 0.4 },
  { note: 1, duration: 1.2 },
  { note: -1, duration: 0.4 }, // Rest
  { note: 2, duration: 0.6 },
  { note: 4, duration: 0.6 },
  { note: 5, duration: 1.0 },
  { note: 4, duration: 0.4 },
  { note: 2, duration: 0.6 },
  { note: 0, duration: 0.6 },
  { note: 1, duration: 1.0 },
  { note: 0, duration: 1.2 },
];

export const useBackgroundMusic = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const musicEnabled = useGameStore((state) => state.musicEnabled);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.gain.value = 0.15;
      masterGainRef.current.connect(audioContextRef.current.destination);
    }
    return { ctx: audioContextRef.current, master: masterGainRef.current! };
  }, []);

  // Soft, warm marimba-like tone
  const playMelodyNote = useCallback((frequency: number, duration: number, startTime: number) => {
    const { ctx, master } = getAudioContext();

    // Main warm tone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(frequency, startTime);
    
    // Soft harmonic for warmth
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 1.5, startTime); // Fifth above, quieter

    // Gentle, smooth envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.08);
    gainNode.gain.exponentialRampToValueAtTime(0.12, startTime + duration * 0.4);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration * 0.95);

    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.15; // Quiet harmonic

    osc1.connect(gainNode);
    osc2.connect(harmGain);
    harmGain.connect(gainNode);
    gainNode.connect(master);

    osc1.start(startTime);
    osc1.stop(startTime + duration + 0.1);
    osc2.start(startTime);
    osc2.stop(startTime + duration + 0.1);
  }, [getAudioContext]);

  // Ambient pad for atmosphere
  const playAmbientPad = useCallback((frequencies: number[], duration: number, startTime: number) => {
    const { ctx, master } = getAudioContext();

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.5, startTime); // Low register

      // Very soft, slow fade envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.04 + i * 0.01, startTime + 0.5);
      gainNode.gain.setValueAtTime(0.04 + i * 0.01, startTime + duration - 0.6);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(master);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    });
  }, [getAudioContext]);

  const playLoop = useCallback(async () => {
    if (!isPlayingRef.current) return;

    try {
      const { ctx } = getAudioContext();
      
      // Must await resume - it's async!
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const baseTime = ctx.currentTime + 0.1;
      const tempo = 0.35; // Slower tempo for relaxed feel
      let currentTime = 0;
      let chordIndex = 0;

      // Play melody with rests
      MELODY_PATTERN.forEach((note, i) => {
        const noteTime = baseTime + currentTime;
        
        // Skip rests (note === -1)
        if (note.note >= 0) {
          playMelodyNote(MELODY_NOTES[note.note], note.duration * tempo * 1.8, noteTime);
        }

        // Change chord every 4 notes for ambient background
        if (i % 4 === 0 && chordIndex < CHORD_PROGRESSIONS.length) {
          playAmbientPad(CHORD_PROGRESSIONS[chordIndex], tempo * 5, noteTime);
          chordIndex++;
        }

        currentTime += note.duration * tempo;
      });

      // Calculate total loop duration and schedule next loop
      const loopDuration = currentTime * 1000 + 500; // Longer gap for relaxed feel

      timeoutRef.current = window.setTimeout(() => {
        playLoop();
      }, loopDuration);

    } catch (e) {
      console.log('Background music error:', e);
    }
  }, [getAudioContext, playMelodyNote, playAmbientPad]);

  const startMusic = useCallback(async () => {
    if (isPlayingRef.current) return;
    
    try {
      // Initialize audio context on user interaction
      const { ctx, master } = getAudioContext();
      
      // Resume suspended context
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      // Reset gain
      master.gain.value = 0.12;
      
      isPlayingRef.current = true;
      playLoop();
    } catch (e) {
      console.log('Failed to start music:', e);
    }
  }, [getAudioContext, playLoop]);

  const stopMusic = useCallback(() => {
    isPlayingRef.current = false;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Fade out
    if (masterGainRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime;
      masterGainRef.current.gain.linearRampToValueAtTime(0, currentTime + 0.3);
    }
  }, []);

  useEffect(() => {
    if (musicEnabled) {
      startMusic();
    } else {
      stopMusic();
    }

    return () => {
      stopMusic();
    };
  }, [musicEnabled, startMusic, stopMusic]);

  useEffect(() => {
    return () => {
      stopMusic();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopMusic]);

  return { startMusic, stopMusic };
};
