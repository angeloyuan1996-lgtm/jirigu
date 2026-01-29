import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { FRUIT_ICONS } from '@/types/game';

const SLOT_SIZE = 42;
const MAX_SLOTS = 7;

export const SlotBar: React.FC = () => {
  const { slots, tempCache } = useGameStore();
  
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Temp cache area - 木质风格 */}
      {tempCache.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-1 p-2 rounded-xl border-[3px] border-[#333]"
          style={{
            backgroundColor: 'hsl(25 70% 35%)',
          }}
        >
          {tempCache.map((block) => (
            <motion.div
              key={block.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center justify-center rounded-lg border-[1.5px] border-[#555]"
              style={{
                width: SLOT_SIZE - 4,
                height: SLOT_SIZE - 4,
                backgroundColor: '#FFFEF5',
              }}
            >
              <img 
                src={FRUIT_ICONS[block.type]}
                alt={block.type}
                draggable={false}
                className="w-7 h-7"
              />
            </motion.div>
          ))}
        </motion.div>
      )}
      
      {/* Main slot bar - 木栅栏/木槽风格 */}
      <div 
        className="relative flex items-center justify-center gap-1 p-3 rounded-2xl"
        style={{
          // 纯色木质背景，无渐变
          backgroundColor: 'hsl(25 70% 35%)',
          // 粗深色描边
          border: '5px solid hsl(25 70% 22%)',
        }}
      >
        {/* 木栅栏装饰 - 左右两侧的竖条 */}
        <div 
          className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-12 rounded-full"
          style={{
            backgroundColor: 'hsl(25 60% 28%)',
            border: '2px solid hsl(25 70% 18%)',
          }}
        />
        <div 
          className="absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-12 rounded-full"
          style={{
            backgroundColor: 'hsl(25 60% 28%)',
            border: '2px solid hsl(25 70% 18%)',
          }}
        />
        
        {/* Slot placeholders - 凹槽效果 */}
        {Array.from({ length: MAX_SLOTS }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-center rounded-lg"
            style={{
              width: SLOT_SIZE,
              height: SLOT_SIZE,
              backgroundColor: 'hsl(25 50% 25%)',
              border: '2px solid hsl(25 60% 18%)',
            }}
          />
        ))}
        
        {/* Actual slots overlay */}
        <div className="absolute inset-3 flex items-center gap-1">
          <AnimatePresence mode="popLayout">
            {slots.map((block) => (
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
                  y: {
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  },
                  opacity: { duration: 0.2 },
                }}
                className="flex items-center justify-center rounded-lg border-[1.5px] border-[#555]"
                style={{
                  width: SLOT_SIZE,
                  height: SLOT_SIZE,
                  backgroundColor: '#FFFEF5',
                }}
              >
              <img 
                src={FRUIT_ICONS[block.type]}
                alt={block.type}
                draggable={false}
                className="w-8 h-8"
              />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {/* 木纹纹理 - 水平木条 */}
        <div 
          className="absolute inset-0 rounded-xl opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(0,0,0,0.2) 8px, rgba(0,0,0,0.2) 9px)',
          }}
        />
      </div>
      
      {/* Slot counter */}
      <div 
        className="text-sm font-bold px-3 py-1 rounded-full border-[2px] border-[#333]"
        style={{
          backgroundColor: '#FFFEF5',
          color: '#333',
        }}
      >
        {slots.length} / {MAX_SLOTS}
      </div>
    </div>
  );
};
