import React, { useEffect } from 'react';
import { useAudio, setAudioController } from '@/hooks/useAudio';
import { useGameStore } from '@/stores/gameStore';

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioController = useAudio();
  const bgmEnabled = useGameStore((state) => state.bgmEnabled);
  
  useEffect(() => {
    setAudioController(audioController);
  }, [audioController]);
  
  // 监听 BGM 开关状态
  useEffect(() => {
    if (bgmEnabled) {
      audioController.startBgm();
    } else {
      audioController.stopBgm();
    }
  }, [bgmEnabled, audioController]);
  
  // 用户首次交互后启动 BGM
  useEffect(() => {
    const handleInteraction = () => {
      if (bgmEnabled) {
        audioController.startBgm();
      }
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
    
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [bgmEnabled, audioController]);
  
  return <>{children}</>;
};
