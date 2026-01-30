import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// 随机名称生成器（用于未登录用户）
const generateRandomUsername = (): string => {
  const adjectives = ['快乐的', '勇敢的', '聪明的', '可爱的', '神秘的', '闪亮的', '飞翔的', '奔跑的', '微笑的', '沉默的'];
  const nouns = ['小猫', '小狗', '兔子', '熊猫', '老虎', '狐狸', '龙', '凤凰', '独角兽', '精灵'];
  
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

  // 更新用户名
  const updateUsername = useCallback(async (newName: string): Promise<boolean> => {
    if (!newName.trim()) return false;
    
    const trimmedName = newName.trim();
    
    if (isLoggedIn && userId) {
      // 登录用户：更新数据库
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ username: trimmedName })
          .eq('id', userId);
        
        if (error) {
          console.error('Error updating username:', error);
          return false;
        }
        
        setUsername(trimmedName);
        return true;
      } catch (err) {
        console.error('Error in updateUsername:', err);
        return false;
      }
    } else {
      // 游客：更新本地存储
      localStorage.setItem(LOCAL_STORAGE_KEY, trimmedName);
      setUsername(trimmedName);
      return true;
    }
  }, [isLoggedIn, userId]);

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
