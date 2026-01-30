import React from 'react';
import { motion } from 'framer-motion';

interface GrassBlade {
  id: number;
  x: string;
  y: string;
  height: number;
  delay: number;
}

const grassBlades: GrassBlade[] = [
  // 左侧
  { id: 1, x: '5%', y: '15%', height: 20, delay: 0 },
  { id: 2, x: '8%', y: '35%', height: 16, delay: 0.3 },
  { id: 3, x: '3%', y: '55%', height: 18, delay: 0.6 },
  { id: 4, x: '10%', y: '75%', height: 14, delay: 0.2 },
  // 右侧
  { id: 5, x: '92%', y: '20%', height: 18, delay: 0.4 },
  { id: 6, x: '95%', y: '40%', height: 22, delay: 0.1 },
  { id: 7, x: '88%', y: '60%', height: 16, delay: 0.5 },
  { id: 8, x: '93%', y: '80%', height: 20, delay: 0.7 },
  // 底部角落
  { id: 9, x: '15%', y: '88%', height: 14, delay: 0.25 },
  { id: 10, x: '85%', y: '90%', height: 16, delay: 0.45 },
];

const GrassBladeSVG: React.FC<{ height: number }> = ({ height }) => (
  <svg 
    width={height * 0.6} 
    height={height} 
    viewBox="0 0 12 24" 
    fill="none"
    style={{ overflow: 'visible' }}
  >
    {/* 主草叶 */}
    <path
      d="M6 24 Q4 16 6 8 Q7 4 6 0"
      stroke="#5a8a3a"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
    {/* 左侧小叶 */}
    <path
      d="M5 14 Q2 12 1 8"
      stroke="#6a9a4a"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    {/* 右侧小叶 */}
    <path
      d="M7 10 Q10 8 11 4"
      stroke="#6a9a4a"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export const GrassDecoration: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {grassBlades.map((blade) => (
        <motion.div
          key={blade.id}
          className="absolute origin-bottom"
          style={{
            left: blade.x,
            top: blade.y,
          }}
          animate={{
            rotateZ: [0, 8, -5, 6, -3, 0],
          }}
          transition={{
            duration: 4,
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
