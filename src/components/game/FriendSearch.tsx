import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, Check, Clock, X, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  username: string;
}

interface FriendSearchProps {
  currentUserId: string | null;
}

export const FriendSearch: React.FC<FriendSearchProps> = ({ currentUserId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [existingFriends, setExistingFriends] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !currentUserId) return;

    setSearching(true);
    try {
      // 搜索用户名
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${searchQuery.trim()}%`)
        .neq('id', currentUserId)
        .limit(10);

      if (error) {
        console.error('Search error:', error);
        toast({
          title: 'Search failed',
          description: 'Please try again',
          variant: 'destructive',
        });
        return;
      }

      setSearchResults(profiles || []);

      // 获取已有的好友关系
      if (profiles && profiles.length > 0) {
        const profileIds = profiles.map(p => p.id);
        
        const { data: friendships } = await supabase
          .from('friendships')
          .select('user_id, friend_id, status')
          .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
          .in('user_id', [currentUserId, ...profileIds])
          .in('friend_id', [currentUserId, ...profileIds]);

        const pending = new Set<string>();
        const friends = new Set<string>();

        friendships?.forEach(f => {
          const otherId = f.user_id === currentUserId ? f.friend_id : f.user_id;
          if (f.status === 'pending') {
            pending.add(otherId);
          } else if (f.status === 'accepted') {
            friends.add(otherId);
          }
        });

        setPendingRequests(pending);
        setExistingFriends(friends);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, currentUserId, toast]);

  const handleSendRequest = async (friendId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: currentUserId,
          friend_id: friendId,
          status: 'pending',
        });

      if (error) {
        console.error('Friend request error:', error);
        toast({
          title: 'Failed to send',
          description: error.message.includes('duplicate') ? 'Request already sent' : 'Please try again',
          variant: 'destructive',
        });
        return;
      }

      setPendingRequests(prev => new Set([...prev, friendId]));
      toast({
        title: 'Friend request sent',
        description: 'Waiting for approval',
      });
    } catch (err) {
      console.error('Friend request error:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!currentUserId) {
    return null; // 未登录时不显示，由父组件统一处理
  }

  return (
    <div className="space-y-3">
      {/* 搜索框 */}
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search players..."
          className="flex-1 h-10 text-sm font-medium border-[2px] border-[#333] rounded-xl px-3"
          style={{ backgroundColor: '#FFFEF5', color: '#333' }}
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          className="h-10 px-4 rounded-xl border-[2px] border-[#333] flex items-center justify-center gap-2 font-bold text-white disabled:opacity-50"
          style={{
            backgroundColor: '#3B82F6',
            borderBottomWidth: '4px',
            borderBottomColor: '#1D4ED8',
          }}
        >
          <Search className="w-4 h-4" />
          Search
        </motion.button>
      </div>

      {/* 搜索结果 */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {searchResults.map((profile) => {
              const isPending = pendingRequests.has(profile.id);
              const isFriend = existingFriends.has(profile.id);

              return (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-3 rounded-xl border-[2px] border-[#333]"
                  style={{ backgroundColor: '#F0FDF4' }}
                >
                  <span className="font-bold text-[#333] truncate max-w-[150px]">
                    {profile.username}
                  </span>
                  
                  {isFriend ? (
                    <span className="flex items-center gap-1 text-sm text-[#22C55E] font-medium">
                      <Check className="w-4 h-4" />
                      Friends
                    </span>
                  ) : isPending ? (
                    <span className="flex items-center gap-1 text-sm text-[#F59E0B] font-medium">
                      <Clock className="w-4 h-4" />
                      Pending
                    </span>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSendRequest(profile.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-[2px] border-[#333] text-sm font-bold text-white"
                      style={{
                        backgroundColor: '#8B5CF6',
                        borderBottomWidth: '3px',
                        borderBottomColor: '#6D28D9',
                      }}
                    >
                      <UserPlus className="w-4 h-4" />
                      Add
                    </motion.button>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 空结果提示 */}
      {!searching && searchResults.length === 0 && searchQuery && (
        <div className="text-center py-4 text-sm text-[#666]">
          No players found
        </div>
      )}
    </div>
  );
};
