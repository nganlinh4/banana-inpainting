import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', hoverEffect = false }) => {
  return (
    <div 
      className={`
        bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-[30px] shadow-clay border border-white/40 dark:border-white/10
        transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]
        ${hoverEffect ? 'hover:shadow-clay-hover hover:-translate-y-1' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;