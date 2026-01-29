import React, { useEffect } from 'react';
import { useAudio, setAudioController } from '@/hooks/useAudio';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioController = useAudio();
  
  // Initialize background music system
  useBackgroundMusic();
  
  useEffect(() => {
    setAudioController(audioController);
  }, [audioController]);
  
  return <>{children}</>;
};
