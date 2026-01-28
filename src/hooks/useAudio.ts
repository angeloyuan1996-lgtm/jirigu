import { useCallback, useRef } from 'react';

// Web Audio API for generating game sounds
export const useAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);
  
  // Match-3 success sound - triumphant ascending tone
  const playMatchSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const currentTime = ctx.currentTime;
      
      // Create oscillator for main tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, currentTime); // C5
      osc1.frequency.setValueAtTime(659.25, currentTime + 0.1); // E5
      osc1.frequency.setValueAtTime(783.99, currentTime + 0.2); // G5
      
      gain1.gain.setValueAtTime(0.3, currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.4);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc1.start(currentTime);
      osc1.stop(currentTime + 0.4);
      
      // Add sparkle effect
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1046.5, currentTime + 0.15); // C6
      
      gain2.gain.setValueAtTime(0.15, currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.5);
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc2.start(currentTime + 0.15);
      osc2.stop(currentTime + 0.5);
    } catch (e) {
      console.log('Audio not available');
    }
  }, [getAudioContext]);
  
  // Click/tap sound
  const playClickSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const currentTime = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.2, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(currentTime);
      osc.stop(currentTime + 0.1);
    } catch (e) {
      console.log('Audio not available');
    }
  }, [getAudioContext]);
  
  // Game over sound
  const playGameOverSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const currentTime = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, currentTime + 0.5);
      
      gain.gain.setValueAtTime(0.15, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(currentTime);
      osc.stop(currentTime + 0.5);
    } catch (e) {
      console.log('Audio not available');
    }
  }, [getAudioContext]);
  
  // Victory sound
  const playVictorySound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const currentTime = ctx.currentTime;
      
      // Fanfare melody
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, currentTime + i * 0.15);
        
        gain.gain.setValueAtTime(0.25, currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, currentTime + i * 0.15 + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(currentTime + i * 0.15);
        osc.stop(currentTime + i * 0.15 + 0.3);
      });
    } catch (e) {
      console.log('Audio not available');
    }
  }, [getAudioContext]);
  
  return {
    playMatchSound,
    playClickSound,
    playGameOverSound,
    playVictorySound,
  };
};

// Singleton audio controller for global access
let audioController: ReturnType<typeof useAudio> | null = null;

export const getAudioController = () => audioController;
export const setAudioController = (controller: ReturnType<typeof useAudio>) => {
  audioController = controller;
};
