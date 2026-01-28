import React, { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { GameBoard } from '@/components/game/GameBoard';
import { SlotBar } from '@/components/game/SlotBar';
import { BoosterBar } from '@/components/game/BoosterBar';
import { GameHeader } from '@/components/game/GameHeader';
import { BlindStack } from '@/components/game/BlindStack';
import { GameOverModal, GameWonModal } from '@/components/game/GameModals';

const Index = () => {
  const { initLevel, currentLevel } = useGameStore();
  
  useEffect(() => {
    initLevel(1);
  }, [initLevel]);
  
  return (
    <div 
      className="min-h-screen flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.25) 100%)',
        backgroundColor: '#90EE90', // Light green fallback
      }}
    >
      {/* Header */}
      <GameHeader />
      
      {/* Level indicator */}
      <div className="text-center py-2">
        <span className="text-sm font-medium text-primary-foreground/70">
          Level {currentLevel}
        </span>
      </div>
      
      {/* Main game area */}
      <div className="flex-1 relative flex flex-col items-center justify-center px-4">
        {/* Decorative elements */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-2xl opacity-50">
          〰️
        </div>
        
        {/* Game board */}
        <div className="relative mb-4">
          <GameBoard />
          
          {/* Blind stacks on sides */}
          <BlindStack position="left" />
          <BlindStack position="right" />
        </div>
      </div>
      
      {/* Bottom section */}
      <div 
        className="relative z-20 pb-4"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(139, 69, 19, 0.1) 100%)',
        }}
      >
        {/* Slot bar */}
        <div className="mb-4">
          <SlotBar />
        </div>
        
        {/* Booster bar */}
        <BoosterBar />
      </div>
      
      {/* Modals */}
      <GameOverModal />
      <GameWonModal />
    </div>
  );
};

export default Index;
