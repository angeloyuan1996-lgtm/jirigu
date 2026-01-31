import { useState, useCallback, useRef, useEffect } from 'react';

// 广告状态
export type AdStatus = 'idle' | 'loading' | 'ready' | 'showing' | 'completed' | 'failed';

// 广告平台配置
export interface AdConfig {
  // Google Ad Manager
  googleAdUnitId?: string;
  // GameDistribution
  gameDistributionGameId?: string;
  // 开发模式使用模拟广告
  useMockAd?: boolean;
  // 模拟广告时长（秒）
  mockAdDuration?: number;
}

// 默认配置
const DEFAULT_CONFIG: AdConfig = {
  useMockAd: true, // 默认使用模拟广告
  mockAdDuration: 3, // 3秒模拟广告
};

// 广告回调
interface AdCallbacks {
  onAdLoaded?: () => void;
  onAdStarted?: () => void;
  onAdCompleted?: () => void;
  onAdFailed?: (error: string) => void;
  onAdSkipped?: () => void;
}

export function useRewardedAd(config: AdConfig = DEFAULT_CONFIG) {
  const [status, setStatus] = useState<AdStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const callbacksRef = useRef<AdCallbacks>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 预加载广告
  const loadAd = useCallback(async (): Promise<boolean> => {
    setStatus('loading');
    setError(null);

    try {
      if (config.useMockAd) {
        // 模拟广告加载（500ms延迟）
        await new Promise(resolve => setTimeout(resolve, 500));
        setStatus('ready');
        callbacksRef.current.onAdLoaded?.();
        return true;
      }

      // TODO: 集成真实广告SDK
      // 这里将来替换为 Google Ad Manager 或其他SDK的加载逻辑
      // 示例:
      // if (config.googleAdUnitId) {
      //   await window.googletag.cmd.push(() => {
      //     // 加载激励广告
      //   });
      // }

      setStatus('ready');
      callbacksRef.current.onAdLoaded?.();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load ad';
      setError(errorMessage);
      setStatus('failed');
      callbacksRef.current.onAdFailed?.(errorMessage);
      return false;
    }
  }, [config.useMockAd]);

  // 显示广告
  const showAd = useCallback(async (callbacks?: AdCallbacks): Promise<boolean> => {
    if (callbacks) {
      callbacksRef.current = callbacks;
    }

    // 如果广告未就绪，先加载
    if (status !== 'ready') {
      const loaded = await loadAd();
      if (!loaded) return false;
    }

    setStatus('showing');
    callbacksRef.current.onAdStarted?.();

    try {
      if (config.useMockAd) {
        // 模拟广告播放
        const duration = config.mockAdDuration || 3;
        setCountdown(duration);

        return new Promise((resolve) => {
          let remaining = duration;
          timerRef.current = setInterval(() => {
            remaining--;
            setCountdown(remaining);
            
            if (remaining <= 0) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              setStatus('completed');
              callbacksRef.current.onAdCompleted?.();
              resolve(true);
            }
          }, 1000);
        });
      }

      // TODO: 集成真实广告SDK
      // 示例:
      // if (config.googleAdUnitId) {
      //   return new Promise((resolve, reject) => {
      //     window.googletag.cmd.push(() => {
      //       // 显示激励广告，监听完成事件
      //     });
      //   });
      // }

      setStatus('completed');
      callbacksRef.current.onAdCompleted?.();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to show ad';
      setError(errorMessage);
      setStatus('failed');
      callbacksRef.current.onAdFailed?.(errorMessage);
      return false;
    }
  }, [status, loadAd, config.useMockAd, config.mockAdDuration]);

  // 取消广告
  const cancelAd = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus('idle');
    setCountdown(0);
    callbacksRef.current.onAdSkipped?.();
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus('idle');
    setError(null);
    setCountdown(0);
    callbacksRef.current = {};
  }, []);

  return {
    status,
    error,
    countdown,
    isLoading: status === 'loading',
    isReady: status === 'ready',
    isShowing: status === 'showing',
    isCompleted: status === 'completed',
    loadAd,
    showAd,
    cancelAd,
    reset,
  };
}

// 广告平台辅助函数（将来扩展用）
export const AdPlatforms = {
  // Google Ad Manager 初始化
  initGoogleAdManager: async (publisherId: string) => {
    // TODO: 加载 Google Publisher Tag (GPT)
    console.log('[AdPlatforms] Google Ad Manager init:', publisherId);
  },

  // GameDistribution 初始化
  initGameDistribution: async (gameId: string) => {
    // TODO: 加载 GameDistribution SDK
    console.log('[AdPlatforms] GameDistribution init:', gameId);
  },
};
