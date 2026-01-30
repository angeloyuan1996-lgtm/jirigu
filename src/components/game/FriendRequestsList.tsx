import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Bell, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FriendRequest {
  id: string;
  user_id: string;
  username: string;
  requested_at: string;
}

interface FriendRequestsListProps {
  currentUserId: string | null;
  onRequestHandled?: () => void;
}

export const FriendRequestsList: React.FC<FriendRequestsListProps> = ({ 
  currentUserId,
  onRequestHandled 
}) => {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    try {
      // 获取发给自己的待处理好友请求
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          requested_at,
          profiles!friendships_user_id_fkey(username)
        `)
        .eq('friend_id', currentUserId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
        return;
      }

      const formattedRequests: FriendRequest[] = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        username: (item.profiles as any)?.username || '未知用户',
        requested_at: item.requested_at,
      }));

      setRequests(formattedRequests);
    } catch (err) {
      console.error('Error in fetchRequests:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAccept = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error accepting request:', error);
        toast({
          title: '操作失败',
          description: '请稍后再试',
          variant: 'destructive',
        });
        return;
      }

      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast({
        title: '已添加好友',
        description: '你们现在是好友了！',
      });
      onRequestHandled?.();
    } catch (err) {
      console.error('Error in handleAccept:', err);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) {
        console.error('Error rejecting request:', error);
        toast({
          title: '操作失败',
          description: '请稍后再试',
          variant: 'destructive',
        });
        return;
      }

      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast({
        title: '已拒绝请求',
      });
    } catch (err) {
      console.error('Error in handleReject:', err);
    }
  };

  if (!currentUserId) return null;

  if (loading) {
    return (
      <div className="text-center py-2 text-sm text-[#666]">
        加载中...
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[#333] font-bold">
        <Bell className="w-5 h-5 text-[#F59E0B]" strokeWidth={2.5} />
        <span>好友请求</span>
        <span className="ml-1 px-2 py-0.5 bg-[#EF4444] text-white text-xs font-bold rounded-full">
          {requests.length}
        </span>
      </div>
      
      <AnimatePresence>
        {requests.map((request) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center justify-between p-3 rounded-xl border-[2px] border-[#333]"
            style={{ backgroundColor: '#FEF3C7' }}
          >
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#F59E0B]" />
              <span className="font-bold text-[#333] truncate max-w-[120px]">
                {request.username}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleAccept(request.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border-[2px] border-[#333]"
                style={{ backgroundColor: '#22C55E' }}
              >
                <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleReject(request.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border-[2px] border-[#333]"
                style={{ backgroundColor: '#EF4444' }}
              >
                <X className="w-4 h-4 text-white" strokeWidth={2.5} />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
