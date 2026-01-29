import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';

// Cheerful C major scale - brighter, more uplifting
const MELODY_NOTES = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  698.46, // F5
  783.99, // G5
  880.00, // A5
  987.77, // B5
  1046.50, // C6
];

const CHORD_PROGRESSIONS = [
  [261.63, 329.63, 392.00], // C major
  [293.66, 369.99, 440.00], // D minor
  [329.63, 392.00, 493.88], // E minor
  [349.23, 440.00, 523.25], // F major
  [392.00, 493.88, 587.33], // G major
  [261.63, 329.63, 392.00], // C major
];

// Predefined cheerful melody pattern (like a music box)
const MELODY_PATTERN = [
  { note: 0, duration: 0.3 },
  { note: 2, duration: 0.3 },
  { note: 4, duration: 0.3 },
  { note: 7, duration: 0.6 },
  { note: 5, duration: 0.3 },
  { note: 4, duration: 0.3 },
  { note: 2, duration: 0.3 },
  { note: 4, duration: 0.6 },
  { note: 2, duration: 0.3 },
  { note: 0, duration: 0.3 },
  { note: 2, duration: 0.3 },
  { note: 4, duration: 0.6 },
  { note: 2, duration: 0.3 },
  { note: 4, duration: 0.3 },
  { note: 5, duration: 0.3 },
  { note: 7, duration: 0.9 },
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
      masterGainRef.current.gain.value = 0.12;
      masterGainRef.current.connect(audioContextRef.current.destination);
    }
    return { ctx: audioContextRef.current, master: masterGainRef.current! };
  }, []);

  // Music box / bell-like tone
  const playMusicBoxNote = useCallback((frequency: number, duration: number, startTime: number) => {
    const { ctx, master } = getAudioContext();

    // Main tone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(frequency, startTime);
    
    // Add slight detune for richness
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2, startTime); // Octave up

    // Bell-like envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.15, startTime + duration * 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(master);

    osc1.start(startTime);
    osc1.stop(startTime + duration + 0.1);
    osc2.start(startTime);
    osc2.stop(startTime + duration + 0.1);
  }, [getAudioContext]);

  // Soft pad chord
  const playPadChord = useCallback((frequencies: number[], duration: number, startTime: number) => {
    const { ctx, master } = getAudioContext();

    frequencies.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * 0.5, startTime); // Lower octave

      // Soft pad envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.3);
      gainNode.gain.setValueAtTime(0.08, startTime + duration - 0.3);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(master);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    });
  }, [getAudioContext]);

  const playLoop = useCallback(() => {
    if (!isPlayingRef.current) return;

    try {
      const { ctx } = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const baseTime = ctx.currentTime + 0.1;
      const tempo = 0.28; // Seconds per beat unit
      let currentTime = 0;
      let chordIndex = 0;

      // Play melody
      MELODY_PATTERN.forEach((note, i) => {
        const noteTime = baseTime + currentTime;
        playMusicBoxNote(MELODY_NOTES[note.note], note.duration * tempo * 2, noteTime);

        // Change chord every 4 notes
        if (i % 4 === 0 && chordIndex < CHORD_PROGRESSIONS.length) {
          playPadChord(CHORD_PROGRESSIONS[chordIndex], tempo * 4 * 1.5, noteTime);
          chordIndex++;
        }

        currentTime += note.duration * tempo;
      });

      // Calculate total loop duration and schedule next loop
      const loopDuration = currentTime * 1000 + 200; // Add small gap

      timeoutRef.current = window.setTimeout(() => {
        playLoop();
      }, loopDuration);

    } catch (e) {
      console.log('Background music error:', e);
    }
  }, [getAudioContext, playMusicBoxNote, playPadChord]);

  const startMusic = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    
    // Reset gain
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = 0.12;
    }
    
    playLoop();
  }, [playLoop]);

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
