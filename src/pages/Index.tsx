import React, { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { GameBoard } from '@/components/game/GameBoard';
import { SlotBar } from '@/components/game/SlotBar';
import { BoosterBar } from '@/components/game/BoosterBar';
import { GameHeader } from '@/components/game/GameHeader';
import { AudioProvider } from '@/components/game/AudioProvider';
import { GameOverModal, GameWonModal } from '@/components/game/GameModals';
import { GrassDecoration } from '@/components/game/GrassDecoration';
import { useGameDistributionAd } from '@/hooks/useGameDistributionAd';

const Index = () => {
  const { initLevel, currentLevel } = useGameStore();
  const { preloadAd } = useGameDistributionAd();
  
  useEffect(() => {
    initLevel(1);
    // 预加载广告 SDK，减少用户点击时的等待时间
    preloadAd();
  }, [initLevel, preloadAd]);
  
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
        
        {/* Main game area - 紧凑布局 */}
        <div className="flex-1 relative flex flex-col items-center justify-start overflow-hidden px-2">
          {/* Game board */}
          <div className="relative">
            <GameBoard />
          </div>
          
          {/* Bottom section - 适当间距 */}
          <div className="mt-6">
            {/* Slot bar with blind stacks */}
            <div className="mb-3">
              <SlotBar />
            </div>
            
            {/* Booster bar */}
            <BoosterBar />
          </div>
        </div>
        
        {/* Bottom safe area padding */}
        <div 
          style={{
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        />
        
        {/* Modals */}
        <GameOverModal />
        <GameWonModal />
      </div>
    </AudioProvider>
  );
};

export default Index;
