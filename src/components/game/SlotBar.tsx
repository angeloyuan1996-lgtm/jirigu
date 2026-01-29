import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { FRUIT_ICONS } from '@/types/game';

const SLOT_SIZE = 42;
const BUFFER_SLOT_SIZE = 48;
const MAX_SLOTS = 7;
const BUFFER_SLOTS = 3;
const BLIND_CARD_SIZE = 44; // 与游戏区卡片大小一致

// 盲盒堆组件 - 与游戏区卡片结构一致
const BlindStack: React.FC<{ position: 'left' | 'right' }> = ({ position }) => {
  const { blindStackLeft, blindStackRight, clickBlindStackBlock, currentLevel } = useGameStore();
  
  const stack = position === 'left' ? blindStackLeft : blindStackRight;
  
  if (currentLevel === 1 || stack.length === 0) return null;
  
  const topBlock = stack[0];
  const hiddenCount = stack.length - 1;
  
  return (
    <div className="relative" style={{ width: BLIND_CARD_SIZE, height: BLIND_CARD_SIZE + 12 }}>
      {/* 底层阴影卡片 - 显示堆叠效果 */}
      {hiddenCount > 0 && (
        <>
          {hiddenCount >= 3 && (
            <div 
              className="absolute rounded-lg border-[1.5px] border-[#555]"
              style={{
                width: BLIND_CARD_SIZE,
                height: BLIND_CARD_SIZE,
                backgroundColor: 'hsl(80 40% 25% / 0.7)',
                top: 8,
                left: 0,
              }}
            />
          )}
          {hiddenCount >= 2 && (
            <div 
              className="absolute rounded-lg border-[1.5px] border-[#555]"
              style={{
                width: BLIND_CARD_SIZE,
                height: BLIND_CARD_SIZE,
                backgroundColor: 'hsl(80 40% 30% / 0.7)',
                top: 5,
                left: 0,
              }}
            />
          )}
          <div 
            className="absolute rounded-lg border-[1.5px] border-[#555]"
            style={{
              width: BLIND_CARD_SIZE,
              height: BLIND_CARD_SIZE,
              backgroundColor: 'hsl(80 40% 35% / 0.7)',
              top: 2,
              left: 0,
            }}
          />
        </>
      )}
      
      {/* 可点击的顶部卡片 - 与游戏区卡片样式完全一致 */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={topBlock.id}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0, y: -20 }}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => clickBlindStackBlock(position)}
          className="absolute top-0 left-0 rounded-lg border-[1.5px] border-[#555] cursor-pointer flex items-center justify-center"
          style={{
            width: BLIND_CARD_SIZE,
            height: BLIND_CARD_SIZE,
            backgroundColor: '#FFF8E7',
          }}
        >
          <img 
            src={FRUIT_ICONS[topBlock.type]} 
            alt={topBlock.type}
            className="pointer-events-none"
            style={{ 
              width: BLIND_CARD_SIZE * 0.95,
              height: BLIND_CARD_SIZE * 0.95,
            }}
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>
      
      {/* 剩余数量标签 */}
      {hiddenCount > 0 && (
        <div 
          className="absolute left-1/2 transform -translate-x-1/2 px-1.5 py-0.5 rounded-full font-bold"
          style={{
            bottom: -4,
            backgroundColor: '#FF6B6B',
            color: 'white',
            border: '1.5px solid #333',
            fontSize: '10px',
            lineHeight: 1,
            zIndex: 10,
          }}
        >
          +{hiddenCount}
        </div>
      )}
    </div>
  );
};

export const SlotBar: React.FC = () => {
  const { slots, tempCache, clickBufferBlock, currentLevel, blindStackLeft, blindStackRight } = useGameStore();
  
  const showBlindStacks = currentLevel > 1 && (blindStackLeft.length > 0 || blindStackRight.length > 0);
  
  return (
    <div className="flex flex-col items-center">
      {/* Booster Buffer Area */}
      {tempCache.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex items-center justify-center gap-1 mb-3"
        >
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
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      exit={{ scale: 0, y: 50, opacity: 0 }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}
      
      {/* 盲盒堆 + 木栅栏容器 */}
      <div className="relative">
        {/* 盲盒堆 - 在木栅栏上方左右两侧 */}
        {showBlindStacks && (
          <>
            {/* 左侧盲盒堆 */}
            <div 
              className="absolute z-30"
              style={{ 
                left: -BLIND_CARD_SIZE - 8,
                bottom: 8,
              }}
            >
              <BlindStack position="left" />
            </div>
            
            {/* 右侧盲盒堆 */}
            <div 
              className="absolute z-30"
              style={{ 
                right: -BLIND_CARD_SIZE - 8,
                bottom: 8,
              }}
            >
              <BlindStack position="right" />
            </div>
          </>
        )}
        
        {/* Main slot bar - 木栅栏 */}
        <div 
          className="relative flex items-center justify-center gap-1 p-3 rounded-2xl"
          style={{
            backgroundColor: 'hsl(25 70% 35%)',
            border: '5px solid hsl(25 70% 22%)',
          }}
        >
          {/* 木栅栏装饰 */}
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
          
          {/* Slot placeholders */}
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
        </div>
      </div>
    </div>
  );
};
