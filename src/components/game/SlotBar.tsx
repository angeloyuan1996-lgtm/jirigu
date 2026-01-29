import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { FRUIT_ICONS } from '@/types/game';

const SLOT_SIZE = 42;
const BUFFER_SLOT_SIZE = 48; // Same as FruitCard default size
const MAX_SLOTS = 7;
const BUFFER_SLOTS = 3;

export const SlotBar: React.FC = () => {
  const { slots, tempCache, clickBufferBlock } = useGameStore();
  
  return (
    <div className="flex flex-col items-center">
      {/* Booster Buffer Area - 3 slots, always visible when has items */}
      {tempCache.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex items-center justify-center gap-1 mb-3"
        >
          {/* Render 3 buffer slots */}
          {Array.from({ length: BUFFER_SLOTS }).map((_, index) => {
            const block = tempCache[index];
            return (
              <motion.div
                key={block?.id || `empty-buffer-${index}`}
                className="relative flex items-center justify-center rounded-lg border-[1.5px]"
                style={{
                  width: BUFFER_SLOT_SIZE,
                  height: BUFFER_SLOT_SIZE,
                  backgroundColor: block ? '#FFF8E7' : 'transparent',
                  borderColor: block ? '#555' : 'transparent',
                  cursor: block ? 'pointer' : 'default',
                }}
                onClick={() => block && clickBufferBlock(block.id)}
                whileHover={block ? { scale: 1.05 } : undefined}
                whileTap={block ? { scale: 0.95 } : undefined}
              >
                <AnimatePresence mode="wait">
                  {block && (
                    <motion.img
                      key={block.id}
                      src={FRUIT_ICONS[block.type]}
                      alt={block.type}
                      draggable={false}
                      className="w-10 h-10"
                      initial={{ scale: 0, y: 50, opacity: 0 }}
                      animate={{ 
                        scale: 1, 
                        y: 0, 
                        opacity: 1,
                        transition: {
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }
                      }}
                      exit={{ 
                        scale: 0, 
                        y: 50, 
                        opacity: 0,
                        transition: {
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }
                      }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}
      
      {/* Main slot bar - 木栅栏/木槽风格 */}
      <div 
        className="relative flex items-center justify-center gap-1 p-3 rounded-2xl"
        style={{
          backgroundColor: 'hsl(25 70% 35%)',
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
                  backgroundColor: '#FFF8E7',
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
    </div>
  );
};
