import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Loader2, CheckCircle } from 'lucide-react';

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  boosterName: string;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  boosterName,
}) => {
  const [phase, setPhase] = useState<'ready' | 'watching' | 'complete'>('ready');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setPhase('ready');
      setCountdown(3);
    }
  }, [isOpen]);

  useEffect(() => {
    if (phase === 'watching' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'watching' && countdown === 0) {
      setPhase('complete');
      // Auto complete after showing success
      setTimeout(() => {
        onComplete();
      }, 800);
    }
  }, [phase, countdown, onComplete]);

  const handleStartWatching = () => {
    setPhase('watching');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={phase === 'ready' ? onClose : undefined}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border-[3px] border-[#333] shadow-2xl p-6 mx-4 max-w-sm w-full"
            style={{
              boxShadow: '0 8px 0 0 #333',
            }}
          >
            {phase === 'ready' && (
              <div className="text-center">
                <div 
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center border-[3px] border-[#333]"
                  style={{ backgroundColor: 'hsl(45 100% 50%)' }}
                >
                  <Play className="w-10 h-10 text-[#333] ml-1" strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-bold text-[#333] mb-2">
                  观看广告
                </h3>
                <p className="text-gray-600 mb-6">
                  观看一段短视频即可获得「{boosterName}」道具
                </p>
                <button
                  onClick={handleStartWatching}
                  className="w-full py-3 px-6 rounded-xl text-white font-bold text-lg border-[3px] border-[#333] transition-all active:translate-y-[2px]"
                  style={{
                    backgroundColor: 'hsl(142 76% 45%)',
                    borderBottomWidth: '6px',
                    borderBottomColor: 'hsl(142 76% 32%)',
                  }}
                >
                  开始观看
                </button>
                <button
                  onClick={onClose}
                  className="mt-3 text-gray-500 text-sm hover:text-gray-700"
                >
                  稍后再说
                </button>
              </div>
            )}

            {phase === 'watching' && (
              <div className="text-center py-4">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  {/* Spinning loader */}
                  <Loader2 
                    className="w-24 h-24 text-blue-500 animate-spin" 
                    strokeWidth={2}
                  />
                  {/* Countdown number */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-[#333]">
                      {countdown}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[#333] mb-2">
                  广告播放中...
                </h3>
                <p className="text-gray-500">
                  请稍候 {countdown} 秒
                </p>
              </div>
            )}

            {phase === 'complete' && (
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'hsl(142 76% 45%)' }}
                >
                  <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
                </motion.div>
                <h3 className="text-xl font-bold text-[#333] mb-2">
                  获得成功！
                </h3>
                <p className="text-gray-600">
                  「{boosterName}」已激活，点击即可使用
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
