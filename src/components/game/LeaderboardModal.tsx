import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
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

// Country code to name
const COUNTRY_NAMES: Record<string, string> = {
  // Special
  AF_CONTINENT: 'Africa',
  // Asia
  CN: 'China',
  IN: 'India',
  ID: 'Indonesia',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  JP: 'Japan',
  PH: 'Philippines',
  VN: 'Vietnam',
  TH: 'Thailand',
  MM: 'Myanmar',
  KR: 'S. Korea',
  MY: 'Malaysia',
  NP: 'Nepal',
  TW: 'Taiwan',
  LK: 'Sri Lanka',
  KH: 'Cambodia',
  SG: 'Singapore',
  HK: 'Hong Kong',
  LA: 'Laos',
  MN: 'Mongolia',
  BN: 'Brunei',
  BT: 'Bhutan',
  MV: 'Maldives',
  // Middle East
  TR: 'Turkey',
  IR: 'Iran',
  SA: 'S. Arabia',
  IQ: 'Iraq',
  AE: 'UAE',
  IL: 'Israel',
  JO: 'Jordan',
  LB: 'Lebanon',
  KW: 'Kuwait',
  OM: 'Oman',
  QA: 'Qatar',
  BH: 'Bahrain',
  YE: 'Yemen',
  SY: 'Syria',
  // Europe
  RU: 'Russia',
  DE: 'Germany',
  GB: 'UK',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  UA: 'Ukraine',
  PL: 'Poland',
  RO: 'Romania',
  NL: 'Holland',
  BE: 'Belgium',
  GR: 'Greece',
  CZ: 'Czechia',
  PT: 'Portugal',
  SE: 'Sweden',
  HU: 'Hungary',
  AT: 'Austria',
  CH: 'Swiss',
  BG: 'Bulgaria',
  DK: 'Denmark',
  FI: 'Finland',
  SK: 'Slovakia',
  NO: 'Norway',
  IE: 'Ireland',
  HR: 'Croatia',
  BA: 'Bosnia',
  RS: 'Serbia',
  LT: 'Lithuania',
  SI: 'Slovenia',
  LV: 'Latvia',
  EE: 'Estonia',
  CY: 'Cyprus',
  LU: 'Lux.',
  MT: 'Malta',
  IS: 'Iceland',
  AL: 'Albania',
  MK: 'N. Macedonia',
  ME: 'Montenegro',
  MD: 'Moldova',
  BY: 'Belarus',
  // Americas
  US: 'USA',
  BR: 'Brazil',
  MX: 'Mexico',
  CO: 'Colombia',
  AR: 'Argentina',
  CA: 'Canada',
  PE: 'Peru',
  VE: 'Venezuela',
  CL: 'Chile',
  EC: 'Ecuador',
  GT: 'Guatemala',
  CU: 'Cuba',
  BO: 'Bolivia',
  DO: 'Dominican',
  HN: 'Honduras',
  PY: 'Paraguay',
  SV: 'El Salvador',
  NI: 'Nicaragua',
  CR: 'Costa Rica',
  PA: 'Panama',
  PR: 'Puerto Rico',
  UY: 'Uruguay',
  JM: 'Jamaica',
  TT: 'Trinidad',
  // Oceania
  AU: 'Australia',
  NZ: 'New Zealand',
  PG: 'PNG',
  FJ: 'Fiji',
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
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-[#D97706]" strokeWidth={2.5} />
                    <h2 className="text-xl font-bold text-[#333]">Country Leaderboard</h2>
                  </div>
                  <span className="text-xs text-[#999] ml-8">Updates every 24 hours</span>
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
                        
                        {/* Country Name */}
                        <div className="flex-1 min-w-0">
                          <span 
                            className="font-bold truncate block"
                            style={{ color: style.text }}
                          >
                            {getCountryName(item.country_code)}
                          </span>
                        </div>
                        
                        {/* Stats */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Trophy className="w-4 h-4 text-[#D97706]" />
                          <span className="font-bold text-[#333]">{item.total_completions}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
