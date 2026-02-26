import { useState, useCallback, useRef } from 'react';

// GameMonetize SDK 类型定义
declare global {
  interface Window {
    SDK_OPTIONS?: {
      gameId: string;
      onEvent: (event: { name: string }) => void;
    };
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

// GameMonetize Game ID
const GAME_ID = 'nhmbbl0lv98kuf7w2sr5das20vkz3lkd';

// SDK 加载状态
let sdkLoaded = false;
let sdkLoading = false;
const sdkLoadCallbacks: (() => void)[] = [];

// 全局事件回调 - 用于广告完成/暂停通知
let onAdPause: (() => void) | null = null;
let onAdResume: (() => void) | null = null;

// 加载 GameMonetize SDK
const loadSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (sdkLoaded && window.sdk) {
      resolve();
      return;
    }

    if (sdkLoading) {
      sdkLoadCallbacks.push(() => resolve());
      return;
    }

    sdkLoading = true;
    console.log('[GameMonetize] Loading SDK on-demand...');

    // 设置 SDK_OPTIONS
    window.SDK_OPTIONS = {
      gameId: GAME_ID,
      onEvent: (event: { name: string }) => {
        console.log('[GameMonetize] Event:', event.name);
        switch (event.name) {
          case 'SDK_GAME_PAUSE':
            // 广告开始播放，暂停游戏
            onAdPause?.();
            break;
          case 'SDK_GAME_START':
            // 广告播放完毕，恢复游戏
            onAdResume?.();
            break;
          case 'SDK_READY':
            console.log('[GameMonetize] SDK is ready');
            break;
          case 'SDK_ERROR':
            console.error('[GameMonetize] SDK error');
            break;
        }
      },
    };

    // 按照官方文档方式加载 SDK
    const existingScript = document.getElementById('gamemonetize-sdk');
    if (existingScript) {
      sdkLoaded = true;
      sdkLoading = false;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = 'gamemonetize-sdk';
    script.src = 'https://api.gamemonetize.com/sdk.js';
    script.async = true;

    script.onload = () => {
      sdkLoaded = true;
      sdkLoading = false;
      console.log('[GameMonetize] SDK loaded successfully');
      resolve();
      sdkLoadCallbacks.forEach(cb => cb());
      sdkLoadCallbacks.length = 0;
    };

    script.onerror = () => {
      sdkLoading = false;
      console.error('[GameMonetize] Failed to load SDK');
      reject(new Error('Failed to load GameMonetize SDK'));
    };

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  });
};

export const useGameDistributionAd = (): UseGameDistributionAdReturn => {
  const [adState, setAdState] = useState<AdState>('idle');
  const [error, setError] = useState<string | null>(null);
  const resolveRef = useRef<((success: boolean) => void) | null>(null);

  const preloadAd = useCallback(async () => {
    try {
      await loadSDK();
      setAdState('ready');
      console.log('[GameMonetize] SDK preloaded');
    } catch (err) {
      console.warn('[GameMonetize] Preload failed:', err);
      setAdState('idle');
    }
  }, []);

  const showRewardedAd = useCallback(async (): Promise<boolean> => {
    return new Promise(async (resolve) => {
      setAdState('showing');
      setError(null);

      try {
        await loadSDK();

        if (!window.sdk) {
          console.error('[GameMonetize] SDK not available');
          setError('SDK not available');
          setAdState('failed');
          resolve(false);
          return;
        }

        console.log('[GameMonetize] 🎬 Showing ad...');
        resolveRef.current = resolve;

        // 设置事件回调
        onAdPause = () => {
          console.log('[GameMonetize] Ad started (game paused)');
        };

        onAdResume = () => {
          console.log('[GameMonetize] ✅ Ad completed (game resumed)');
          setAdState('completed');
          onAdPause = null;
          onAdResume = null;
          resolveRef.current = null;
          resolve(true);
        };

        // 调用 showBanner 显示广告
        window.sdk.showBanner();
      } catch (err) {
        console.error('[GameMonetize] ❌ Ad failed:', err);
        setError(err instanceof Error ? err.message : 'Ad failed');
        setAdState('failed');
        onAdPause = null;
        onAdResume = null;
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
