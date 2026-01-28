import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { FruitCard } from './FruitCard';
import { FRUIT_EMOJIS } from '@/types/game';

const SLOT_SIZE = 40; // Compact for mobile
const MAX_SLOTS = 7;

export const SlotBar: React.FC = () => {
  const { slots, tempCache } = useGameStore();
  
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Temp cache area */}
      {tempCache.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-1 p-2 rounded-xl bg-amber-900/30 border-2 border-amber-700/50"
        >
          {tempCache.map((block, index) => (
            <motion.div
              key={block.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center justify-center rounded-lg border-2 border-white/30"
              style={{
                width: SLOT_SIZE - 4,
                height: SLOT_SIZE - 4,
                backgroundColor: `hsl(var(--muted))`,
              }}
            >
              <span className="text-xl">
                {FRUIT_EMOJIS[block.type]}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}
      
      {/* Main slot bar */}
      <div 
        className="relative flex items-center justify-center gap-1 p-3 rounded-2xl"
        style={{
          background: 'linear-gradient(180deg, #8B4513 0%, #654321 50%, #4a3219 100%)',
          border: '4px solid #3d2914',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 4px 8px rgba(0,0,0,0.3)',
        }}
      >
        {/* Slot placeholders */}
        {Array.from({ length: MAX_SLOTS }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-center rounded-lg"
            style={{
              width: SLOT_SIZE,
              height: SLOT_SIZE,
              backgroundColor: 'rgba(0,0,0,0.3)',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
          />
        ))}
        
        {/* Actual slots overlay */}
        <div className="absolute inset-3 flex items-center gap-1">
          <AnimatePresence mode="popLayout">
            {slots.map((block, index) => (
              <motion.div
                key={block.id}
                layout
                initial={{ scale: 0.5, y: -100, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0, opacity: 0, y: -20 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  mass: 0.8,
                  // Bezier curve effect for flying animation
                  y: {
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  },
                  opacity: { duration: 0.2 },
                }}
                className="flex items-center justify-center rounded-lg border-2 border-white/50 shadow-md"
                style={{
                  width: SLOT_SIZE,
                  height: SLOT_SIZE,
                  backgroundColor: `hsl(var(--card))`,
                }}
              >
                <span className="text-xl">
                  {FRUIT_EMOJIS[block.type]}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {/* Wood grain texture overlay */}
        <div 
          className="absolute inset-0 rounded-xl opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 11px)',
          }}
        />
      </div>
      
      {/* Slot counter */}
      <div className="text-xs text-muted-foreground">
        {slots.length} / {MAX_SLOTS}
      </div>
    </div>
  );
};
