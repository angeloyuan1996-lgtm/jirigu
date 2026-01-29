import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { FRUIT_ICONS } from '@/types/game';

interface BlindStackPanelProps {
  position: 'left' | 'right';
}

const CARD_SIZE = 44;

export const BlindStackPanel: React.FC<BlindStackPanelProps> = ({ position }) => {
  const { blindStackLeft, blindStackRight, clickBlindStackBlock, currentLevel } = useGameStore();
  
  const stack = position === 'left' ? blindStackLeft : blindStackRight;
  
  // Level 1 没有盲盒堆
  if (currentLevel === 1 || stack.length === 0) return null;
  
  const topBlock = stack[0];
  const hiddenCount = stack.length - 1;
  
  return (
    <div 
      className={`absolute z-30 ${position === 'left' ? 'left-1' : 'right-1'}`}
      style={{ bottom: '180px' }}
    >
      {/* 堆叠效果 - 显示隐藏的牌数 */}
      <div className="relative">
        {/* 底层阴影卡片 - 显示有多少张隐藏 */}
        {hiddenCount > 0 && (
          <>
            {/* 最底层 */}
            {hiddenCount >= 3 && (
              <div 
                className="absolute rounded-lg shadow-md"
                style={{
                  width: CARD_SIZE,
                  height: CARD_SIZE,
                  backgroundColor: '#8B7355',
                  border: '2px solid #654321',
                  transform: 'translateY(8px)',
                  opacity: 0.4,
                }}
              />
            )}
            {/* 中层 */}
            {hiddenCount >= 2 && (
              <div 
                className="absolute rounded-lg shadow-md"
                style={{
                  width: CARD_SIZE,
                  height: CARD_SIZE,
                  backgroundColor: '#9B8365',
                  border: '2px solid #654321',
                  transform: 'translateY(5px)',
                  opacity: 0.6,
                }}
              />
            )}
            {/* 次顶层 */}
            <div 
              className="absolute rounded-lg shadow-md"
              style={{
                width: CARD_SIZE,
                height: CARD_SIZE,
                backgroundColor: '#AB9375',
                border: '2px solid #654321',
                transform: 'translateY(2px)',
                opacity: 0.8,
              }}
            />
          </>
        )}
        
        {/* 可点击的顶部卡片 */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={topBlock.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0, y: -20 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => clickBlindStackBlock(position)}
            className="relative rounded-lg shadow-lg cursor-pointer"
            style={{
              width: CARD_SIZE,
              height: CARD_SIZE,
              backgroundColor: '#FFF8E7',
              border: '2px solid #333',
            }}
          >
            <div className="w-full h-full flex items-center justify-center p-1">
              <img 
                src={FRUIT_ICONS[topBlock.type]} 
                alt={topBlock.type}
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>
          </motion.div>
        </AnimatePresence>
        
        {/* 剩余数量标签 */}
        {hiddenCount > 0 && (
          <div 
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-1.5 py-0.5 rounded-full text-xs font-bold"
            style={{
              backgroundColor: '#FF6B6B',
              color: 'white',
              border: '1px solid #333',
              fontSize: '10px',
            }}
          >
            +{hiddenCount}
          </div>
        )}
      </div>
    </div>
  );
};
