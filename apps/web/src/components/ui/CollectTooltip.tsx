import { useState, useRef, useEffect } from 'react';
import gemIcon from '../../assets/icon-gem.png';
import xpIcon from '../../assets/icon-level.png';

interface CollectTooltipProps {
  type: 'xp' | 'gem';
  amount: number;
  secondsLeft: number;
  canCollect: boolean;
  onCollect: () => void;
  position?: 'left' | 'right';
  tooltipClassName?: string;
  children?: React.ReactNode;
}

export function CollectTooltip({
  type,
  amount,
  secondsLeft,
  canCollect,
  onCollect,
  position = 'left',
  tooltipClassName = '',
  children
}: CollectTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Automatically open tooltip when can collect
  useEffect(() => {
    if (canCollect) {
      setIsOpen(true);
    }
  }, [canCollect]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close on outside click if we can't collect yet
      if (!canCollect && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [canCollect]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && !canCollect) {
      timer = setTimeout(() => {
        setIsOpen(false);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [isOpen, canCollect]);

  const handleClick = () => {
    if (canCollect) {
      onCollect();
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative" ref={triggerRef} data-miner-tooltip>
      <div
        onClick={handleClick}
        className="cursor-pointer"
      >
        {children}
      </div>

      {(isOpen || canCollect) && (
        <div
          className={`absolute z-50 ${
            position === 'left' ? 'left-1/2 -translate-x-1/2' : 'right-1/2 translate-x-1/2'
          } ${tooltipClassName}`}
          style={{ filter: 'drop-shadow(0 4px 0 rgba(0, 0, 0, 0.3))' }}
        >
          <div
            className={`w-[40px] h-[40px] rounded-xl flex items-center justify-center border-[2px] border-black ${
              type === 'gem' ? 'bg-[#E0D7B6]' : 'bg-sky-100'
            }`}
            onClick={canCollect ? handleClick : undefined}
          >
            {canCollect ? (
              <img 
                src={type === 'gem' ? gemIcon : xpIcon} 
                alt={type === 'gem' ? 'gem' : 'xp'} 
                className="w-8 h-8 object-contain" 
              />
            ) : (
              <span className="text-base font-bold text-gray-600">{secondsLeft}s</span>
            )}
          </div>

          <div className="absolute bottom-[1px] left-1/2 h-0 w-0 -translate-x-1/2">
            <div
              className="absolute h-0 w-0 -translate-x-1/2 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-black"
              style={{ left: '50%', top: '-1px' }}
            />
            <div
              className={`absolute h-0 w-0 -translate-x-1/2 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] ${
                type === 'gem' ? 'border-t-[#E0D7B6]' : 'border-t-sky-100'
              }`}
              style={{ left: '50%', top: '-2px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
