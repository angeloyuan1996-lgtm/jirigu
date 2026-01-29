export type FruitType = 
  | 'apple' | 'banana' | 'cherry' | 'grape' | 'lemon'
  | 'orange' | 'peach' | 'pear' | 'pineapple' | 'strawberry'
  | 'watermelon' | 'dragonfruit' | 'kiwi' | 'blueberry';

export interface FruitBlock {
  id: string;
  type: FruitType;
  x: number;
  y: number;
  z: number;
  status: 'onMap' | 'inSlot' | 'inTemp' | 'removed';
  isLocked: boolean;
}

export interface HistoryEntry {
  block: FruitBlock;
  previousSlots: FruitBlock[];
}

export interface GameState {
  // Game data
  mapData: FruitBlock[];
  slots: FruitBlock[];
  tempCache: FruitBlock[];
  historyStack: HistoryEntry[];
  
  // Game status
  isGameOver: boolean;
  isGameWon: boolean;
  currentLevel: number;
  hasRevived: boolean;
  
  // Booster usage (per game)
  boostersUsed: {
    moveOut: boolean;
    undo: boolean;
    shuffle: boolean;
  };
  
  // Booster activation (via rewarded ads)
  boostersActivated: {
    moveOut: boolean;
    undo: boolean;
    shuffle: boolean;
  };
  
  // Computed
  totalBlocks: number;
  remainingBlocks: number;
  
  // Actions
  initLevel: (level: number) => void;
  clickBlock: (blockId: string) => void;
  useMoveOut: () => void;
  useUndo: () => void;
  useShuffle: () => void;
  activateBooster: (booster: 'moveOut' | 'undo' | 'shuffle') => void;
  reviveWithWhatsApp: () => void;
  restartGame: () => void;
  updateLockStatus: () => void;
}

export const FRUIT_EMOJIS: Record<FruitType, string> = {
  apple: '🍎',
  banana: '🍌',
  cherry: '🍒',
  grape: '🍇',
  lemon: '🍋',
  orange: '🍊',
  peach: '🍑',
  pear: '🍐',
  pineapple: '🍍',
  strawberry: '🍓',
  watermelon: '🍉',
  dragonfruit: '🐉',
  kiwi: '🥝',
  blueberry: '🫐',
};

// OpenMoji CDN URLs (color SVG)
// https://openmoji.org/library/
export const FRUIT_ICONS: Record<FruitType, string> = {
  apple: 'https://openmoji.org/data/color/svg/1F34E.svg',
  banana: 'https://openmoji.org/data/color/svg/1F34C.svg',
  cherry: 'https://openmoji.org/data/color/svg/1F352.svg',
  grape: 'https://openmoji.org/data/color/svg/1F347.svg',
  lemon: 'https://openmoji.org/data/color/svg/1F34B.svg',
  orange: 'https://openmoji.org/data/color/svg/1F34A.svg',
  peach: 'https://openmoji.org/data/color/svg/1F351.svg',
  pear: 'https://openmoji.org/data/color/svg/1F350.svg',
  pineapple: 'https://openmoji.org/data/color/svg/1F34D.svg',
  strawberry: 'https://openmoji.org/data/color/svg/1F353.svg',
  watermelon: 'https://openmoji.org/data/color/svg/1F349.svg',
  dragonfruit: 'https://openmoji.org/data/color/svg/1F409.svg', // Dragon as placeholder
  kiwi: 'https://openmoji.org/data/color/svg/1F95D.svg',
  blueberry: 'https://openmoji.org/data/color/svg/1FAD0.svg',
};

export const FRUIT_COLORS: Record<FruitType, string> = {
  apple: '#FF6B6B',
  banana: '#FFE66D',
  cherry: '#C23B22',
  grape: '#8B5CF6',
  lemon: '#FEF08A',
  orange: '#FB923C',
  peach: '#FBBF24',
  pear: '#84CC16',
  pineapple: '#FACC15',
  strawberry: '#F43F5E',
  watermelon: '#22C55E',
  dragonfruit: '#FF1493',
  kiwi: '#65A30D',
  blueberry: '#6366F1',
};

export const ALL_FRUITS: FruitType[] = [
  'apple', 'banana', 'cherry', 'grape', 'lemon',
  'orange', 'peach', 'pear', 'pineapple', 'strawberry',
  'watermelon', 'dragonfruit', 'kiwi', 'blueberry'
];
