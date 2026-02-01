import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Gem, X } from 'lucide-react';

interface BoosterChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWatchAd: () => void;
  onGetDiamonds: () => void;
  boosterName: string;
  diamondBalance: number;
}

export const BoosterChoiceModal: React.FC<BoosterChoiceModalProps> = ({
  isOpen,
  onClose,
  onWatchAd,
  onGetDiamonds,
  boosterName,
  diamondBalance,
}) => {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black/60"
          style={{ zIndex: 99999 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border-[3px] border-[#333] shadow-2xl p-6 mx-4 max-w-sm w-full"
            style={{ boxShadow: '0 8px 0 0 #333' }}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-[#333] mb-2">
                Unlock "{boosterName}"
              </h3>
              <p className="text-gray-500 text-sm">
                You need 2 diamonds to use this booster
              </p>
              <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-amber-100 rounded-full text-amber-700 font-bold">
                <span>💎</span>
                <span>{diamondBalance}</span>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {/* Watch Ad option */}
              <button
                onClick={onWatchAd}
                className="w-full py-3 px-4 rounded-xl text-white font-bold border-[3px] border-[#333] transition-all active:translate-y-[2px] flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'hsl(142 76% 45%)',
                  borderBottomWidth: '6px',
                  borderBottomColor: 'hsl(142 76% 32%)',
                }}
              >
                <Play className="w-5 h-5" />
                Watch Ad (Free)
              </button>

              {/* Get Diamonds option */}
              <button
                onClick={onGetDiamonds}
                className="w-full py-3 px-4 rounded-xl text-white font-bold border-[3px] border-[#333] transition-all active:translate-y-[2px] flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'hsl(217 85% 55%)',
                  borderBottomWidth: '6px',
                  borderBottomColor: 'hsl(217 85% 38%)',
                }}
              >
                <Gem className="w-5 h-5" />
                Get Diamonds
              </button>
            </div>

            {/* Cancel */}
            <button
              onClick={onClose}
              className="w-full mt-3 py-2 text-gray-500 text-sm hover:text-gray-700"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
