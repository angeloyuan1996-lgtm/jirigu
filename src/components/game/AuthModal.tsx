import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, User, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'signup';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Dynamic import to avoid errors before supabase is generated
      const { supabase } = await import('@/integrations/supabase/client');
      
      if (mode === 'signup') {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });
        
        if (error) {
          if (error.message.includes('already registered')) {
            setError('该邮箱已注册，请直接登录');
          } else {
            setError(error.message);
          }
        } else {
          setSuccess('注册成功！请查收验证邮件');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('邮箱或密码错误');
          } else {
            setError(error.message);
          }
        } else {
          setSuccess('登录成功！');
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      }
    } catch (err: any) {
      setError('认证服务暂不可用，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        setError('Google 登录失败，请稍后再试');
      }
    } catch (err) {
      setError('认证服务暂不可用，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setSuccess(null);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  return (
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
            className="relative w-[320px] p-6 rounded-3xl border-[4px] border-[#333]"
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
            <div className="flex items-center justify-center gap-2 mb-6">
              <User className="w-6 h-6 text-[#333]" strokeWidth={2.5} />
              <h2 className="text-xl font-bold text-[#333]">
                {mode === 'login' ? '登录' : '注册'}
              </h2>
            </div>

            {/* Google login button */}
            <motion.button
              whileTap={{ y: 2 }}
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full h-12 mb-4 font-bold rounded-xl flex items-center justify-center gap-3 border-[3px] border-[#333] disabled:opacity-50"
              style={{
                backgroundColor: '#FFFFFF',
                borderBottomWidth: '5px',
                borderBottomColor: '#D1D5DB',
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-[#333]">使用 Google 登录</span>
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-[2px] bg-[#E5E7EB]" />
              <span className="text-sm text-[#9CA3AF] font-medium">或</span>
              <div className="flex-1 h-[2px] bg-[#E5E7EB]" />
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                <Input
                  type="email"
                  placeholder="邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-12 rounded-xl border-[2px] border-[#333] bg-white text-[#333] placeholder:text-[#9CA3AF]"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 pr-10 h-12 rounded-xl border-[2px] border-[#333] bg-white text-[#333] placeholder:text-[#9CA3AF]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-[#9CA3AF]" />
                  ) : (
                    <Eye className="w-5 h-5 text-[#9CA3AF]" />
                  )}
                </button>
              </div>

              {error && (
                <p className="text-sm text-red-500 font-medium text-center">{error}</p>
              )}

              {success && (
                <p className="text-sm text-green-500 font-medium text-center">{success}</p>
              )}

              <motion.button
                type="submit"
                whileTap={{ y: 2 }}
                disabled={loading}
                className="w-full h-12 text-white font-bold rounded-xl flex items-center justify-center gap-2 border-[3px] border-[#333] disabled:opacity-50"
                style={{
                  backgroundColor: '#22C55E',
                  borderBottomWidth: '5px',
                  borderBottomColor: '#16A34A',
                }}
              >
                {loading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
              </motion.button>
            </form>

            {/* Switch mode */}
            <p className="text-center text-sm text-[#6B7280] mt-4">
              {mode === 'login' ? (
                <>
                  还没有账号？{' '}
                  <button
                    onClick={() => switchMode('signup')}
                    className="text-[#3B82F6] font-bold hover:underline"
                  >
                    立即注册
                  </button>
                </>
              ) : (
                <>
                  已有账号？{' '}
                  <button
                    onClick={() => switchMode('login')}
                    className="text-[#3B82F6] font-bold hover:underline"
                  >
                    立即登录
                  </button>
                </>
              )}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
