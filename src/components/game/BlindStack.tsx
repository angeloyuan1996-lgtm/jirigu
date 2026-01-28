import React from 'react';
import { motion } from 'framer-motion';
import { FRUIT_EMOJIS, ALL_FRUITS } from '@/types/game';

interface BlindStackProps {
  position: 'left' | 'right';
}

export const BlindStack: React.FC<BlindStackProps> = ({ position }) => {
  // Generate random fruits for the blind stack display
  const stackFruits = React.useMemo(() => {
    return Array.from({ length: 6 }, () => {
      const randomFruit = ALL_FRUITS[Math.floor(Math.random() * ALL_FRUITS.length)];
      return FRUIT_EMOJIS[randomFruit];
    });
  }, []);
  
  return (
    <div 
      className={`absolute bottom-24 ${position === 'left' ? 'left-2' : 'right-2'} z-10`}
    >
      <div className="relative">
        {/* Stacked cards effect */}
        {stackFruits.slice(0, 4).map((emoji, index) => (
          <motion.div
            key={index}
            className="absolute flex items-center justify-center w-10 h-10 rounded-lg shadow-md"
            style={{
              backgroundColor: 'hsl(var(--muted))',
              border: '2px solid rgba(255,255,255,0.3)',
              transform: `translateY(${-index * 3}px) rotate(${position === 'left' ? -5 : 5}deg)`,
              opacity: 1 - index * 0.15,
              filter: `brightness(${1 - index * 0.1})`,
              zIndex: 4 - index,
            }}
          >
            <span className="text-lg opacity-60">{emoji}</span>
          </motion.div>
        ))}
        
        {/* Top visible card */}
        <motion.div
          className="relative flex items-center justify-center w-10 h-10 rounded-lg shadow-lg"
          style={{
            backgroundColor: 'hsl(var(--card))',
            border: '2px solid rgba(255,255,255,0.5)',
            transform: `translateY(-12px) rotate(${position === 'left' ? -3 : 3}deg)`,
            zIndex: 5,
          }}
          whileHover={{ scale: 1.05 }}
        >
          <span className="text-lg">❓</span>
        </motion.div>
      </div>
    </div>
  );
};
