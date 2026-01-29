import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { SettingsModal } from './SettingsModal';

export const GameHeader: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric' 
  });
  
  return (
    <>
      <div className="flex items-center justify-between w-full px-4 py-2">
        {/* Settings button - 羊了个羊风格 */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center justify-center w-12 h-12 rounded-xl border-[3px] border-[#333]"
          style={{
            // 纯色蓝色，无渐变
            backgroundColor: 'hsl(217 85% 55%)',
            // 3D效果底边
            borderBottomWidth: '5px',
            borderBottomColor: 'hsl(217 85% 38%)',
          }}
        >
          <Settings className="w-6 h-6 text-white" strokeWidth={2.5} />
        </motion.button>
        
        {/* Date display - 卡通标签风格 */}
        <div 
          className="px-4 py-2 rounded-full text-sm font-bold border-[2px] border-[#333]"
          style={{
            backgroundColor: '#FFFEF5',
            color: '#333',
          }}
        >
          - {dateStr} -
        </div>
        
        {/* Placeholder for right side */}
        <div className="w-12" />
      </div>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
