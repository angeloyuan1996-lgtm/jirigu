import { create } from 'zustand';
import { FruitBlock, FruitType, GameState, HistoryEntry, ALL_FRUITS } from '@/types/game';
import { getAudioController } from '@/hooks/useAudio';

const BLOCK_SIZE = 44; // Smaller for mobile
const GRID_COLS = 7;  // Reduced to fit mobile screens
const GRID_ROWS = 8;
const MAX_SLOTS = 7;

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * AABB 矩形碰撞检测 - 判断两个方块是否重叠
 * 使用像素级坐标进行精确碰撞检测
 */
const checkOverlap = (target: FruitBlock, other: FruitBlock): boolean => {
  const targetLeft = target.x * BLOCK_SIZE;
  const targetRight = targetLeft + BLOCK_SIZE;
  const targetTop = target.y * BLOCK_SIZE;
  const targetBottom = targetTop + BLOCK_SIZE;
  
  const otherLeft = other.x * BLOCK_SIZE;
  const otherRight = otherLeft + BLOCK_SIZE;
  const otherTop = other.y * BLOCK_SIZE;
  const otherBottom = otherTop + BLOCK_SIZE;
  
  // AABB 碰撞检测：如果任意边界不重叠，则无碰撞
  const isOverlapping = !(
    targetRight <= otherLeft ||
    targetLeft >= otherRight ||
    targetBottom <= otherTop ||
    targetTop >= otherBottom
  );
  
  return isOverlapping;
};

/**
 * 判定方块是否被遮挡的算法
 * 只有 Z 轴更大的方块才可能造成遮挡
 */
const checkIsLocked = (target: FruitBlock, allTiles: FruitBlock[]): boolean => {
  // 筛选出在当前方块上方且仍在地图上的方块
  const tilesAbove = allTiles.filter(
    tile => tile.z > target.z && tile.status === 'onMap'
  );
  
  for (const topTile of tilesAbove) {
    if (checkOverlap(target, topTile)) {
      return true; // 被上方方块重叠，锁定
    }
  }
  return false; // 无遮挡，解锁
};

// Generate level data with "Hell Algorithm"
// Key: Total count of each fruit type must be divisible by 3
// Only 2 levels: Super easy Level 1 (9 cards) and Hell Level 2
const generateLevel = (level: number): FruitBlock[] => {
  const blocks: FruitBlock[] = [];
  
  if (level === 1) {
    // Level 1: 超简单 - 只有3种水果，每种3个 = 9张卡片，无重叠
    const shuffledFruits = [...ALL_FRUITS].sort(() => Math.random() - 0.5);
    const selectedFruits = shuffledFruits.slice(0, 3); // 只选3种水果
    
    // 在网格中均匀分布，避免重叠
    const positions = [
      { x: 1, y: 1 }, { x: 3, y: 1 }, { x: 5, y: 1 },
      { x: 1, y: 3 }, { x: 3, y: 3 }, { x: 5, y: 3 },
      { x: 1, y: 5 }, { x: 3, y: 5 }, { x: 5, y: 5 },
    ];
    
    let posIndex = 0;
    selectedFruits.forEach((fruitType) => {
      for (let i = 0; i < 3; i++) {
        const pos = positions[posIndex++];
        blocks.push({
          id: generateId(),
          type: fruitType,
          x: pos.x,
          y: pos.y,
          z: 0, // 全部在同一层，无遮挡
          status: 'onMap',
          isLocked: false,
        });
      }
    });
  } else {
    // Level 2: 地狱难度 - 14种水果，每种6-9个，50层堆叠
    const numFruitTypes = 14;
    const maxZ = 50;
    
    const shuffledFruits = [...ALL_FRUITS].sort(() => Math.random() - 0.5);
    const selectedFruits = shuffledFruits.slice(0, numFruitTypes);
    
    selectedFruits.forEach((fruitType) => {
      const blocksPerType = Math.random() > 0.5 ? 9 : 6;
      
      for (let i = 0; i < blocksPerType; i++) {
        // 地狱模式：密集堆叠，大量重叠
        const x = Math.floor(Math.random() * GRID_COLS) + (Math.random() * 0.6 - 0.3);
        const y = Math.floor(Math.random() * GRID_ROWS) + (Math.random() * 0.6 - 0.3);
        const z = Math.floor(Math.random() * maxZ);
        
        blocks.push({
          id: generateId(),
          type: fruitType,
          x,
          y,
          z,
          status: 'onMap',
          isLocked: false,
        });
      }
    });
  }
  
  // Sort by z for proper rendering (lower z first)
  return blocks.sort((a, b) => a.z - b.z);
};

/**
 * 全局状态更新函数
 * 遍历所有方块更新锁定状态
 */
const calculateLockStatus = (blocks: FruitBlock[]): FruitBlock[] => {
  return blocks.map(block => {
    if (block.status !== 'onMap') {
      return { ...block, isLocked: false };
    }
    return { ...block, isLocked: checkIsLocked(block, blocks) };
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
      // Play match sound
      const audio = getAudioController();
      audio?.playMatchSound();
      
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
    } else {
      // Play click sound
      const audio = getAudioController();
      audio?.playClickSound();
    }
    
    // Recalculate lock status
    const blocksWithLock = calculateLockStatus(finalMapData);
    
    // Calculate remaining
    const remaining = blocksWithLock.filter(b => b.status === 'onMap').length;
    
    // Try to return tempCache blocks back to slots if there's space
    let returnedSlots = finalSlots;
    let returnedTempCache = state.tempCache;
    
    // Only return blocks if we have tempCache and enough space
    if (state.tempCache.length > 0 && finalSlots.length + state.tempCache.length <= MAX_SLOTS) {
      // Return temp blocks to slots
      returnedSlots = [
        ...finalSlots,
        ...state.tempCache.map(b => ({ ...b, status: 'inSlot' as const }))
      ];
      returnedTempCache = [];
      
      // Check for new matches after returning
      const newTypeCount: Record<string, number> = {};
      returnedSlots.forEach(s => {
        newTypeCount[s.type] = (newTypeCount[s.type] || 0) + 1;
      });
      
      for (const [type, count] of Object.entries(newTypeCount)) {
        if (count >= 3) {
          const newMatchType = type as FruitType;
          let newRemoved = 0;
          returnedSlots = returnedSlots.filter(s => {
            if (s.type === newMatchType && newRemoved < 3) {
              newRemoved++;
              return false;
            }
            return true;
          });
          // Play match sound for returning match
          setTimeout(() => {
            const audio = getAudioController();
            audio?.playMatchSound();
          }, 300);
          break;
        }
      }
    }
    
    // Check game over
    const isGameOver = returnedSlots.length >= MAX_SLOTS && !matchedType;
    const isGameWon = remaining === 0 && returnedSlots.length === 0;
    
    // Play sounds for game end states
    if (isGameOver) {
      setTimeout(() => {
        const audio = getAudioController();
        audio?.playGameOverSound();
      }, 200);
    }
    if (isGameWon) {
      setTimeout(() => {
        const audio = getAudioController();
        audio?.playVictorySound();
      }, 200);
    }
    
    set({
      mapData: blocksWithLock,
      slots: returnedSlots,
      tempCache: returnedTempCache,
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
