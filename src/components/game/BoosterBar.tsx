import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Undo2, Shuffle } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { cn } from '@/lib/utils';
import { RewardedAdModal } from './RewardedAdModal';

interface BoosterButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
  used: boolean;
  activated: boolean;
}

const BoosterButton: React.FC<BoosterButtonProps> = ({
  icon,
  label,
  onClick,
  disabled,
  used,
  activated,
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={used}
      className={cn(
        // 羊了个羊风格：大矩形蓝色按钮，粗边框
        "relative flex flex-col items-center gap-0.5 px-4 py-2",
        "rounded-xl",
        "border-[3px] border-[#333]", // 粗黑色描边
        "transition-all duration-150",
        used 
          ? "opacity-50 cursor-not-allowed" 
          : "cursor-pointer active:translate-y-[2px]",
      )}
      style={{
        // 纯色背景，无渐变
        backgroundColor: used ? '#6b7280' : 'hsl(217 85% 55%)',
        // 3D点击效果 - 底部深色边框
        borderBottomWidth: used ? '3px' : '6px',
        borderBottomColor: used ? '#4b5563' : 'hsl(217 85% 38%)',
      }}
      whileTap={!used ? { y: 2 } : undefined}
    >
      {/* 激活状态徽章 - 显示 "0" 或 "1" */}
      <div 
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center border-[2px] border-[#333] text-xs font-bold"
        style={{
          backgroundColor: activated ? 'hsl(45 100% 50%)' : 'hsl(0 0% 85%)', // 黄色=激活, 灰色=未激活
          color: '#333',
        }}
      >
        {activated ? '1' : '0'}
      </div>
      
      <div className="text-white">
        {icon}
      </div>
      <span className="text-white text-xs font-bold">
        {label}
      </span>
    </motion.button>
  );
};

type BoosterType = 'moveOut' | 'undo' | 'shuffle';

const BOOSTER_LABELS: Record<BoosterType, string> = {
  moveOut: 'Move Out',
  undo: 'Undo',
  shuffle: 'Shuffle',
};

export const BoosterBar: React.FC = () => {
  const { 
    useMoveOut, 
    useUndo, 
    useShuffle,
    activateBooster,
    boostersUsed,
    boostersActivated,
    slots,
    tempCache,
    historyStack,
  } = useGameStore();
  
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [pendingBooster, setPendingBooster] = useState<BoosterType | null>(null);

  const handleBoosterClick = (booster: BoosterType) => {
    if (boostersUsed[booster]) return;
    
    if (!boostersActivated[booster]) {
      // Not activated - show ad modal
      setPendingBooster(booster);
      setAdModalOpen(true);
    } else {
      // Already activated - use it
      executeBooster(booster);
    }
  };

  const executeBooster = (booster: BoosterType) => {
    switch (booster) {
      case 'moveOut':
        useMoveOut();
        break;
      case 'undo':
        useUndo();
        break;
      case 'shuffle':
        useShuffle();
        break;
    }
  };

  const handleAdComplete = () => {
    if (pendingBooster) {
      activateBooster(pendingBooster);
    }
    setAdModalOpen(false);
    setPendingBooster(null);
  };

  const handleAdClose = () => {
    setAdModalOpen(false);
    setPendingBooster(null);
  };
  
  return (
    <>
      <div className="flex items-center justify-center gap-3 px-2">
        <BoosterButton
          icon={<ArrowLeftRight className="w-6 h-6" strokeWidth={2.5} />}
          label="Move Out"
          onClick={() => handleBoosterClick('moveOut')}
          disabled={slots.length < 3 || tempCache.length > 0}
          used={boostersUsed.moveOut}
          activated={boostersActivated.moveOut}
        />
        
        <BoosterButton
          icon={<Undo2 className="w-6 h-6" strokeWidth={2.5} />}
          label="Undo"
          onClick={() => handleBoosterClick('undo')}
          disabled={historyStack.length === 0}
          used={boostersUsed.undo}
          activated={boostersActivated.undo}
        />
        
        <BoosterButton
          icon={<Shuffle className="w-6 h-6" strokeWidth={2.5} />}
          label="Shuffle"
          onClick={() => handleBoosterClick('shuffle')}
          disabled={false}
          used={boostersUsed.shuffle}
          activated={boostersActivated.shuffle}
        />
      </div>

      <RewardedAdModal
        isOpen={adModalOpen}
        onClose={handleAdClose}
        onComplete={handleAdComplete}
        boosterName={pendingBooster ? BOOSTER_LABELS[pendingBooster] : ''}
      />
    </>
  );
};
