import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 关键：先设置监听器，再获取 session
    // 这确保在获取到 session 之后的任何变化都能被捕获
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[AuthProvider] Auth state changed:', event, currentSession?.user?.email || 'none');
        
        if (!mounted) return;
        
        // 直接使用传入的 session，不再重复请求
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    );

    // 获取初始 session
    const initSession = async () => {
      try {
        console.log('[AuthProvider] Getting initial session...');
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthProvider] Error getting session:', error);
        }
        
        if (!mounted) return;
        
        console.log('[AuthProvider] Initial session:', initialSession?.user?.email || 'none');
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setLoading(false);
      } catch (err) {
        console.error('[AuthProvider] Exception getting session:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    console.log('[AuthProvider] Signing out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthProvider] Sign out error:', error);
        throw error;
      }
      console.log('[AuthProvider] Sign out successful');
      // State will be updated by onAuthStateChange
    } catch (err) {
      console.error('[AuthProvider] Sign out exception:', err);
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
