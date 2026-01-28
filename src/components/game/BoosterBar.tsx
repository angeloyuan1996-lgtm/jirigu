import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Undo2, Shuffle, Plus } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { cn } from '@/lib/utils';

interface BoosterButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
  used: boolean;
}

const BoosterButton: React.FC<BoosterButtonProps> = ({
  icon,
  label,
  onClick,
  disabled,
  used,
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // 羊了个羊风格：大矩形蓝色按钮，粗边框
        "relative flex flex-col items-center gap-1 px-5 py-3",
        "rounded-xl",
        "border-[3px] border-[#333]", // 粗黑色描边
        "transition-all duration-150",
        disabled 
          ? "opacity-50 cursor-not-allowed" 
          : "cursor-pointer active:translate-y-[2px]",
      )}
      style={{
        // 纯色背景，无渐变
        backgroundColor: disabled ? '#6b7280' : 'hsl(217 85% 55%)',
        // 3D点击效果 - 底部深色边框
        borderBottomWidth: disabled ? '3px' : '6px',
        borderBottomColor: disabled ? '#4b5563' : 'hsl(217 85% 38%)',
      }}
      whileTap={!disabled ? { y: 2 } : undefined}
    >
      {/* 黄色 + 徽章 - 广告奖励指示器 */}
      {!used && (
        <div 
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center border-[2px] border-[#333]"
          style={{
            backgroundColor: 'hsl(45 100% 50%)', // 亮黄色
          }}
        >
          <Plus className="w-4 h-4 text-[#333]" strokeWidth={3} />
        </div>
      )}
      
      <div className="text-white">
        {icon}
      </div>
      <span className="text-white text-xs font-bold">
        {label}
      </span>
    </motion.button>
  );
};

export const BoosterBar: React.FC = () => {
  const { 
    useMoveOut, 
    useUndo, 
    useShuffle, 
    boostersUsed,
    slots,
    tempCache,
    historyStack,
  } = useGameStore();
  
  return (
    <div className="flex items-center justify-center gap-4 px-2">
      <BoosterButton
        icon={<ArrowLeftRight className="w-7 h-7" strokeWidth={2.5} />}
        label="移出"
        onClick={useMoveOut}
        disabled={boostersUsed.moveOut || slots.length < 3 || tempCache.length > 0}
        used={boostersUsed.moveOut}
      />
      
      <BoosterButton
        icon={<Undo2 className="w-7 h-7" strokeWidth={2.5} />}
        label="撤回"
        onClick={useUndo}
        disabled={boostersUsed.undo || historyStack.length === 0}
        used={boostersUsed.undo}
      />
      
      <BoosterButton
        icon={<Shuffle className="w-7 h-7" strokeWidth={2.5} />}
        label="洗牌"
        onClick={useShuffle}
        disabled={boostersUsed.shuffle}
        used={boostersUsed.shuffle}
      />
    </div>
  );
};
