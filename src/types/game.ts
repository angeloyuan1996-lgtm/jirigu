export type FruitType = 
  | 'apple' | 'banana' | 'cherry' | 'grape' | 'lemon'
  | 'orange' | 'peach' | 'pear' | 'pineapple' | 'strawberry'
  | 'watermelon' | 'mango' | 'kiwi' | 'blueberry';

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
  
  // Computed
  totalBlocks: number;
  remainingBlocks: number;
  
  // Actions
  initLevel: (level: number) => void;
  clickBlock: (blockId: string) => void;
  useMoveOut: () => void;
  useUndo: () => void;
  useShuffle: () => void;
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
  mango: '🥭',
  kiwi: '🥝',
  blueberry: '🫐',
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
  mango: '#F59E0B',
  kiwi: '#65A30D',
  blueberry: '#6366F1',
};

export const ALL_FRUITS: FruitType[] = [
  'apple', 'banana', 'cherry', 'grape', 'lemon',
  'orange', 'peach', 'pear', 'pineapple', 'strawberry',
  'watermelon', 'mango', 'kiwi', 'blueberry'
];
