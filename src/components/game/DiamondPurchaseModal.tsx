import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, X, Loader2, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiamondPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete?: () => void;
  onNeedLogin?: () => void;
}

export const DiamondPurchaseModal: React.FC<DiamondPurchaseModalProps> = ({
  isOpen,
  onClose,
  onPurchaseComplete,
  onNeedLogin,
}) => {
  const [loading, setLoading] = useState(false);
  const [showLoginNotice, setShowLoginNotice] = useState(false);

  const handlePurchase = async () => {
    // 检查登录状态
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      // 显示黑色提示框，1秒后自动关闭
      setShowLoginNotice(true);
      setTimeout(() => {
        setShowLoginNotice(false);
        onClose();
        if (onNeedLogin) {
          onNeedLogin();
        }
      }, 1000);
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-diamond-checkout');
      
      if (error) {
        console.error('Error creating checkout:', error);
        toast.error('Failed to start checkout. Please try again.');
        setLoading(false);
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        onClose();
        onPurchaseComplete?.();
      } else {
        toast.error('Failed to create checkout session');
        setLoading(false);
      }
    } catch (err) {
      console.error('Purchase error:', err);
      toast.error('An error occurred. Please try again.');
      setLoading(false);
    }
  };

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
          {/* 黑色提示框 - 请先登录 */}
          <AnimatePresence>
            {showLoginNotice && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed inset-0 flex items-center justify-center"
                style={{ zIndex: 100000 }}
              >
                <div 
                  className="px-8 py-4 rounded-xl text-white text-lg font-bold"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
                >
                  Please login first
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl border-[3px] border-[#333] shadow-2xl p-6 mx-4 max-w-sm w-full"
            style={{ boxShadow: '0 8px 0 0 #333' }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div 
                className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center border-[3px] border-[#333]"
                style={{ 
                  background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #2563EB 100%)',
                }}
              >
                <Gem className="w-10 h-10 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-[#333]">
                Get Diamonds
              </h3>
            </div>

            {/* Package */}
            <div 
              className="rounded-xl border-[3px] border-[#333] p-4 mb-4"
              style={{ 
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">💎</div>
                  <div>
                    <div className="text-2xl font-bold text-[#333]">100</div>
                    <div className="text-sm text-amber-700">Diamonds</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#333]">€1.40</div>
                  <div className="text-xs text-amber-700">Best Value</div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="text-center text-sm text-gray-500 mb-4">
              <p>• 2💎 per booster use</p>
              <p>• No ads</p>
            </div>

            {/* Purchase button - 只保留 Purchase Now */}
            <button
              onClick={handlePurchase}
              disabled={loading}
              className="w-full py-3 px-6 rounded-xl text-white font-bold text-lg border-[3px] border-[#333] transition-all active:translate-y-[2px] flex items-center justify-center gap-2"
              style={{
                backgroundColor: loading ? '#9CA3AF' : '#22C55E',
                borderBottomWidth: loading ? '3px' : '6px',
                borderBottomColor: loading ? '#6B7280' : '#16A34A',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Purchase Now
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              Secure payment via Stripe
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
