import React, { useEffect } from 'react';
import { useAudio, setAudioController } from '@/hooks/useAudio';

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioController = useAudio();
  
  useEffect(() => {
    setAudioController(audioController);
  }, [audioController]);
  
  return <>{children}</>;
};
