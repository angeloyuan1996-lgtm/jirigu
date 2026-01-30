import React from 'react';
import { motion } from 'framer-motion';
import { FruitBlock, FRUIT_ICONS } from '@/types/game';
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
  const iconUrl = FRUIT_ICONS[block.type];

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
        // 羊了个羊风格：方形、细描边、纯色
        "flex items-center justify-center select-none",
        "rounded-lg overflow-hidden", // 圆角 + 裁剪溢出
        "transition-all duration-300 ease-in-out",
        isInSlot && "relative",
        isInTemp && "relative",
        // 锁定状态：深色边框
        block.isLocked 
          ? "cursor-not-allowed pointer-events-none border-[1.5px] border-[#3a4a2a]" 
          : "border-[1.5px] border-[#555]",
        // 可点击状态
        !block.isLocked && block.status === 'onMap' && "cursor-pointer active:scale-95 hover:scale-105"
      )}
      initial={false}
      animate={{
        scale: 1,
        opacity: 1,
      }}
    >
      {/* 方块背景 - 正常乳白色，锁定时深色 */}
      <div 
        className="absolute inset-0 rounded-lg"
        style={{
          backgroundColor: block.isLocked ? '#8a9a6a' : '#FFF8E7',
        }}
      />
      
      {/* 锁定状态覆盖层 - 深橄榄绿，增加不透明度 */}
      {block.isLocked && (
        <div 
          className="absolute inset-0 rounded-lg"
          style={{
            backgroundColor: 'hsl(80 40% 25% / 0.5)',
          }}
        />
      )}
      
      {/* OpenMoji 水果图标 - 放大1.1倍 */}
      <img 
        src={iconUrl}
        alt={block.type}
        draggable={false}
        className={cn(
          "relative z-10 pointer-events-none",
          block.isLocked && "opacity-60"
        )}
        style={{ 
          width: size,
          height: size,
          transform: 'scale(1.1)',
        }}
      />
    </motion.div>
  );
};
