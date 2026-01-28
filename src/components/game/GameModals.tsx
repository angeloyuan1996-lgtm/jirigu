import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Share2 } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

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
  
  const progress = Math.round(((totalBlocks - remainingBlocks) / totalBlocks) * 100);
  
  return (
    <AnimatePresence>
      {isGameOver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative w-[320px] p-6 rounded-3xl border-[4px] border-[#333]"
            style={{
              // 羊了个羊风格：纯色背景
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
            
            {/* Buttons - 羊了个羊风格 */}
            <div className="flex flex-col gap-3">
              {!hasRevived && (
                <motion.button
                  onClick={reviveWithWhatsApp}
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
  );
};

export const GameWonModal: React.FC = () => {
  const { 
    isGameWon, 
    currentLevel,
    initLevel,
  } = useGameStore();
  
  const handleNextLevel = () => {
    initLevel(currentLevel + 1);
  };
  
  return (
    <AnimatePresence>
      {isGameWon && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
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
              🎉
            </motion.div>
            
            <h2 className="text-2xl font-bold text-[#333] mb-2">
              恭喜通关!
            </h2>
            <p className="text-[#166534] font-medium mb-6">
              第 {currentLevel} 关完成!
            </p>
            
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
