import React, { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { GameBoard } from '@/components/game/GameBoard';
import { SlotBar } from '@/components/game/SlotBar';
import { BoosterBar } from '@/components/game/BoosterBar';
import { GameHeader } from '@/components/game/GameHeader';
import { AudioProvider } from '@/components/game/AudioProvider';
import { GameOverModal, GameWonModal } from '@/components/game/GameModals';

const Index = () => {
  const { initLevel, currentLevel } = useGameStore();
  
  useEffect(() => {
    initLevel(1);
  }, [initLevel]);
  
  return (
    <AudioProvider>
      <div 
        className="h-screen w-screen max-w-full flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.25) 100%)',
          backgroundColor: '#90EE90', // Light green fallback
        }}
      >
        {/* Header */}
        <GameHeader />
        
        {/* Level indicator */}
        <div className="text-center py-1">
          <span className="text-sm font-medium text-primary-foreground/70">
            Level {currentLevel}
          </span>
        </div>
        
        {/* Main game area - scrollable if needed */}
        <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden px-2">
          {/* Game board */}
          <div className="relative">
            <GameBoard />
          </div>
        </div>
        
        {/* Bottom section - fixed height */}
        <div 
          className="relative z-20 pb-safe px-2"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(139, 69, 19, 0.1) 100%)',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          {/* Slot bar */}
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
