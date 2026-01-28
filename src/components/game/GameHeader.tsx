import React from 'react';
import { Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export const GameHeader: React.FC = () => {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  
  return (
    <div className="flex items-center justify-between w-full px-4 py-2">
      {/* Settings button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center justify-center w-12 h-12 rounded-xl"
        style={{
          background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
          border: '2px solid rgba(255,255,255,0.3)',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
        }}
      >
        <Settings className="w-6 h-6 text-white" />
      </motion.button>
      
      {/* Date display */}
      <div 
        className="px-4 py-2 rounded-full text-sm font-medium"
        style={{
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
        }}
      >
        - {dateStr} -
      </div>
      
      {/* Placeholder for right side */}
      <div className="w-12" />
    </div>
  );
};
