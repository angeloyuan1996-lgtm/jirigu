import React, { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { FruitCard } from './FruitCard';

const BLOCK_SIZE = 44; // Slightly smaller for mobile
const GRID_COLS = 7;
const GRID_ROWS = 8;

export const GameBoard: React.FC = () => {
  const { mapData, clickBlock } = useGameStore();
  
  const visibleBlocks = mapData.filter(b => b.status === 'onMap');
  
  // Calculate dynamic sizing based on viewport
  const boardWidth = GRID_COLS * BLOCK_SIZE;
  const boardHeight = GRID_ROWS * BLOCK_SIZE;
  
  // Normalize block positions to ensure they stay within bounds
  const normalizedBlocks = useMemo(() => {
    return visibleBlocks.map(block => {
      // Clamp x and y to stay within the grid bounds
      const clampedX = Math.max(0, Math.min(block.x, GRID_COLS - 1));
      const clampedY = Math.max(0, Math.min(block.y, GRID_ROWS - 1));
      
      return {
        ...block,
        x: clampedX,
        y: clampedY,
      };
    });
  }, [visibleBlocks]);
  
  return (
    <div className="relative flex items-center justify-center overflow-hidden">
      {/* Game area container with padding */}
      <div 
        className="relative rounded-2xl"
        style={{ 
          width: boardWidth + 16, 
          height: boardHeight + 16,
          padding: 8,
        }}
      >
        {/* Block container - clips overflow */}
        <div 
          className="relative overflow-hidden"
          style={{ 
            width: boardWidth, 
            height: boardHeight,
          }}
        >
          <AnimatePresence>
            {normalizedBlocks.map(block => (
              <FruitCard
                key={block.id}
                block={block}
                onClick={() => clickBlock(block.id)}
                size={BLOCK_SIZE}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
