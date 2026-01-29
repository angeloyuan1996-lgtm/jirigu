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
 * 严格像素级检测：只要有任何像素重叠就判定为遮挡
 */
const checkOverlap = (target: FruitBlock, other: FruitBlock): boolean => {
  // 计算 target 的边界 (x1, y1, x2, y2)
  const targetX1 = target.x * BLOCK_SIZE;
  const targetX2 = targetX1 + BLOCK_SIZE;
  const targetY1 = target.y * BLOCK_SIZE;
  const targetY2 = targetY1 + BLOCK_SIZE;
  
  // 计算 other 的边界 (x1, y1, x2, y2)
  const otherX1 = other.x * BLOCK_SIZE;
  const otherX2 = otherX1 + BLOCK_SIZE;
  const otherY1 = other.y * BLOCK_SIZE;
  const otherY2 = otherY1 + BLOCK_SIZE;
  
  // 严格 AABB 碰撞检测
  // 如果两个矩形在任意轴上不重叠，则无碰撞
  // 注意：使用 < 和 > 而非 <= 和 >= 确保即使 1px 重叠也能检测到
  const isOverlapping = !(
    targetX2 <= otherX1 ||  // target 在 other 左边
    targetX1 >= otherX2 ||  // target 在 other 右边
    targetY2 <= otherY1 ||  // target 在 other 上边
    targetY1 >= otherY2     // target 在 other 下边
  );
  
  return isOverlapping;
};

/**
 * 判定方块是否被遮挡的算法
 * 检查是否有任何更高层或同层但后渲染的方块遮挡目标方块
 * @param target 目标方块
 * @param allTiles 所有方块（已按 z 排序，同 z 时按数组顺序渲染）
 * @param targetIndex 目标方块在数组中的索引
 */
const checkIsLocked = (target: FruitBlock, allTiles: FruitBlock[], targetIndex: number): boolean => {
  // 遍历所有在目标之后渲染的方块（这些方块会在视觉上覆盖目标）
  // 包括：1. z > target.z 的方块  2. z == target.z 但数组索引更大的方块
  for (let i = 0; i < allTiles.length; i++) {
    const tile = allTiles[i];
    
    // 跳过自己和已移除的方块
    if (tile.id === target.id || tile.status !== 'onMap') continue;
    
    // 判断这个 tile 是否在视觉上覆盖 target
    // 条件：z 更高，或者 z 相同但在数组中位置更靠后（后渲染 = 在上面）
    const isVisuallyAbove = tile.z > target.z || (tile.z === target.z && i > targetIndex);
    
    if (isVisuallyAbove && checkOverlap(target, tile)) {
      return true; // 被遮挡，锁定
    }
  }
  return false; // 无遮挡，解锁
};

// 生成盲盒堆数据
const generateBlindStack = (position: 'left' | 'right', allFruits: FruitType[]): FruitBlock[] => {
  const blocks: FruitBlock[] = [];
  const STACK_SIZE = 10;
  
  // 从现有水果类型中随机选择
  for (let i = 0; i < STACK_SIZE; i++) {
    const randomFruit = allFruits[Math.floor(Math.random() * allFruits.length)];
    blocks.push({
      id: generateId(),
      type: randomFruit,
      x: 0, // 位置在渲染时确定
      y: 0,
      z: STACK_SIZE - i, // 底部z最高，顶部z最低
      status: 'inBlindStack',
      isLocked: i > 0, // 只有顶部可点击
      blindStackPosition: position,
      blindStackIndex: i,
    });
  }
  
  return blocks;
};

