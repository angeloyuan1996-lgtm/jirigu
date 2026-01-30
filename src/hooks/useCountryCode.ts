import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const LOCAL_STORAGE_KEY = 'jirigu_guest_country';

export const useCountryCode = (userId: string | null, isLoggedIn: boolean) => {
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 从边缘函数获取国家代码
  const fetchCountryFromAPI = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-country-code');
      
      if (error) {
        console.error('Error calling get-country-code function:', error);
        return null;
      }
      
      return data?.country || null;
    } catch (err) {
      console.error('Error fetching country code:', err);
      return null;
    }
  }, []);

  // 更新数据库中的国家代码
  const updateCountryInDB = useCallback(async (uid: string, country: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ country_code: country })
        .eq('id', uid);
      
      if (error) {
        console.error('Error updating country code in DB:', error);
      }
    } catch (err) {
      console.error('Error in updateCountryInDB:', err);
    }
  }, []);

  // 从数据库获取国家代码
  const fetchCountryFromDB = useCallback(async (uid: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('country_code')
        .eq('id', uid)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching country from DB:', error);
        return null;
      }
      
      return data?.country_code || null;
    } catch (err) {
      console.error('Error in fetchCountryFromDB:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const detectCountry = async () => {
      setLoading(true);

      try {
        if (isLoggedIn && userId) {
          // 登录用户：先检查数据库是否已有缓存
          const cachedCountry = await fetchCountryFromDB(userId);
          
          if (cachedCountry) {
            // 已有缓存，直接使用
            if (mounted) {
              setCountryCode(cachedCountry);
              setLoading(false);
            }
            return;
          }
          
          // 没有缓存，调用 API 检测
          const detectedCountry = await fetchCountryFromAPI();
          
          if (mounted) {
            setCountryCode(detectedCountry);
            
            // 存入数据库
            if (detectedCountry) {
              await updateCountryInDB(userId, detectedCountry);
            }
          }
        } else {
          // 游客：检查本地存储
          const cachedCountry = localStorage.getItem(LOCAL_STORAGE_KEY);
          
          if (cachedCountry) {
            if (mounted) {
              setCountryCode(cachedCountry);
              setLoading(false);
            }
            return;
          }
          
          // 没有缓存，调用 API 检测
          const detectedCountry = await fetchCountryFromAPI();
          
          if (mounted) {
            setCountryCode(detectedCountry);
            
            // 存入本地存储
            if (detectedCountry) {
              localStorage.setItem(LOCAL_STORAGE_KEY, detectedCountry);
            }
          }
        }
      } catch (err) {
        console.error('Error in detectCountry:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    detectCountry();

    return () => {
      mounted = false;
    };
  }, [userId, isLoggedIn, fetchCountryFromAPI, fetchCountryFromDB, updateCountryInDB]);

  return {
    countryCode,
    loading,
  };
};
