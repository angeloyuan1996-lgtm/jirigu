import { useState, useCallback, useRef, useEffect } from 'react';

// GameMonetize SDK 类型定义
declare global {
  interface Window {
    sdk?: {
      showBanner: () => void;
    };
  }
}

type AdState = 'idle' | 'loading' | 'ready' | 'showing' | 'completed' | 'failed';

interface UseGameDistributionAdReturn {
  adState: AdState;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  showRewardedAd: () => Promise<boolean>;
  preloadAd: () => void;
}

export const useGameDistributionAd = (): UseGameDistributionAdReturn => {
  const [adState, setAdState] = useState<AdState>('idle');
  const [error, setError] = useState<string | null>(null);
  const resolveRef = useRef<((success: boolean) => void) | null>(null);

  // Listen for SDK events dispatched from index.html
  useEffect(() => {
    const handlePause = () => {
      console.log('[GameMonetize] Ad started (game paused)');
    };

    const handleResume = () => {
      console.log('[GameMonetize] ✅ Ad completed (game resumed)');
      setAdState('completed');
      if (resolveRef.current) {
        resolveRef.current(true);
        resolveRef.current = null;
      }
    };

    window.addEventListener('gm-ad-pause', handlePause);
    window.addEventListener('gm-ad-resume', handleResume);

    return () => {
      window.removeEventListener('gm-ad-pause', handlePause);
      window.removeEventListener('gm-ad-resume', handleResume);
    };
  }, []);

  const preloadAd = useCallback(() => {
    // SDK is loaded globally from index.html, just check if ready
    if (window.sdk) {
      setAdState('ready');
      console.log('[GameMonetize] SDK is ready (global)');
    } else {
      console.warn('[GameMonetize] SDK not yet loaded');
    }
  }, []);

  const showRewardedAd = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      setAdState('showing');
      setError(null);

      try {
        if (typeof sdk !== 'undefined' && typeof sdk.showBanner !== 'undefined') {
          console.log('[GameMonetize] 🎬 Showing ad via global sdk...');
          resolveRef.current = resolve;
          sdk.showBanner();
        } else if (window.sdk) {
          console.log('[GameMonetize] 🎬 Showing ad via window.sdk...');
          resolveRef.current = resolve;
          window.sdk.showBanner();
        } else {
          console.error('[GameMonetize] SDK not available');
          setError('SDK not available');
          setAdState('failed');
          resolve(false);
        }
      } catch (err) {
        console.error('[GameMonetize] ❌ Ad failed:', err);
        setError(err instanceof Error ? err.message : 'Ad failed');
        setAdState('failed');
        resolveRef.current = null;
        resolve(false);
      }
    });
  }, []);

  return {
    adState,
    isReady: adState === 'ready' || adState === 'idle',
    isLoading: adState === 'loading' || adState === 'showing',
    error,
    showRewardedAd,
    preloadAd,
  };
};

// Global sdk variable from GameMonetize SDK
declare var sdk: { showBanner: () => void } | undefined;