// Generate level data with "Hell Algorithm" - 羊了个羊级别难度
// Key: Total count of each fruit type must be divisible by 3
const generateLevel = (level: number): { mainBlocks: FruitBlock[], leftStack: FruitBlock[], rightStack: FruitBlock[] } => {
  const blocks: FruitBlock[] = [];
  
  // Track used coordinates to prevent perfect overlaps
  const usedCoordinates = new Set<string>();
  const coordKey = (x: number, y: number) => `${x.toFixed(2)},${y.toFixed(2)}`;
  
  if (level === 1) {
    // Level 1: 超简单 - 只有3种水果，每种3个 = 9张卡片，无重叠
    const shuffledFruits = [...ALL_FRUITS].sort(() => Math.random() - 0.5);
    const selectedFruits = shuffledFruits.slice(0, 3);
    
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
          z: 0,
          status: 'onMap',
          isLocked: false,
        });
        usedCoordinates.add(coordKey(pos.x, pos.y));
      }
    });
    
    return { mainBlocks: blocks.sort((a, b) => a.z - b.z), leftStack: [], rightStack: [] };
  }
  
  // ========== Level 2: 羊了个羊级别地狱难度 ==========
  
  // 1/4 格偏移量 - 每个方块只被遮住1/4或1/2
  const QUARTER_OFFSET = 0.25;
  
  // 深井堆叠点配置 (3-4个中心堆叠点)
  const CLUSTER_POINTS = [
    { x: 2.0, y: 2.0 },  // 左上
    { x: 4.5, y: 2.0 },  // 右上
    { x: 3.25, y: 4.5 }, // 中央
    { x: 1.5, y: 5.5 },  // 左下
    { x: 5.0, y: 5.5 },  // 右下
  ];
  
  const WELL_DEPTH = 45; // 每个堆叠点40-50层
  const NUM_FRUIT_TYPES = 14;
  
  // 打乱水果类型
  const shuffledFruits = [...ALL_FRUITS].sort(() => Math.random() - 0.5);
  const selectedFruits = shuffledFruits.slice(0, NUM_FRUIT_TYPES);
  
  // 计算每种水果需要的数量 (必须是3的倍数)
  // 主区域 70% 约 9个三元组 * 14种 ≈ 378张
  // 盲盒堆 20张
  // 总计约 400+ 张牌
  
  // 数学死局策略：每种水果分配若干个三元组
  // 故意让2张在顶层，1张埋在底层
  
  interface PlannedBlock {
    type: FruitType;
    isBottomBuried: boolean; // 是否深埋底层
    clusterIndex: number; // 分配到哪个堆叠点
  }
  
  const plannedBlocks: PlannedBlock[] = [];
  
  selectedFruits.forEach((fruitType) => {
    // 每种水果 9-12 个 (必须是3的倍数)
    const triplets = Math.random() > 0.5 ? 4 : 3; // 3-4个三元组 = 9-12个
    
    for (let t = 0; t < triplets; t++) {
      const clusterIndex = Math.floor(Math.random() * CLUSTER_POINTS.length);
      
      // 数学死局：每个三元组中，2张放顶层，1张埋底层
      for (let i = 0; i < 3; i++) {
        plannedBlocks.push({
          type: fruitType,
          isBottomBuried: i === 0, // 第一张深埋
          clusterIndex: i === 0 
            ? Math.floor(Math.random() * CLUSTER_POINTS.length) // 深埋的分散到不同堆叠点
            : clusterIndex,
        });
      }
    }
  });
  
  // 打乱顺序但保持死局结构
  const shuffledPlanned = [...plannedBlocks].sort(() => Math.random() - 0.5);
  
  // 为每个堆叠点分配的方块
  const clusterBlocks: PlannedBlock[][] = CLUSTER_POINTS.map(() => []);
  
  shuffledPlanned.forEach((pb) => {
    clusterBlocks[pb.clusterIndex].push(pb);
  });
  
  // 生成实际方块
  clusterBlocks.forEach((cluster, clusterIdx) => {
    const basePoint = CLUSTER_POINTS[clusterIdx];
    
    // 分离深埋块和顶层块
    const buriedBlocks = cluster.filter(b => b.isBottomBuried);
    const topBlocks = cluster.filter(b => !b.isBottomBuried);
    
    // 先放置深埋块在底层
    buriedBlocks.forEach((pb, idx) => {
      // 底层使用 1/4 偏移创建紧密交错
      const offsetX = (idx % 4) * QUARTER_OFFSET - 0.375;
      const offsetY = Math.floor(idx / 4) * QUARTER_OFFSET - 0.375;
      
      const x = Math.max(0, Math.min(GRID_COLS - 1, basePoint.x + offsetX));
      const y = Math.max(0, Math.min(GRID_ROWS - 1, basePoint.y + offsetY));
      const z = idx; // 最底层
      
      const key = coordKey(x, y);
      if (!usedCoordinates.has(key)) {
        usedCoordinates.add(key);
        blocks.push({
          id: generateId(),
          type: pb.type,
          x,
          y,
          z,
          status: 'onMap',
          isLocked: false,
        });
      }
    });
    
    // 在顶层放置其他方块，使用1/4偏移
    topBlocks.forEach((pb, idx) => {
      // 顶层使用更紧密的1/4偏移
      const spiralIdx = idx % 16;
      const layer = Math.floor(idx / 16);
      
      // 螺旋式偏移 - 1/4格步进
      const offsetPatterns = [
        { dx: 0, dy: 0 },
        { dx: QUARTER_OFFSET, dy: 0 },
        { dx: QUARTER_OFFSET * 2, dy: 0 },
        { dx: 0, dy: QUARTER_OFFSET },
        { dx: QUARTER_OFFSET, dy: QUARTER_OFFSET },
        { dx: QUARTER_OFFSET * 2, dy: QUARTER_OFFSET },
        { dx: 0, dy: QUARTER_OFFSET * 2 },
        { dx: QUARTER_OFFSET, dy: QUARTER_OFFSET * 2 },
        { dx: -QUARTER_OFFSET, dy: 0 },
        { dx: -QUARTER_OFFSET, dy: QUARTER_OFFSET },
        { dx: 0, dy: -QUARTER_OFFSET },
        { dx: QUARTER_OFFSET, dy: -QUARTER_OFFSET },
        { dx: -QUARTER_OFFSET, dy: -QUARTER_OFFSET },
        { dx: QUARTER_OFFSET * 2, dy: -QUARTER_OFFSET },
        { dx: -QUARTER_OFFSET * 2, dy: 0 },
        { dx: -QUARTER_OFFSET * 2, dy: QUARTER_OFFSET },
      ];
      
      const pattern = offsetPatterns[spiralIdx];
      const x = Math.max(0, Math.min(GRID_COLS - 1, basePoint.x + pattern.dx + layer * 0.1));
      const y = Math.max(0, Math.min(GRID_ROWS - 1, basePoint.y + pattern.dy + layer * 0.1));
      const z = buriedBlocks.length + idx + layer * 16; // 在深埋块之上
      
      const key = coordKey(x, y);
      // 允许部分重叠（这是1/4偏移的关键）
      usedCoordinates.add(key);
      blocks.push({
        id: generateId(),
        type: pb.type,
        x,
        y,
        z,
        status: 'onMap',
        isLocked: false,
      });
    });
  });
  
  // 30% 的边缘散布方块 (增加迷惑性)
  const edgeCount = Math.floor(blocks.length * 0.15);
  const edgeFruits = selectedFruits.slice(0, 7); // 用前7种水果
  
  for (let i = 0; i < edgeCount; i++) {
    const isLeft = Math.random() > 0.5;
    const x = isLeft ? Math.random() * 1.5 : GRID_COLS - 1.5 + Math.random() * 1;
    const y = Math.random() * (GRID_ROWS - 1);
    const z = Math.floor(Math.random() * 20); // 较低的z值
    
    blocks.push({
      id: generateId(),
      type: edgeFruits[i % edgeFruits.length],
      x: Math.max(0, Math.min(GRID_COLS - 1, x)),
      y: Math.max(0, Math.min(GRID_ROWS - 1, y)),
      z,
      status: 'onMap',
      isLocked: false,
    });
  }
  
  // 确保总数是3的倍数 (通过调整)
  const remainder = blocks.length % 3;
  if (remainder > 0) {
    // 移除多余的方块
    blocks.splice(-remainder, remainder);
  }
  
  // 生成盲盒堆
  const leftStack = generateBlindStack('left', selectedFruits);
  const rightStack = generateBlindStack('right', selectedFruits);
  
  return { 
    mainBlocks: blocks.sort((a, b) => a.z - b.z), 
    leftStack, 
    rightStack 
  };
};

