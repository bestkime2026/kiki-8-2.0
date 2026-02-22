import React from 'react';
import { motion } from 'motion/react';
import { Card as CardType } from '../types';
import { getSuitSymbol, getSuitColor } from '../constants';

interface CardProps {
  card: CardType;
  isFaceUp?: boolean;
  onClick?: () => void;
  isPlayable?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ 
  card, 
  isFaceUp = true, 
  onClick, 
  isPlayable = false,
  className = ""
}) => {
  // Array of scenic images for card backs representing Chinese landmarks
  const scenicImages = [
    "https://picsum.photos/seed/huashan/400/600", // 华山
    "https://picsum.photos/seed/terracotta/400/600", // 兵马俑
    "https://picsum.photos/seed/westlake/400/600", // 西湖
    "https://picsum.photos/seed/guilin/400/600", // 桂林
    "https://picsum.photos/seed/huangshan/400/600", // 黄山
    "https://picsum.photos/seed/jiuzhaigou/400/600" // 九寨沟
  ];
  
  // Use card id to pick a consistent image from the list
  const imageIndex = card.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % scenicImages.length;
  const backImage = scenicImages[imageIndex];

  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={isPlayable ? { y: -20, scale: 1.05 } : {}}
      onClick={isPlayable ? onClick : undefined}
      className={`
        relative w-20 h-28 sm:w-24 sm:h-36 rounded-lg border-2 shadow-md flex flex-col items-center justify-center cursor-default transition-all duration-200 overflow-hidden
        ${isFaceUp ? 'bg-white border-gray-200' : 'bg-red-900 border-yellow-600'}
        ${isPlayable ? 'cursor-pointer hover:border-yellow-400 ring-2 ring-transparent hover:ring-yellow-400' : ''}
        ${className}
      `}
    >
      {isFaceUp ? (
        <>
          <div className={`absolute top-1 left-2 font-bold text-lg sm:text-xl ${getSuitColor(card.suit)}`}>
            {card.rank}
          </div>
          <div className={`text-3xl sm:text-4xl ${getSuitColor(card.suit)}`}>
            {getSuitSymbol(card.suit)}
          </div>
          <div className={`absolute bottom-1 right-2 font-bold text-lg sm:text-xl rotate-180 ${getSuitColor(card.suit)}`}>
            {card.rank}
          </div>
        </>
      ) : (
        <div className="w-full h-full relative">
          <img 
            src={backImage} 
            alt="Scenic China" 
            className="w-full h-full object-cover opacity-90"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-red-900/10 flex items-center justify-center">
             <div className="w-12 h-20 sm:w-16 sm:h-28 border-2 border-yellow-400/30 rounded-md flex items-center justify-center backdrop-blur-[1px]">
                <span className="text-yellow-400/80 text-2xl font-serif drop-shadow-lg">华</span>
             </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
