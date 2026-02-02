import { useState, useCallback, useRef } from 'react';

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

// GameDistribution Game ID
const GAME_ID = '8619a854c679413d84547ed1716d1df2';

// SDK 加载状态
let sdkLoaded = false;
let sdkLoading = false;
const sdkLoadCallbacks: (() => void)[] = [];

// 加载 GameDistribution SDK（延迟加载，只在需要时调用）
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
    console.log('[GameDistribution] Loading SDK on-demand...');

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

  // 注意：不再在 useEffect 中自动加载 SDK
  // SDK 只在 showRewardedAd 被调用时才加载
  // 这样可以避免 GameDistribution 的域名验证阻止整个游戏

  // 预加载广告（按需加载 SDK）
  const preloadAd = useCallback(async () => {
    try {
      // 先加载 SDK
      await loadSDK();
      
      if (!window.gdsdk) {
        console.warn('[GameDistribution] SDK not available');
        return;
      }

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

  // 显示激励广告 - 3秒模拟模式（预览环境测试用）
  const showRewardedAd = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      setAdState('showing');
      setError(null);

      console.log('[GameDistribution] 🎬 Simulating 3-second ad (preview mode)...');
      
      // 3秒模拟广告
      setTimeout(() => {
        setAdState('completed');
        console.log('[GameDistribution] ✅ Simulated ad completed');
        resolve(true);
      }, 3000);
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