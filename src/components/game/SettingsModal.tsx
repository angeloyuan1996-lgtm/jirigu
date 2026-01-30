import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Home, Download, Mail } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useGameStore } from '@/stores/gameStore';
import { AuthModal } from './AuthModal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    soundEnabled, 
    toggleSound, 
    abandonGame,
  } = useGameStore();
  
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    // 检查是否已安装
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // 检查登录状态
    const checkAuth = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          setUser(session?.user ?? null);
        });
        
        return () => subscription.unsubscribe();
      } catch (err) {
        // Supabase not yet available
      }
    };
    
    checkAuth();
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };
  
  const handleAbandon = () => {
    onClose();
    abandonGame();
  };

  const handleLogout = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      // Handle error
    }
  };
  
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative w-[300px] p-6 rounded-3xl border-[4px] border-[#333]"
              style={{ backgroundColor: '#FFFEF5' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full border-[2px] border-[#333]"
                style={{ backgroundColor: '#FEE2E2' }}
              >
                <X className="w-4 h-4 text-[#333]" strokeWidth={2.5} />
              </motion.button>
              
              {/* Header */}
              <h2 className="text-xl font-bold text-[#333] text-center mb-6">
                设置
              </h2>
              
              {/* Settings options */}
              <div className="space-y-4">
                {/* Sound effects toggle */}
                <div 
                  className="flex items-center justify-between p-3 rounded-xl border-[2px] border-[#333]"
                  style={{ backgroundColor: '#F0FDF4' }}
                >
                  <div className="flex items-center gap-3">
                    {soundEnabled ? (
                      <Volume2 className="w-5 h-5 text-[#22C55E]" strokeWidth={2.5} />
                    ) : (
                      <VolumeX className="w-5 h-5 text-[#999]" strokeWidth={2.5} />
                    )}
                    <span className="font-bold text-[#333]">音效</span>
                  </div>
                  <Switch 
                    checked={soundEnabled} 
                    onCheckedChange={toggleSound}
                    className="data-[state=checked]:bg-[#22C55E]"
                  />
                </div>
              </div>
              
              {/* Abandon button */}
              <motion.button
                onClick={handleAbandon}
                whileTap={{ y: 2 }}
                className="w-full h-12 mt-6 text-white font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                style={{
                  backgroundColor: '#EF4444',
                  borderBottomWidth: '5px',
                  borderBottomColor: '#B91C1C',
                }}
              >
                <Home className="w-5 h-5" strokeWidth={2.5} />
                放弃挑战
              </motion.button>
              
              {/* Install button - 只在可以安装时显示 */}
              {!isInstalled && (
                <motion.button
                  onClick={handleInstall}
                  whileTap={{ y: 2 }}
                  className="w-full h-12 mt-3 font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                  style={{
                    backgroundColor: deferredPrompt ? '#3B82F6' : '#9CA3AF',
                    color: 'white',
                    borderBottomWidth: '5px',
                    borderBottomColor: deferredPrompt ? '#1D4ED8' : '#6B7280',
                  }}
                  disabled={!deferredPrompt}
                >
                  <Download className="w-5 h-5" strokeWidth={2.5} />
                  {deferredPrompt ? '添加到屏幕' : '请用浏览器打开'}
                </motion.button>
              )}
              
              {isInstalled && (
                <div className="w-full mt-3 text-center text-sm text-[#22C55E] font-medium">
                  ✓ 已安装到屏幕
                </div>
              )}

              {/* Login/Logout button */}
              {user ? (
                <div className="mt-3 space-y-2">
                  <div className="text-center text-sm text-[#22C55E] font-medium truncate">
                    ✓ 已登录: {user.email}
                  </div>
                  <motion.button
                    onClick={handleLogout}
                    whileTap={{ y: 2 }}
                    className="w-full h-12 font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                    style={{
                      backgroundColor: '#F3F4F6',
                      color: '#333',
                      borderBottomWidth: '5px',
                      borderBottomColor: '#D1D5DB',
                    }}
                  >
                    <Mail className="w-5 h-5" strokeWidth={2.5} />
                    退出登录
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  onClick={() => setShowAuthModal(true)}
                  whileTap={{ y: 2 }}
                  className="w-full h-12 mt-3 font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                  style={{
                    backgroundColor: '#8B5CF6',
                    color: 'white',
                    borderBottomWidth: '5px',
                    borderBottomColor: '#6D28D9',
                  }}
                >
                  <Mail className="w-5 h-5" strokeWidth={2.5} />
                  邮箱登录
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};
