import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Bell, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!currentUserId) {
      console.log('[FriendRequestsList] No currentUserId, skipping fetch');
      setLoading(false);
      return;
    }

    console.log('[FriendRequestsList] Fetching requests for:', currentUserId);
    setLoading(true);
    setError(null);
    
    try {
      // 获取发给自己的待处理好友请求
      const { data, error: fetchError } = await supabase
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

      if (fetchError) {
        console.error('[FriendRequestsList] Error fetching requests:', fetchError);
        setError(fetchError.message);
        setRequests([]);
        setLoading(false);
        return;
      }

      console.log('[FriendRequestsList] Raw data:', data);

      const formattedRequests: FriendRequest[] = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        username: (item.profiles as any)?.username || 'Unknown',
        requested_at: item.requested_at,
      }));

      console.log('[FriendRequestsList] Formatted requests:', formattedRequests);
      setRequests(formattedRequests);
    } catch (err) {
      console.error('[FriendRequestsList] Exception:', err);
      setError('Failed to load requests');
      setRequests([]);
    } finally {
      console.log('[FriendRequestsList] Fetch complete, setting loading=false');
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchRequests();
    
    // 超时保护
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('[FriendRequestsList] Loading timeout, forcing complete');
        setLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
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
        console.error('[FriendRequestsList] Error accepting request:', error);
        toast.error('Action failed. Please try again.');
        return;
      }

      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Friend added!');
      onRequestHandled?.();
    } catch (err) {
      console.error('[FriendRequestsList] Exception in handleAccept:', err);
      toast.error('Action failed. Please try again.');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) {
        console.error('[FriendRequestsList] Error rejecting request:', error);
        toast.error('Action failed. Please try again.');
        return;
      }

      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Request declined');
    } catch (err) {
      console.error('[FriendRequestsList] Exception in handleReject:', err);
      toast.error('Action failed. Please try again.');
    }
  };

  if (!currentUserId) return null;

  if (loading) {
    return (
      <div className="text-center py-2 text-sm text-[#666]">
        Loading requests...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-2 text-sm text-[#EF4444]">
        {error}
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
        <span>Friend Requests</span>
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
