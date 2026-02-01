import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// 全局事件触发器，用于跨组件同步钻石余额
const diamondEventListeners = new Set<() => void>();

export const triggerDiamondRefresh = () => {
  diamondEventListeners.forEach(listener => listener());
};

export const useDiamonds = () => {
  const [diamonds, setDiamonds] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Fetch diamond balance from database
  const fetchDiamonds = useCallback(async (uid: string): Promise<number> => {
    try {
      console.log('[useDiamonds] Fetching diamonds for:', uid);
      const { data, error } = await supabase
        .from('profiles')
        .select('diamonds')
        .eq('id', uid)
        .maybeSingle();
      
      if (error) {
        console.error('[useDiamonds] Error fetching diamonds:', error);
        return 0;
      }
      console.log('[useDiamonds] Got diamonds:', data?.diamonds);
      return data?.diamonds || 0;
    } catch (err) {
      console.error('[useDiamonds] Error in fetchDiamonds:', err);
      return 0;
    }
  }, []);

  // Spend diamonds (deduct from balance)
  const spendDiamonds = useCallback(async (amount: number, description: string): Promise<boolean> => {
    if (!userId || !isLoggedIn) {
      console.warn('Cannot spend diamonds: user not logged in');
      return false;
    }

    if (diamonds < amount) {
      console.warn('Insufficient diamonds');
      return false;
    }

    try {
      const newBalance = diamonds - amount;

      // Update balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ diamonds: newBalance })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating diamonds:', updateError);
        return false;
      }

      // Record transaction
      const { error: transactionError } = await supabase
        .from('diamond_transactions')
        .insert({
          user_id: userId,
          amount: -amount,
          type: 'spend',
          description,
        });

      if (transactionError) {
        console.error('Error recording transaction:', transactionError);
        // Don't fail, balance was already updated
      }

      setDiamonds(newBalance);
      // 触发全局刷新
      triggerDiamondRefresh();
      return true;
    } catch (err) {
      console.error('Error spending diamonds:', err);
      return false;
    }
  }, [userId, isLoggedIn, diamonds]);

  // Add diamonds (for rewards, etc.)
  const addDiamonds = useCallback(async (amount: number, description: string): Promise<boolean> => {
    if (!userId || !isLoggedIn) {
      console.warn('Cannot add diamonds: user not logged in');
      return false;
    }

    try {
      const newBalance = diamonds + amount;

      // Update balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ diamonds: newBalance })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating diamonds:', updateError);
        return false;
      }

      // Record transaction
      await supabase
        .from('diamond_transactions')
        .insert({
          user_id: userId,
          amount: amount,
          type: 'reward',
          description,
        });

      setDiamonds(newBalance);
      // 触发全局刷新
      triggerDiamondRefresh();
      return true;
    } catch (err) {
      console.error('Error adding diamonds:', err);
      return false;
    }
  }, [userId, isLoggedIn, diamonds]);

  // Refresh balance from database
  const refreshBalance = useCallback(async () => {
    if (userId) {
      const balance = await fetchDiamonds(userId);
      setDiamonds(balance);
    }
  }, [userId, fetchDiamonds]);

  // Check if user has enough diamonds
  const canAfford = useCallback((amount: number): boolean => {
    return isLoggedIn && diamonds >= amount;
  }, [isLoggedIn, diamonds]);

  // Initialize and listen for auth changes
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      console.log('[useDiamonds] Starting initialization...');
      
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[useDiamonds] Session error:', sessionError);
        }
        
        if (!mounted) return;
        
        if (session?.user) {
          console.log('[useDiamonds] User logged in:', session.user.id);
          setUserId(session.user.id);
          setIsLoggedIn(true);
          const balance = await fetchDiamonds(session.user.id);
          if (mounted) {
            setDiamonds(balance);
          }
        } else {
          console.log('[useDiamonds] No session');
          setUserId(null);
          setIsLoggedIn(false);
          setDiamonds(0);
        }
      } catch (err) {
        console.error('[useDiamonds] Error initializing:', err);
      } finally {
        if (mounted) {
          console.log('[useDiamonds] Initialization complete, setting loading=false');
          setLoading(false);
        }
      }
    };

    init();

    // 设置超时保护，防止永久卡住
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[useDiamonds] Loading timeout, forcing complete');
        setLoading(false);
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useDiamonds] Auth state changed:', event);
      if (!mounted) return;
      
      if (session?.user) {
        setUserId(session.user.id);
        setIsLoggedIn(true);
        const balance = await fetchDiamonds(session.user.id);
        if (mounted) {
          setDiamonds(balance);
        }
      } else {
        setUserId(null);
        setIsLoggedIn(false);
        setDiamonds(0);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchDiamonds]);

  // 监听全局刷新事件
  useEffect(() => {
    const handleRefresh = () => {
      if (userId) {
        fetchDiamonds(userId).then(balance => {
          setDiamonds(balance);
        });
      }
    };

    diamondEventListeners.add(handleRefresh);
    return () => {
      diamondEventListeners.delete(handleRefresh);
    };
  }, [userId, fetchDiamonds]);

  return {
    diamonds,
    loading,
    isLoggedIn,
    userId,
    spendDiamonds,
    addDiamonds,
    refreshBalance,
    canAfford,
  };
};
