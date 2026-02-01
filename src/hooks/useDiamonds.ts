import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// 全局事件触发器，用于跨组件同步钻石余额
const diamondEventListeners = new Set<() => void>();

export const triggerDiamondRefresh = () => {
  diamondEventListeners.forEach(listener => listener());
};

export const useDiamonds = () => {
  const { user, loading: authLoading } = useAuth();
  const [diamonds, setDiamonds] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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
    if (!user) {
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
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating diamonds:', updateError);
        return false;
      }

      // Record transaction
      const { error: transactionError } = await supabase
        .from('diamond_transactions')
        .insert({
          user_id: user.id,
          amount: -amount,
          type: 'spend',
          description,
        });

      if (transactionError) {
        console.error('Error recording transaction:', transactionError);
      }

      setDiamonds(newBalance);
      triggerDiamondRefresh();
      return true;
    } catch (err) {
      console.error('Error spending diamonds:', err);
      return false;
    }
  }, [user, diamonds]);

  // Add diamonds (for rewards, etc.)
  const addDiamonds = useCallback(async (amount: number, description: string): Promise<boolean> => {
    if (!user) {
      console.warn('Cannot add diamonds: user not logged in');
      return false;
    }

    try {
      const newBalance = diamonds + amount;

      // Update balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ diamonds: newBalance })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating diamonds:', updateError);
        return false;
      }

      // Record transaction
      await supabase
        .from('diamond_transactions')
        .insert({
          user_id: user.id,
          amount: amount,
          type: 'reward',
          description,
        });

      setDiamonds(newBalance);
      triggerDiamondRefresh();
      return true;
    } catch (err) {
      console.error('Error adding diamonds:', err);
      return false;
    }
  }, [user, diamonds]);

  // Refresh balance from database
  const refreshBalance = useCallback(async () => {
    if (user) {
      const balance = await fetchDiamonds(user.id);
      setDiamonds(balance);
    }
  }, [user, fetchDiamonds]);

  // Check if user has enough diamonds
  const canAfford = useCallback((amount: number): boolean => {
    return !!user && diamonds >= amount;
  }, [user, diamonds]);

  // 当 auth 状态变化时获取钻石数量
  useEffect(() => {
    let mounted = true;

    const loadDiamonds = async () => {
      if (authLoading) {
        return;
      }
      
      console.log('[useDiamonds] Auth loaded, user:', user?.email || 'guest');
      
      if (user) {
        const balance = await fetchDiamonds(user.id);
        if (mounted) {
          setDiamonds(balance);
          setLoading(false);
        }
      } else {
        if (mounted) {
          setDiamonds(0);
          setLoading(false);
        }
      }
    };

    loadDiamonds();

    return () => {
      mounted = false;
    };
  }, [user, authLoading, fetchDiamonds]);

  // 监听全局刷新事件
  useEffect(() => {
    const handleRefresh = () => {
      if (user) {
        fetchDiamonds(user.id).then(balance => {
          setDiamonds(balance);
        });
      }
    };

    diamondEventListeners.add(handleRefresh);
    return () => {
      diamondEventListeners.delete(handleRefresh);
    };
  }, [user, fetchDiamonds]);

  return {
    diamonds,
    loading: loading || authLoading,
    isLoggedIn: !!user,
    userId: user?.id || null,
    spendDiamonds,
    addDiamonds,
    refreshBalance,
    canAfford,
  };
};
