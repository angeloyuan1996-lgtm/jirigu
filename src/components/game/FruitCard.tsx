import React from 'react';
import { motion } from 'framer-motion';
import { FruitBlock, FRUIT_EMOJIS, FRUIT_COLORS } from '@/types/game';
import { cn } from '@/lib/utils';

interface FruitCardProps {
  block: FruitBlock;
  onClick?: () => void;
  size?: number;
  isInSlot?: boolean;
  isInTemp?: boolean;
}

export const FruitCard: React.FC<FruitCardProps> = ({
  block,
  onClick,
  size = 48,
  isInSlot = false,
  isInTemp = false,
}) => {
  const emoji = FRUIT_EMOJIS[block.type];
  const bgColor = FRUIT_COLORS[block.type];

  return (
    <motion.div
      layoutId={block.id}
      onClick={() => !block.isLocked && block.status === 'onMap' && onClick?.()}
      style={{
        position: 'absolute',
        left: isInSlot || isInTemp ? undefined : block.x * size,
        top: isInSlot || isInTemp ? undefined : block.y * size,
        zIndex: block.z + 1,
        width: size,
        height: size,
      }}
      className={cn(
        // 羊了个羊风格：方形、粗描边、纯色
        "flex items-center justify-center select-none",
        "rounded-lg", // border-radius: 8px
        "border-[3px] border-[#333]", // 粗黑色描边
        "transition-all duration-300 ease-in-out",
        isInSlot && "relative",
        isInTemp && "relative",
        // 锁定状态：深橄榄绿覆盖效果
        block.isLocked && "cursor-not-allowed pointer-events-none",
        // 可点击状态
        !block.isLocked && block.status === 'onMap' && "cursor-pointer active:scale-95 hover:scale-105"
      )}
      initial={false}
      animate={{
        scale: 1,
        opacity: 1,
      }}
    >
      {/* 方块背景 - 纯色无渐变 */}
      <div 
        className="absolute inset-0 rounded-lg"
        style={{
          backgroundColor: '#FFFEF5', // 浅米色基底
        }}
      />
      
      {/* 锁定状态覆盖层 - 深橄榄绿 */}
      {block.isLocked && (
        <div 
          className="absolute inset-0 rounded-lg"
          style={{
            backgroundColor: 'hsl(80 40% 25% / 0.7)', // 深橄榄绿
          }}
        />
      )}
      
      {/* 水果emoji - 2D风格 */}
      <span 
        className={cn(
          "relative z-10 drop-shadow-none",
          block.isLocked && "opacity-60"
        )}
        style={{ 
          fontSize: size * 0.55,
          // 粗线条卡通风格的文字描边效果
          textShadow: '0 1px 0 #333',
        }}
      >
        {emoji}
      </span>
    </motion.div>
  );
};
