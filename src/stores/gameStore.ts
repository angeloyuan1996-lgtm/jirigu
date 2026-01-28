import { create } from 'zustand';
import { FruitBlock, FruitType, GameState, HistoryEntry, ALL_FRUITS } from '@/types/game';

const BLOCK_SIZE = 48;
const GRID_COLS = 8;
const GRID_ROWS = 8;
const MAX_SLOTS = 7;

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Check if two blocks overlap
const blocksOverlap = (a: FruitBlock, b: FruitBlock): boolean => {
  const aLeft = a.x * BLOCK_SIZE;
  const aRight = aLeft + BLOCK_SIZE;
  const aTop = a.y * BLOCK_SIZE;
  const aBottom = aTop + BLOCK_SIZE;
  
  const bLeft = b.x * BLOCK_SIZE;
  const bRight = bLeft + BLOCK_SIZE;
  const bTop = b.y * BLOCK_SIZE;
  const bBottom = bTop + BLOCK_SIZE;
  
  return !(aRight <= bLeft || bRight <= aLeft || aBottom <= bTop || bBottom <= aTop);
};

// Generate level data
const generateLevel = (level: number): FruitBlock[] => {
  const blocks: FruitBlock[] = [];
  
  // Level 1: Simple, few layers
  // Level 2+: More complex, many layers
  const numFruitTypes = level === 1 ? 6 : Math.min(8 + level, 14);
  const maxZ = level === 1 ? 3 : Math.min(10 + level * 5, 30);
  const blocksPerType = level === 1 ? 6 : 9; // Must be divisible by 3
  
  // Select random fruit types
  const shuffledFruits = [...ALL_FRUITS].sort(() => Math.random() - 0.5);
  const selectedFruits = shuffledFruits.slice(0, numFruitTypes);
  
  // Generate blocks for each fruit type
  selectedFruits.forEach((fruitType) => {
    for (let i = 0; i < blocksPerType; i++) {
      const x = Math.floor(Math.random() * GRID_COLS);
      const y = Math.floor(Math.random() * GRID_ROWS);
      const z = Math.floor(Math.random() * maxZ);
      
      blocks.push({
        id: generateId(),
        type: fruitType,
        x: x + (Math.random() * 0.5 - 0.25), // Slight offset for organic feel
        y: y + (Math.random() * 0.5 - 0.25),
        z,
        status: 'onMap',
        isLocked: false,
      });
    }
  });
  
  // Sort by z for proper rendering
  return blocks.sort((a, b) => a.z - b.z);
};

// Calculate lock status for all blocks
const calculateLockStatus = (blocks: FruitBlock[]): FruitBlock[] => {
  return blocks.map(block => {
    if (block.status !== 'onMap') {
      return { ...block, isLocked: false };
    }
    
    // Check if any block with higher z overlaps this one
    const isLocked = blocks.some(other => 
      other.id !== block.id &&
      other.status === 'onMap' &&
      other.z > block.z &&
      blocksOverlap(block, other)
    );
    
    return { ...block, isLocked };
  });
};

