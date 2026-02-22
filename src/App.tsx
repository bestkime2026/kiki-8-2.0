/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card as CardComponent } from './components/Card';
import { Card as CardType, Suit, GameState, GameStatus } from './types';
import { createDeck, SUITS, getSuitSymbol, getSuitColor } from './constants';
import { Trophy, RotateCcw, Info, ChevronUp, ChevronDown } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    deck: [],
    discardPile: [],
    playerHand: [],
    aiHand: [],
    currentTurn: 'player',
    status: 'playing',
    wildSuit: null,
  });

  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [message, setMessage] = useState("欢迎来到 kiki疯狂8点 2.0！");

  // Initialize Game
  const initGame = useCallback(() => {
    const fullDeck = createDeck();
    const playerHand = fullDeck.splice(0, 8);
    const aiHand = fullDeck.splice(0, 8);
    const firstDiscard = fullDeck.pop()!;
    
    setGameState({
      deck: fullDeck,
      discardPile: [firstDiscard],
      playerHand,
      aiHand,
      currentTurn: 'player',
      status: 'playing',
      wildSuit: null,
    });
    setMessage("你的回合，请出牌。");
    setShowSuitPicker(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const topDiscard = gameState.discardPile.length > 0 ? gameState.discardPile[gameState.discardPile.length - 1] : null;
  const currentSuit = gameState.wildSuit || topDiscard?.suit;

  const isCardPlayable = (card: CardType) => {
    if (gameState.status !== 'playing' || gameState.currentTurn !== 'player' || !topDiscard) return false;
    if (card.rank === '8') return true;
    return card.suit === currentSuit || card.rank === topDiscard.rank;
  };

  const playCard = (card: CardType, isPlayer: boolean) => {
    const handKey = isPlayer ? 'playerHand' : 'aiHand';
    const nextTurn = isPlayer ? 'ai' : 'player';

    setGameState(prev => {
      const newHand = prev[handKey].filter(c => c.id !== card.id);
      const newDiscardPile = [...prev.discardPile, card];
      
      let newStatus: GameStatus = prev.status;
      if (newHand.length === 0) {
        newStatus = isPlayer ? 'player_won' : 'ai_won';
      }

      // If it's an 8, we need to pick a suit
      if (card.rank === '8') {
        if (isPlayer) {
          setShowSuitPicker(true);
          return {
            ...prev,
            [handKey]: newHand,
            discardPile: newDiscardPile,
            status: 'waiting_for_suit',
            currentTurn: isPlayer ? 'player' : 'ai', // Keep turn if waiting for suit? Actually, logic usually is: play 8 -> pick suit -> turn ends.
          };
        } else {
          // AI picks a suit (most frequent in hand)
          const suitCounts = newHand.reduce((acc, c) => {
            acc[c.suit] = (acc[c.suit] || 0) + 1;
            return acc;
          }, {} as Record<Suit, number>);
          const bestSuit = (Object.keys(suitCounts) as Suit[]).sort((a, b) => suitCounts[b] - suitCounts[a])[0] || 'hearts';
          
          return {
            ...prev,
            [handKey]: newHand,
            discardPile: newDiscardPile,
            wildSuit: bestSuit,
            currentTurn: nextTurn,
            status: newStatus,
          };
        }
      }

      return {
        ...prev,
        [handKey]: newHand,
        discardPile: newDiscardPile,
        currentTurn: nextTurn,
        status: newStatus,
        wildSuit: null, // Reset wild suit if a non-8 is played
      };
    });

    if (card.rank !== '8') {
      setMessage(isPlayer ? "AI 正在思考..." : "你的回合，请出牌。");
    } else if (!isPlayer) {
      setMessage(`AI 打出了 8 并选择了 ${getSuitSymbol(gameState.wildSuit || 'hearts')}。你的回合。`);
    }
  };

  const drawCard = (isPlayer: boolean) => {
    if (gameState.deck.length === 0) {
      setMessage("摸牌堆已空，跳过回合。");
      setGameState(prev => ({ ...prev, currentTurn: isPlayer ? 'ai' : 'player' }));
      return;
    }

    setGameState(prev => {
      const newDeck = [...prev.deck];
      const drawnCard = newDeck.pop()!;
      const handKey = isPlayer ? 'playerHand' : 'aiHand';
      
      return {
        ...prev,
        deck: newDeck,
        [handKey]: [...prev[handKey], drawnCard],
        currentTurn: isPlayer ? 'ai' : 'player'
      };
    });
    
    setMessage(isPlayer ? "你摸了一张牌。AI 的回合。" : "AI 摸了一张牌。你的回合。");
  };

  // AI Turn Logic
  useEffect(() => {
    if (gameState.currentTurn === 'ai' && gameState.status === 'playing' && topDiscard) {
      const timer = setTimeout(() => {
        const playableCards = gameState.aiHand.filter(card => {
          if (card.rank === '8') return true;
          return card.suit === currentSuit || card.rank === topDiscard.rank;
        });

        if (playableCards.length > 0) {
          // AI strategy: play non-8 if possible, otherwise play 8
          const nonEight = playableCards.find(c => c.rank !== '8');
          playCard(nonEight || playableCards[0], false);
        } else {
          drawCard(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentTurn, gameState.status, gameState.aiHand, currentSuit, topDiscard]);

  const handleSuitSelect = (suit: Suit) => {
    setGameState(prev => ({
      ...prev,
      wildSuit: suit,
      currentTurn: 'ai',
      status: 'playing'
    }));
    setShowSuitPicker(false);
    setMessage(`你选择了 ${getSuitSymbol(suit)}。AI 正在思考...`);
  };

  return (
    <div className="min-h-screen bg-emerald-900 text-white font-sans selection:bg-emerald-700 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-2xl font-bold">8</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">kiki疯狂8点 2.0</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={initGame}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="重新开始"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 relative p-4 flex flex-col items-center justify-between max-w-6xl mx-auto w-full">
        
        {/* AI Hand */}
        <div className="w-full flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium uppercase tracking-wider">
            <span>AI 对手</span>
            <span className="px-2 py-0.5 bg-emerald-800 rounded-full text-xs">{gameState.aiHand.length} 张</span>
          </div>
          <div className="flex justify-center -space-x-12 sm:-space-x-16 h-32 sm:h-40 items-center">
            {gameState.aiHand.map((card, index) => (
              <CardComponent 
                key={card.id} 
                card={card} 
                isFaceUp={false} 
                className="shadow-xl"
              />
            ))}
          </div>
        </div>

        {/* Center Table */}
        <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-16 my-4">
          {/* Deck */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-emerald-400/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div 
              onClick={() => gameState.currentTurn === 'player' && gameState.status === 'playing' && drawCard(true)}
              className={`
                relative w-20 h-28 sm:w-24 sm:h-36 bg-indigo-800 rounded-lg border-2 border-indigo-900 shadow-2xl flex items-center justify-center cursor-pointer
                ${gameState.currentTurn === 'player' ? 'hover:scale-105 active:scale-95' : 'opacity-50 cursor-not-allowed'}
                transition-all
              `}
            >
              <div className="text-indigo-300/50 text-xs font-bold uppercase tracking-widest rotate-90">
                摸牌堆 ({gameState.deck.length})
              </div>
              {/* Stack effect */}
              <div className="absolute -top-1 -left-1 w-full h-full bg-indigo-800 rounded-lg border-2 border-indigo-900 -z-10"></div>
              <div className="absolute -top-2 -left-2 w-full h-full bg-indigo-800 rounded-lg border-2 border-indigo-900 -z-20"></div>
            </div>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <AnimatePresence mode="wait">
                {topDiscard && (
                  <CardComponent 
                    key={topDiscard.id}
                    card={topDiscard} 
                    className="shadow-2xl ring-4 ring-white/10"
                  />
                )}
              </AnimatePresence>
              {gameState.wildSuit && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-emerald-500"
                >
                  <span className={`text-2xl ${getSuitColor(gameState.wildSuit)}`}>
                    {getSuitSymbol(gameState.wildSuit)}
                  </span>
                </motion.div>
              )}
            </div>
            <div className="text-xs text-emerald-200/60 font-medium uppercase tracking-widest">
              弃牌堆
            </div>
          </div>
        </div>

        {/* Player Hand */}
        <div className="w-full flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
             <div className="px-4 py-1.5 bg-black/30 backdrop-blur-md rounded-full border border-white/10 text-sm font-medium">
                {message}
             </div>
          </div>
          
          <div className="flex justify-center -space-x-8 sm:-space-x-12 h-40 sm:h-48 items-end pb-4 overflow-x-auto w-full px-8 no-scrollbar">
            {gameState.playerHand.map((card) => (
              <CardComponent 
                key={card.id} 
                card={card} 
                isPlayable={isCardPlayable(card)}
                onClick={() => playCard(card, true)}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Suit Picker Modal */}
      <AnimatePresence>
        {showSuitPicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-emerald-800 border border-white/20 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center"
            >
              <h2 className="text-2xl font-bold mb-2">疯狂 8 点！</h2>
              <p className="text-emerald-200 mb-8">请选择接下来的花色：</p>
              <div className="grid grid-cols-2 gap-4">
                {SUITS.map((suit) => (
                  <button
                    key={suit}
                    onClick={() => handleSuitSelect(suit)}
                    className="bg-white/10 hover:bg-white/20 border border-white/10 p-6 rounded-2xl flex flex-col items-center gap-2 transition-all group"
                  >
                    <span className={`text-5xl group-hover:scale-110 transition-transform ${getSuitColor(suit)}`}>
                      {getSuitSymbol(suit)}
                    </span>
                    <span className="text-xs uppercase tracking-widest font-bold opacity-60">
                      {suit}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {(gameState.status === 'player_won' || gameState.status === 'ai_won') && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-zinc-900 border border-white/10 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center"
            >
              <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-500/20">
                <Trophy className="text-black" size={40} />
              </div>
              <h2 className="text-4xl font-bold mb-2">
                {gameState.status === 'player_won' ? '你赢了！' : 'AI 赢了'}
              </h2>
              <p className="text-zinc-400 mb-8">
                {gameState.status === 'player_won' ? '太棒了，你清空了所有手牌。' : '再接再厉，AI 棋高一着。'}
              </p>
              <button
                onClick={initGame}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} />
                再玩一局
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Scrollbar Style */}
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
