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
  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={isPlayable ? { y: -20, scale: 1.05 } : {}}
      onClick={isPlayable ? onClick : undefined}
      className={`
        relative w-20 h-28 sm:w-24 sm:h-36 rounded-lg border-2 shadow-md flex flex-col items-center justify-center cursor-default transition-all duration-200
        ${isFaceUp ? 'bg-white border-gray-200' : 'bg-indigo-700 border-indigo-900'}
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
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-20 sm:w-16 sm:h-28 border-2 border-indigo-400/30 rounded-md flex items-center justify-center">
             <span className="text-indigo-200/20 text-4xl">K</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};
