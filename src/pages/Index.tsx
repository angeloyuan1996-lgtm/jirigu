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
import { triggerDiamondRefresh } from '@/hooks/useDiamonds';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const gameStore = useGameStore();
  const [searchParams, setSearchParams] = useSearchParams();
  
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const savedGame = localStorage.getItem('jirigu_saved_game');
    
    // 尝试恢复保存的游戏状态（支付返回或 OAuth 登录返回）
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
      // 没有保存的游戏状态，初始化第一关
      gameStore.initLevel(1);
    }
    
    // 处理支付状态
    if (paymentStatus === 'success') {
      // 调用验证支付函数，确保钻石被正确添加
      const verifyPayment = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('verify-payment');
          if (error) {
            console.error('Payment verification error:', error);
          } else if (data?.diamonds_added > 0) {
            toast.success(`Payment successful! ${data.diamonds_added} diamonds added to your account.`);
          } else {
            toast.success('Payment verified! Your diamonds are ready.');
          }
          // 触发全局钻石余额刷新
          triggerDiamondRefresh();
        } catch (err) {
          console.error('Payment verification failed:', err);
          toast.success('Payment successful! Diamonds added to your account.');
          triggerDiamondRefresh();
        }
      };
      verifyPayment();
      setSearchParams({});
    } else if (paymentStatus === 'canceled') {
      toast.info('Payment was canceled.');
      setSearchParams({});
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
