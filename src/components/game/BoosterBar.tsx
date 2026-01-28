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
        "relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl",
        "transition-all duration-200",
        disabled 
          ? "opacity-50 cursor-not-allowed" 
          : "hover:scale-105 active:scale-95",
      )}
      style={{
        background: disabled 
          ? 'linear-gradient(180deg, #6b7280 0%, #4b5563 100%)'
          : 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
        boxShadow: disabled 
          ? 'none' 
          : '0 4px 12px rgba(59, 130, 246, 0.4)',
        border: '2px solid rgba(255,255,255,0.2)',
      }}
      whileHover={!disabled ? { y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
    >
      {/* Plus badge */}
      {!used && (
        <div 
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: '#000',
            border: '2px solid #fff',
          }}
        >
          <Plus className="w-3 h-3 text-white" />
        </div>
      )}
      
      <div className="text-white text-2xl">
        {icon}
      </div>
      <span className="text-white text-xs font-medium">
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
    <div className="flex items-center justify-center gap-3 px-2">
      <BoosterButton
        icon={<ArrowLeftRight className="w-6 h-6" />}
        label="Move Out"
        onClick={useMoveOut}
        disabled={boostersUsed.moveOut || slots.length < 3 || tempCache.length > 0}
        used={boostersUsed.moveOut}
      />
      
      <BoosterButton
        icon={<Undo2 className="w-6 h-6" />}
        label="Undo"
        onClick={useUndo}
        disabled={boostersUsed.undo || historyStack.length === 0}
        used={boostersUsed.undo}
      />
      
      <BoosterButton
        icon={<Shuffle className="w-6 h-6" />}
        label="Shuffle"
        onClick={useShuffle}
        disabled={boostersUsed.shuffle}
        used={boostersUsed.shuffle}
      />
    </div>
  );
};
