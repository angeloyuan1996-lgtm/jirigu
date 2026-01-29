import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';

// Cheerful pentatonic scale notes (C major pentatonic)
const MELODY_NOTES = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.00, // G4
  440.00, // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
];

const BASS_NOTES = [
  130.81, // C3
  146.83, // D3
  164.81, // E3
  196.00, // G3
];

export const useBackgroundMusic = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const musicEnabled = useGameStore((state) => state.musicEnabled);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 0.15; // Low volume for background
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    return { ctx: audioContextRef.current, gain: gainNodeRef.current! };
  }, []);

  const playNote = useCallback((frequency: number, duration: number, delay: number, type: OscillatorType = 'sine') => {
    const { ctx, gain } = getAudioContext();
    const currentTime = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, currentTime);

    // Soft attack and release
    noteGain.gain.setValueAtTime(0, currentTime);
    noteGain.gain.linearRampToValueAtTime(0.3, currentTime + 0.05);
    noteGain.gain.linearRampToValueAtTime(0.2, currentTime + duration * 0.5);
    noteGain.gain.linearRampToValueAtTime(0, currentTime + duration);

    osc.connect(noteGain);
    noteGain.connect(gain);

    osc.start(currentTime);
    osc.stop(currentTime + duration);
  }, [getAudioContext]);

  const playChord = useCallback((frequencies: number[], duration: number, delay: number) => {
    frequencies.forEach((freq) => {
      playNote(freq, duration, delay, 'triangle');
    });
  }, [playNote]);

  const playMelodyLoop = useCallback(() => {
    // Generate a cheerful 8-bar melody pattern
    const beatDuration = 0.25; // 240 BPM feel
    const barLength = 8; // 8 beats per bar
    const totalBars = 4;
    
    let time = 0;

    for (let bar = 0; bar < totalBars; bar++) {
      // Bass note at start of each bar
      const bassNote = BASS_NOTES[bar % BASS_NOTES.length];
      playNote(bassNote, beatDuration * 4, time, 'triangle');

      // Melody pattern - cheerful bouncy feel
      for (let beat = 0; beat < barLength; beat++) {
        // Random melody note from pentatonic scale
        const noteIndex = Math.floor(Math.random() * MELODY_NOTES.length);
        const note = MELODY_NOTES[noteIndex];
        
        // Vary note duration for rhythm variety
        const noteDuration = beat % 2 === 0 ? beatDuration * 1.5 : beatDuration * 0.8;
        
        // Add some rests for breathing room
        if (Math.random() > 0.3) {
          playNote(note, noteDuration, time + beat * beatDuration, 'sine');
        }

        // Add harmony occasionally
        if (beat % 4 === 0 && Math.random() > 0.5) {
          const harmonyIndex = (noteIndex + 2) % MELODY_NOTES.length;
          playNote(MELODY_NOTES[harmonyIndex], noteDuration, time + beat * beatDuration, 'sine');
        }
      }

      time += barLength * beatDuration;
    }

    return totalBars * barLength * beatDuration * 1000; // Return duration in ms
  }, [playNote]);

  const startMusic = useCallback(() => {
    if (isPlayingRef.current) return;
    
    try {
      const { ctx } = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      isPlayingRef.current = true;

      const loopDuration = playMelodyLoop();

      // Set up looping
      intervalRef.current = window.setInterval(() => {
        if (isPlayingRef.current) {
          playMelodyLoop();
        }
      }, loopDuration);
    } catch (e) {
      console.log('Background music not available');
    }
  }, [getAudioContext, playMelodyLoop]);

  const stopMusic = useCallback(() => {
    isPlayingRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Fade out
    if (gainNodeRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime;
      gainNodeRef.current.gain.linearRampToValueAtTime(0, currentTime + 0.5);
      
      // Reset gain after fade
      setTimeout(() => {
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = 0.15;
        }
      }, 600);
    }
  }, []);

  // React to musicEnabled changes
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

  // Cleanup on unmount
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