export const useGameStore = create<GameState>((set, get) => ({
  mapData: [],
  slots: [],
  tempCache: [],
  historyStack: [],
  isGameOver: false,
  isGameWon: false,
  currentLevel: 1,
  hasRevived: false,
  boostersUsed: {
    moveOut: false,
    undo: false,
    shuffle: false,
  },
  totalBlocks: 0,
  remainingBlocks: 0,

  initLevel: (level: number) => {
    const blocks = generateLevel(level);
    const blocksWithLock = calculateLockStatus(blocks);
    
    set({
      mapData: blocksWithLock,
      slots: [],
      tempCache: [],
      historyStack: [],
      isGameOver: false,
      isGameWon: false,
      currentLevel: level,
      hasRevived: false,
      boostersUsed: {
        moveOut: false,
        undo: false,
        shuffle: false,
      },
      totalBlocks: blocks.length,
      remainingBlocks: blocks.length,
    });
  },

  clickBlock: (blockId: string) => {
    const state = get();
    const block = state.mapData.find(b => b.id === blockId);
    
    if (!block || block.isLocked || block.status !== 'onMap') return;
    if (state.slots.length >= MAX_SLOTS) return;
    
    // Save history for undo
    const historyEntry: HistoryEntry = {
      block: { ...block },
      previousSlots: [...state.slots],
    };
    
    // Find insertion position (smart insertion)
    let insertIndex = state.slots.length;
    for (let i = 0; i < state.slots.length; i++) {
      if (state.slots[i].type === block.type) {
        // Find the last occurrence of this type
        let lastSameType = i;
        while (lastSameType < state.slots.length - 1 && 
               state.slots[lastSameType + 1].type === block.type) {
          lastSameType++;
        }
        insertIndex = lastSameType + 1;
        break;
      }
    }
    
    // Update block status
    const updatedMapData = state.mapData.map(b => 
      b.id === blockId ? { ...b, status: 'inSlot' as const } : b
    );
    
    // Insert into slots
    const newSlots = [...state.slots];
    newSlots.splice(insertIndex, 0, { ...block, status: 'inSlot' });
    
    // Check for triple match
    const typeCount: Record<string, number> = {};
    newSlots.forEach(s => {
      typeCount[s.type] = (typeCount[s.type] || 0) + 1;
    });
    
    let finalSlots = newSlots;
    let finalMapData = updatedMapData;
    let matchedType: FruitType | null = null;
    
    for (const [type, count] of Object.entries(typeCount)) {
      if (count >= 3) {
        matchedType = type as FruitType;
        break;
      }
    }
    
    if (matchedType) {
      // Remove matched blocks from slots
      let removed = 0;
      finalSlots = newSlots.filter(s => {
        if (s.type === matchedType && removed < 3) {
          removed++;
          return false;
        }
        return true;
      });
      
      // Update map data to mark as removed
      finalMapData = updatedMapData.map(b => 
        b.type === matchedType && b.status === 'inSlot' && removed > 0
          ? { ...b, status: 'removed' as const }
          : b
      );
    }
    
    // Recalculate lock status
    const blocksWithLock = calculateLockStatus(finalMapData);
    
    // Calculate remaining
    const remaining = blocksWithLock.filter(b => b.status === 'onMap').length;
    
    // Check game over
    const isGameOver = finalSlots.length >= MAX_SLOTS && !matchedType;
    const isGameWon = remaining === 0 && finalSlots.length === 0;
    
    set({
      mapData: blocksWithLock,
      slots: finalSlots,
      historyStack: [...state.historyStack, historyEntry],
      isGameOver,
      isGameWon,
      remainingBlocks: remaining,
    });
  },

  useMoveOut: () => {
    const state = get();
    if (state.boostersUsed.moveOut || state.tempCache.length > 0) return;
    if (state.slots.length < 3) return;
    
    const movedBlocks = state.slots.slice(0, 3);
    const remainingSlots = state.slots.slice(3);
    
    set({
      slots: remainingSlots,
      tempCache: movedBlocks.map(b => ({ ...b, status: 'inTemp' })),
      boostersUsed: { ...state.boostersUsed, moveOut: true },
      isGameOver: false, // Reset game over since we freed slots
    });
  },

  useUndo: () => {
    const state = get();
    if (state.boostersUsed.undo || state.historyStack.length === 0) return;
    
    const lastEntry = state.historyStack[state.historyStack.length - 1];
    
    // Restore block to map
    const updatedMapData = state.mapData.map(b => 
      b.id === lastEntry.block.id 
        ? { ...lastEntry.block, status: 'onMap' as const }
        : b
    );
    
    const blocksWithLock = calculateLockStatus(updatedMapData);
    const remaining = blocksWithLock.filter(b => b.status === 'onMap').length;
    
    set({
      mapData: blocksWithLock,
      slots: lastEntry.previousSlots,
      historyStack: state.historyStack.slice(0, -1),
      boostersUsed: { ...state.boostersUsed, undo: true },
      isGameOver: false,
      remainingBlocks: remaining,
    });
  },

  useShuffle: () => {
    const state = get();
    if (state.boostersUsed.shuffle) return;
    
    const onMapBlocks = state.mapData.filter(b => b.status === 'onMap');
    const otherBlocks = state.mapData.filter(b => b.status !== 'onMap');
    
    // Collect all positions
    const positions = onMapBlocks.map(b => ({ x: b.x, y: b.y, z: b.z }));
    
    // Shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    // Assign new positions
    const shuffledBlocks = onMapBlocks.map((block, i) => ({
      ...block,
      x: positions[i].x,
      y: positions[i].y,
      z: positions[i].z,
    }));
    
    const newMapData = [...shuffledBlocks, ...otherBlocks].sort((a, b) => a.z - b.z);
    const blocksWithLock = calculateLockStatus(newMapData);
    
    set({
      mapData: blocksWithLock,
      boostersUsed: { ...state.boostersUsed, shuffle: true },
    });
  },

  reviveWithWhatsApp: () => {
    const state = get();
    if (state.hasRevived) return;
    
    // Open WhatsApp share
    const message = encodeURIComponent("Help! I'm stuck at Fruit Match! 🍎🍓 Help me beat Level " + state.currentLevel + "!");
    window.open(`https://wa.me/?text=${message}`, '_blank');
    
    // Listen for visibility change to trigger move out
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        
        // Execute move out effect
        const currentState = get();
        if (currentState.slots.length >= 3 && currentState.tempCache.length === 0) {
          const movedBlocks = currentState.slots.slice(0, 3);
          const remainingSlots = currentState.slots.slice(3);
          
          set({
            slots: remainingSlots,
            tempCache: movedBlocks.map(b => ({ ...b, status: 'inTemp' })),
            hasRevived: true,
            isGameOver: false,
          });
        } else {
          set({ hasRevived: true, isGameOver: false });
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    set({ hasRevived: true });
  },

  restartGame: () => {
    const state = get();
    get().initLevel(state.currentLevel);
  },

  updateLockStatus: () => {
    const state = get();
    const blocksWithLock = calculateLockStatus(state.mapData);
    set({ mapData: blocksWithLock });
  },
}));
