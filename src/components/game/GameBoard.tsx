import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { FruitCard } from './FruitCard';

const BLOCK_SIZE = 48;
const GRID_COLS = 8;
const GRID_ROWS = 8;

export const GameBoard: React.FC = () => {
  const { mapData, clickBlock } = useGameStore();
  
  const visibleBlocks = mapData.filter(b => b.status === 'onMap');
  
  const boardWidth = GRID_COLS * BLOCK_SIZE + BLOCK_SIZE;
  const boardHeight = GRID_ROWS * BLOCK_SIZE + BLOCK_SIZE;
  
  return (
    <div className="relative flex items-center justify-center">
      {/* Game area background */}
      <div 
        className="relative rounded-2xl"
        style={{ 
          width: boardWidth + 20, 
          height: boardHeight + 20,
        }}
      >
        {/* Block container */}
        <div 
          className="relative mx-auto"
          style={{ 
            width: boardWidth, 
            height: boardHeight,
          }}
        >
          <AnimatePresence>
            {visibleBlocks.map(block => (
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
