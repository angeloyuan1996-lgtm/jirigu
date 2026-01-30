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
  
  // ========== Level 2: 深井瓶颈策略 ==========
  // 核心规则：每组3个同类水果，2个在表面可见，1个埋到最底层
  // 制造极其紧张的资源博弈：玩家必须"挖"到底层才能凑齐
  
  const BLIND_STACK_SIZE = 10;
  const NUM_FRUIT_TYPES = 14;
  
  // ===== 深井瓶颈水果池生成 =====
  const shuffledFruits = [...ALL_FRUITS].sort(() => Math.random() - 0.5);
  const allFruits = shuffledFruits.slice(0, NUM_FRUIT_TYPES);
  
  interface CardInfo {
    type: FruitType;
    layer: 'surface' | 'deep_buried'; // surface=表面可见, deep_buried=深埋底层
    tripletGroup: number; // 标记属于第几个三连组
  }
  
  const totalCardPool: CardInfo[] = [];
  
  // 核心"深井"策略：
  // 每种水果生成2-4组三连（每组3张）
  // 每组三连中：2张放表面层，1张埋到底层
  let globalTripletGroup = 0;
  
  allFruits.forEach((fruitType) => {
    // 每种水果生成 2-4 组三连
    const tripletCount = Math.floor(Math.random() * 3) + 2; // 2-4组
    
    for (let t = 0; t < tripletCount; t++) {
      globalTripletGroup++;
      
      // 关键！每组三连中：
      // - 2张卡片放在表面层（容易拿到）
      // - 1张卡片埋到底层（必须挖穿整个堆叠才能拿到）
      totalCardPool.push({ 
        type: fruitType, 
        layer: 'surface', 
        tripletGroup: globalTripletGroup 
      });
      totalCardPool.push({ 
        type: fruitType, 
        layer: 'surface', 
        tripletGroup: globalTripletGroup 
      });
      totalCardPool.push({ 
        type: fruitType, 
        layer: 'deep_buried', // 第3张故意埋底层！
        tripletGroup: globalTripletGroup 
      });
    }
  });
  
  // 分离表面层和深埋层
  const surfaceCards = totalCardPool.filter(c => c.layer === 'surface');
  const buriedCards = totalCardPool.filter(c => c.layer === 'deep_buried');
  
  console.log(`[Level 2 - 深井瓶颈] 表面层: ${surfaceCards.length}张 (容易获取)`);
  console.log(`[Level 2 - 深井瓶颈] 深埋层: ${buriedCards.length}张 (必须挖穿才能拿到)`);
  console.log(`[Level 2 - 深井瓶颈] 三连组数: ${globalTripletGroup}组 (每组3张，2张表面+1张底层)`);
  
  // 打乱卡片顺序
  const shuffledSurface = [...surfaceCards].sort(() => Math.random() - 0.5);
  const shuffledBuried = [...buriedCards].sort(() => Math.random() - 0.5);
  
  // 盲盒堆：从深埋层抽取一些（增加瓶颈感）
  const blindPool = [...shuffledBuried].splice(0, Math.min(BLIND_STACK_SIZE * 2, shuffledBuried.length));
  const leftStackCards = blindPool.splice(0, BLIND_STACK_SIZE);
  const rightStackCards = blindPool.splice(0, BLIND_STACK_SIZE);
  
  // 剩余的深埋卡片 + 所有表面卡片 = 主区域
  const remainingBuried = shuffledBuried.slice(BLIND_STACK_SIZE * 2);
  
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
  
  // ===== 羊了个羊式"乱中有序"堆叠 =====
  const mainBlocks: FruitBlock[] = [];
  
  // 游戏区域边界
  const AREA_MIN_X = 0.5;
  const AREA_MAX_X = GRID_COLS - 1.5;
  const AREA_MIN_Y = 0.5;
  const AREA_MAX_Y = GRID_ROWS - 1.5;
  
  // 生成随机聚类中心
  const generateClusterCenters = (layerIndex: number, count: number = 4): { x: number, y: number }[] => {
    const centers: { x: number, y: number }[] = [];
    const seed = layerIndex * 137 + 42;
    
    for (let i = 0; i < count; i++) {
      const rx = Math.sin(seed + i * 17) * 0.5 + 0.5;
      const ry = Math.sin(seed + i * 31 + 7) * 0.5 + 0.5;
      
      centers.push({
        x: AREA_MIN_X + rx * (AREA_MAX_X - AREA_MIN_X),
        y: AREA_MIN_Y + ry * (AREA_MAX_Y - AREA_MIN_Y),
      });
    }
    
    return centers;
  };
  
  // 生成散布位置
  const generateScatteredPosition = (layerIndex: number, posIndex: number): { x: number, y: number } => {
    const seed = layerIndex * 1000 + posIndex * 7;
    
    const clusterCount = 3 + (layerIndex % 3);
    const centers = generateClusterCenters(layerIndex, clusterCount);
    
    const centerIdx = Math.floor((Math.sin(seed * 13) * 0.5 + 0.5) * centers.length);
    const center = centers[centerIdx % centers.length];
    
    const spreadX = (Math.sin(seed * 17) + Math.sin(seed * 29) * 0.5) * 2.5;
    const spreadY = (Math.sin(seed * 23) + Math.sin(seed * 37) * 0.5) * 2.5;
    
    const halfOffsetX = Math.sin(seed * 41) > 0 ? 0.5 : 0;
    const halfOffsetY = Math.sin(seed * 47) > 0 ? 0.5 : 0;
    
    let x = center.x + spreadX + halfOffsetX;
    let y = center.y + spreadY + halfOffsetY;
    
    x = Math.round(x * 2) / 2;
    y = Math.round(y * 2) / 2;
    
    x = Math.max(0, Math.min(x, GRID_COLS - 1));
    y = Math.max(0, Math.min(y, GRID_ROWS - 1));
    
    return { x, y };
  };
  
  // 跨层位置追踪
  const globalPositionMap = new Map<string, boolean>();
  
  const xyKey = (x: number, y: number): string => {
    return `${snapToGrid(x).toFixed(2)},${snapToGrid(y).toFixed(2)}`;
  };
  
  const isPositionAvailable = (x: number, y: number): boolean => {
    const key = xyKey(x, y);
    return !globalPositionMap.has(key);
  };
  
  const markPositionUsed = (x: number, y: number): void => {
    const key = xyKey(x, y);
    globalPositionMap.set(key, true);
  };
  
  const OFFSET_OPTIONS = [
    { dx: 0.5, dy: 0 },
    { dx: -0.5, dy: 0 },
    { dx: 0, dy: 0.5 },
    { dx: 0, dy: -0.5 },
    { dx: 0.5, dy: 0.5 },
    { dx: -0.5, dy: 0.5 },
    { dx: 0.5, dy: -0.5 },
    { dx: -0.5, dy: -0.5 },
  ];
  
  const findValidPosition2 = (baseX: number, baseY: number, seed: number): { x: number, y: number } | null => {
    const snapX = snapToGrid(baseX);
    const snapY = snapToGrid(baseY);
    
    if (isPositionAvailable(snapX, snapY)) {
      markPositionUsed(snapX, snapY);
      return { x: snapX, y: snapY };
    }
    
    const shuffledOffsets = [...OFFSET_OPTIONS].sort((a, b) => {
      const valA = Math.sin(seed * 17 + a.dx * 31 + a.dy * 37);
      const valB = Math.sin(seed * 17 + b.dx * 31 + b.dy * 37);
      return valA - valB;
    });
    
    for (const offset of shuffledOffsets) {
      const newX = snapToGrid(baseX + offset.dx);
      const newY = snapToGrid(baseY + offset.dy);
      
      if (newX >= 0 && newX <= GRID_COLS - 1 && newY >= 0 && newY <= GRID_ROWS - 1) {
        if (isPositionAvailable(newX, newY)) {
          markPositionUsed(newX, newY);
          return { x: newX, y: newY };
        }
      }
    }
    
    const extendedOffsets = [-1, -0.75, -0.25, 0.25, 0.75, 1];
    for (const dx of extendedOffsets) {
      for (const dy of extendedOffsets) {
        if (dx === 0 && dy === 0) continue;
        const newX = snapToGrid(baseX + dx);
        const newY = snapToGrid(baseY + dy);
        if (newX >= 0 && newX <= GRID_COLS - 1 && newY >= 0 && newY <= GRID_ROWS - 1) {
          if (isPositionAvailable(newX, newY)) {
            markPositionUsed(newX, newY);
            return { x: newX, y: newY };
          }
        }
      }
    }
    
    return null;
  };
  
  // ========== 深井瓶颈布局（约30层） ==========
  // 关键策略：
  // 1. 底层（z=0~18）：19层 - 深埋每组三连的第3张"瓶颈"卡片
  // 2. 中层（z=19~26）：8层 - 高密度干扰填充层(Filler)
  // 3. 表层（z=27~29）：3层 - 表面可见的前2张卡片
  
  const DEEP_LAYER_START = 0;
  const DEEP_LAYER_END = 18;       // 底层 z=0~18 (19层)
  const SURFACE_LAYER_START = 27;
  const SURFACE_LAYER_END = 29;    // 表层 z=27~29 (3层)
  
  // 生成指定层范围的散点位置
  const generateLayerPositions = (count: number, minZ: number, maxZ: number): { x: number, y: number, z: number }[] => {
    const positions: { x: number, y: number, z: number }[] = [];
    let globalPosIndex = 0;
    
    const layerRange = maxZ - minZ + 1;
    const cardsPerLayer = Math.ceil(count / layerRange);
    
    for (let z = minZ; z <= maxZ && positions.length < count; z++) {
      const remaining = count - positions.length;
      const targetCount = Math.min(cardsPerLayer, remaining);
      
      for (let i = 0; i < targetCount; i++) {
        const pos = generateScatteredPosition(z, globalPosIndex);
        const validPos = findValidPosition2(pos.x, pos.y, z * 1000 + globalPosIndex);
        
        if (validPos) {
          positions.push({ x: validPos.x, y: validPos.y, z });
        }
        globalPosIndex++;
      }
    }
    
    return positions;
  };
  
  // 第一步：放置深埋层卡片（z=0~5，最底层）
  const buriedPositions = generateLayerPositions(remainingBuried.length, DEEP_LAYER_START, DEEP_LAYER_END);
  remainingBuried.forEach((card, idx) => {
    const pos = buriedPositions[idx];
    if (pos) {
      mainBlocks.push({
        id: generateId(),
        type: card.type,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        status: 'onMap',
        isLocked: false,
      });
    }
  });
  
  console.log(`[深井瓶颈] 底层(z=0~18): ${mainBlocks.length}张 (每组第3张埋在这里)`);
  
  // 第二步：放置表面层卡片（z=35~45，最顶层）
  const surfacePositions = generateLayerPositions(shuffledSurface.length, SURFACE_LAYER_START, SURFACE_LAYER_END);
  shuffledSurface.forEach((card, idx) => {
    const pos = surfacePositions[idx];
    if (pos) {
      mainBlocks.push({
        id: generateId(),
        type: card.type,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        status: 'onMap',
        isLocked: false,
      });
    }
  });
  
  console.log(`[深井瓶颈] 表层(z=27~29): ${shuffledSurface.length}张 (每组的2张在这里)`);
  
  // 第三步：中间填充层（z=19~26）用随机水果填充 - 共8层
  // 这些是"障碍物"，玩家必须挖穿它们才能拿到底层
  const FILLER_LAYER_START = 19;
  const FILLER_LAYER_END = 26;
  
  // 生成填充水果（必须是3的倍数，每种3张）
  const fillerCardPool: CardInfo[] = [];
  const fillerTriplets = Math.floor(Math.random() * 20) + 30; // 30-50组填充
  
  for (let t = 0; t < fillerTriplets; t++) {
    const fruitType = allFruits[t % allFruits.length];
    for (let i = 0; i < 3; i++) {
      fillerCardPool.push({ 
        type: fruitType, 
        layer: 'surface', // 不重要，只是填充
        tripletGroup: globalTripletGroup + t + 1 
      });
    }
  }
  
  const shuffledFiller = fillerCardPool.sort(() => Math.random() - 0.5);
  const fillerPositions = generateLayerPositions(shuffledFiller.length, FILLER_LAYER_START, FILLER_LAYER_END);
  
  shuffledFiller.forEach((card, idx) => {
    const pos = fillerPositions[idx];
    if (pos) {
      mainBlocks.push({
        id: generateId(),
        type: card.type,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        status: 'onMap',
        isLocked: false,
      });
    }
  });
  
  console.log(`[深井瓶颈] 填充层(z=6~34): ${shuffledFiller.length}张 (障碍物，必须挖穿)`);
  
  const totalCount = mainBlocks.length + leftStack.length + rightStack.length;
  console.log(`[Level 2 - 深井瓶颈] 总计: ${totalCount}张 (main: ${mainBlocks.length}, left: ${leftStack.length}, right: ${rightStack.length})`);
  console.log(`[Level 2 - 深井瓶颈] 是否3的倍数: ${totalCount % 3 === 0}`);
  
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
    if (state.boostersUsed.undo || state.slots.length === 0) return;
    
    // 撤回槽位里最后一张卡片（最右边的）
    const lastSlotBlock = state.slots[state.slots.length - 1];
    
    // 检查是来自地图还是盲盒堆
    const originalBlock = state.mapData.find(b => b.id === lastSlotBlock.id);
    const isFromBlindStack = lastSlotBlock.blindStackPosition !== undefined;
    
    // 从槽位移除最后一张
    const newSlots = state.slots.slice(0, -1);
    
    let updatedMapData = state.mapData;
    let newBlindStackLeft = state.blindStackLeft;
    let newBlindStackRight = state.blindStackRight;
    
    if (isFromBlindStack) {
      // 卡片来自盲盒堆，放回盲盒堆顶部
      const restoredBlock: FruitBlock = {
        ...lastSlotBlock,
        status: 'inBlindStack' as const,
        isLocked: false,
        blindStackIndex: 0,
      };
      
      if (lastSlotBlock.blindStackPosition === 'left') {
        // 将现有的盲盒堆卡片索引+1，isLocked状态更新
        newBlindStackLeft = [
          restoredBlock,
          ...state.blindStackLeft.map((b, idx) => ({
            ...b,
            blindStackIndex: idx + 1,
            isLocked: true, // 顶部以下都锁定
          }))
        ];
      } else {
        newBlindStackRight = [
          restoredBlock,
          ...state.blindStackRight.map((b, idx) => ({
            ...b,
            blindStackIndex: idx + 1,
            isLocked: true,
          }))
        ];
      }
    } else if (originalBlock) {
      // 卡片来自地图，放回原位置
      updatedMapData = state.mapData.map(b => 
        b.id === lastSlotBlock.id 
          ? { ...b, status: 'onMap' as const }
          : b
      );
    } else {
      // 找不到原始方块，无法撤回
      return;
    }
    
    const blocksWithLock = calculateLockStatus(updatedMapData);
    const remaining = blocksWithLock.filter(b => b.status === 'onMap').length +
      newBlindStackLeft.length + newBlindStackRight.length;
    
    set({
      mapData: blocksWithLock,
      slots: newSlots,
      blindStackLeft: newBlindStackLeft,
      blindStackRight: newBlindStackRight,
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
    
    // 保存历史记录以支持撤回
    const historyEntry: HistoryEntry = {
      block: { ...topBlock },
      previousSlots: [...state.slots],
    };
    
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
      historyStack: [...state.historyStack, historyEntry],
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
