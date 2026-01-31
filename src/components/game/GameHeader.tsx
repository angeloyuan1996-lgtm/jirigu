import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { SettingsModal } from './SettingsModal';
import { useGameStore } from '@/stores/gameStore';

export const GameHeader: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { currentLevel } = useGameStore();
  
  return (
    <>
      <div className="flex items-center justify-between w-full px-4 py-1">
        {/* Settings button - 羊了个羊风格 */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center justify-center w-12 h-12 rounded-xl border-[3px] border-[#333]"
          style={{
            backgroundColor: 'hsl(217 85% 55%)',
            borderBottomWidth: '5px',
            borderBottomColor: 'hsl(217 85% 38%)',
          }}
        >
          <Settings className="w-6 h-6 text-white" strokeWidth={2.5} />
        </motion.button>
        
        {/* Level indicator - 与设置按钮同行 */}
        <span 
          className="text-sm font-bold px-4 py-1 rounded-full border-[2px] border-[#333]"
          style={{
            backgroundColor: '#FFFEF5',
            color: '#333',
          }}
        >
          Level {currentLevel}
        </span>
        
        {/* 右侧占位，保持居中效果 */}
        <div className="w-12 h-12" />
      </div>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
