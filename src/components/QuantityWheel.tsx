import React, { useRef, useEffect, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';

interface QuantityWheelProps {
  value: number | string;
  onChange: (val: number) => void;
  max?: number;
}

export const QuantityWheel: React.FC<QuantityWheelProps> = ({ value, onChange, max = 50 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const ITEM_HEIGHT = 32; // h-8 = 32px

  const numbers = Array.from({ length: max }, (_, i) => i + 1);
  const numValue = Number(value) || 1;

  // Sync scroll position with value, but only when not actively scrolling
  useEffect(() => {
    if (containerRef.current && !isScrolling) {
      containerRef.current.scrollTop = (numValue - 1) * ITEM_HEIGHT;
    }
  }, [numValue, isScrolling]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    setIsScrolling(true);
    
    const scrollY = containerRef.current.scrollTop;
    const index = Math.round(scrollY / ITEM_HEIGHT);
    const newValue = index + 1;
    
    if (newValue !== numValue && newValue >= 1 && newValue <= max) {
      onChange(newValue);
    }
  };

  // Debounce the scroll end to resume external value syncing if needed
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isScrolling) {
      timeout = setTimeout(() => {
        setIsScrolling(false);
      }, 150); // 150ms after last scroll event, consider scrolling finished
    }
    return () => clearTimeout(timeout);
  }, [isScrolling, numValue]); // Re-trigger on numValue change during scroll

  return (
    <div 
      className="relative w-20 mx-auto h-[96px] overflow-hidden rounded bg-surface border border-outline-variant select-none shadow-inner group"
      style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)' }}
    >
      {/* Scroll Hint Icon */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none group-hover:text-primary/60 transition-colors z-20">
        <ChevronsUpDown className="w-3.5 h-3.5" />
      </div>

      {/* Center highlight overlay */}
      <div className="absolute top-1/2 left-0 w-full h-8 -mt-4 bg-primary/10 pointer-events-none border-y border-primary/20 z-10" />
      
      {/* Scroll container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory scrollbar-hide py-[32px] relative z-0 pr-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {numbers.map(num => {
          const isActive = num === numValue;
          return (
            <div 
              key={num} 
              className={`h-8 flex items-center justify-center snap-center text-sm transition-all duration-150 pl-2 ${isActive ? 'font-bold text-primary scale-110' : 'text-on-surface-variant/60 scale-95'}`}
            >
              {num}
            </div>
          );
        })}
      </div>
    </div>
  );
};
