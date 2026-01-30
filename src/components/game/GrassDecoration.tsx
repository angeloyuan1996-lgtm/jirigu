import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface GrassBlade {
  id: number;
  x: number;
  y: number;
  height: number;
  delay: number;
  rotation: number;
}

// 使用seeded random生成稳定的随机位置
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

const generateGrassBlades = (): GrassBlade[] => {
  const blades: GrassBlade[] = [];
  const count = 15; // 小草数量
  
  for (let i = 0; i < count; i++) {
    blades.push({
      id: i,
      x: seededRandom(i * 3 + 1) * 90 + 5, // 5% - 95%
      y: seededRandom(i * 3 + 2) * 80 + 10, // 10% - 90%
      height: 14 + seededRandom(i * 3 + 3) * 10, // 14-24px
      delay: seededRandom(i * 3 + 4) * 2, // 0-2s delay
      rotation: (seededRandom(i * 3 + 5) - 0.5) * 20, // -10 to 10 degrees
    });
  }
  
  return blades;
};

const GrassBladeSVG: React.FC<{ height: number }> = ({ height }) => (
  <svg 
    width={height * 0.5} 
    height={height} 
    viewBox="0 0 10 24" 
    fill="none"
    style={{ overflow: 'visible' }}
  >
    {/* 主草叶 */}
    <path
      d="M5 24 Q3 16 5 8 Q6 4 5 0"
      stroke="#5a8a3a"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    {/* 左侧小叶 */}
    <path
      d="M4 16 Q1 14 0 10"
      stroke="#6a9a4a"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
    {/* 右侧小叶 */}
    <path
      d="M6 12 Q9 10 10 6"
      stroke="#6a9a4a"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export const GrassDecoration: React.FC = () => {
  const grassBlades = useMemo(() => generateGrassBlades(), []);
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {grassBlades.map((blade) => (
        <motion.div
          key={blade.id}
          className="absolute origin-bottom"
          style={{
            left: `${blade.x}%`,
            top: `${blade.y}%`,
            transform: `rotate(${blade.rotation}deg)`,
          }}
          animate={{
            rotateZ: [blade.rotation, blade.rotation + 6, blade.rotation - 4, blade.rotation + 3, blade.rotation],
          }}
          transition={{
            duration: 3 + blade.delay,
            repeat: Infinity,
            ease: "easeInOut",
            delay: blade.delay,
          }}
        >
          <GrassBladeSVG height={blade.height} />
        </motion.div>
      ))}
    </div>
  );
};
