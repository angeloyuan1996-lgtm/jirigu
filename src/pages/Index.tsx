import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { GameBoard } from '@/components/game/GameBoard';
import { SlotBar } from '@/components/game/SlotBar';
import { BoosterBar } from '@/components/game/BoosterBar';
import { GameHeader } from '@/components/game/GameHeader';
import { AudioProvider } from '@/components/game/AudioProvider';
import { GameOverModal, GameWonModal } from '@/components/game/GameModals';
import { StartModal } from '@/components/game/StartModal';
import { GrassDecoration } from '@/components/game/GrassDecoration';
import { useDiamonds } from '@/hooks/useDiamonds';
import { toast } from 'sonner';

const Index = () => {
  const gameStore = useGameStore();
  const { refreshBalance } = useDiamonds();
  const [searchParams, setSearchParams] = useSearchParams();
  
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    
    // 如果是支付返回，尝试恢复游戏状态
    if (paymentStatus === 'success' || paymentStatus === 'canceled') {
      const savedGame = localStorage.getItem('jirigu_saved_game');
      if (savedGame) {
        try {
          const state = JSON.parse(savedGame);
          // 恢复游戏状态
          useGameStore.setState({
            mapData: state.mapData,
            slots: state.slots,
            tempCache: state.tempCache,
            historyStack: state.historyStack,
            blindStackLeft: state.blindStackLeft,
            blindStackRight: state.blindStackRight,
            currentLevel: state.currentLevel,
            hasRevived: state.hasRevived,
            boostersUsed: state.boostersUsed,
            boostersActivated: state.boostersActivated,
            totalBlocks: state.totalBlocks,
            remainingBlocks: state.remainingBlocks,
            gameStarted: state.gameStarted,
            isGameOver: false,
            isGameWon: false,
          });
          // 清除保存的状态
          localStorage.removeItem('jirigu_saved_game');
        } catch (e) {
          console.error('Failed to restore game state:', e);
          gameStore.initLevel(1);
        }
      } else {
        gameStore.initLevel(1);
      }
      
      if (paymentStatus === 'success') {
        toast.success('Payment successful! Diamonds added to your account.');
        refreshBalance();
      } else {
        toast.info('Payment was canceled.');
      }
      setSearchParams({});
    } else {
      // 正常启动，初始化第一关
      gameStore.initLevel(1);
    }
  }, []);
  
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
        <StartModal />
      </div>
    </AudioProvider>
  );
};

export default Index;
