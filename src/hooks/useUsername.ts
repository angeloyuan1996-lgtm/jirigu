import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [username, setUsername] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', uid)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data?.username || null;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
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
      
      // 如果没有找到，或者找到的是当前用户自己，则可用
      return !data || data.id === userId;
    } catch (err) {
      console.error('Error in checkUsernameAvailable:', err);
      return false;
    }
  }, [userId]);

  // 更新用户名 - 返回 { success: boolean, error?: string }
  const updateUsername = useCallback(async (newName: string): Promise<{ success: boolean; error?: string }> => {
    if (!newName.trim()) {
      return { success: false, error: 'Username cannot be empty' };
    }
    
    const trimmedName = newName.trim();
    
    // 检查长度限制
    if (trimmedName.length > 20) {
      return { success: false, error: 'Username must be 20 characters or less' };
    }
    
    if (isLoggedIn && userId) {
      // 登录用户：先检查唯一性，再更新数据库
      try {
        const isAvailable = await checkUsernameAvailable(trimmedName);
        if (!isAvailable) {
          return { success: false, error: 'This username is already taken' };
        }
        
        const { error } = await supabase
          .from('profiles')
          .update({ username: trimmedName })
          .eq('id', userId);
        
        if (error) {
          console.error('Error updating username:', error);
          if (error.code === '23505') { // 唯一约束冲突
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
      // 游客：更新本地存储（游客名称不检查唯一性）
      localStorage.setItem(LOCAL_STORAGE_KEY, trimmedName);
      setUsername(trimmedName);
      return { success: true };
    }
  }, [isLoggedIn, userId, checkUsernameAvailable]);

  // 初始化和监听认证状态
  useEffect(() => {
    let mounted = true;

    const initUsername = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          setUserId(session.user.id);
          setIsLoggedIn(true);
          
          const dbUsername = await fetchProfile(session.user.id);
          if (mounted) {
            setUsername(dbUsername || getGuestUsername());
          }
        } else {
          setUserId(null);
          setIsLoggedIn(false);
          setUsername(getGuestUsername());
        }
      } catch (err) {
        console.error('Error initializing username:', err);
        if (mounted) {
          setUsername(getGuestUsername());
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initUsername();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (session?.user) {
        setUserId(session.user.id);
        setIsLoggedIn(true);
        
        const dbUsername = await fetchProfile(session.user.id);
        if (mounted) {
          setUsername(dbUsername || getGuestUsername());
        }
      } else {
        setUserId(null);
        setIsLoggedIn(false);
        setUsername(getGuestUsername());
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, getGuestUsername]);

  return {
    username,
    userId,
    isLoggedIn,
    loading,
    updateUsername,
  };
};
