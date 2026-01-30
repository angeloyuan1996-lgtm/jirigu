import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Share2, Trophy } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { toast } from 'sonner';

const MAX_LEVEL = 2; // 游戏只有2关
const SHARE_COUNTDOWN_SECONDS = 12;

// 分享等待覆盖层组件
const ShareWaitingOverlay: React.FC<{
  isVisible: boolean;
  countdown: number;
  onRevive: () => void;
}> = ({ isVisible, countdown, onRevive }) => {
  const isReady = countdown <= 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex flex-col items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100000 }}
        >
          {!isReady ? (
            // 加载中状态 - 持续旋转的圈圈
            <>
              {/* 旋转的圆环 */}
              <div className="relative w-24 h-24 mb-6">
                <motion.div
                  className="w-full h-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <svg className="w-full h-full" viewBox="0 0 96 96">
                    {/* 圆环 - 只有部分弧度，形成旋转效果 */}
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      stroke="white"
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="200 64"
                    />
                  </svg>
                </motion.div>
              </div>
              
              {/* 提示文字 */}
              <p className="text-white text-center text-lg font-medium px-8">
                Share with a friend and revive right away!
              </p>
            </>
          ) : (
            // 可复活状态
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              {/* 成功图标 */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-6"
              >
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              
              {/* 复活按钮 */}
              <motion.button
                onClick={onRevive}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 text-white font-bold text-xl rounded-2xl border-[3px] border-[#333]"
                style={{
                  backgroundColor: '#22C55E',
                  borderBottomWidth: '6px',
                  borderBottomColor: '#166534',
                }}
              >
                Revive now 🎉
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const GameOverModal: React.FC = () => {
  const { 
    isGameOver, 
    hasRevived, 
    reviveWithWhatsApp, 
    restartGame,
    totalBlocks,
    remainingBlocks,
    currentLevel,
  } = useGameStore();
  
  const [isWaitingForShare, setIsWaitingForShare] = useState(false);
  const [countdown, setCountdown] = useState(SHARE_COUNTDOWN_SECONDS);
  
  const progress = Math.round(((totalBlocks - remainingBlocks) / totalBlocks) * 100);
  
  // 处理分享按钮点击
  const handleShareClick = useCallback(async () => {
    const inviteText = "This game is so addictive—only 0.1% of players ever make it to the end! https://jirigu.com";
    
    try {
      await navigator.clipboard.writeText(inviteText);
      toast.success('邀请内容已复制！');
      setIsWaitingForShare(true);
      setCountdown(SHARE_COUNTDOWN_SECONDS);
    } catch (err) {
      toast.error('复制失败，请手动复制');
    }
  }, []);
  
  // 倒计时逻辑
  useEffect(() => {
    if (!isWaitingForShare || countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isWaitingForShare, countdown]);
  
  // 处理复活
  const handleRevive = useCallback(() => {
    setIsWaitingForShare(false);
    setCountdown(SHARE_COUNTDOWN_SECONDS);
    reviveWithWhatsApp();
  }, [reviveWithWhatsApp]);
  
  // 重置状态当游戏结束状态改变时
  useEffect(() => {
    if (!isGameOver) {
      setIsWaitingForShare(false);
      setCountdown(SHARE_COUNTDOWN_SECONDS);
    }
  }, [isGameOver]);
  
  return (
    <>
      {/* 分享等待覆盖层 */}
      <ShareWaitingOverlay
        isVisible={isWaitingForShare}
        countdown={countdown}
        onRevive={handleRevive}
      />
      
      <AnimatePresence>
        {isGameOver && !isWaitingForShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 99999 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative w-[320px] p-6 rounded-3xl border-[4px] border-[#333]"
              style={{
                backgroundColor: '#FEF3C7',
              }}
            >
              {/* Header */}
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-[#333]">
                  游戏结束! 😢
                </h2>
                <p className="text-[#666] mt-1 font-medium">
                  第 {currentLevel} 关
                </p>
              </div>
              
              {/* Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-[#333] font-bold mb-2">
                  <span>进度</span>
                  <span>{progress}%</span>
                </div>
                <div 
                  className="h-5 rounded-full overflow-hidden border-[2px] border-[#333]"
                  style={{ backgroundColor: '#FDE68A' }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: '#F59E0B',
                    }}
                  />
                </div>
              </div>
              
              {/* Buttons */}
              <div className="flex flex-col gap-3">
                {!hasRevived && (
                  <motion.button
                    onClick={handleShareClick}
                    whileTap={{ y: 2 }}
                    className="w-full h-12 text-white font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                    style={{
                      backgroundColor: '#22C55E',
                      borderBottomWidth: '5px',
                      borderBottomColor: '#166534',
                    }}
                  >
                    <Share2 className="w-5 h-5" strokeWidth={2.5} />
                    分享复活
                  </motion.button>
                )}
                
                <motion.button
                  onClick={restartGame}
                  whileTap={{ y: 2 }}
                  className="w-full h-12 text-white font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                  style={{
                    backgroundColor: 'hsl(217 85% 55%)',
                    borderBottomWidth: '5px',
                    borderBottomColor: 'hsl(217 85% 38%)',
                  }}
                >
                  <RotateCcw className="w-5 h-5" strokeWidth={2.5} />
                  重新开始
                </motion.button>
              </div>
              
              {hasRevived && (
                <p className="text-center text-sm text-[#666] font-medium mt-4">
                  你已经使用过复活机会了，下次好运！🍀
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const GameWonModal: React.FC = () => {
  const { 
    isGameWon, 
    currentLevel,
    initLevel,
  } = useGameStore();
  
  const [copied, setCopied] = useState(false);
  const isLastLevel = currentLevel >= MAX_LEVEL;
  
  const handleNextLevel = () => {
    initLevel(currentLevel + 1);
  };
  
  const handlePlayAgain = () => {
    initLevel(1);
  };
  
  const handleShare = async () => {
    const inviteText = "This game is so addictive—only 0.1% of players ever make it to the end! https://jirigu.com";
    
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
      toast.success('邀请内容已复制！');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('复制失败，请手动复制');
    }
  };
  
  const handleViewLeaderboard = () => {
    // TODO: 实现排行榜功能
    alert('排行榜功能即将上线！');
  };
  
  return (
    <AnimatePresence>
      {isGameWon && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 99999 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative w-[320px] p-6 rounded-3xl text-center border-[4px] border-[#333]"
            style={{
              backgroundColor: '#BBF7D0',
            }}
          >
            {/* Celebration */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-6xl mb-4"
            >
              {isLastLevel ? '🏆' : '🎉'}
            </motion.div>
            
            <h2 className="text-2xl font-bold text-[#333] mb-2">
              {isLastLevel ? '恭喜通关全部关卡!' : '恭喜通关!'}
            </h2>
            <p className="text-[#166534] font-medium mb-6">
              {isLastLevel ? '你已成功挑战所有关卡！' : `第 ${currentLevel} 关完成!`}
            </p>
            
            {isLastLevel ? (
              // 最后一关通关：显示分享、再玩一次、排行榜
              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={handleShare}
                  whileTap={{ y: 2 }}
                  className="w-full h-12 text-white font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                  style={{
                    backgroundColor: '#22C55E',
                    borderBottomWidth: '5px',
                    borderBottomColor: '#166534',
                  }}
                >
                  <Share2 className="w-5 h-5" strokeWidth={2.5} />
                  {copied ? '已复制!' : '分享给好友'}
                </motion.button>
                
                <motion.button
                  onClick={handlePlayAgain}
                  whileTap={{ y: 2 }}
                  className="w-full h-12 text-white font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                  style={{
                    backgroundColor: 'hsl(217 85% 55%)',
                    borderBottomWidth: '5px',
                    borderBottomColor: 'hsl(217 85% 38%)',
                  }}
                >
                  <RotateCcw className="w-5 h-5" strokeWidth={2.5} />
                  再玩一次
                </motion.button>
                
                <motion.button
                  onClick={handleViewLeaderboard}
                  whileTap={{ y: 2 }}
                  className="w-full h-12 text-[#333] font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                  style={{
                    backgroundColor: '#FDE68A',
                    borderBottomWidth: '5px',
                    borderBottomColor: '#D97706',
                  }}
                >
                  <Trophy className="w-5 h-5" strokeWidth={2.5} />
                  查看排行榜
                </motion.button>
              </div>
            ) : (
              // 非最后一关：显示下一关按钮
              <motion.button
                onClick={handleNextLevel}
                whileTap={{ y: 2 }}
                className="w-full h-12 text-white font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                style={{
                  backgroundColor: '#22C55E',
                  borderBottomWidth: '5px',
                  borderBottomColor: '#166534',
                }}
              >
                下一关 →
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
