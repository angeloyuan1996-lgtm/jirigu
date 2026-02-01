import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Undo2, Shuffle, Gem } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useDiamonds } from '@/hooks/useDiamonds';
import { cn } from '@/lib/utils';
import { RewardedAdModal } from './RewardedAdModal';
import { DiamondPurchaseModal } from './DiamondPurchaseModal';
import { BoosterChoiceModal } from './BoosterChoiceModal';

const DIAMOND_COST = 2;

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
        "relative flex flex-col items-center gap-1 px-5 py-3",
        "rounded-xl",
        "border-[3px] border-[#333]",
        "transition-all duration-150",
        used 
          ? "opacity-50 cursor-not-allowed" 
          : "cursor-pointer active:translate-y-[2px]",
      )}
      style={{
        backgroundColor: used ? '#6b7280' : 'hsl(217 85% 55%)',
        borderBottomWidth: used ? '3px' : '6px',
        borderBottomColor: used ? '#4b5563' : 'hsl(217 85% 38%)',
      }}
      whileTap={!used ? { y: 2 } : undefined}
    >
      {/* Diamond cost indicator - top left */}
      <div 
        className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded-full flex items-center justify-center border-[2px] border-[#333]"
        style={{
          backgroundColor: 'hsl(45 100% 50%)',
          color: '#333',
        }}
      >
        <Gem className="w-3.5 h-3.5" />
      </div>
      
      {/* Activation status badge - top right */}
      <div 
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center border-[2px] border-[#333] text-xs font-bold"
        style={{
          backgroundColor: activated ? 'hsl(142 76% 45%)' : 'hsl(0 0% 85%)',
          color: '#333',
        }}
      >
        {activated ? '✓' : '0'}
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
  
  const { diamonds, canAfford, spendDiamonds, isLoggedIn } = useDiamonds();
  
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);
  const [pendingBooster, setPendingBooster] = useState<BoosterType | null>(null);

  const handleBoosterClick = async (booster: BoosterType) => {
    if (boostersUsed[booster]) return;
    
    if (boostersActivated[booster]) {
      // Already activated - use it directly
      executeBooster(booster);
      return;
    }
    
    // Not activated - check if user can pay with diamonds
    if (canAfford(DIAMOND_COST)) {
      // User has enough diamonds - spend and activate
      const success = await spendDiamonds(DIAMOND_COST, `Used ${BOOSTER_LABELS[booster]} booster`);
      if (success) {
        activateBooster(booster);
        executeBooster(booster);
      }
    } else if (isLoggedIn && diamonds > 0) {
      // Has some diamonds but not enough - show choice modal
      setPendingBooster(booster);
      setChoiceModalOpen(true);
    } else {
      // No diamonds or not logged in - show ad modal or choice
      setPendingBooster(booster);
      if (!isLoggedIn) {
        // Not logged in - just show ad
        setAdModalOpen(true);
      } else {
        // Logged in but 0 diamonds - show choice
        setChoiceModalOpen(true);
      }
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
      executeBooster(pendingBooster);
    }
    setAdModalOpen(false);
    setChoiceModalOpen(false);
    setPendingBooster(null);
  };

  const handleAdClose = () => {
    setAdModalOpen(false);
    setPendingBooster(null);
  };

  const handleWatchAd = () => {
    setChoiceModalOpen(false);
    setAdModalOpen(true);
  };

  const handleGetDiamonds = () => {
    setChoiceModalOpen(false);
    setPurchaseModalOpen(true);
  };

  const handleChoiceClose = () => {
    setChoiceModalOpen(false);
    setPendingBooster(null);
  };
  
  return (
    <>
      <div className="flex items-center justify-center gap-4 px-2">
        <BoosterButton
          icon={<ArrowLeftRight className="w-7 h-7" strokeWidth={2.5} />}
          label="Move Out"
          onClick={() => handleBoosterClick('moveOut')}
          disabled={slots.length < 3 || tempCache.length > 0}
          used={boostersUsed.moveOut}
          activated={boostersActivated.moveOut}
        />
        
        <BoosterButton
          icon={<Undo2 className="w-7 h-7" strokeWidth={2.5} />}
          label="Undo"
          onClick={() => handleBoosterClick('undo')}
          disabled={historyStack.length === 0}
          used={boostersUsed.undo}
          activated={boostersActivated.undo}
        />
        
        <BoosterButton
          icon={<Shuffle className="w-7 h-7" strokeWidth={2.5} />}
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
        onGetDiamonds={handleGetDiamonds}
        boosterName={pendingBooster ? BOOSTER_LABELS[pendingBooster] : ''}
      />

      <DiamondPurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
      />

      <BoosterChoiceModal
        isOpen={choiceModalOpen}
        onClose={handleChoiceClose}
        onWatchAd={handleWatchAd}
        onGetDiamonds={handleGetDiamonds}
        boosterName={pendingBooster ? BOOSTER_LABELS[pendingBooster] : ''}
        diamondBalance={diamonds}
      />
    </>
  );
};
