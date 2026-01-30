import { useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';

// 欢快儿童旋律的音符序列 (C大调)
const MELODY_NOTES = [
  // 第一乐句 - 欢快上行
  { freq: 523.25, duration: 0.25 }, // C5
  { freq: 587.33, duration: 0.25 }, // D5
  { freq: 659.25, duration: 0.25 }, // E5
  { freq: 698.46, duration: 0.25 }, // F5
  { freq: 783.99, duration: 0.5 },  // G5
  { freq: 659.25, duration: 0.25 }, // E5
  { freq: 783.99, duration: 0.5 },  // G5
  { freq: 0, duration: 0.25 },       // 休止
  
  // 第二乐句 - 跳跃感
  { freq: 880.00, duration: 0.25 }, // A5
  { freq: 783.99, duration: 0.25 }, // G5
  { freq: 659.25, duration: 0.25 }, // E5
  { freq: 523.25, duration: 0.25 }, // C5
  { freq: 587.33, duration: 0.5 },  // D5
  { freq: 523.25, duration: 0.5 },  // C5
  { freq: 0, duration: 0.25 },       // 休止
  
  // 第三乐句 - 活泼重复
  { freq: 659.25, duration: 0.25 }, // E5
  { freq: 659.25, duration: 0.25 }, // E5
  { freq: 698.46, duration: 0.25 }, // F5
  { freq: 783.99, duration: 0.25 }, // G5
  { freq: 783.99, duration: 0.25 }, // G5
  { freq: 698.46, duration: 0.25 }, // F5
  { freq: 659.25, duration: 0.25 }, // E5
  { freq: 587.33, duration: 0.5 },  // D5
  
  // 第四乐句 - 回归主音
  { freq: 523.25, duration: 0.25 }, // C5
  { freq: 587.33, duration: 0.25 }, // D5
  { freq: 659.25, duration: 0.25 }, // E5
  { freq: 587.33, duration: 0.25 }, // D5
  { freq: 523.25, duration: 0.75 }, // C5
  { freq: 0, duration: 0.5 },        // 休止
];

// Web Audio API for generating game sounds
export const useAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const bgmIntervalRef = useRef<number | null>(null);
  const bgmGainRef = useRef<GainNode | null>(null);
  const isPlayingBgmRef = useRef(false);
  
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);
  
  const isSoundEnabled = () => useGameStore.getState().soundEnabled;
  const isBgmEnabled = () => useGameStore.getState().bgmEnabled;
  
  // 播放单个音符
  const playNote = useCallback((ctx: AudioContext, freq: number, startTime: number, duration: number, gainNode: GainNode) => {
    if (freq === 0) return; // 休止符
    
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    
    // 使用正弦波 + 三角波混合，更柔和的儿童音乐感
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    
    // 音符包络
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    noteGain.gain.setValueAtTime(0.12, startTime + duration * 0.7);
    noteGain.gain.linearRampToValueAtTime(0, startTime + duration);
    
    osc.connect(noteGain);
    noteGain.connect(gainNode);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  }, []);
  
  // 播放一轮完整旋律
  const playMelodyLoop = useCallback(() => {
    if (!isBgmEnabled() || isPlayingBgmRef.current) return;
    
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      // 创建主增益节点
      if (!bgmGainRef.current) {
        bgmGainRef.current = ctx.createGain();
        bgmGainRef.current.gain.setValueAtTime(0.3, ctx.currentTime);
        bgmGainRef.current.connect(ctx.destination);
      }
      
      let currentTime = ctx.currentTime + 0.1;
      const tempo = 0.4; // 每拍时长（秒）
      
      MELODY_NOTES.forEach((note) => {
        const noteDuration = note.duration * tempo;
        playNote(ctx, note.freq, currentTime, noteDuration, bgmGainRef.current!);
        currentTime += noteDuration;
      });
      
      // 计算旋律总时长
      const totalDuration = MELODY_NOTES.reduce((sum, note) => sum + note.duration * tempo, 0);
      
      // 设置下一轮播放
      bgmIntervalRef.current = window.setTimeout(() => {
        if (isBgmEnabled()) {
          isPlayingBgmRef.current = false;
          playMelodyLoop();
        }
      }, totalDuration * 1000 + 200); // 加小间隔
      
      isPlayingBgmRef.current = true;
    } catch (e) {
      console.log('BGM not available');
    }
  }, [getAudioContext, playNote]);
  
  // 开始背景音乐
  const startBgm = useCallback(() => {
    if (!isBgmEnabled()) return;
    isPlayingBgmRef.current = false;
    playMelodyLoop();
  }, [playMelodyLoop]);
  
  // 停止背景音乐
  const stopBgm = useCallback(() => {
    if (bgmIntervalRef.current) {
      clearTimeout(bgmIntervalRef.current);
      bgmIntervalRef.current = null;
    }
    isPlayingBgmRef.current = false;
    
    // 渐出
    if (bgmGainRef.current && audioContextRef.current) {
      const ctx = audioContextRef.current;
      bgmGainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      setTimeout(() => {
        if (bgmGainRef.current) {
          bgmGainRef.current.gain.setValueAtTime(0.3, audioContextRef.current?.currentTime || 0);
        }
      }, 400);
    }
  }, []);
  
  // Match-3 success sound - triumphant ascending tone
  const playMatchSound = useCallback(() => {
    if (!isSoundEnabled()) return;
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
    if (!isSoundEnabled()) return;
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
    if (!isSoundEnabled()) return;
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
    if (!isSoundEnabled()) return;
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
    startBgm,
    stopBgm,
  };
};

// Singleton audio controller for global access
let audioController: ReturnType<typeof useAudio> | null = null;

export const getAudioController = () => audioController;
export const setAudioController = (controller: ReturnType<typeof useAudio>) => {
  audioController = controller;
};
