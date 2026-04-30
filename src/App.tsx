import React, { useEffect, useReducer } from 'react';
import { RefreshCw, Trophy, Skull } from 'lucide-react';
import { EASY_WORDS, MEDIUM_WORDS, HARD_WORDS } from './words';
import { audio } from './audio';

type CellColor = 'GREEN' | 'YELLOW' | 'GRAY' | 'UNLANDED';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface Block {
  char: string;
  color: CellColor;
}

interface Piece {
  char: string;
  x: number;
  y: number;
}

interface GameState {
  grid: (Block | null)[][];
  activePiece: Piece | null;
  targetWord: string;
  status: 'START' | 'PLAYING' | 'WON' | 'LOSS';
  score: number;
  difficulty: Difficulty;
}

type Action =
  | { type: 'START_GAME' }
  | { type: 'SET_DIFFICULTY', difficulty: Difficulty }
  | { type: 'SHOW_MENU' }
  | { type: 'TICK' }
  | { type: 'MOVE', dx: number, dy: number }
  | { type: 'HARD_DROP' };

const getRandomWord = (diff: Difficulty) => {
  const words = diff === 'EASY' ? EASY_WORDS : diff === 'MEDIUM' ? MEDIUM_WORDS : HARD_WORDS;
  return words[Math.floor(Math.random() * words.length)];
};

const getNeededLetters = (target: string, grid: (Block | null)[][]) => {
  const needed: string[] = [];
  for (let c = 0; c < 5; c++) {
    if (!grid.some(row => row[c]?.color === 'GREEN')) {
      needed.push(target[c]);
    }
  }
  return needed.length > 0 ? needed : [target[0]];
};

const getRandomLetter = (neededLetters: string[]) => {
  const r = Math.random();
  // 50% chance to drop letters you actually need
  if (r < 0.50) return neededLetters[Math.floor(Math.random() * neededLetters.length)];
  if (r < 0.65) {
    const v = "AEIOU";
    return v[Math.floor(Math.random() * v.length)];
  }
  return String.fromCharCode(65 + Math.floor(Math.random() * 26));
};

const createEmptyGrid = () => Array(10).fill(null).map(() => Array(5).fill(null));

const lockPiece = (state: GameState, pieceToLock: Piece): GameState => {
  const { char, x, y } = pieceToLock;
  let color: CellColor = 'GRAY';
  
  if (state.targetWord[x] === char) {
    color = 'GREEN';
  } else if (state.targetWord.includes(char)) {
    color = 'YELLOW';
  }

  const newGrid = state.grid.map(row => [...row]);
  newGrid[y][x] = { char, color };

  let won = true;
  for (let c = 0; c < 5; c++) {
    let hasGreen = false;
    for (let r = 0; r < 10; r++) {
      if (newGrid[r][c]?.color === 'GREEN') hasGreen = true;
    }
    if (!hasGreen) won = false;
  }

  let lost = false;
  for (let c = 0; c < 5; c++) {
    if (newGrid[0][c] !== null) lost = true;
  }

  if (won) {
    return { ...state, grid: newGrid, status: 'WON', score: state.score + 500, activePiece: null };
  } else if (lost) {
    return { ...state, grid: newGrid, status: 'LOSS', activePiece: null };
  }

  const neededLetters = getNeededLetters(state.targetWord, newGrid);
  const newPiece = { char: getRandomLetter(neededLetters), x: 2, y: 0 };
  let newLost = false;
  if (newGrid[0][2] !== null) {
      newLost = true;
  }

  const nextScore = state.score + (color === 'GREEN' ? 100 : color === 'YELLOW' ? 20 : 0);

  return {
    ...state,
    grid: newGrid,
    status: newLost ? 'LOSS' : 'PLAYING',
    activePiece: newLost ? null : newPiece,
    score: nextScore
  };
};

const reducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.difficulty };
    case 'SHOW_MENU':
      return { ...state, status: 'START' };
    case 'START_GAME': {
      const newWord = getRandomWord(state.difficulty);
      const neededLetters = newWord.split('');
      return {
        ...state,
        grid: createEmptyGrid(),
        targetWord: newWord,
        activePiece: { char: getRandomLetter(neededLetters), x: 2, y: 0 },
        status: 'PLAYING',
        score: 0
      };
    }
    case 'TICK':
    case 'MOVE': {
      if (state.status !== 'PLAYING' || !state.activePiece) return state;
      const dx = action.type === 'MOVE' ? action.dx : 0;
      const dy = action.type === 'MOVE' ? action.dy : 1;
      
      const { x, y, char } = state.activePiece;
      const nx = x + dx;
      const ny = y + dy;

      let collides = false;
      if (nx < 0 || nx > 4) collides = true;
      if (!collides && ny > 9) collides = true;
      if (!collides && state.grid[ny][nx] !== null) collides = true;

      if (collides) {
        if (dy > 0 && dx === 0) {
          // Locked falling piece
          return lockPiece(state, state.activePiece);
        } else {
          // Invalid lateral move, do nothing
          return state;
        }
      }
      return { ...state, activePiece: { ...state.activePiece, x: nx, y: ny } };
    }
    case 'HARD_DROP': {
      if (state.status !== 'PLAYING' || !state.activePiece) return state;
      let p = { ...state.activePiece };
      while (p.y < 9 && state.grid[p.y + 1][p.x] === null) {
        p.y += 1;
      }
      return lockPiece(state, p);
    }
    default:
      return state;
  }
};

