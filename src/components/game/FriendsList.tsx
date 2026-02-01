import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Trophy, Star, Share2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Friend {
  id: string;
  username: string;
  completionCount: number;
}

interface FriendsListProps {
  currentUserId: string | null;
  refreshTrigger?: number;
}

export const FriendsList: React.FC<FriendsListProps> = ({ 
  currentUserId,
  refreshTrigger 
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [myCompletionCount, setMyCompletionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleInvite = async () => {
    const inviteText = "This game is so addictive—only 0.1% of players ever make it to the end! https://jirigu.com";
    
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
      toast.success('Invite copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Copy failed');
    }
  };

  const fetchFriends = useCallback(async () => {
    if (!currentUserId) {
      console.log('[FriendsList] No currentUserId, skipping fetch');
      setLoading(false);
      return;
    }

    console.log('[FriendsList] Fetching friends for:', currentUserId);
    setLoading(true);
    setError(null);
    
    try {
      // 获取自己的通关次数
      const { data: myCompletions, error: completionsError } = await supabase
        .from('level_completions')
        .select('id')
        .eq('user_id', currentUserId);
      
      if (completionsError) {
        console.error('[FriendsList] Error fetching my completions:', completionsError);
      }
      
      setMyCompletionCount(myCompletions?.length || 0);

      // 获取已接受的好友关系
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          user_profile:profiles!friendships_user_id_fkey(id, username),
          friend_profile:profiles!friendships_friend_id_fkey(id, username)
        `)
        .eq('status', 'accepted')
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

      if (friendshipsError) {
        console.error('[FriendsList] Error fetching friends:', friendshipsError);
        setError(friendshipsError.message);
        setFriends([]);
        setLoading(false);
        return;
      }

      console.log('[FriendsList] Friendships data:', friendships);

      if (!friendships || friendships.length === 0) {
        console.log('[FriendsList] No friends found');
        setFriends([]);
        setLoading(false);
        return;
      }

      // 提取好友ID和用户名
      const friendsData = friendships.map(f => {
        const isSender = f.user_id === currentUserId;
        const friendProfile = isSender ? f.friend_profile : f.user_profile;
        return {
          id: (friendProfile as any)?.id,
          username: (friendProfile as any)?.username || 'Unknown',
        };
      }).filter(f => f.id);

      // 获取好友的通关次数
      const friendIds = friendsData.map(f => f.id);
      const { data: completions } = await supabase
        .from('level_completions')
        .select('user_id')
        .in('user_id', friendIds);

      // 计算每个好友的通关次数
      const completionCounts: Record<string, number> = {};
      completions?.forEach(c => {
        completionCounts[c.user_id] = (completionCounts[c.user_id] || 0) + 1;
      });

      // 组合数据并排序
      const friendsWithCounts: Friend[] = friendsData.map(f => ({
        ...f,
        completionCount: completionCounts[f.id] || 0,
      }));

      // 按通关次数降序排序
      friendsWithCounts.sort((a, b) => b.completionCount - a.completionCount);

      console.log('[FriendsList] Final friends list:', friendsWithCounts);
      setFriends(friendsWithCounts);
    } catch (err) {
      console.error('[FriendsList] Exception:', err);
      setError('Failed to load friends');
      setFriends([]);
    } finally {
      console.log('[FriendsList] Fetch complete, setting loading=false');
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchFriends();
    
    // 超时保护
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('[FriendsList] Loading timeout, forcing complete');
        setLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [fetchFriends, refreshTrigger]);

  if (!currentUserId) {
    return null; // 未登录时不显示，由父组件统一处理
  }

  if (loading) {
    return (
      <div className="text-center py-4 text-sm text-[#666]">
        Loading friends...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-sm text-[#EF4444]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#333] font-bold">
          <Users className="w-5 h-5" strokeWidth={2.5} />
          <span>Friends</span>
          <span className="ml-1 text-sm text-[#666] font-normal">
            ({friends.length})
          </span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleInvite}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold border-[2px] border-[#333]"
          style={{ backgroundColor: '#E0F2FE', color: '#0284C7' }}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              Invite
            </>
          )}
        </motion.button>
      </div>

      {/* 自己的通关信息 */}
      <div 
        className="flex items-center justify-between p-3 rounded-xl border-[2px] border-[#333]"
        style={{ backgroundColor: '#DBEAFE' }}
      >
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-[#3B82F6]" />
          <span className="font-bold text-[#333]">Me</span>
        </div>
        <div className="flex items-center gap-1 text-sm font-bold text-[#3B82F6]">
          <Trophy className="w-4 h-4" />
          <span>{myCompletionCount} Levels</span>
        </div>
      </div>

      {friends.length === 0 ? (
        <div 
          className="p-4 rounded-xl border-[2px] border-dashed border-[#D1D5DB] text-center"
        >
          <p className="text-sm text-[#666]">No friends yet. Add some!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {friends.map((friend, index) => (
            <motion.div
              key={friend.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3 rounded-xl border-[2px] border-[#333]"
              style={{ backgroundColor: '#F0FDF4' }}
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-[#666]">
                  {index + 1}
                </span>
                <span className="font-bold text-[#333] truncate max-w-[120px]">
                  {friend.username}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm font-bold text-[#22C55E]">
                <Trophy className="w-4 h-4" />
                <span>{friend.completionCount} Levels</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
