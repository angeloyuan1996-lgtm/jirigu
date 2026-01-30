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
  const [copied, setCopied] = useState(false);

  const handleInvite = async () => {
    const inviteText = "This game is so addictive—only 0.1% of players ever make it to the end! https://jirigu.com";
    
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
      toast.success('邀请内容已复制！');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('复制失败，请手动复制');
    }
  };

  const fetchFriends = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    try {
      // 获取自己的通关次数
      const { data: myCompletions } = await supabase
        .from('level_completions')
        .select('id')
        .eq('user_id', currentUserId);
      
      setMyCompletionCount(myCompletions?.length || 0);

      // 获取已接受的好友关系
      const { data: friendships, error } = await supabase
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

      if (error) {
        console.error('Error fetching friends:', error);
        return;
      }

      if (!friendships || friendships.length === 0) {
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
          username: (friendProfile as any)?.username || '未知用户',
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

      setFriends(friendsWithCounts);
    } catch (err) {
      console.error('Error in fetchFriends:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends, refreshTrigger]);

  if (!currentUserId) {
    return null; // 未登录时不显示，由父组件统一处理
  }

  if (loading) {
    return (
      <div className="text-center py-4 text-sm text-[#666]">
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#333] font-bold">
          <Users className="w-5 h-5" strokeWidth={2.5} />
          <span>好友列表</span>
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
              已复制
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              邀请
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
          <span className="font-bold text-[#333]">我</span>
        </div>
        <div className="flex items-center gap-1 text-sm font-bold text-[#3B82F6]">
          <Trophy className="w-4 h-4" />
          <span>{myCompletionCount} 关</span>
        </div>
      </div>

      {friends.length === 0 ? (
        <div 
          className="p-4 rounded-xl border-[2px] border-dashed border-[#D1D5DB] text-center"
        >
          <p className="text-sm text-[#666]">还没有好友，快去添加吧！</p>
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
                <span>{friend.completionCount} 关</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
