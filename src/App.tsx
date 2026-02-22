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
  const [showHome, setShowHome] = useState(true);
  const [stars, setStars] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [inventory, setInventory] = useState<Record<string, number>>({
    p1: 0, p2: 0, p3: 0, p4: 0
  });
  const [redeemStatus, setRedeemStatus] = useState<{ name: string; starsLeft: number } | null>(null);
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
  const [message, setMessage] = useState("欢迎来玩 Kiki 的锦绣中国·8点中国");

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
    setShowHome(false);
  }, []);

  useEffect(() => {
    if (!showHome) {
      initGame();
    }
  }, [showHome, initGame]);

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
    let aiChosenSuit: Suit | null = null;

    // Pre-calculate AI's choice if it's an 8 to avoid stale state in message
    if (!isPlayer && card.rank === '8') {
      const currentHand = gameState.aiHand.filter(c => c.id !== card.id);
      const suitCounts = currentHand.reduce((acc, c) => {
        acc[c.suit] = (acc[c.suit] || 0) + 1;
        return acc;
      }, {} as Record<Suit, number>);
      aiChosenSuit = (Object.keys(suitCounts) as Suit[]).sort((a, b) => suitCounts[b] - suitCounts[a])[0] || 'hearts';
    }

    setGameState(prev => {
      const newHand = prev[handKey].filter(c => c.id !== card.id);
      const newDiscardPile = [...prev.discardPile, card];
      
      let newStatus: GameStatus = prev.status;
      if (newHand.length === 0) {
        newStatus = isPlayer ? 'player_won' : 'ai_won';
        // Reward mechanism: 2 stars for winning, 1 star for losing
        // Terracotta Model (p2) gives 2 stars regardless
        const earned = (isPlayer || inventory.p2 > 0) ? 2 : 1;
        setStars(prevStars => prevStars + earned);
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
            currentTurn: isPlayer ? 'player' : 'ai',
          };
        } else {
          return {
            ...prev,
            [handKey]: newHand,
            discardPile: newDiscardPile,
            wildSuit: aiChosenSuit,
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
      setMessage(`AI 打出了 8 并选择了 ${getSuitSymbol(aiChosenSuit || 'hearts')}。你的回合。`);
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

  const RulesContent = () => (
    <div className="p-4 bg-red-950/95 border border-yellow-500/30 rounded-xl shadow-2xl text-xs leading-relaxed text-yellow-100/80">
      <h4 className="font-bold text-yellow-400 mb-2 border-b border-yellow-500/20 pb-1">《8点中国》规则</h4>
      <ul className="space-y-1 list-disc list-inside">
        <li>初始各发 8 张牌。</li>
        <li>出牌需匹配花色或点数。</li>
        <li><span className="text-yellow-400 font-bold">数字 8</span> 是万能牌，可随时打出并指定新花色。</li>
        <li>无牌可出时需从摸牌堆摸一张。</li>
        <li>率先清空手牌者获胜。</li>
        <li>每局游戏结束均可获得 <span className="text-yellow-400">★</span>，获胜奖励翻倍！</li>
      </ul>
    </div>
  );

  const prizes = [
    { id: 'p1', name: '长城明信片', cost: 3, icon: '🏯', desc: '免单/挽救：AI 摸 5 张牌' },
    { id: 'p2', name: '兵马俑模型', cost: 5, icon: '🗿', desc: '被动：每局必得 2 颗星' },
    { id: 'p3', name: '西湖丝绸', cost: 10, icon: '🧣', desc: '消耗：自动消除 2 张手牌' },
    { id: 'p4', name: '锦绣山河画卷', cost: 20, icon: '📜', desc: '神力：直接获得本局胜利' },
  ];

  const handleRedeem = (prize: typeof prizes[0]) => {
    if (stars >= prize.cost) {
      const newStars = stars - prize.cost;
      setStars(newStars);
      setInventory(prev => ({ ...prev, [prize.id]: (prev[prize.id] || 0) + 1 }));
      setRedeemStatus({ name: prize.name, starsLeft: newStars });
      
      // Auto clear message after 3 seconds
      setTimeout(() => setRedeemStatus(null), 3000);
    }
  };

  const useItem = (id: string) => {
    if (inventory[id] <= 0 || gameState.status !== 'playing') return;

    setInventory(prev => ({ ...prev, [id]: prev[id] - 1 }));

    if (id === 'p1') {
      // Postcard: AI draws 5 cards to "save" player
      setGameState(prev => {
        const newDeck = [...prev.deck];
        const drawn = [];
        for (let i = 0; i < 5 && newDeck.length > 0; i++) {
          drawn.push(newDeck.pop()!);
        }
        return {
          ...prev,
          deck: newDeck,
          aiHand: [...prev.aiHand, ...drawn]
        };
      });
      setMessage("使用了长城明信片！AI 摸了 5 张牌。");
    } else if (id === 'p3') {
      // Silk: Remove 2 cards
      setGameState(prev => {
        const newHand = [...prev.playerHand];
        newHand.splice(0, 2);
        const won = newHand.length === 0;
        if (won) {
          setStars(s => s + 2);
        }
        return {
          ...prev,
          playerHand: newHand,
          status: won ? 'player_won' : prev.status
        };
      });
      setMessage("使用了西湖丝绸！消除了 2 张手牌。");
    } else if (id === 'p4') {
      // Scroll: Instant win
      setGameState(prev => ({
        ...prev,
        playerHand: [],
        status: 'player_won'
      }));
      setStars(s => s + 2);
      setMessage("使用了锦绣山河画卷！山河助力，直接获胜！");
    }
  };

  const PrizeShop = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="bg-red-950 border border-yellow-500/30 p-8 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-yellow-400">锦绣商店</h2>
          <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-500/30">
            <span className="text-yellow-400">★</span>
            <span className="font-bold text-yellow-400">{stars}</span>
          </div>
        </div>

        <AnimatePresence>
          {redeemStatus && (
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-0 left-0 right-0 bg-yellow-500 text-red-950 p-3 text-center font-bold text-sm z-10 shadow-lg"
            >
              🎉 你已获得【{redeemStatus.name}】！<br/>
              剩余星星：{redeemStatus.starsLeft} ★
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-4 mb-8">
          {prizes.map(prize => (
            <div key={prize.id} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{prize.icon}</span>
                <div>
                  <div className="font-bold text-yellow-100">{prize.name}</div>
                  <div className="text-[10px] text-yellow-500/80 mb-1">{prize.desc}</div>
                  <div className="text-xs text-yellow-500/60">消耗 {prize.cost} 颗星</div>
                </div>
              </div>
              <button 
                onClick={() => handleRedeem(prize)}
                disabled={stars < prize.cost}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${stars >= prize.cost ? 'bg-yellow-500 text-red-950 hover:scale-105' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
              >
                兑换
              </button>
            </div>
          ))}
        </div>
        <button 
          onClick={() => {
            setShowShop(false);
            setRedeemStatus(null);
          }}
          className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors"
        >
          返回游戏
        </button>
      </div>
    </motion.div>
  );

  if (showHome) {
    return (
      <div className="min-h-screen bg-red-950 text-white font-sans selection:bg-red-800 overflow-hidden flex flex-col relative items-center justify-center">
        {/* Background Image */}
        <div className="fixed inset-0 z-0 opacity-40 pointer-events-none">
          <img 
            src="https://picsum.photos/seed/tiananmen/1920/1080" 
            alt="Tiananmen Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 text-center p-8 bg-black/40 backdrop-blur-md rounded-3xl border border-yellow-500/30 shadow-2xl max-w-2xl"
        >
          <div className="w-24 h-24 bg-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-yellow-500/20 rotate-3">
            <span className="text-5xl font-bold text-red-900">8</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-yellow-400 tracking-tight">
            欢迎来玩<br/>Kiki 的锦绣中国·8点中国
          </h1>
          <p className="text-yellow-100/70 mb-10 text-lg">
            领略大好山河，体验经典纸牌乐趣。
          </p>
          <button
            onClick={() => setShowHome(false)}
            className="px-12 py-4 bg-yellow-500 hover:bg-yellow-400 text-red-950 font-bold text-xl rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-yellow-500/30"
          >
            开始游戏
          </button>
        </motion.div>

        {/* Rules at the bottom corner */}
        <div className="absolute bottom-6 right-6 z-20 max-w-xs">
          <RulesContent />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-950 text-white font-sans selection:bg-red-800 overflow-hidden flex flex-col relative">
      {/* Background Image */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        <img 
          src="https://picsum.photos/seed/tiananmen/1920/1080" 
          alt="Tiananmen Background" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Header */}
      <header className="p-4 flex justify-between items-center bg-red-900/40 backdrop-blur-md border-b border-yellow-500/30 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <span className="text-2xl font-bold text-red-900">8</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-yellow-400">Kiki 的锦绣中国·8点中国</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-500/30 mr-2">
            <span className="text-yellow-400">★</span>
            <span className="font-bold text-yellow-400">{stars}</span>
          </div>
          <button 
            onClick={() => setShowHome(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-yellow-400"
            title="返回主页"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 relative p-4 flex flex-col items-center justify-between max-w-6xl mx-auto w-full">
        
        {/* Inventory Bar */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
          {prizes.filter(p => p.id !== 'p2').map(prize => (
            <motion.button
              key={prize.id}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => useItem(prize.id)}
              disabled={inventory[prize.id] <= 0 || gameState.status !== 'playing'}
              className={`
                w-12 h-12 rounded-xl flex items-center justify-center relative shadow-lg border transition-all
                ${inventory[prize.id] > 0 && gameState.status === 'playing' 
                  ? 'bg-red-800 border-yellow-500/50 cursor-pointer' 
                  : 'bg-black/40 border-white/10 opacity-40 cursor-not-allowed'}
              `}
              title={prize.desc}
            >
              <span className="text-2xl">{prize.icon}</span>
              {inventory[prize.id] > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-500 text-red-950 text-[10px] font-bold rounded-full flex items-center justify-center border border-red-950">
                  {inventory[prize.id]}
                </span>
              )}
            </motion.button>
          ))}
          {inventory.p2 > 0 && (
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center shadow-lg" title={prizes[1].desc}>
              <span className="text-2xl grayscale-0">{prizes[1].icon}</span>
            </div>
          )}
        </div>

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
        <div className="w-full flex flex-col items-center gap-4 z-10">
          <div className="flex items-center gap-4">
             <div className="px-4 py-1.5 bg-red-900/60 backdrop-blur-md rounded-full border border-yellow-500/30 text-sm font-medium text-yellow-100">
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

        {/* Game Rules & Shop Footer */}
        <div className="absolute bottom-2 right-4 z-20 flex gap-4">
          <button 
            onClick={() => setShowShop(true)}
            className="flex items-center gap-2 text-yellow-500/60 hover:text-yellow-400 transition-colors"
          >
            <span className="text-[10px] uppercase tracking-widest font-bold">锦绣商店</span>
          </button>
          <div className="group relative">
            <div className="flex items-center gap-2 text-yellow-500/60 hover:text-yellow-400 cursor-help transition-colors">
              <Info size={16} />
              <span className="text-[10px] uppercase tracking-widest font-bold">游戏规则</span>
            </div>
            <div className="absolute bottom-full right-0 mb-2 w-64 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              <RulesContent />
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showShop && <PrizeShop />}
      </AnimatePresence>

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
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg ${gameState.status === 'player_won' ? 'bg-yellow-500 shadow-yellow-500/20' : 'bg-red-500 shadow-red-500/20'}`}>
                {gameState.status === 'player_won' ? (
                  <Trophy className="text-black" size={40} />
                ) : (
                  <span className="text-4xl">😢</span>
                )}
              </div>
              <h2 className="text-4xl font-bold mb-2">
                {gameState.status === 'player_won' ? '你赢了！' : '你输了'}
              </h2>
              <div className="flex items-center justify-center gap-2 mb-4 text-yellow-400 font-bold text-xl">
                <span>{(gameState.status === 'player_won' || inventory.p2 > 0) ? '+2' : '+1'}</span>
                <span className="text-2xl">★</span>
              </div>
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
