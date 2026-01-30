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
  
  // ========== Level 2: 整齐网格布局 ==========
  // 核心：卡片排列整齐，只在 1/4 或 1/2 位置偏移
  // 类似原版羊了个羊的整齐堆叠效果
  
  const BLIND_STACK_SIZE = 10;
  const NUM_FRUIT_TYPES = 14;
  
  // ===== 生成水果池 =====
  const shuffledFruits = [...ALL_FRUITS].sort(() => Math.random() - 0.5);
  const allFruits = shuffledFruits.slice(0, NUM_FRUIT_TYPES);
  const easyFruits = allFruits.slice(0, 4);
  const hellFruits = allFruits;
  
  interface CardInfo {
    type: FruitType;
    layer: 'top' | 'middle' | 'bottom';
  }
  
  const totalCardPool: CardInfo[] = [];
  
  // 顶层（诱导层）
  easyFruits.forEach((fruitType) => {
    const triplets = Math.floor(Math.random() * 2) + 1;
    for (let t = 0; t < triplets; t++) {
      for (let i = 0; i < 3; i++) {
        totalCardPool.push({ type: fruitType, layer: 'top' });
      }
    }
  });
  
  // 中层（地狱层）
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
  
  const topCards = totalCardPool.filter(c => c.layer === 'top');
  const middleCards = totalCardPool.filter(c => c.layer === 'middle');
  const bottomCards = totalCardPool.filter(c => c.layer === 'bottom');
  
  const shuffledTop = [...topCards].sort(() => Math.random() - 0.5);
  const shuffledMiddle = [...middleCards].sort(() => Math.random() - 0.5);
  const shuffledBottom = [...bottomCards].sort(() => Math.random() - 0.5);
  
  console.log(`[Level 2 - 视觉陷阱] 顶层(诱导): ${topCards.length}张 (${easyFruits.length}种水果)`);
  console.log(`[Level 2 - 视觉陷阱] 中层(地狱): ${middleCards.length}张 (${hellFruits.length}种水果)`);
  console.log(`[Level 2 - 视觉陷阱] 底层: ${bottomCards.length}张`);
  
  // 盲盒堆
  const nonTopPool = [...shuffledBottom, ...shuffledMiddle].sort(() => Math.random() - 0.5);
  const leftStackCards = nonTopPool.splice(0, BLIND_STACK_SIZE);
  const rightStackCards = nonTopPool.splice(0, BLIND_STACK_SIZE);
  const mainAreaCards = [...nonTopPool, ...shuffledTop];
  
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
  // 核心规则：
  // 1. 遮住一半 = X或Y方向偏移0.5
  // 2. 遮住一个角 = X和Y方向都偏移0.5
  // 3. 不规则外形 = 随机跳过某些位置，边缘参差不齐
  
  const mainBlocks: FruitBlock[] = [];
  
  // 基础网格尺寸（整数坐标）
  const BASE_GRID_COLS = 7;
  const BASE_GRID_ROWS = 8;
  
  // 羊了个羊式遮挡模式
  type OverlapMode = 'half-x' | 'half-y' | 'corner';
  
  // 大幅增加"一角遮挡"(corner)的比例 - 70%是corner，30%是half
  const getRandomOverlapMode = (seed: number): OverlapMode => {
    const rand = Math.sin(seed * 13.7) * 0.5 + 0.5;
    if (rand < 0.7) return 'corner'; // 70% corner
    if (rand < 0.85) return 'half-x'; // 15% half-x
    return 'half-y'; // 15% half-y
  };
  
  // 根据层级和随机种子获取偏移量（更随机化）
  const getLayerOffset = (layerIndex: number, posIndex: number): { dx: number, dy: number } => {
    const seed = layerIndex * 31 + posIndex * 7;
    const pattern = getRandomOverlapMode(seed);
    
    // 随机决定偏移方向（正或负）
    const dirX = Math.sin(seed * 17) > 0 ? 1 : -1;
    const dirY = Math.sin(seed * 23) > 0 ? 1 : -1;
    
    switch (pattern) {
      case 'half-x':
        return { dx: 0.5 * dirX, dy: 0 };
      case 'half-y':
        return { dx: 0, dy: 0.5 * dirY };
      case 'corner':
        return { dx: 0.5 * dirX, dy: 0.5 * dirY };
      default:
        return { dx: 0.5 * dirX, dy: 0.5 * dirY };
    }
  };
  
  // 生成不规则形状掩码 - 决定哪些位置要跳过
  const generateIrregularMask = (cols: number, rows: number, layerIndex: number): boolean[][] => {
    const mask: boolean[][] = [];
    const seed = layerIndex * 17 + 42; // 伪随机种子
    
    for (let row = 0; row < rows; row++) {
      mask[row] = [];
      for (let col = 0; col < cols; col++) {
        // 中心区域更密集，边缘更稀疏
        const distFromCenterX = Math.abs(col - cols / 2) / (cols / 2);
        const distFromCenterY = Math.abs(row - rows / 2) / (rows / 2);
        const distFromCenter = Math.max(distFromCenterX, distFromCenterY);
        
        // 边缘有更高概率被跳过
        const skipProbability = distFromCenter > 0.7 ? 0.5 : (distFromCenter > 0.5 ? 0.3 : 0.15);
        
        // 使用确定性随机（基于位置和层级）
        const randomValue = Math.sin(seed + col * 7 + row * 13) * 0.5 + 0.5;
        
        // 如果是边角，增加跳过概率
        const isCorner = (col === 0 || col === cols - 1) && (row === 0 || row === rows - 1);
        const isEdge = col === 0 || col === cols - 1 || row === 0 || row === rows - 1;
        
        let shouldSkip = false;
        if (isCorner) {
          shouldSkip = randomValue < 0.6; // 角落60%跳过
        } else if (isEdge) {
          shouldSkip = randomValue < skipProbability + 0.2; // 边缘额外20%
        } else {
          shouldSkip = randomValue < skipProbability;
        }
        
        // 每层使用不同的跳过模式
        if (layerIndex % 2 === 0) {
          // 偶数层：棋盘格式稀疏
          if ((col + row) % 3 === 0) shouldSkip = shouldSkip || randomValue < 0.3;
        } else {
          // 奇数层：对角线式稀疏
          if (Math.abs(col - row) % 4 === 0) shouldSkip = shouldSkip || randomValue < 0.25;
        }
        
        mask[row][col] = !shouldSkip;
      }
    }
    
    return mask;
  };
  
  // ========== 跨层位置追踪系统 ==========
  // 使用 coordKey 作为唯一键（只看x,y，忽略z），确保不同层的卡片不会完全重叠
  const globalPositionMap = new Map<string, boolean>();
  
  // 生成只包含 x,y 的键（用于跨层检测）
  const xyKey = (x: number, y: number): string => {
    return `${snapToGrid(x).toFixed(2)},${snapToGrid(y).toFixed(2)}`;
  };
  
  // 检查位置是否有效（不与任何层的任何卡片完全重叠）
  const isPositionAvailable = (x: number, y: number): boolean => {
    const key = xyKey(x, y);
    return !globalPositionMap.has(key);
  };
  
  // 标记位置已使用（内部函数，由 findValidPosition2 调用）
  const markPositionUsed = (x: number, y: number): void => {
    const key = xyKey(x, y);
    globalPositionMap.set(key, true);
  };
  
  // 强制偏移量列表 - 必须偏移0.5单位，产生"半边"或"角"遮挡
  const OFFSET_OPTIONS = [
    { dx: 0.5, dy: 0 },      // 右半
    { dx: -0.5, dy: 0 },     // 左半
    { dx: 0, dy: 0.5 },      // 下半
    { dx: 0, dy: -0.5 },     // 上半
    { dx: 0.5, dy: 0.5 },    // 右下角
    { dx: -0.5, dy: 0.5 },   // 左下角
    { dx: 0.5, dy: -0.5 },   // 右上角
    { dx: -0.5, dy: -0.5 },  // 左上角
  ];
  
  // 找到一个有效位置（如果原位置被占用，则强制偏移0.5）
  // 重要：找到后立即标记，防止同层重复！
  const findValidPosition2 = (baseX: number, baseY: number, seed: number): { x: number, y: number } | null => {
    const snapX = snapToGrid(baseX);
    const snapY = snapToGrid(baseY);
    
    // 首先检查原位置是否可用
    if (isPositionAvailable(snapX, snapY)) {
      // 立即标记！这是关键！
      markPositionUsed(snapX, snapY);
      return { x: snapX, y: snapY };
    }
    
    // 原位置被占用，必须偏移！使用伪随机打乱偏移顺序
    const shuffledOffsets = [...OFFSET_OPTIONS].sort((a, b) => {
      const valA = Math.sin(seed * 17 + a.dx * 31 + a.dy * 37);
      const valB = Math.sin(seed * 17 + b.dx * 31 + b.dy * 37);
      return valA - valB;
    });
    
    for (const offset of shuffledOffsets) {
      const newX = snapToGrid(baseX + offset.dx);
      const newY = snapToGrid(baseY + offset.dy);
      
      // 确保在边界内
      if (newX >= 0 && newX <= GRID_COLS - 1 && newY >= 0 && newY <= GRID_ROWS - 1) {
        if (isPositionAvailable(newX, newY)) {
          // 立即标记！
          markPositionUsed(newX, newY);
          return { x: newX, y: newY };
        }
      }
    }
    
    // 如果0.5偏移都不行，尝试更大范围（0.25, 0.75, 1.0）
    const extendedOffsets = [-1, -0.75, -0.25, 0.25, 0.75, 1];
    for (const dx of extendedOffsets) {
      for (const dy of extendedOffsets) {
        if (dx === 0 && dy === 0) continue;
        const newX = snapToGrid(baseX + dx);
        const newY = snapToGrid(baseY + dy);
        if (newX >= 0 && newX <= GRID_COLS - 1 && newY >= 0 && newY <= GRID_ROWS - 1) {
          if (isPositionAvailable(newX, newY)) {
            // 立即标记！
            markPositionUsed(newX, newY);
            return { x: newX, y: newY };
          }
        }
      }
    }
    
    return null;
  };
  
  // 生成"乱中有序"的网格位置 - 避免整齐并排，强制错位遮挡
  const generateChaoticGridPositions = (count: number, baseZ: number): { x: number, y: number, z: number }[] => {
    const positions: { x: number, y: number, z: number }[] = [];
    let currentZ = baseZ;
    let globalPosIndex = 0;
    
    while (positions.length < count) {
      const layerIndex = currentZ - baseZ;
      
      // 生成当前层的不规则掩码
      const mask = generateIrregularMask(BASE_GRID_COLS, BASE_GRID_ROWS, layerIndex);
      
      // 收集这层所有有效位置（使用散点布局避免并排）
      const layerPositions: { x: number, y: number }[] = [];
      
      for (let row = 0; row < BASE_GRID_ROWS; row++) {
        for (let col = 0; col < BASE_GRID_COLS; col++) {
          if (!mask[row][col]) continue;
          
          // 使用1.5间距的稀疏网格（避免并排）
          const sparseRow = row % 2;
          const sparseCol = col % 2;
          
          // 棋盘式稀疏
          const layerOffset = layerIndex % 2;
          const shouldPlace = (sparseRow + sparseCol + layerOffset) % 2 === 0;
          
          if (!shouldPlace && Math.sin(layerIndex * 7 + col * 13 + row * 17) > -0.3) {
            continue;
          }
          
          // 每张卡片独立获取随机偏移
          const { dx, dy } = getLayerOffset(layerIndex, col * 100 + row);
          
          // 基础位置
          const baseX = col * 1.0;
          const baseY = row * 1.0;
          
          // 添加随机抖动（0 或 0.5）
          const jitterX = Math.sin(layerIndex * 23 + col * 7 + row * 11) > 0 ? 0.5 : 0;
          const jitterY = Math.sin(layerIndex * 29 + col * 11 + row * 7) > 0 ? 0.5 : 0;
          
          let candidateX = baseX + dx + jitterX;
          let candidateY = baseY + dy + jitterY;
          
          // 确保在边界内
          candidateX = Math.max(0, Math.min(candidateX, GRID_COLS - 1));
          candidateY = Math.max(0, Math.min(candidateY, GRID_ROWS - 1));
          
          // 找到一个不与其他层完全重叠的位置
          const seed = currentZ * 1000 + col * 100 + row;
          const validPos = findValidPosition2(candidateX, candidateY, seed);
          
          if (validPos) {
            layerPositions.push(validPos);
          }
        }
      }
      
      // 随机打乱这层的位置顺序
      layerPositions.sort(() => Math.sin(currentZ * 31 + globalPosIndex * 7) - 0.5);
      
      // 添加位置（位置已在 findValidPosition2 中标记过了）
      for (const pos of layerPositions) {
        if (positions.length >= count) break;
        positions.push({ x: pos.x, y: pos.y, z: currentZ });
        globalPosIndex++;
      }
      
      currentZ++;
    }
    
    return positions;
  };
  
  // 分类主区域卡片
  const mainBottom = mainAreaCards.filter(c => c.layer === 'bottom');
  const mainMiddle = mainAreaCards.filter(c => c.layer === 'middle');
  const mainTop = mainAreaCards.filter(c => c.layer === 'top');
  
  // 底层：z = 0 开始
  const bottomPositions = generateChaoticGridPositions(mainBottom.length, 0);
  mainBottom.forEach((card, idx) => {
    const pos = bottomPositions[idx];
    mainBlocks.push({
      id: generateId(),
      type: card.type,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      status: 'onMap',
      isLocked: false,
    });
  });
  
  const maxBottomZ = Math.max(...mainBlocks.map(b => b.z), 0);
  
  // 中层：紧接底层
  const middlePositions = generateChaoticGridPositions(mainMiddle.length, maxBottomZ + 1);
  mainMiddle.forEach((card, idx) => {
    const pos = middlePositions[idx];
    mainBlocks.push({
      id: generateId(),
      type: card.type,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      status: 'onMap',
      isLocked: false,
    });
  });
  
  const maxMiddleZ = Math.max(...mainBlocks.map(b => b.z), 0);
  
  // 顶层：最上面
  const topPositions = generateChaoticGridPositions(mainTop.length, maxMiddleZ + 1);
  mainTop.forEach((card, idx) => {
    const pos = topPositions[idx];
    mainBlocks.push({
      id: generateId(),
      type: card.type,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      status: 'onMap',
      isLocked: false,
    });
  });
  
  const totalCount = mainBlocks.length + leftStack.length + rightStack.length;
  console.log(`[Level 2] Total cards: ${totalCount} (main: ${mainBlocks.length}, left: ${leftStack.length}, right: ${rightStack.length})`);
  console.log(`[Level 2] Is multiple of 3: ${totalCount % 3 === 0}`);
  console.log(`[Level 2] Grid alignment: Neat 1/4 and 1/2 offsets only`);
  
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
    
    // 从 mapData 中找到原始方块（保留了原始 x, y, z 坐标）
    const originalBlock = state.mapData.find(b => b.id === lastSlotBlock.id);
    if (!originalBlock) return;
    
    // 从槽位移除最后一张
    const newSlots = state.slots.slice(0, -1);
    
    // 将该卡片放回地图原位置（使用 mapData 中保存的原始坐标）
    const updatedMapData = state.mapData.map(b => 
      b.id === lastSlotBlock.id 
        ? { ...b, status: 'onMap' as const }
        : b
    );
    
    const blocksWithLock = calculateLockStatus(updatedMapData);
    const remaining = blocksWithLock.filter(b => b.status === 'onMap').length;
    
    set({
      mapData: blocksWithLock,
      slots: newSlots,
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
