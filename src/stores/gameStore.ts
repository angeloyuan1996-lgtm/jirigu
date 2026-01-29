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

// ========== 虚拟网格系统 ==========
// 所有坐标对齐到 1/4 卡片尺寸的网格上
// 公式：x = column * (1 / 4), y = row * (1 / 4)
// column 和 row 必须是整数

// 网格单位 = 1/4 卡片尺寸
const GRID_UNIT = 0.25;

// 将任意坐标对齐到网格
const snapToGrid = (value: number): number => {
  return Math.round(value / GRID_UNIT) * GRID_UNIT;
};

// 坐标键（用于追踪已使用的位置）
const coordKey = (x: number, y: number, z: number): string => {
  return `${snapToGrid(x).toFixed(2)},${snapToGrid(y).toFixed(2)},${z}`;
};

// 检查两个方块是否完全重叠（同坐标同层）
const isExactSamePosition = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): boolean => {
  return snapToGrid(x1) === snapToGrid(x2) && 
         snapToGrid(y1) === snapToGrid(y2) && 
         z1 === z2;
};

// 允许的偏移量（1/4, 1/2, 3/4 卡片尺寸）
const ALLOWED_OFFSETS = [1, 2, 3]; // 对应 0.25, 0.5, 0.75

// 生成阶梯式偏移（确保只产生规则的 1/4、1/2、3/4 遮挡）
const generateStaircaseOffset = (): { dx: number, dy: number } => {
  const offsetUnits = ALLOWED_OFFSETS[Math.floor(Math.random() * ALLOWED_OFFSETS.length)];
  const dx = offsetUnits * GRID_UNIT * (Math.random() > 0.5 ? 1 : -1);
  const dy = offsetUnits * GRID_UNIT * (Math.random() > 0.5 ? 1 : -1);
  return { dx, dy };
};

