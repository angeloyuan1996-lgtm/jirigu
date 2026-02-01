import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

export const StartModal: React.FC = () => {
  const { gameStarted, startGame } = useGameStore();

  return (
    <AnimatePresence>
      {!gameStarted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100000 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="w-[300px] p-6 rounded-3xl border-[4px] border-[#222] text-center"
            style={{
              backgroundColor: '#1a1a1a',
            }}
          >
            {/* Message */}
            <p className="text-white text-lg font-bold mb-6 leading-relaxed">
              游戏规则很简单，都不用我教吧
            </p>
            
            {/* Start Button */}
            <motion.button
              onClick={startGame}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95, y: 2 }}
              className="w-full h-14 text-white font-bold text-xl rounded-2xl flex items-center justify-center gap-3 border-[3px] border-[#333]"
              style={{
                backgroundColor: '#22C55E',
                borderBottomWidth: '6px',
                borderBottomColor: '#166534',
              }}
            >
              <Play className="w-6 h-6" fill="white" strokeWidth={0} />
              Start
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
