import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Home, Download, Mail, UserPlus, Trophy } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useGameStore } from '@/stores/gameStore';
import { AuthModal } from './AuthModal';
import { FriendSearch } from './FriendSearch';
import { FriendRequestsList } from './FriendRequestsList';
import { FriendsList } from './FriendsList';
import { UsernameDisplay } from './UsernameDisplay';
import { LeaderboardModal } from './LeaderboardModal';
import { supabase } from '@/integrations/supabase/client';

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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [friendsRefreshTrigger, setFriendsRefreshTrigger] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  
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
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        setAuthLoading(false);
      } catch (err) {
        console.error('Error checking auth:', err);
        setAuthLoading(false);
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      subscription.unsubscribe();
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
    console.log('Logout button clicked');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error from Supabase:', error);
        return;
      }
      console.log('Logout successful');
      setUser(null);
      onClose(); // Close the modal after logout
    } catch (err) {
      console.error('Logout exception:', err);
    }
  };

  const handleFriendRequestHandled = () => {
    setFriendsRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative w-full max-w-[340px] max-h-[90vh] overflow-y-auto p-6 rounded-3xl border-[4px] border-[#333]"
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
              <h2 className="text-xl font-bold text-[#333] text-center mb-2">
                Settings
              </h2>
              
              {/* Username display */}
              <div className="flex justify-center mb-4">
                <UsernameDisplay />
              </div>
              
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
                    <span className="font-bold text-[#333]">Sound</span>
                  </div>
                  <Switch 
                    checked={soundEnabled} 
                    onCheckedChange={toggleSound}
                    className="data-[state=checked]:bg-[#22C55E]"
                  />
                </div>

                {/* Country Leaderboard button */}
                <motion.button
                  onClick={() => setShowLeaderboard(true)}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border-[2px] border-[#333]"
                  style={{ backgroundColor: '#FEF3C7' }}
                >
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-[#D97706]" strokeWidth={2.5} />
                    <span className="font-bold text-[#333]">Country Leaderboard</span>
                  </div>
                  <span className="text-lg">🏆</span>
                </motion.button>

                {/* 好友功能区域 */}
                {authLoading ? (
                  <div className="text-center py-4 text-sm text-[#666]">
                    Loading...
                  </div>
                ) : user ? (
                  <>
                    {/* 好友请求通知 */}
                    <FriendRequestsList 
                      currentUserId={user.id} 
                      onRequestHandled={handleFriendRequestHandled}
                    />

                    {/* 好友列表 */}
                    <FriendsList 
                      currentUserId={user.id}
                      refreshTrigger={friendsRefreshTrigger}
                    />
                    
                    {/* 好友搜索区域 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[#333] font-bold">
                        <UserPlus className="w-5 h-5" strokeWidth={2.5} />
                        <span>Add Friends</span>
                      </div>
                      <FriendSearch currentUserId={user.id} />
                    </div>
                  </>
                ) : (
                  <div 
                    className="p-4 rounded-xl border-[2px] border-[#333] text-center"
                    style={{ backgroundColor: '#FEF3C7' }}
                  >
                    <UserPlus className="w-8 h-8 mx-auto mb-2 text-[#F59E0B]" />
                    <p className="text-sm font-bold text-[#333]">Login to see friends and add new ones</p>
                  </div>
                )}
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
                Quit Game
              </motion.button>
              
              {/* Installed indicator */}
              {isInstalled && (
                <div className="w-full mt-6 text-center text-sm text-[#22C55E] font-medium">
                  ✓ Installed
                </div>
              )}

              {/* Login/Logout button */}
              {authLoading ? null : user ? (
                <div className="mt-3 space-y-2">
                  <div className="text-center text-sm text-[#22C55E] font-medium truncate">
                    ✓ Logged in: {user.email}
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
                    Log Out
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
                  Email Login
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

      {/* Leaderboard Modal */}
      <LeaderboardModal 
        isOpen={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
      />
    </>
  );
};
