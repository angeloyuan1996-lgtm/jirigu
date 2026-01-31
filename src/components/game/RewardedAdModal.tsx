import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useRewardedAd } from '@/hooks/useRewardedAd';

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
  const [phase, setPhase] = useState<'ready' | 'watching' | 'complete' | 'error'>('ready');
  
  const { 
    countdown, 
    isLoading, 
    showAd, 
    reset,
    error 
  } = useRewardedAd({
    useMockAd: true, // 当前使用模拟广告
    mockAdDuration: 3, // 3秒
    // 将来替换为真实广告配置:
    // useMockAd: false,
    // googleAdUnitId: 'your-ad-unit-id',
  });

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setPhase('ready');
      reset();
    }
  }, [isOpen, reset]);

  // 开始观看广告
  const handleStartWatching = useCallback(async () => {
    setPhase('watching');
    
    const success = await showAd({
      onAdCompleted: () => {
        setPhase('complete');
        // 延迟调用完成回调，让用户看到成功动画
        setTimeout(() => {
          onComplete();
        }, 800);
      },
      onAdFailed: (err) => {
        console.error('[RewardedAd] Failed:', err);
        setPhase('error');
      },
    });

    if (!success) {
      setPhase('error');
    }
  }, [showAd, onComplete]);

  // 重试
  const handleRetry = useCallback(() => {
    setPhase('ready');
    reset();
  }, [reset]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black/60"
          style={{ zIndex: 99999 }}
          onClick={phase === 'ready' || phase === 'error' ? onClose : undefined}
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
            {/* Ready Phase */}
            {phase === 'ready' && (
              <div className="text-center">
                <div 
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center border-[3px] border-[#333]"
                  style={{ backgroundColor: 'hsl(45 100% 50%)' }}
                >
                  <Play className="w-10 h-10 text-[#333] ml-1" strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-bold text-[#333] mb-2">
                  Watch Ad
                </h3>
                <p className="text-gray-600 mb-6">
                  Watch a short video to get the "{boosterName}" booster
                </p>
                <button
                  onClick={handleStartWatching}
                  disabled={isLoading}
                  className="w-full py-3 px-6 rounded-xl text-white font-bold text-lg border-[3px] border-[#333] transition-all active:translate-y-[2px] disabled:opacity-50"
                  style={{
                    backgroundColor: 'hsl(142 76% 45%)',
                    borderBottomWidth: '6px',
                    borderBottomColor: 'hsl(142 76% 32%)',
                  }}
                >
                  {isLoading ? 'Loading...' : 'Start Watching'}
                </button>
                <button
                  onClick={onClose}
                  className="mt-3 text-gray-500 text-sm hover:text-gray-700"
                >
                  Maybe Later
                </button>
              </div>
            )}

            {/* Watching Phase */}
            {phase === 'watching' && (
              <div className="text-center py-4">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <Loader2 
                    className="w-24 h-24 text-blue-500 animate-spin" 
                    strokeWidth={2}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-[#333]">
                      {countdown}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[#333] mb-2">
                  Ad Playing...
                </h3>
                <p className="text-gray-500">
                  Please wait {countdown} seconds
                </p>
                {/* 模拟广告提示 */}
                <p className="text-xs text-gray-400 mt-4">
                  🎮 Demo Mode - Real ads coming soon!
                </p>
              </div>
            )}

            {/* Complete Phase */}
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
                  Success!
                </h3>
                <p className="text-gray-600">
                  "{boosterName}" is now active. Tap to use it!
                </p>
              </div>
            )}

            {/* Error Phase */}
            {phase === 'error' && (
              <div className="text-center py-4">
                <div 
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'hsl(0 84% 60%)' }}
                >
                  <AlertCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-bold text-[#333] mb-2">
                  Ad Failed
                </h3>
                <p className="text-gray-600 mb-4">
                  {error || 'Unable to load ad. Please try again.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleRetry}
                    className="flex-1 py-3 px-4 rounded-xl text-white font-bold border-[3px] border-[#333]"
                    style={{
                      backgroundColor: 'hsl(217 85% 55%)',
                      borderBottomWidth: '5px',
                      borderBottomColor: 'hsl(217 85% 38%)',
                    }}
                  >
                    Retry
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 px-4 rounded-xl text-[#333] font-bold border-[3px] border-[#333]"
                    style={{
                      backgroundColor: '#e5e7eb',
                      borderBottomWidth: '5px',
                      borderBottomColor: '#9ca3af',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