// Generate level data with "Hell Algorithm" - 羊了个羊级别难度
// Key: Total count of each fruit type must be divisible by 3
// 所有区域（主区域 + 盲盒堆）共享同一个资源池
const generateLevel = (level: number): { mainBlocks: FruitBlock[], leftStack: FruitBlock[], rightStack: FruitBlock[] } => {
  
  // 追踪已使用的坐标，防止完全重叠
  const usedPositions = new Map<string, { x: number, y: number, z: number }>();
  
  // 查找可用位置（避免完全重叠，强制至少 1/4 偏移）
  const findValidPosition = (baseX: number, baseY: number, z: number): { x: number, y: number } => {
    let x = snapToGrid(baseX);
    let y = snapToGrid(baseY);
    
    // 检查当前层和下方层是否有完全重叠
    const checkLayers = [z, z - 1, z - 2].filter(l => l >= 0);
    
    for (const checkZ of checkLayers) {
      const key = coordKey(x, y, checkZ);
      if (usedPositions.has(key)) {
        // 发现重叠，应用阶梯式偏移
        const { dx, dy } = generateStaircaseOffset();
        x = snapToGrid(x + dx);
        y = snapToGrid(y + dy);
        
        // 确保在网格范围内
        x = Math.max(0, Math.min(GRID_COLS - 1, x));
        y = Math.max(0, Math.min(GRID_ROWS - 1, y));
      }
    }
    
    // 最终保存位置
    usedPositions.set(coordKey(x, y, z), { x, y, z });
    
    return { x, y };
  };
  
  if (level === 1) {
    // Level 1: 超简单 - 只有3种水果，每种3个 = 9张卡片，无重叠，无盲盒堆
    const blocks: FruitBlock[] = [];
    const shuffledFruits = [...ALL_FRUITS].sort(() => Math.random() - 0.5);
    const selectedFruits = shuffledFruits.slice(0, 3);
    
    // 网格对齐的位置（每个位置间隔 2 个卡片单位 = 8 个网格单位）
    const positions = [
      { x: 1, y: 1 }, { x: 3, y: 1 }, { x: 5, y: 1 },
      { x: 1, y: 3 }, { x: 3, y: 3 }, { x: 5, y: 3 },
      { x: 1, y: 5 }, { x: 3, y: 5 }, { x: 5, y: 5 },
    ];
    
    let posIndex = 0;
    selectedFruits.forEach((fruitType) => {
      for (let i = 0; i < 3; i++) {
        const pos = positions[posIndex++];
        const snappedX = snapToGrid(pos.x);
        const snappedY = snapToGrid(pos.y);
        blocks.push({
          id: generateId(),
          type: fruitType,
          x: snappedX,
          y: snappedY,
          z: 0,
          status: 'onMap',
          isLocked: false,
        });
        usedPositions.set(coordKey(snappedX, snappedY, 0), { x: snappedX, y: snappedY, z: 0 });
      }
    });
    
    return { mainBlocks: blocks.sort((a, b) => a.z - b.z), leftStack: [], rightStack: [] };
  }
  
  // ========== Level 2: 羊了个羊级别地狱难度 ==========
  // 核心：视觉陷阱 - 前期简单诱导 + 中期全类型爆发
  // 所有区域共享同一个资源池
  // 严格网格对齐 + 阶梯式堆叠
  
  const BLIND_STACK_SIZE = 10; // 每个盲盒堆10张
  const NUM_FRUIT_TYPES = 14;
  
  // 深井堆叠点配置（对齐到网格）
  const CLUSTER_POINTS = [
    { x: snapToGrid(2.0), y: snapToGrid(2.0) },
    { x: snapToGrid(4.5), y: snapToGrid(2.0) },
    { x: snapToGrid(3.25), y: snapToGrid(4.5) },
    { x: snapToGrid(1.5), y: snapToGrid(5.5) },
    { x: snapToGrid(5.0), y: snapToGrid(5.5) },
  ];
  
  // ===== 视觉陷阱设计 =====
  const shuffledFruits = [...ALL_FRUITS].sort(() => Math.random() - 0.5);
  const allFruits = shuffledFruits.slice(0, NUM_FRUIT_TYPES);
  
  // 前期诱导水果（仅3-4种）
  const easyFruits = allFruits.slice(0, 4);
  // 中期爆发水果（全部14种）
  const hellFruits = allFruits;
  
  // ===== 第一步：生成分层卡片池 =====
  interface CardInfo {
    type: FruitType;
    layer: 'top' | 'middle' | 'bottom';
  }
  
  const totalCardPool: CardInfo[] = [];
  
  // 顶层（诱导层）: 3-4种水果
  easyFruits.forEach((fruitType) => {
    const triplets = Math.floor(Math.random() * 2) + 1;
    for (let t = 0; t < triplets; t++) {
      for (let i = 0; i < 3; i++) {
        totalCardPool.push({ type: fruitType, layer: 'top' });
      }
    }
  });
  
  // 中层（地狱层）: 全部14种水果
  hellFruits.forEach((fruitType) => {
    const triplets = Math.floor(Math.random() * 3) + 2;
    for (let t = 0; t < triplets; t++) {
      for (let i = 0; i < 3; i++) {
        totalCardPool.push({ type: fruitType, layer: 'middle' });
      }
    }
  });
  
  // 底层
  hellFruits.forEach((fruitType) => {
    const triplets = Math.floor(Math.random() * 2) + 1;
    for (let t = 0; t < triplets; t++) {
      for (let i = 0; i < 3; i++) {
        totalCardPool.push({ type: fruitType, layer: 'bottom' });
      }
    }
  });
  
  // 分离各层卡片
  const topCards = totalCardPool.filter(c => c.layer === 'top');
  const middleCards = totalCardPool.filter(c => c.layer === 'middle');
  const bottomCards = totalCardPool.filter(c => c.layer === 'bottom');
  
  // 各层内部打乱
  const shuffledTop = [...topCards].sort(() => Math.random() - 0.5);
  const shuffledMiddle = [...middleCards].sort(() => Math.random() - 0.5);
  const shuffledBottom = [...bottomCards].sort(() => Math.random() - 0.5);
  
  console.log(`[Level 2 - 视觉陷阱] 顶层(诱导): ${topCards.length}张 (${easyFruits.length}种水果)`);
  console.log(`[Level 2 - 视觉陷阱] 中层(地狱): ${middleCards.length}张 (${hellFruits.length}种水果)`);
  console.log(`[Level 2 - 视觉陷阱] 底层: ${bottomCards.length}张`);
  
  // ===== 第二步：从卡片池中分配到盲盒堆 =====
  const nonTopPool = [...shuffledBottom, ...shuffledMiddle].sort(() => Math.random() - 0.5);
  const leftStackCards = nonTopPool.splice(0, BLIND_STACK_SIZE);
  const rightStackCards = nonTopPool.splice(0, BLIND_STACK_SIZE);
  
  // 剩余的非顶层卡片 + 全部顶层卡片放入主区域
  const mainAreaCards = [...nonTopPool, ...shuffledTop];
  
  // ===== 第三步：生成盲盒堆 FruitBlock =====
  const createBlindStack = (cards: CardInfo[], position: 'left' | 'right'): FruitBlock[] => {
    return cards.map((card, index) => ({
      id: generateId(),
      type: card.type,
      x: 0,
      y: 0,
      z: BLIND_STACK_SIZE - index,
      status: 'inBlindStack' as const,
      isLocked: index > 0,
      blindStackPosition: position,
      blindStackIndex: index,
    }));
  };
  
  const leftStack = createBlindStack(leftStackCards, 'left');
  const rightStack = createBlindStack(rightStackCards, 'right');
  
  // ===== 第四步：生成主区域方块（网格对齐 + 阶梯式堆叠）=====
  const mainBlocks: FruitBlock[] = [];
  
  // 分离主区域中的各层卡片
  const mainBottom = mainAreaCards.filter(c => c.layer === 'bottom');
  const mainMiddle = mainAreaCards.filter(c => c.layer === 'middle');
  const mainTop = mainAreaCards.filter(c => c.layer === 'top');
  
  let currentZ = 0;
  
  // === 底层方块生成 (z: 0 - 9) ===
  // 使用网格对齐的阶梯式放置
  mainBottom.forEach((card, idx) => {
    const clusterIdx = idx % CLUSTER_POINTS.length;
    const basePoint = CLUSTER_POINTS[clusterIdx];
    
    // 阶梯式偏移（1/4, 1/2, 3/4 单位）
    const offsetUnits = ALLOWED_OFFSETS[idx % ALLOWED_OFFSETS.length];
    const direction = idx % 4;
    let offsetX = 0, offsetY = 0;
    
    switch (direction) {
      case 0: offsetX = offsetUnits * GRID_UNIT; offsetY = offsetUnits * GRID_UNIT; break;
      case 1: offsetX = -offsetUnits * GRID_UNIT; offsetY = offsetUnits * GRID_UNIT; break;
      case 2: offsetX = offsetUnits * GRID_UNIT; offsetY = -offsetUnits * GRID_UNIT; break;
      case 3: offsetX = -offsetUnits * GRID_UNIT; offsetY = -offsetUnits * GRID_UNIT; break;
    }
    
    const z = Math.floor(idx / (CLUSTER_POINTS.length * 2));
    const { x, y } = findValidPosition(basePoint.x + offsetX, basePoint.y + offsetY, z);
    
    mainBlocks.push({
      id: generateId(),
      type: card.type,
      x,
      y,
      z,
      status: 'onMap',
      isLocked: false,
    });
  });
  
  currentZ = Math.max(...mainBlocks.map(b => b.z), 0) + 1;
  
  // === 中层方块生成 (z: 10 - 30) - 地狱层 ===
  // 全部14种水果密集堆叠，网格对齐
  mainMiddle.forEach((card, idx) => {
    const clusterIdx = idx % CLUSTER_POINTS.length;
    const basePoint = CLUSTER_POINTS[clusterIdx];
    
    // 紧密阶梯式堆叠
    const layerInCluster = Math.floor(idx / CLUSTER_POINTS.length);
    const offsetPattern = layerInCluster % 4;
    const offsetUnits = ALLOWED_OFFSETS[offsetPattern % 3];
    
    let offsetX = 0, offsetY = 0;
    switch (offsetPattern) {
      case 0: offsetX = offsetUnits * GRID_UNIT; offsetY = 0; break;
      case 1: offsetX = 0; offsetY = offsetUnits * GRID_UNIT; break;
      case 2: offsetX = -offsetUnits * GRID_UNIT; offsetY = 0; break;
      case 3: offsetX = 0; offsetY = -offsetUnits * GRID_UNIT; break;
    }
    
    const z = currentZ + Math.floor(idx / (CLUSTER_POINTS.length * 2));
    const { x, y } = findValidPosition(basePoint.x + offsetX, basePoint.y + offsetY, z);
    
    mainBlocks.push({
      id: generateId(),
      type: card.type,
      x,
      y,
      z,
      status: 'onMap',
      isLocked: false,
    });
  });
  
  currentZ = Math.max(...mainBlocks.map(b => b.z), 0) + 1;
  
  // === 顶层方块生成 (最高z值) - 诱导层 ===
  // 仅3-4种水果，网格对齐，阶梯式分散
  mainTop.forEach((card, idx) => {
    const clusterIdx = idx % CLUSTER_POINTS.length;
    const basePoint = CLUSTER_POINTS[clusterIdx];
    
    // 更大范围的阶梯式分散
    const spreadPattern = idx % 8;
    const spreadUnits = (spreadPattern % 4 + 1) * 2; // 2, 4, 6, 8 个网格单位
    
    let offsetX = 0, offsetY = 0;
    switch (spreadPattern) {
      case 0: offsetX = spreadUnits * GRID_UNIT; offsetY = 0; break;
      case 1: offsetX = 0; offsetY = spreadUnits * GRID_UNIT; break;
      case 2: offsetX = -spreadUnits * GRID_UNIT; offsetY = 0; break;
      case 3: offsetX = 0; offsetY = -spreadUnits * GRID_UNIT; break;
      case 4: offsetX = spreadUnits * GRID_UNIT; offsetY = spreadUnits * GRID_UNIT; break;
      case 5: offsetX = -spreadUnits * GRID_UNIT; offsetY = spreadUnits * GRID_UNIT; break;
      case 6: offsetX = spreadUnits * GRID_UNIT; offsetY = -spreadUnits * GRID_UNIT; break;
      case 7: offsetX = -spreadUnits * GRID_UNIT; offsetY = -spreadUnits * GRID_UNIT; break;
    }
    
    const z = currentZ + Math.floor(idx / CLUSTER_POINTS.length);
    const { x, y } = findValidPosition(basePoint.x + offsetX, basePoint.y + offsetY, z);
    
    mainBlocks.push({
      id: generateId(),
      type: card.type,
      x,
      y,
      z,
      status: 'onMap',
      isLocked: false,
    });
  });
  
  // 边缘散布（也遵循网格对齐）
  const edgeCount = Math.floor(mainBlocks.length * 0.08);
  for (let i = 0; i < edgeCount && i < mainBlocks.length; i++) {
    const block = mainBlocks[i];
    const isLeft = i % 2 === 0;
    
    // 边缘位置也对齐到网格
    const edgeX = isLeft 
      ? snapToGrid(Math.floor(Math.random() * 4) * GRID_UNIT)
      : snapToGrid(GRID_COLS - 1 - Math.floor(Math.random() * 4) * GRID_UNIT);
    const edgeY = snapToGrid(Math.floor(Math.random() * (GRID_ROWS * 4)) * GRID_UNIT);
    
    block.x = Math.max(0, Math.min(GRID_COLS - 1, edgeX));
    block.y = Math.max(0, Math.min(GRID_ROWS - 1, edgeY));
  }
  
  // 验证总数是3的倍数
  const totalCount = mainBlocks.length + leftStack.length + rightStack.length;
  console.log(`[Level 2] Total cards: ${totalCount} (main: ${mainBlocks.length}, left: ${leftStack.length}, right: ${rightStack.length})`);
  console.log(`[Level 2] Is multiple of 3: ${totalCount % 3 === 0}`);
  console.log(`[Level 2] Grid alignment: All coordinates snapped to 1/4 unit grid`);
  
  return { 
    mainBlocks: mainBlocks.sort((a, b) => a.z - b.z), 
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
    
    // 只撤回最后点击的那一张卡片，不恢复被消除的卡片
    // 1. 将最后点击的卡片从槽位移除（如果它还在槽位中）
    // 2. 将该卡片放回地图原位置
    
    // 从当前槽位中移除该卡片（如果存在）
    const newSlots = state.slots.filter(s => s.id !== lastEntry.block.id);
    
    // 将该卡片放回地图原位置
    const updatedMapData = state.mapData.map(b => 
      b.id === lastEntry.block.id 
        ? { ...lastEntry.block, status: 'onMap' as const }
        : b
    );
    
    const blocksWithLock = calculateLockStatus(updatedMapData);
    const remaining = blocksWithLock.filter(b => b.status === 'onMap').length;
    
    set({
      mapData: blocksWithLock,
      slots: newSlots,
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
