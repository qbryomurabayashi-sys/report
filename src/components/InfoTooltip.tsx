import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
  position?: 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right';
}

export const InfoTooltip: React.FC<TooltipProps> = ({ 
  children, 
  content, 
  className = '',
  position = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'bottom-full left-0 mb-2';
      case 'top-right':
        return 'bottom-full right-0 mb-2';
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom-left':
        return 'top-full left-0 mt-2';
      case 'bottom-right':
        return 'top-full right-0 mt-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top-left':
      case 'bottom-left':
        return 'left-4';
      case 'top-right':
      case 'bottom-right':
        return 'right-4';
      case 'top':
      case 'bottom':
      default:
        return 'left-1/2 -translate-x-1/2';
    }
  };

  const getArrowPositionClasses = () => {
    if (position.startsWith('bottom')) {
      return 'bottom-full border-b-neutral-800 border-t-transparent';
    }
    return 'top-full border-t-neutral-800 border-b-transparent';
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: position.startsWith('bottom') ? -5 : 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position.startsWith('bottom') ? -5 : 5 }}
            className={`absolute z-50 p-3 bg-neutral-800 text-white text-xs rounded-lg shadow-xl min-w-[220px] max-w-[300px] pointer-events-none ${getPositionClasses()}`}
          >
            <div className="relative whitespace-normal break-words">
              {content}
              <div className={`absolute border-8 border-transparent ${getArrowPositionClasses()} ${getArrowClasses()}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
