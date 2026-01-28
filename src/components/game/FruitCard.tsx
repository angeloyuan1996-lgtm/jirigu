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
  
  const isClickable = !block.isLocked && block.status === 'onMap';
  
  return (
    <motion.div
      layoutId={block.id}
      onClick={isClickable ? onClick : undefined}
      className={cn(
        "absolute flex items-center justify-center rounded-lg border-2 border-white/50 shadow-lg cursor-pointer select-none",
        "transition-all duration-150",
        block.isLocked && "brightness-50 grayscale pointer-events-none",
        isClickable && "hover:scale-105 hover:shadow-xl active:scale-95",
        isInSlot && "relative",
        isInTemp && "relative opacity-90"
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: `${bgColor}20`,
        backgroundImage: `linear-gradient(135deg, ${bgColor}40 0%, ${bgColor}20 100%)`,
        borderColor: `${bgColor}80`,
        left: isInSlot || isInTemp ? undefined : block.x * size,
        top: isInSlot || isInTemp ? undefined : block.y * size,
        zIndex: block.z + 1,
      }}
      initial={false}
      animate={{
        scale: 1,
        opacity: 1,
      }}
      whileHover={isClickable ? { scale: 1.05 } : undefined}
      whileTap={isClickable ? { scale: 0.95 } : undefined}
    >
      <span 
        className="text-2xl drop-shadow-sm"
        style={{ fontSize: size * 0.55 }}
      >
        {emoji}
      </span>
      
      {/* Shine effect */}
      <div 
        className="absolute inset-0 rounded-lg opacity-30"
        style={{
          background: 'linear-gradient(135deg, white 0%, transparent 50%)',
        }}
      />
    </motion.div>
  );
};
