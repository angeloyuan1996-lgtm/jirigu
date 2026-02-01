import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Share2, Trophy, Download, Play } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { toast } from 'sonner';
import { LeaderboardModal } from './LeaderboardModal';
import { supabase } from '@/integrations/supabase/client';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { ReviveAdModal } from './ReviveAdModal';

const MAX_LEVEL = 2; // 游戏只有2关

export const GameOverModal: React.FC = () => {
  const { 
    isGameOver, 
    hasRevived, 
    reviveWithWhatsApp, 
    restartGame,
    totalBlocks,
    remainingBlocks,
    currentLevel,
  } = useGameStore();
  
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePwaInstall();
  const [showAdModal, setShowAdModal] = useState(false);
  const [showReviveButton, setShowReviveButton] = useState(false);
  
  const progress = Math.round(((totalBlocks - remainingBlocks) / totalBlocks) * 100);
  
  // 处理观看广告按钮点击
  const handleWatchAdsClick = useCallback(() => {
    setShowAdModal(true);
  }, []);
  
  // 广告完成后显示复活按钮
  const handleAdComplete = useCallback(() => {
    setShowAdModal(false);
    setShowReviveButton(true);
  }, []);
  
  // 处理复活
  const handleRevive = useCallback(() => {
    setShowReviveButton(false);
    reviveWithWhatsApp();
  }, [reviveWithWhatsApp]);
  
  // 重置状态当游戏结束状态改变时
  useEffect(() => {
    if (!isGameOver) {
      setShowAdModal(false);
      setShowReviveButton(false);
    }
  }, [isGameOver]);
  
  return (
    <>
      {/* 广告观看弹窗 */}
      <ReviveAdModal
        isOpen={showAdModal}
        onClose={() => setShowAdModal(false)}
        onComplete={handleAdComplete}
      />
      
      {/* 复活按钮覆盖层 */}
      <AnimatePresence>
        {showReviveButton && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex flex-col items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100000 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              {/* 成功图标 */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-6"
              >
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              
              {/* 复活按钮 */}
              <motion.button
                onClick={handleRevive}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 text-white font-bold text-xl rounded-2xl border-[3px] border-[#333]"
                style={{
                  backgroundColor: '#22C55E',
                  borderBottomWidth: '6px',
                  borderBottomColor: '#166534',
                }}
              >
                Revive now 🎉
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isGameOver && !showAdModal && !showReviveButton && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 99999 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative w-[320px] p-6 rounded-3xl border-[4px] border-[#333]"
              style={{
                backgroundColor: '#FEF3C7',
              }}
            >
            {/* Header */}
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-[#333]">
                  Game Over! 😢
                </h2>
                <p className="text-[#666] mt-1 font-medium">
                  Level {currentLevel}
                </p>
                {/* Progress-based feedback for Level 2 */}
                {currentLevel === 2 && (
                  <p className="text-[#333] mt-2 text-sm font-medium italic">
                    {progress >= 90 
                      ? "Oh no! You were so close!" 
                      : progress >= 80 
                        ? "Wow, that's an impressive score!" 
                        : progress >= 70 
                          ? "Not bad, I believe in you!" 
                          : progress >= 60 
                            ? "Pretty good, your friends will have a hard time beating you" 
                            : progress >= 20 
                              ? "So-so, get your friends to come challenge me" 
                              : "Are you going to keep trying or call someone to help?"}
                  </p>
                )}
              </div>
              
              {/* Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-[#333] font-bold mb-2">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div 
                  className="h-5 rounded-full overflow-hidden border-[2px] border-[#333]"
                  style={{ backgroundColor: '#FDE68A' }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: '#F59E0B',
                    }}
                  />
                </div>
              </div>
              
              {/* Buttons */}
              <div className="flex flex-col gap-3">
                {!hasRevived && (
                  <motion.button
                    onClick={handleWatchAdsClick}
                    whileTap={{ y: 2 }}
                    className="w-full h-12 text-white font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                    style={{
                      backgroundColor: '#22C55E',
                      borderBottomWidth: '5px',
                      borderBottomColor: '#166534',
                    }}
                  >
                    <Play className="w-5 h-5" strokeWidth={2.5} />
                    Watch Ads to Revive
                  </motion.button>
                )}
                
                {/* PWA 安装按钮 - 未安装时始终显示 */}
                {!isInstalled && (
                  <motion.button
                    onClick={async () => {
                      if (isInstallable) {
                        const success = await promptInstall();
                        if (success) {
                          toast.success('Game added to home screen!');
                        }
                      } else if (isIOS) {
                        toast.info('Tap the Share button (box with arrow) → Add to Home Screen', {
                          duration: 5000,
                        });
                      } else {
                        // Android/Desktop 非 PWA 环境
                        toast.info('Open browser menu (⋮) → Add to Home Screen', {
                          duration: 5000,
                        });
                      }
                    }}
                    whileTap={{ y: 2 }}
                    className="w-full h-12 text-[#333] font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                    style={{
                      backgroundColor: '#FDE68A',
                      borderBottomWidth: '5px',
                      borderBottomColor: '#D97706',
                    }}
                  >
                    <Download className="w-5 h-5" strokeWidth={2.5} />
                    Add to Home Screen
                  </motion.button>
                )}

                {/* 邀请好友按钮 */}
                <motion.button
                  onClick={async () => {
                    const inviteText = "This game is so addictive—only 0.1% of players ever make it to the end! https://jirigu.com";
                    try {
                      await navigator.clipboard.writeText(inviteText);
                      toast.success('Invite copied!');
                    } catch (err) {
                      toast.error('Copy failed, please try again');
                    }
                  }}
                  whileTap={{ y: 2 }}
                  className="w-full h-12 text-[#333] font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                  style={{
                    backgroundColor: '#E9D5FF',
                    borderBottomWidth: '5px',
                    borderBottomColor: '#9333EA',
                  }}
                >
                  <Share2 className="w-5 h-5" strokeWidth={2.5} />
                  Invite Your Friend
                </motion.button>
                
                <motion.button
                  onClick={restartGame}
                  whileTap={{ y: 2 }}
                  className="w-full h-12 text-white font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                  style={{
                    backgroundColor: 'hsl(217 85% 55%)',
                    borderBottomWidth: '5px',
                    borderBottomColor: 'hsl(217 85% 38%)',
                  }}
                >
                  <RotateCcw className="w-5 h-5" strokeWidth={2.5} />
                  Restart
                </motion.button>
              </div>
              
              {hasRevived && (
                <p className="text-center text-sm text-[#666] font-medium mt-4">
                  You've already used your revival chance. Good luck next time! 🍀
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// 难度升级提示组件
const DifficultyNotice: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 100000 }}
        >
          <motion.div
            className="px-8 py-4 rounded-2xl"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
          >
            <p className="text-white text-xl font-bold text-center">
              ⚡ Difficulty Increased!
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const GameWonModal: React.FC = () => {
  const { 
    isGameWon, 
    currentLevel,
    initLevel,
  } = useGameStore();
  
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePwaInstall();
  const [copied, setCopied] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showDifficultyNotice, setShowDifficultyNotice] = useState(false);
  const isLastLevel = currentLevel >= MAX_LEVEL;
  
  // Track if completion has been recorded for this game win
  const hasRecordedCompletion = useRef(false);
  
  // Record level completion to database when game is won
  useEffect(() => {
    if (!isGameWon || hasRecordedCompletion.current) return;
    
    const recordCompletion = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[GameWonModal] No authenticated user, skipping completion record');
          return;
        }
        
        const { error } = await supabase.from('level_completions').insert({
          user_id: user.id,
          level_number: currentLevel
        });
        
        if (error) {
          console.error('[GameWonModal] Failed to record completion:', error);
        } else {
          console.log('[GameWonModal] Level completion recorded:', currentLevel);
          hasRecordedCompletion.current = true;
        }
      } catch (error) {
        console.error('[GameWonModal] Error recording completion:', error);
      }
    };
    
    recordCompletion();
  }, [isGameWon, currentLevel]);
  
  // Reset the recorded flag when game win state changes (new game)
  useEffect(() => {
    if (!isGameWon) {
      hasRecordedCompletion.current = false;
    }
  }, [isGameWon]);
  
  const handleNextLevel = () => {
    const nextLevel = currentLevel + 1;
    if (nextLevel === 2) {
      setShowDifficultyNotice(true);
      setTimeout(() => {
        setShowDifficultyNotice(false);
        initLevel(nextLevel);
      }, 1000);
    } else {
      initLevel(nextLevel);
    }
  };
  
  const handlePlayAgain = () => {
    initLevel(1);
  };
  
  const handleShare = async () => {
    const inviteText = "This game is so addictive—only 0.1% of players ever make it to the end! https://jirigu.com";
    
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
      toast.success('Invite copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Copy failed, please try again');
    }
  };
  
  const handleViewLeaderboard = () => {
    setShowLeaderboard(true);
  };
  
  return (
    <AnimatePresence>
      {isGameWon && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 99999 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative w-[320px] p-6 rounded-3xl text-center border-[4px] border-[#333]"
            style={{
              backgroundColor: '#BBF7D0',
            }}
          >
            {/* Celebration */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-6xl mb-4"
            >
              {isLastLevel ? '🏆' : '🎉'}
            </motion.div>
            
            <h2 className="text-2xl font-bold text-[#333] mb-2">
              {isLastLevel ? 'Congratulations! All Levels Cleared!' : 'Level Complete!'}
            </h2>
            <p className="text-[#166534] font-medium mb-6">
              {isLastLevel ? 'You have conquered all challenges!' : "Warm-up done, now let's get serious!"}
            </p>
            
            {isLastLevel ? (
              // Last level: show share, install, play again, leaderboard
              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={handleShare}
                  whileTap={{ y: 2 }}
                  className="w-full h-12 text-white font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                  style={{
                    backgroundColor: '#22C55E',
                    borderBottomWidth: '5px',
                    borderBottomColor: '#166534',
                  }}
                >
                  <Share2 className="w-5 h-5" strokeWidth={2.5} />
                  {copied ? 'Copied!' : 'Share with Friends'}
                </motion.button>
                
                {/* PWA 安装按钮 - 只在可安装时显示 */}
                {isInstallable && !isInstalled && (
                  <motion.button
                    onClick={async () => {
                      const success = await promptInstall();
                      if (success) {
                        toast.success('Game added to home screen!');
                      }
                    }}
                    whileTap={{ y: 2 }}
                    className="w-full h-12 text-[#333] font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                    style={{
                      backgroundColor: '#FDE68A',
                      borderBottomWidth: '5px',
                      borderBottomColor: '#D97706',
                    }}
                  >
                    <Download className="w-5 h-5" strokeWidth={2.5} />
                    Add to Home Screen
                  </motion.button>
                )}

                {/* iOS 提示 */}
                {isIOS && !isInstalled && (
                  <motion.button
                    onClick={() => {
                      toast.info('Tap the Share button (box with arrow) → Add to Home Screen', {
                        duration: 5000,
                      });
                    }}
                    whileTap={{ y: 2 }}
                    className="w-full h-12 text-[#333] font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                    style={{
                      backgroundColor: '#FDE68A',
                      borderBottomWidth: '5px',
                      borderBottomColor: '#D97706',
                    }}
                  >
                    <Download className="w-5 h-5" strokeWidth={2.5} />
                    Add to Home Screen
                  </motion.button>
                )}
                
                <motion.button
                  onClick={handlePlayAgain}
                  whileTap={{ y: 2 }}
                  className="w-full h-12 text-white font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                  style={{
                    backgroundColor: 'hsl(217 85% 55%)',
                    borderBottomWidth: '5px',
                    borderBottomColor: 'hsl(217 85% 38%)',
                  }}
                >
                  <RotateCcw className="w-5 h-5" strokeWidth={2.5} />
                  Play Again
                </motion.button>
                
                <motion.button
                  onClick={handleViewLeaderboard}
                  whileTap={{ y: 2 }}
                  className="w-full h-12 text-[#333] font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                  style={{
                    backgroundColor: '#FDE68A',
                    borderBottomWidth: '5px',
                    borderBottomColor: '#D97706',
                  }}
                >
                  <Trophy className="w-5 h-5" strokeWidth={2.5} />
                  Leaderboard
                </motion.button>
              </div>
            ) : (
              // Not last level: show next level button
              <motion.button
                onClick={handleNextLevel}
                whileTap={{ y: 2 }}
                className="w-full h-12 text-white font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333]"
                style={{
                  backgroundColor: '#22C55E',
                  borderBottomWidth: '5px',
                  borderBottomColor: '#166534',
                }}
              >
                Next Level →
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
      
      {/* Leaderboard Modal */}
      <LeaderboardModal 
        isOpen={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
      />
      
      {/* Difficulty Notice */}
      <DifficultyNotice isVisible={showDifficultyNotice} />
    </AnimatePresence>
  );
};
