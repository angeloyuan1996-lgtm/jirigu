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
        backgroundColor: '#FFFEF5',
        backgroundImage: 'linear-gradient(135deg, #FFFEF5 0%, #FFF8E7 100%)',
        borderColor: `${bgColor}80`,
      }}
      className={cn(
        "flex items-center justify-center rounded-lg border-2 border-white/50 shadow-lg select-none",
        "transition-all duration-300 ease-in-out",
        isInSlot && "relative",
        isInTemp && "relative opacity-90",
        // 锁定状态：置灰、变暗、禁止点击
        block.isLocked && "brightness-50 grayscale cursor-not-allowed pointer-events-none",
        // 可点击状态
        !block.isLocked && block.status === 'onMap' && "brightness-100 grayscale-0 cursor-pointer active:scale-95 hover:scale-105 hover:shadow-xl"
      )}
      initial={false}
      animate={{
        scale: 1,
        opacity: 1,
      }}
    >
      <span 
        className="drop-shadow-sm"
        style={{ fontSize: size * 0.55 }}
      >
        {emoji}
      </span>
      
      {/* Shine effect */}
      <div 
        className="absolute inset-0 rounded-lg opacity-30 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, white 0%, transparent 50%)',
        }}
      />
    </motion.div>
  );
};
