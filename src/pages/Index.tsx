import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { GameBoard } from '@/components/game/GameBoard';
import { SlotBar } from '@/components/game/SlotBar';
import { BoosterBar } from '@/components/game/BoosterBar';
import { GameHeader } from '@/components/game/GameHeader';
import { AudioProvider } from '@/components/game/AudioProvider';
import { GameOverModal, GameWonModal } from '@/components/game/GameModals';
import { GrassDecoration } from '@/components/game/GrassDecoration';
import { useDiamonds } from '@/hooks/useDiamonds';
import { toast } from 'sonner';

const Index = () => {
  const { initLevel } = useGameStore();
  const { refreshBalance } = useDiamonds();
  const [searchParams, setSearchParams] = useSearchParams();
  
  useEffect(() => {
    initLevel(1);
  }, [initLevel]);

  // Handle payment success/cancel from URL params
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    
    if (paymentStatus === 'success') {
      // Refresh diamond balance after successful payment
      toast.success('Payment successful! Diamonds added to your account.');
      refreshBalance();
      // Clean up URL
      setSearchParams({});
    } else if (paymentStatus === 'canceled') {
      toast.info('Payment was canceled.');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, refreshBalance]);
  
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
