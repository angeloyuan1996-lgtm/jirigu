import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Country code to flag emoji converter
const getCountryFlag = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Country code to name (common countries)
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  CN: 'China',
  JP: 'Japan',
  KR: 'South Korea',
  DE: 'Germany',
  FR: 'France',
  GB: 'United Kingdom',
  IT: 'Italy',
  ES: 'Spain',
  BR: 'Brazil',
  RU: 'Russia',
  IN: 'India',
  CA: 'Canada',
  AU: 'Australia',
  MX: 'Mexico',
  NL: 'Netherlands',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  PL: 'Poland',
  TR: 'Turkey',
  TH: 'Thailand',
  VN: 'Vietnam',
  ID: 'Indonesia',
  MY: 'Malaysia',
  SG: 'Singapore',
  PH: 'Philippines',
  TW: 'Taiwan',
  HK: 'Hong Kong',
  AE: 'UAE',
  SA: 'Saudi Arabia',
  EG: 'Egypt',
  ZA: 'South Africa',
  NG: 'Nigeria',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  AT: 'Austria',
  CH: 'Switzerland',
  BE: 'Belgium',
  PT: 'Portugal',
  GR: 'Greece',
  CZ: 'Czech Republic',
  HU: 'Hungary',
  RO: 'Romania',
  UA: 'Ukraine',
  IL: 'Israel',
  NZ: 'New Zealand',
  IE: 'Ireland',
};

const getCountryName = (code: string): string => {
  return COUNTRY_NAMES[code?.toUpperCase()] || code?.toUpperCase() || 'Unknown';
};

interface CountryRanking {
  country_code: string;
  total_completions: number;
  user_count: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const [rankings, setRankings] = useState<CountryRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_country_leaderboard');
      
      if (error) {
        console.error('Error fetching leaderboard:', error);
        return;
      }
      
      setRankings(data || []);
    } catch (err) {
      console.error('Error in fetchLeaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return { bg: '#FFD700', text: '#333', medal: '🥇' };
      case 2:
        return { bg: '#C0C0C0', text: '#333', medal: '🥈' };
      case 3:
        return { bg: '#CD7F32', text: '#333', medal: '🥉' };
      default:
        return { bg: '#FFFEF5', text: '#333', medal: null };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100000 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative w-full max-w-[360px] max-h-[80vh] rounded-3xl border-[4px] border-[#333] overflow-hidden"
            style={{ backgroundColor: '#FEF3C7' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="sticky top-0 z-10 p-4 border-b-[3px] border-[#333]"
              style={{ backgroundColor: '#FDE68A' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-[#D97706]" strokeWidth={2.5} />
                  <h2 className="text-xl font-bold text-[#333]">Country Leaderboard</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[#333] text-white flex items-center justify-center"
                >
                  <X className="w-5 h-5" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 72px)' }}>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-10 h-10 border-4 border-[#D97706] border-t-transparent rounded-full"
                  />
                  <p className="mt-4 text-[#666] font-medium">Loading...</p>
                </div>
              ) : rankings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="text-4xl mb-4">🌍</span>
                  <p className="text-[#666] font-medium text-center">
                    No rankings yet.<br />Be the first to play!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {rankings.map((item, index) => {
                    const rank = index + 1;
                    const style = getRankStyle(rank);
                    
                    return (
                      <motion.div
                        key={item.country_code}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl border-[2px] border-[#333]"
                        style={{ backgroundColor: style.bg }}
                      >
                        {/* Rank */}
                        <div className="w-8 text-center font-bold text-lg" style={{ color: style.text }}>
                          {style.medal || `#${rank}`}
                        </div>
                        
                        {/* Flag & Country */}
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <span className="text-2xl flex-shrink-0">
                            {getCountryFlag(item.country_code)}
                          </span>
                          <span 
                            className="font-bold truncate"
                            style={{ color: style.text }}
                          >
                            {getCountryName(item.country_code)}
                          </span>
                        </div>
                        
                        {/* Stats */}
                        <div className="flex flex-col items-end flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <Trophy className="w-4 h-4 text-[#D97706]" />
                            <span className="font-bold text-[#333]">{item.total_completions}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[#666]">
                            <Users className="w-3 h-3" />
                            <span>{item.user_count} players</span>
                          </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            
            {/* Footer */}
            <div className="text-center pt-3 mt-3 border-t border-[#E5E2D3]">
              <span className="text-xs text-[#999]">Updates every 24 hours</span>
            </div>
          </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
