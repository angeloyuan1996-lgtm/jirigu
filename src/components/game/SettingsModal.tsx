import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Home } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useGameStore } from '@/stores/gameStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    soundEnabled, 
    toggleSound, 
    abandonGame,
  } = useGameStore();
  
  const handleAbandon = () => {
    onClose();
    abandonGame();
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative w-[300px] p-6 rounded-3xl border-[4px] border-[#333]"
            style={{ backgroundColor: '#FFFEF5' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full border-[2px] border-[#333]"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              <X className="w-4 h-4 text-[#333]" strokeWidth={2.5} />
            </motion.button>
            
            {/* Header */}
            <h2 className="text-xl font-bold text-[#333] text-center mb-6">
              设置
            </h2>
            
            {/* Settings options */}
            <div className="space-y-4">
              {/* Sound effects toggle */}
              <div 
                className="flex items-center justify-between p-3 rounded-xl border-[2px] border-[#333]"
                style={{ backgroundColor: '#F0FDF4' }}
              >
                <div className="flex items-center gap-3">
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-[#22C55E]" strokeWidth={2.5} />
                  ) : (
                    <VolumeX className="w-5 h-5 text-[#999]" strokeWidth={2.5} />
                  )}
                  <span className="font-bold text-[#333]">音效</span>
                </div>
                <Switch 
                  checked={soundEnabled} 
                  onCheckedChange={toggleSound}
                  className="data-[state=checked]:bg-[#22C55E]"
                />
              </div>
            </div>
            
            {/* Abandon button */}
            <motion.button
              onClick={handleAbandon}
              whileTap={{ y: 2 }}
              className="w-full h-12 mt-6 text-white font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
              style={{
                backgroundColor: '#EF4444',
                borderBottomWidth: '5px',
                borderBottomColor: '#B91C1C',
              }}
            >
              <Home className="w-5 h-5" strokeWidth={2.5} />
              放弃挑战
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
