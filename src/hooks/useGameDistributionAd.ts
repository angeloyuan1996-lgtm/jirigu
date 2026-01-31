import { useEffect, useState, useCallback, useRef } from 'react';

// GameDistribution SDK 类型定义
declare global {
  interface Window {
    gdsdk?: {
      showAd: (type: 'rewarded' | 'interstitial') => Promise<void>;
      preloadAd: (type: 'rewarded' | 'interstitial') => Promise<void>;
    };
    GD_OPTIONS?: {
      gameId: string;
      onEvent: (event: GDEvent) => void;
    };
  }
}

type GDEvent = {
  name: string;
  message?: string;
  status?: string;
};

type AdState = 'idle' | 'loading' | 'ready' | 'showing' | 'completed' | 'failed';

interface UseGameDistributionAdReturn {
  adState: AdState;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  showRewardedAd: () => Promise<boolean>;
  preloadAd: () => void;
}

// GameDistribution Game ID - 需要替换为你的真实 Game ID
const GAME_ID = 'YOUR_GAME_ID_HERE';

// SDK 加载状态
let sdkLoaded = false;
let sdkLoading = false;
const sdkLoadCallbacks: (() => void)[] = [];

// 加载 GameDistribution SDK
const loadSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (sdkLoaded && window.gdsdk) {
      resolve();
      return;
    }

    if (sdkLoading) {
      sdkLoadCallbacks.push(() => resolve());
      return;
    }

    sdkLoading = true;

    // 设置 GD_OPTIONS（SDK 初始化配置）
    window.GD_OPTIONS = {
      gameId: GAME_ID,
      onEvent: (event: GDEvent) => {
        console.log('[GameDistribution] Event:', event.name, event.message || '');
      },
    };

    // 创建 script 标签加载 SDK
    const script = document.createElement('script');
    script.src = 'https://html5.api.gamedistribution.com/main.min.js';
    script.async = true;

    script.onload = () => {
      sdkLoaded = true;
      sdkLoading = false;
      console.log('[GameDistribution] SDK loaded successfully');
      resolve();
      sdkLoadCallbacks.forEach(cb => cb());
      sdkLoadCallbacks.length = 0;
    };

    script.onerror = () => {
      sdkLoading = false;
      console.error('[GameDistribution] Failed to load SDK');
      reject(new Error('Failed to load GameDistribution SDK'));
    };

    document.head.appendChild(script);
  });
};

export const useGameDistributionAd = (): UseGameDistributionAdReturn => {
  const [adState, setAdState] = useState<AdState>('idle');
  const [error, setError] = useState<string | null>(null);
  const resolveRef = useRef<((success: boolean) => void) | null>(null);

  // 初始化 SDK
  useEffect(() => {
    loadSDK().catch((err) => {
      setError(err.message);
      setAdState('failed');
    });
  }, []);

  // 预加载广告
  const preloadAd = useCallback(async () => {
    if (!window.gdsdk) {
      console.warn('[GameDistribution] SDK not loaded yet');
      return;
    }

    try {
      setAdState('loading');
      await window.gdsdk.preloadAd('rewarded');
      setAdState('ready');
      console.log('[GameDistribution] Ad preloaded');
    } catch (err) {
      console.warn('[GameDistribution] Preload failed:', err);
      // 预加载失败不算错误，showAd 时会自动加载
      setAdState('idle');
    }
  }, []);

  // 显示激励广告
  const showRewardedAd = useCallback(async (): Promise<boolean> => {
    return new Promise(async (resolve) => {
      // 如果 SDK 未加载，使用模拟模式
      if (!window.gdsdk) {
        console.warn('[GameDistribution] SDK not available, using simulation mode');
        setAdState('showing');
        
        // 模拟 3 秒广告
        setTimeout(() => {
          setAdState('completed');
          resolve(true);
        }, 3000);
        return;
      }

      try {
        setAdState('showing');
        setError(null);
        
        await window.gdsdk.showAd('rewarded');
        
        // 广告成功完成
        setAdState('completed');
        console.log('[GameDistribution] Rewarded ad completed');
        resolve(true);
      } catch (err: any) {
        // 广告失败（用户跳过、加载失败等）
        const errorMsg = err?.message || 'Ad failed or was skipped';
        console.warn('[GameDistribution] Ad error:', errorMsg);
        setError(errorMsg);
        setAdState('failed');
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
