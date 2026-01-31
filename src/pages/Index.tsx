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
        
        {/* Main game area - 紧凑布局，减少与底部间距 */}
        <div className="relative flex flex-col items-center overflow-hidden px-2">
          {/* Game board */}
          <div className="relative">
            <GameBoard />
          </div>
        </div>
        
        {/* Bottom section - 紧凑间距 */}
        <div 
          className="relative z-20 px-2 mt-1"
          style={{
            backgroundColor: '#A2E16F',
            paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
          }}
        >
          {/* Slot bar with blind stacks */}
          <div className="mb-1">
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
