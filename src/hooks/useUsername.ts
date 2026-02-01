import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Random name generator for guest users
const generateRandomUsername = (): string => {
  const adjectives = ['Happy', 'Brave', 'Clever', 'Cute', 'Mystic', 'Shiny', 'Flying', 'Swift', 'Smiling', 'Silent'];
  const nouns = ['Cat', 'Dog', 'Bunny', 'Panda', 'Tiger', 'Fox', 'Dragon', 'Phoenix', 'Unicorn', 'Elf'];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  
  return `${adj}${noun}${num}`;
};

const LOCAL_STORAGE_KEY = 'jirigu_guest_username';

export const useUsername = () => {
  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // 从本地存储获取或生成游客名称
  const getGuestUsername = useCallback(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) return stored;
    
    const newName = generateRandomUsername();
    localStorage.setItem(LOCAL_STORAGE_KEY, newName);
    return newName;
  }, []);

  // 从数据库获取用户名
  const fetchProfile = useCallback(async (uid: string): Promise<string | null> => {
    try {
      console.log('[useUsername] Fetching profile for:', uid);
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', uid)
        .maybeSingle();
      
      if (error) {
        console.error('[useUsername] Error fetching profile:', error);
        return null;
      }
      console.log('[useUsername] Got profile:', data);
      return data?.username || null;
    } catch (err) {
      console.error('[useUsername] Error in fetchProfile:', err);
      return null;
    }
  }, []);

  // 检查用户名是否已被占用
  const checkUsernameAvailable = useCallback(async (name: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', name)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking username:', error);
        return false;
      }
      
      return !data || data.id === user?.id;
    } catch (err) {
      console.error('Error in checkUsernameAvailable:', err);
      return false;
    }
  }, [user?.id]);

  // 更新用户名
  const updateUsername = useCallback(async (newName: string): Promise<{ success: boolean; error?: string }> => {
    if (!newName.trim()) {
      return { success: false, error: 'Username cannot be empty' };
    }
    
    const trimmedName = newName.trim();
    
    if (trimmedName.length > 20) {
      return { success: false, error: 'Username must be 20 characters or less' };
    }
    
    if (user) {
      try {
        const isAvailable = await checkUsernameAvailable(trimmedName);
        if (!isAvailable) {
          return { success: false, error: 'This username is already taken' };
        }
        
        const { error } = await supabase
          .from('profiles')
          .update({ username: trimmedName })
          .eq('id', user.id);
        
        if (error) {
          console.error('Error updating username:', error);
          if (error.code === '23505') {
            return { success: false, error: 'This username is already taken' };
          }
          return { success: false, error: 'Failed to update username' };
        }
        
        setUsername(trimmedName);
        return { success: true };
      } catch (err) {
        console.error('Error in updateUsername:', err);
        return { success: false, error: 'Failed to update username' };
      }
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY, trimmedName);
      setUsername(trimmedName);
      return { success: true };
    }
  }, [user, checkUsernameAvailable]);

  // 当 auth 状态变化时获取用户名
  useEffect(() => {
    let mounted = true;

    const loadUsername = async () => {
      // 等待 auth 加载完成
      if (authLoading) {
        return;
      }
      
      console.log('[useUsername] Auth loaded, user:', user?.email || 'guest');
      
      if (user) {
        const dbUsername = await fetchProfile(user.id);
        if (mounted) {
          setUsername(dbUsername || getGuestUsername());
          setLoading(false);
        }
      } else {
        if (mounted) {
          setUsername(getGuestUsername());
          setLoading(false);
        }
      }
    };

    loadUsername();

    return () => {
      mounted = false;
    };
  }, [user, authLoading, fetchProfile, getGuestUsername]);

  return {
    username,
    userId: user?.id || null,
    isLoggedIn: !!user,
    loading: loading || authLoading,
    updateUsername,
  };
};
