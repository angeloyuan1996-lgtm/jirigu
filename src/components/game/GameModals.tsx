import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Share2 } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { Button } from '@/components/ui/button';

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative w-[320px] p-6 rounded-3xl"
            style={{
              background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
              border: '4px solid #92400e',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-amber-900">
                Game Over! 😢
              </h2>
              <p className="text-amber-700 mt-1">
                Level {currentLevel}
              </p>
            </div>
            
            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-amber-800 mb-2">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-4 bg-amber-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                  }}
                />
              </div>
            </div>
            
            {/* Buttons */}
            <div className="flex flex-col gap-3">
              {!hasRevived && (
                <Button
                  onClick={reviveWithWhatsApp}
                  className="w-full h-12 text-white font-semibold rounded-xl"
                  style={{
                    background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
                  }}
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Share & Revive
                </Button>
              )}
              
              <Button
                onClick={restartGame}
                variant="outline"
                className="w-full h-12 font-semibold rounded-xl border-2 border-amber-600 text-amber-800 hover:bg-amber-100"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Restart
              </Button>
            </div>
            
            {hasRevived && (
              <p className="text-center text-sm text-amber-700 mt-4">
                You've already used your revival. Better luck next time! 🍀
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative w-[320px] p-6 rounded-3xl text-center"
            style={{
              background: 'linear-gradient(180deg, #bbf7d0 0%, #86efac 100%)',
              border: '4px solid #166534',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
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
            
            <h2 className="text-2xl font-bold text-green-900 mb-2">
              You Won!
            </h2>
            <p className="text-green-700 mb-6">
              Level {currentLevel} Complete!
            </p>
            
            <Button
              onClick={handleNextLevel}
              className="w-full h-12 text-white font-semibold rounded-xl"
              style={{
                background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
              }}
            >
              Next Level →
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