const getCellStyles = (color?: CellColor) => {
  switch(color) {
    case 'GREEN': return 'bg-[#00ffcc] border-2 border-[#00ffcc]/80 text-black shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]';
    case 'YELLOW': return 'bg-yellow-500 border-2 border-yellow-300 text-black shadow-[inset_0_0_10px_rgba(0,0,0,0.4)]';
    case 'GRAY': return 'bg-purple-700 border-2 border-purple-500 text-white shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]';
    case 'UNLANDED': return 'bg-[#ff00ff] border-2 border-[#ffb3ff] text-white shadow-[0_0_15px_rgba(255,0,255,0.6)] z-10';
    default: return 'bg-transparent';
  }
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, {
    grid: createEmptyGrid(),
    activePiece: null,
    targetWord: getRandomWord('MEDIUM'),
    status: 'START',
    score: 0,
    difficulty: 'MEDIUM'
  });

  const { grid, activePiece, targetWord, status, score, difficulty } = state;

  useEffect(() => {
    if (status === 'PLAYING') {
      audio.start();
    } else {
      audio.stop();
    }
    return () => audio.stop();
  }, [status]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'PLAYING') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'MOVE', dx: -1, dy: 0 }); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'MOVE', dx: 1, dy: 0 }); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); dispatch({ type: 'MOVE', dx: 0, dy: 1 }); }
      else if (e.key === ' ') { e.preventDefault(); dispatch({ type: 'HARD_DROP' }); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  useEffect(() => {
    if (status !== 'PLAYING') return;
    const solvedCols = [0,1,2,3,4].filter(c => grid.some(row => row[c]?.color === 'GREEN')).length;
    const speedMs = Math.max(250, 800 - (solvedCols * 100));
    
    const timer = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, speedMs);
    
    return () => clearInterval(timer);
  }, [status, grid]);

  return (
    <div className="bg-[#050505] text-[#00ffcc] min-h-[100dvh] w-full font-mono overflow-hidden flex items-center justify-center relative flex-col md:flex-row py-8 px-4 selection:bg-[#ff00ff]/30">
      
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(0, 255, 204, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 204, 0.1) 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }}></div>

      <div className="z-10 flex flex-col lg:flex-row gap-12 items-center lg:items-start max-w-6xl w-full justify-center px-4 relative">
        
        {/* Left Side: Info & Score */}
        <div className="w-full lg:w-[450px] bg-black/60 border-2 border-[#00ffcc]/30 p-8 shadow-[0_0_20px_rgba(0,255,204,0.1)] order-2 lg:order-1 flex flex-col gap-8">
          <div className="border-4 border-[#ff00ff] bg-black/80 p-4 shadow-[0_0_20px_rgba(255,0,255,0.4)]">
            <h1 className="text-4xl font-black italic tracking-tighter text-[#ff00ff] mb-2 leading-tight">LEXITRIS</h1>
            <p className="text-xs text-cyan-400 opacity-80 uppercase tracking-widest">Vaporwave v1.0.5</p>
          </div>

          <div>
            <div className="text-sm uppercase opacity-60 mb-2">Score</div>
            <div className="text-5xl font-bold text-white">{score.toString().padStart(6, '0')}</div>
          </div>

          <div>
            <div className="text-xs uppercase opacity-60 mb-2">How to Play</div>
            <div className="space-y-3 text-sm text-[#00ffcc]/80">
              <p>Match falling letters to guess the hidden 5-letter word.</p>
              <div className="space-y-2 my-3">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-[#00ffcc] border-2 border-[#00ffcc]/80"></div>
                  <span className="text-[10px] uppercase">Correct spot</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-yellow-500 border-2 border-yellow-300"></div>
                  <span className="text-[10px] uppercase">Wrong spot</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-purple-700 border-2 border-purple-500"></div>
                  <span className="text-[10px] uppercase">Not in word</span>
                </div>
              </div>
              <p>Win by locking a correct block in all 5 columns.</p>
            </div>
          </div>
          
          <div className="mt-auto pt-4 border-t border-[#00ffcc]/20 hidden md:block">
             <div className="text-[10px] uppercase opacity-60 mb-3">Controls</div>
             <div className="grid grid-cols-2 gap-2 text-[10px] uppercase">
                 <div className="border border-[#00ffcc]/30 bg-black/40 px-2 py-1.5 text-center">&larr; &rarr; Move</div>
                 <div className="border border-[#00ffcc]/30 bg-black/40 px-2 py-1.5 text-center">&darr; Drops</div>
                 <div className="border border-[#00ffcc]/30 bg-black/40 px-2 py-1.5 text-center col-span-2">SPACE Hard Drop</div>
             </div>
          </div>
        </div>

        {/* Center: Grid */}
        <div className="flex flex-col items-center order-1 lg:order-2 shrink-0">
          
          <div className="relative bg-[#111] border-4 border-[#00ffcc] shadow-[0_0_40px_rgba(0,255,204,0.2)] overflow-hidden"
               style={{ width: 5 * 72, height: 10 * 72 }}>
            
            {/* Grid Static Background layout */}
            <div className="absolute inset-0 flex flex-wrap pointer-events-none opacity-20">
                {Array.from({length: 50}).map((_, i) => (
                    <div key={i} className="border border-[#00ffcc]/50" style={{ width: 72, height: 72 }}></div>
                ))}
            </div>

            {/* Static Blocks */}
            {grid.map((row, y) => (
              row.map((cell, x) => (
                cell ? (
                  <div key={`${y}-${x}`} 
                        className={`absolute flex items-center justify-center text-4xl font-black border-[3px] transition-transform duration-100 ${getCellStyles(cell.color)}`}
                       style={{ left: x * 72, top: y * 72, width: 72, height: 72 }}>
                    {cell.char}
                  </div>
                ) : null
              ))
            ))}

            {/* Falling Piece */}
            {status === 'PLAYING' && activePiece && (
              <div className={`absolute z-10 flex items-center justify-center text-4xl font-black border-[3px] transition-all duration-75 ${getCellStyles('UNLANDED')}`}
                   style={{ left: activePiece.x * 72, top: activePiece.y * 72, width: 72, height: 72 }}>
                {activePiece.char}
              </div>
            )}

            {/* Overlays */}
            {status === 'START' && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6 text-center border-4 border-[#ff00ff] m-4">
                <h2 className="text-3xl font-black italic text-[#ff00ff] mb-4 tracking-tighter">READY?</h2>
                
                <div className="flex gap-2 mb-6">
                  {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(diff => (
                    <button 
                      key={diff}
                      onClick={() => dispatch({ type: 'SET_DIFFICULTY', difficulty: diff })}
                      className={`px-2 py-1 text-[10px] font-bold border-2 transition-colors ${difficulty === diff ? 'bg-[#00ffcc] text-black border-[#00ffcc]' : 'bg-transparent text-[#00ffcc] border-[#00ffcc]/30'} uppercase`}>
                      {diff}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => dispatch({ type: 'START_GAME' })}
                  className="px-6 py-2 bg-[#ff00ff] text-white font-black text-lg shadow-[0_0_20px_rgba(255,0,255,0.4)] hover:bg-[#ff00ff]/80 transition-all uppercase tracking-widest border-2 border-white">
                  INSERT COIN
                </button>
              </div>
            )}

            {status === 'WON' && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 text-center border-4 border-[#00ffcc] m-4">
                <h2 className="text-3xl font-black italic text-[#00ffcc] mb-4 leading-tight">SYSTEM<br/>CLEARED</h2>
                <div className="text-[#00ffcc] mb-6 flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-widest opacity-80 mb-2">Decrypted Word</span>
                  <span className="text-2xl font-black tracking-widest text-[#ffcc00]">{targetWord}</span>
                </div>
                <button 
                  onClick={() => dispatch({ type: 'START_GAME' })}
                  className="px-6 py-2 bg-transparent text-[#00ffcc] font-bold border-2 border-[#00ffcc] hover:bg-[#00ffcc] hover:text-black transition-colors flex items-center gap-2 text-sm uppercase mt-4">
                  <RefreshCw className="w-4 h-4"/> REBOOT
                </button>
                <button 
                  onClick={() => dispatch({ type: 'SHOW_MENU' })}
                  className="px-6 py-2 bg-transparent text-[#00ffcc] font-bold border-2 border-[#00ffcc]/50 hover:bg-[#00ffcc]/20 transition-colors text-xs uppercase mt-3">
                  Change Difficulty
                </button>
              </div>
            )}

            {status === 'LOSS' && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 border-4 border-red-500 m-4 text-center">
                <h2 className="text-4xl font-black italic text-red-500 mb-4 leading-tight">FATAL<br/>ERROR</h2>
                <div className="text-red-400 mb-6 flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-widest opacity-80 mb-2">Target Word</span>
                  <span className="text-2xl font-black tracking-widest text-white">{targetWord}</span>
                </div>
                <button 
                  onClick={() => dispatch({ type: 'START_GAME' })}
                  className="px-6 py-2 bg-red-600 text-white font-bold border-2 border-red-400 hover:bg-red-500 transition-colors flex items-center gap-2 text-sm uppercase shadow-[0_0_20px_rgba(255,0,0,0.4)] mt-4">
                  <RefreshCw className="w-4 h-4"/> RETRY
                </button>
                <button 
                  onClick={() => dispatch({ type: 'SHOW_MENU' })}
                  className="px-6 py-2 bg-transparent text-red-500 font-bold border-2 border-red-500/50 hover:bg-red-500/20 transition-colors text-xs uppercase mt-3">
                  Change Difficulty
                </button>
              </div>
            )}
            
          </div>

          {/* Target Word Indicator */}
          <div className="flex justify-between w-full mt-6 gap-2" style={{ width: 5 * 72 }}>
            <div className="absolute ml-[-50px] mt-4 text-[10px] uppercase text-[#ffcc00] font-bold -rotate-90 origin-right whitespace-nowrap">Target</div>
            {[0, 1, 2, 3, 4].map(c => {
               const cellIsSolved = grid.some(row => row[c]?.color === 'GREEN');
               return (
                 <div key={c} className={`flex-1 h-20 flex items-center justify-center text-4xl font-black border-[3px] ${
                     cellIsSolved 
                      ? 'border-[#00ffcc] bg-[#00ffcc]/10 shadow-[0_0_10px_rgba(0,255,204,0.3)] text-[#ffcc00]' 
                      : 'border-dashed border-[#00ffcc]/40 text-transparent'
                   }`}>
                   {cellIsSolved ? targetWord[c] : '?'}
                 </div>
               );
            })}
          </div>
          
          {/* Mobile Controls */}
          <div className="grid grid-cols-4 gap-2 mt-8 w-full lg:hidden" style={{ width: 5 * 72 }}>
            <button 
               onTouchStart={(e) => { e.preventDefault(); dispatch({ type: 'MOVE', dx: -1, dy: 0 }); }}
               className="bg-[#111] active:bg-[#222] h-14 border-2 border-[#00ffcc]/50 font-bold flex items-center justify-center text-[#00ffcc] select-none text-xl shadow-[0_0_10px_rgba(0,255,204,0.1)]">
               &larr;
            </button>
            <button 
               onTouchStart={(e) => { e.preventDefault(); dispatch({ type: 'HARD_DROP' }); }}
               className="bg-[#ff00ff]/20 active:bg-[#ff00ff]/40 col-span-2 h-14 border-2 border-[#ff00ff] font-bold flex items-center justify-center text-[#ff00ff] select-none tracking-widest shadow-[0_0_15px_rgba(255,0,255,0.3)] uppercase text-xs">
               DROP
            </button>
            <button 
               onTouchStart={(e) => { e.preventDefault(); dispatch({ type: 'MOVE', dx: 1, dy: 0 }); }}
               className="bg-[#111] active:bg-[#222] h-14 border-2 border-[#00ffcc]/50 font-bold flex items-center justify-center text-[#00ffcc] select-none text-xl shadow-[0_0_10px_rgba(0,255,204,0.1)]">
               &rarr;
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