/**
 * 全局状态更新函数
 * 遍历所有方块更新锁定状态
 */
const calculateLockStatus = (blocks: FruitBlock[]): FruitBlock[] => {
  return blocks.map((block, index) => {
    if (block.status !== 'onMap') {
      return { ...block, isLocked: false };
    }
    return { ...block, isLocked: checkIsLocked(block, blocks, index) };
  });
};

export const useGameStore = create<GameState>((set, get) => ({
  mapData: [],
  slots: [],
  tempCache: [],
  historyStack: [],
  blindStackLeft: [],
  blindStackRight: [],
  isGameOver: false,
  isGameWon: false,
  currentLevel: 1,
  hasRevived: false,
  boostersUsed: {
    moveOut: false,
    undo: false,
    shuffle: false,
  },
  boostersActivated: {
    moveOut: false,
    undo: false,
    shuffle: false,
  },
  totalBlocks: 0,
  remainingBlocks: 0,
  soundEnabled: true,
  

  initLevel: (level: number) => {
    const { mainBlocks, leftStack, rightStack } = generateLevel(level);
    const blocksWithLock = calculateLockStatus(mainBlocks);
    
    const totalCount = mainBlocks.length + leftStack.length + rightStack.length;
    
    set({
      mapData: blocksWithLock,
      slots: [],
      tempCache: [],
      historyStack: [],
      blindStackLeft: leftStack,
      blindStackRight: rightStack,
      isGameOver: false,
      isGameWon: false,
      currentLevel: level,
      hasRevived: false,
      boostersUsed: {
        moveOut: false,
        undo: false,
        shuffle: false,
      },
      boostersActivated: {
        moveOut: false,
        undo: false,
        shuffle: false,
      },
      totalBlocks: totalCount,
      remainingBlocks: totalCount,
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
    }
    
    // Recalculate lock status
    const blocksWithLock = calculateLockStatus(finalMapData);
    
    // Calculate remaining
    const remaining = blocksWithLock.filter(b => b.status === 'onMap').length;
    
    // No automatic return of tempCache blocks - player must click them manually
    
    // Check game over - now also considers if tempCache is blocking
    const isGameOver = finalSlots.length >= MAX_SLOTS && !matchedType;
    const isGameWon = remaining === 0 && finalSlots.length === 0 && state.tempCache.length === 0;
    
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
    
    // Take the first 3 blocks from slots and move to tempCache
    const movedBlocks = state.slots.slice(0, 3);
    const remainingSlots = state.slots.slice(3);
    
    set({
      slots: remainingSlots,
      tempCache: movedBlocks.map(b => ({ ...b, status: 'inTemp' as const })),
      boostersUsed: { ...state.boostersUsed, moveOut: true },
      isGameOver: false,
    });
  },

  clickBufferBlock: (blockId: string) => {
    const state = get();
    const blockIndex = state.tempCache.findIndex(b => b.id === blockId);
    
    if (blockIndex === -1) return;
    if (state.slots.length >= MAX_SLOTS) return; // No space in slots
    
    const block = state.tempCache[blockIndex];
    
    // Remove from tempCache
    const newTempCache = state.tempCache.filter(b => b.id !== blockId);
    
    // Find insertion position using smart insertion (same as clickBlock)
    let insertIndex = state.slots.length;
    for (let i = 0; i < state.slots.length; i++) {
      if (state.slots[i].type === block.type) {
        let lastSameType = i;
        while (lastSameType < state.slots.length - 1 && 
               state.slots[lastSameType + 1].type === block.type) {
          lastSameType++;
        }
        insertIndex = lastSameType + 1;
        break;
      }
    }
    
    // Insert into slots
    const newSlots = [...state.slots];
    newSlots.splice(insertIndex, 0, { ...block, status: 'inSlot' as const });
    
    // Check for triple match
    const typeCount: Record<string, number> = {};
    newSlots.forEach(s => {
      typeCount[s.type] = (typeCount[s.type] || 0) + 1;
    });
    
    let finalSlots = newSlots;
    let matchedType: FruitType | null = null;
    
    for (const [type, count] of Object.entries(typeCount)) {
      if (count >= 3) {
        matchedType = type as FruitType;
        break;
      }
    }
    
    if (matchedType) {
      const audio = getAudioController();
      audio?.playMatchSound();
      
      let removed = 0;
      finalSlots = newSlots.filter(s => {
        if (s.type === matchedType && removed < 3) {
          removed++;
          return false;
        }
        return true;
      });
    } else {
      const audio = getAudioController();
      audio?.playClickSound();
    }
    
    // Check game over - slots full with no match = game over
    const isGameOver = finalSlots.length >= MAX_SLOTS && !matchedType;
    
    // Play game over sound
    if (isGameOver) {
      setTimeout(() => {
        const audio = getAudioController();
        audio?.playGameOverSound();
      }, 200);
    }
    
    set({
      slots: finalSlots,
      tempCache: newTempCache,
      isGameOver,
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

  activateBooster: (booster: 'moveOut' | 'undo' | 'shuffle') => {
    const state = get();
    if (state.boostersActivated[booster]) return; // Already activated
    
    // Simulate watching a rewarded ad
    // In production, this would be called after the ad completes
    set({
      boostersActivated: { ...state.boostersActivated, [booster]: true },
    });
  },

  updateLockStatus: () => {
    const state = get();
    const blocksWithLock = calculateLockStatus(state.mapData);
    set({ mapData: blocksWithLock });
  },

  toggleSound: () => {
    set((state) => ({ soundEnabled: !state.soundEnabled }));
  },

  // 点击盲盒堆顶部方块
  clickBlindStackBlock: (position: 'left' | 'right') => {
    const state = get();
    const stack = position === 'left' ? state.blindStackLeft : state.blindStackRight;
    
    if (stack.length === 0) return;
    if (state.slots.length >= MAX_SLOTS) return;
    
    // 获取顶部方块 (index 0)
    const topBlock = stack[0];
    
    // 从盲盒堆移除
    const newStack = stack.slice(1).map((b, idx) => ({
      ...b,
      isLocked: idx > 0, // 新的顶部解锁
      blindStackIndex: idx,
    }));
    
    // 智能插入到槽位
    let insertIndex = state.slots.length;
    for (let i = 0; i < state.slots.length; i++) {
      if (state.slots[i].type === topBlock.type) {
        let lastSameType = i;
        while (lastSameType < state.slots.length - 1 && 
               state.slots[lastSameType + 1].type === topBlock.type) {
          lastSameType++;
        }
        insertIndex = lastSameType + 1;
        break;
      }
    }
    
    const newSlots = [...state.slots];
    newSlots.splice(insertIndex, 0, { ...topBlock, status: 'inSlot' as const });
    
    // 检查三消
    const typeCount: Record<string, number> = {};
    newSlots.forEach(s => {
      typeCount[s.type] = (typeCount[s.type] || 0) + 1;
    });
    
    let finalSlots = newSlots;
    let matchedType: FruitType | null = null;
    
    for (const [type, count] of Object.entries(typeCount)) {
      if (count >= 3) {
        matchedType = type as FruitType;
        break;
      }
    }
    
    if (matchedType) {
      const audio = getAudioController();
      audio?.playMatchSound();
      
      let removed = 0;
      finalSlots = newSlots.filter(s => {
        if (s.type === matchedType && removed < 3) {
          removed++;
          return false;
        }
        return true;
      });
    } else {
      const audio = getAudioController();
      audio?.playClickSound();
    }
    
    // 计算剩余
    const remaining = state.mapData.filter(b => b.status === 'onMap').length +
      (position === 'left' ? newStack.length : state.blindStackLeft.length) +
      (position === 'right' ? newStack.length : state.blindStackRight.length);
    
    // 检查游戏结束
    const isGameOver = finalSlots.length >= MAX_SLOTS && !matchedType;
    const isGameWon = remaining === 0 && finalSlots.length === 0 && state.tempCache.length === 0;
    
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
      slots: finalSlots,
      blindStackLeft: position === 'left' ? newStack : state.blindStackLeft,
      blindStackRight: position === 'right' ? newStack : state.blindStackRight,
      isGameOver,
      isGameWon,
      remainingBlocks: remaining,
    });
  },

  abandonGame: () => {
    // Reset to level 1 (home page placeholder - just restart at level 1)
    get().initLevel(1);
  },
}));
