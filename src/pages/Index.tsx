import React, { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { GameBoard } from '@/components/game/GameBoard';
import { SlotBar } from '@/components/game/SlotBar';
import { BoosterBar } from '@/components/game/BoosterBar';
import { GameHeader } from '@/components/game/GameHeader';
import { AudioProvider } from '@/components/game/AudioProvider';
import { GameOverModal, GameWonModal } from '@/components/game/GameModals';
import { GrassDecoration } from '@/components/game/GrassDecoration';

const Index = () => {
  const { initLevel, currentLevel } = useGameStore();
  
  useEffect(() => {
    initLevel(1);
  }, [initLevel]);
  
  return (
    <AudioProvider>
      <div 
        className="h-screen w-screen max-w-full flex flex-col overflow-hidden relative"
        style={{
          backgroundColor: '#A2E16F',
        }}
      >
        {/* Grass decoration */}
        <GrassDecoration />
        
        {/* Header with Level indicator */}
        <GameHeader />
        
        {/* Main game area */}
        <div className="flex-1 relative flex flex-col items-center justify-start overflow-hidden px-2 pt-2">
          {/* Game board */}
          <div className="relative">
            <GameBoard />
          </div>
        </div>
        
        {/* Bottom section */}
        <div 
          className="relative z-20 pb-safe px-2"
          style={{
            backgroundColor: '#A2E16F',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          {/* Slot bar with blind stacks */}
          <div className="mb-3">
            <SlotBar />
          </div>
          
          {/* Booster bar */}
          <BoosterBar />
        </div>
        
        {/* Modals */}
        <GameOverModal />
        <GameWonModal />
      </div>
    </AudioProvider>
  );
};

export default Index;
