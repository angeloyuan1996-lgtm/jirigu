import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { SettingsModal } from './SettingsModal';

export const GameHeader: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  return (
    <>
      <div className="flex items-center justify-center w-full px-4 py-2">
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
      </div>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
