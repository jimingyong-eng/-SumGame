/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Timer, 
  RotateCcw, 
  Play, 
  Pause, 
  AlertCircle,
  Hash,
  Zap,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants ---
const COLS = 6;
const ROWS = 10;
const INITIAL_ROWS = 4;
const TARGET_MIN = 10;
const TARGET_MAX = 25;
const TIME_MODE_LIMIT = 15; // seconds

type GameMode = 'classic' | 'time';

interface Block {
  id: string;
  value: number;
  isSelected: boolean;
}

// --- Components ---

export default function App() {
  const [grid, setGrid] = useState<(Block | null)[][]>([]);
  const [target, setTarget] = useState<number>(0);
  const [score, setScore] = useState(0);
  const [mode, setMode] = useState<GameMode>('classic');
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
  const [timeLeft, setTimeLeft] = useState(TIME_MODE_LIMIT);
  const [highScore, setHighScore] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Grid
  const initGame = useCallback((selectedMode: GameMode) => {
    const newGrid: (Block | null)[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    
    // Fill initial rows from the bottom
    for (let r = ROWS - 1; r >= ROWS - INITIAL_ROWS; r--) {
      for (let c = 0; c < COLS; c++) {
        newGrid[r][c] = {
          id: Math.random().toString(36).substr(2, 9),
          value: Math.floor(Math.random() * 9) + 1,
          isSelected: false
        };
      }
    }
    
    setGrid(newGrid);
    setTarget(generateTarget());
    setScore(0);
    setMode(selectedMode);
    setGameState('playing');
    setTimeLeft(TIME_MODE_LIMIT);
  }, []);

  const generateTarget = () => Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN;

  const addRow = useCallback(() => {
    setGrid(prevGrid => {
      // Check if top row has any blocks
      if (prevGrid[0].some(cell => cell !== null)) {
        setGameState('gameover');
        return prevGrid;
      }

      const newGrid = [...prevGrid.map(row => [...row])];
      // Shift everything up
      for (let r = 0; r < ROWS - 1; r++) {
        newGrid[r] = newGrid[r + 1];
      }
      
      // Add new row at the bottom
      newGrid[ROWS - 1] = Array(COLS).fill(null).map(() => ({
        id: Math.random().toString(36).substr(2, 9),
        value: Math.floor(Math.random() * 9) + 1,
        isSelected: false
      }));

      return newGrid;
    });
  }, []);

  // Timer logic for Time Mode
  useEffect(() => {
    if (gameState === 'playing' && mode === 'time') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            addRow();
            return TIME_MODE_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, mode, addRow]);

  const handleBlockClick = (r: number, c: number) => {
    if (gameState !== 'playing') return;
    
    const block = grid[r][c];
    if (!block) return;

    const newGrid = [...grid.map(row => [...row])];
    newGrid[r][c] = { ...block, isSelected: !block.isSelected };
    
    // Calculate current sum
    const selectedBlocks: {r: number, c: number, val: number}[] = [];
    newGrid.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (cell?.isSelected) {
          selectedBlocks.push({ r: ri, c: ci, val: cell.value });
        }
      });
    });

    const currentSum = selectedBlocks.reduce((acc, b) => acc + b.val, 0);

    if (currentSum === target) {
      // Success!
      selectedBlocks.forEach(b => {
        newGrid[b.r][b.c] = null;
      });
      
      // Apply gravity
      for (let col = 0; col < COLS; col++) {
        let emptyRow = ROWS - 1;
        for (let row = ROWS - 1; row >= 0; row--) {
          if (newGrid[row][col] !== null) {
            const temp = newGrid[row][col];
            newGrid[row][col] = null;
            newGrid[emptyRow][col] = temp;
            emptyRow--;
          }
        }
      }

      setGrid(newGrid);
      setScore(prev => prev + (selectedBlocks.length * 10));
      setTarget(generateTarget());
      if (mode === 'classic') {
        addRow();
      } else {
        setTimeLeft(TIME_MODE_LIMIT); // Reset timer on success in time mode
      }
      
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7']
      });
    } else if (currentSum > target) {
      // Exceeded target, deselect all
      newGrid.forEach((row, ri) => {
        row.forEach((cell, ci) => {
          if (cell) cell.isSelected = false;
        });
      });
      setGrid(newGrid);
    } else {
      setGrid(newGrid);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('sumstack-highscore');
    if (stored) setHighScore(parseInt(stored));
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('sumstack-highscore', score.toString());
    }
  }, [score, highScore]);

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header / Stats */}
      <header className="max-w-md mx-auto pt-8 px-6 flex flex-col gap-6">
        <div className="flex justify-between items-end border-b border-[#141414] pb-4">
          <div>
            <h1 className="font-serif italic text-3xl tracking-tight leading-none">数合堆</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold mt-1">
              {mode === 'classic' ? '经典模式' : '计时冲刺'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest opacity-50 font-bold">最高分</div>
            <div className="font-mono text-xl tabular-nums">{highScore.toString().padStart(6, '0')}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard 
            label="目标" 
            value={target} 
            icon={<Hash size={14} />} 
            highlight 
          />
          <StatCard 
            label="得分" 
            value={score} 
            icon={<Trophy size={14} />} 
          />
          <StatCard 
            label={mode === 'classic' ? '状态' : '时间'} 
            value={mode === 'classic' ? '进行中' : `${timeLeft}秒`} 
            icon={mode === 'classic' ? <Zap size={14} /> : <Timer size={14} />}
            alert={mode === 'time' && timeLeft <= 5}
          />
        </div>
      </header>

      {/* Game Board */}
      <main className="max-w-md mx-auto mt-8 px-6 pb-12 relative">
        <div className="aspect-[6/10] w-full bg-[#D6D5D2] border-2 border-[#141414] relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
          {/* Grid Lines */}
          <div className="absolute inset-0 grid grid-cols-6 pointer-events-none">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="border-r border-[#141414]/10 last:border-0" />
            ))}
          </div>
          <div className="absolute inset-0 grid grid-rows-10 pointer-events-none">
            {Array(10).fill(0).map((_, i) => (
              <div key={i} className="border-b border-[#141414]/10 last:border-0" />
            ))}
          </div>

          {/* Blocks */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-10 p-1 gap-1">
            <AnimatePresence>
              {grid.map((row, r) => 
                row.map((block, c) => block && (
                  <motion.button
                    key={block.id}
                    layoutId={block.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    onClick={() => handleBlockClick(r, c)}
                    className={cn(
                      "relative flex items-center justify-center text-xl font-bold transition-all duration-100",
                      "border-2 border-[#141414] rounded-sm",
                      block.isSelected 
                        ? "bg-[#141414] text-[#E4E3E0] shadow-[inset_2px_2px_0px_rgba(255,255,255,0.2)]" 
                        : "bg-white text-[#141414] hover:bg-[#F0F0F0] active:translate-y-0.5"
                    )}
                    style={{
                      gridRow: r + 1,
                      gridColumn: c + 1
                    }}
                  >
                    {block.value}
                  </motion.button>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Overlays */}
          <AnimatePresence>
            {gameState === 'menu' && (
              <Overlay key="menu">
                <h2 className="font-serif italic text-4xl mb-8">选择模式</h2>
                <div className="flex flex-col gap-4 w-full px-12">
                  <MenuButton 
                    onClick={() => initGame('classic')}
                    title="经典模式"
                    description="每次成功后新增一行"
                    icon={<ChevronRight size={18} />}
                  />
                  <MenuButton 
                    onClick={() => initGame('time')}
                    title="计时冲刺"
                    description="每轮15秒。别让时间耗尽！"
                    icon={<Timer size={18} />}
                  />
                </div>
              </Overlay>
            )}

            {gameState === 'gameover' && (
              <Overlay key="gameover" variant="dark">
                <AlertCircle size={48} className="text-[#E4E3E0] mb-4" />
                <h2 className="font-serif italic text-4xl mb-2 text-[#E4E3E0]">游戏结束</h2>
                <p className="text-[#E4E3E0] opacity-70 mb-8 font-mono">最终得分: {score}</p>
                <button 
                  onClick={() => setGameState('menu')}
                  className="bg-[#E4E3E0] text-[#141414] px-8 py-3 font-bold uppercase tracking-widest text-sm border-2 border-[#141414] hover:bg-white transition-colors flex items-center gap-2"
                >
                  <RotateCcw size={16} /> 再试一次
                </button>
              </Overlay>
            )}

            {gameState === 'paused' && (
              <Overlay key="paused">
                <h2 className="font-serif italic text-4xl mb-8">已暂停</h2>
                <button 
                  onClick={() => setGameState('playing')}
                  className="bg-[#141414] text-[#E4E3E0] px-8 py-3 font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Play size={16} /> 继续游戏
                </button>
              </Overlay>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-6 flex justify-between items-center">
          <button 
            onClick={() => setGameState(prev => prev === 'playing' ? 'paused' : 'playing')}
            className="p-3 border-2 border-[#141414] hover:bg-white transition-colors"
            disabled={gameState === 'menu' || gameState === 'gameover'}
          >
            {gameState === 'paused' ? <Play size={20} /> : <Pause size={20} />}
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setGameState('menu')}
              className="px-4 py-2 border-2 border-[#141414] font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-md mx-auto px-6 pb-12 text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 text-center">
        选择数字以达到目标和 • 别让方块触顶
      </footer>
    </div>
  );
}

function StatCard({ label, value, icon, highlight = false, alert = false }: { 
  label: string, 
  value: string | number, 
  icon: React.ReactNode,
  highlight?: boolean,
  alert?: boolean
}) {
  return (
    <div className={cn(
      "border-2 border-[#141414] p-3 flex flex-col gap-1 transition-colors",
      highlight ? "bg-white" : "bg-transparent",
      alert && "bg-red-500 text-white border-red-600 animate-pulse"
    )}>
      <div className="flex items-center gap-1.5 opacity-60">
        {icon}
        <span className="text-[9px] uppercase tracking-widest font-black">{label}</span>
      </div>
      <div className="font-mono text-2xl font-bold leading-none">{value}</div>
    </div>
  );
}

function MenuButton({ onClick, title, description, icon }: { 
  onClick: () => void, 
  title: string, 
  description: string,
  icon: React.ReactNode 
}) {
  return (
    <button 
      onClick={onClick}
      className="group flex items-center justify-between p-4 border-2 border-[#141414] bg-white hover:bg-[#141414] hover:text-[#E4E3E0] transition-all text-left"
    >
      <div>
        <div className="font-serif italic text-xl leading-none mb-1">{title}</div>
        <div className="text-[10px] uppercase tracking-wider opacity-60 font-bold">{description}</div>
      </div>
      <div className="translate-x-0 group-hover:translate-x-1 transition-transform">
        {icon}
      </div>
    </button>
  );
}

function Overlay({ children, variant = 'light' }: { children: React.ReactNode, variant?: 'light' | 'dark', key?: React.Key }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm",
        variant === 'light' ? "bg-[#E4E3E0]/90" : "bg-[#141414]/95"
      )}
    >
      {children}
    </motion.div>
  );
}
