import { useState } from 'react';
import Castle1Image from '../../assets/castle-1.png';
import Castle2Image from '../../assets/castle-2.png';
import Castle3Image from '../../assets/castle-3.png';
import Castle4Image from '../../assets/castle-4.png';
import MainCastleImage from '../../assets/main-castle.png';

import XpMinerLevel1Image1 from '../../assets/xp-miner-1-1.png';
import XpMinerLevel1Image2 from '../../assets/xp-miner-1-2.png';
import XpMinerLevel1Image3 from '../../assets/xp-miner-1-3.png';
import XpMinerLevel2Image1 from '../../assets/xp-miner-2-1.png';
import XpMinerLevel2Image2 from '../../assets/xp-miner-2-2.png';
import XpMinerLevel2Image3 from '../../assets/xp-miner-2-3.png';

import GemMinerLevel1Image1 from '../../assets/gem-miner-1-1.png';
import GemMinerLevel1Image2 from '../../assets/gem-miner-1-2.png';
import GemMinerLevel1Image3 from '../../assets/gem-miner-1-3.png';
import GemMinerLevel2Image1 from '../../assets/gem-miner-2-1.png';

import { CollectEffect } from '../ui/CollectEffect';
import { CollectTooltip } from '../ui/CollectTooltip';

interface CastleProps {
  level: number;
  xpMinerLevel?: number;
  gemMinerLevel?: number;
  onClick?: () => void;
  className?: string;
  canCollectGem?: boolean;
  canCollectXp?: boolean;
  gemSecondsLeft?: number;
  xpSecondsLeft?: number;
  gemAmount?: number;
  xpAmount?: number;
  onCollectGem?: () => void;
  onCollectXp?: () => void;
}

type Effect = { id: number; type: 'xp' | 'gem'; amount: number };

export function Castle({
  level,
  xpMinerLevel = 0,
  gemMinerLevel = 0,
  onClick,
  className = '',
  canCollectGem = false,
  canCollectXp = false,
  gemSecondsLeft = 0,
  xpSecondsLeft = 0,
  gemAmount = 0,
  xpAmount = 0,
  onCollectGem,
  onCollectXp
}: CastleProps) {
  const [effects, setEffects] = useState<Effect[]>([]);

  const XP_COLLECT_INTERVAL = 50; // 50 seconds from collector.service.ts
  const GEM_COLLECT_INTERVAL = 30; // 30 seconds from collector.service.ts

  const getCastleImage = (lvl: number) => {
    switch (lvl) {
      case 2:
        return Castle2Image;
      case 3:
        return Castle3Image;
      case 4:
        return Castle4Image;
      default:
        return Castle1Image;
    }
  };

  const getXpMinerImage = (lvl: number, secondsLeft: number) => {
    let image;
    
    // Calculate passed percentage (secondsLeft is remaining)
    const totalSeconds = XP_COLLECT_INTERVAL;
    const passedPercentage = secondsLeft === 0 ? 100 : ((totalSeconds - secondsLeft) / totalSeconds) * 100;
    
    if (passedPercentage < 20) {
      image = lvl === 1 ? XpMinerLevel1Image1 : XpMinerLevel2Image1;
    } else if (passedPercentage < 80) {
      image = lvl === 1 ? XpMinerLevel1Image2 : XpMinerLevel2Image2;
    } else {
      image = lvl === 1 ? XpMinerLevel1Image3 : XpMinerLevel2Image3;
    }

    switch (lvl) {
      case 1:
      case 2:
        return image;
      default:
        return null;
    }
  };

  const getGemMinerImage = (lvl: number, secondsLeft: number) => {
    let image;
    
    // Calculate passed percentage (secondsLeft is remaining)
    const totalSeconds = GEM_COLLECT_INTERVAL;
    const passedPercentage = secondsLeft === 0 ? 100 : ((totalSeconds - secondsLeft) / totalSeconds) * 100;
    
    if (lvl === 1) {
      if (passedPercentage < 20) {
        image = GemMinerLevel1Image1;
      } else if (passedPercentage < 80) {
        image = GemMinerLevel1Image2;
      } else {
        image = GemMinerLevel1Image3;
      }
    } else if (lvl === 2) {
      // We only have gem-miner-2-1 for level 2, use that for now
      image = GemMinerLevel2Image1;
    }

    switch (lvl) {
      case 1:
      case 2:
        return image;
      default:
        return null;
    }
  };

  const addEffect = (type: 'xp' | 'gem', amount: number) => {
    const id = Date.now() + Math.random();
    setEffects(prev => [...prev, { id, type, amount }]);
  };

  const removeEffect = (id: number) => {
    setEffects(prev => prev.filter(effect => effect.id !== id));
  };

  const handleCollectXpWithEffect = () => {
    if (canCollectXp) {
      addEffect('xp', xpAmount);
      onCollectXp?.();
    }
  };

  const handleCollectGemWithEffect = () => {
    if (canCollectGem) {
      addEffect('gem', gemAmount);
      onCollectGem?.();
    }
  };

  const handleCastleClick = (e: React.MouseEvent) => {
    // If the click came from a miner tooltip, don't trigger the castle onClick
    const target = e.target as HTMLElement;
    if (target.closest('[data-miner-tooltip]')) {
      return;
    }
    onClick?.();
  };

  const xpEffects = effects.filter(e => e.type === 'xp');
  const gemEffects = effects.filter(e => e.type === 'gem');

  const xpMinerImage = getXpMinerImage(xpMinerLevel, xpSecondsLeft);
  const gemMinerImage = getGemMinerImage(gemMinerLevel, gemSecondsLeft);

  return (
    <div className={`relative ${className}`}>
      <div
        onClick={handleCastleClick}
        className="relative group block w-full active:scale-95 cursor-pointer"
        aria-label="ارتقای قلعه"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick?.();
          }
        }}
      >
        <div className="relative w-full transition-transform duration-300 group-hover:scale-105">
          <img
            src={MainCastleImage}
            alt=""
            className="absolute inset-0 z-0 w-full select-none"
            draggable="false"
            style={{
              filter: 'drop-shadow(-8px 8px 0px rgba(0, 0, 0, 0.3))',
            }}
          />

          <img
            src={getCastleImage(level)}
            alt="Castle"
            className="relative z-10 block w-full select-none"
            draggable="false"
          />

          {xpMinerImage ? (
            <div className="absolute left-[11%] top-[55%] z-20 w-[20%] -translate-y-1/2">
              {xpEffects.map((effect) => (
                <CollectEffect
                  key={effect.id}
                  type={effect.type}
                  amount={effect.amount}
                  onComplete={() => removeEffect(effect.id)}
                  className="left-1/2 -bottom-2"
                />
              ))}
              <CollectTooltip
                type="xp"
                amount={xpAmount}
                secondsLeft={xpSecondsLeft}
                canCollect={canCollectXp}
                onCollect={handleCollectXpWithEffect}
                position="left"
                tooltipClassName="-translate-x-4 bottom-full -mb-5"
              >
                <img
                  src={xpMinerImage}
                  alt=""
                  className="w-full select-none rounded-bl-[40px] overflow-hidden"
                  draggable="false"
                />
              </CollectTooltip>
            </div>
          ) : null}

          {gemMinerImage ? (
            <div className="absolute right-[14%] top-[55%] z-20 w-[30%] -translate-y-1/2">
              {gemEffects.map((effect) => (
                <CollectEffect
                  key={effect.id}
                  type={effect.type}
                  amount={effect.amount}
                  onComplete={() => removeEffect(effect.id)}
                  className="left-1/2 -bottom-2"
                />
              ))}
              <CollectTooltip
                type="gem"
                amount={gemAmount}
                secondsLeft={gemSecondsLeft}
                canCollect={canCollectGem}
                onCollect={handleCollectGemWithEffect}
                position="right"
                tooltipClassName="translate-x-10 bottom-full -mb-7"
              >
                <img
                  src={gemMinerImage}
                  alt=""
                  className="w-full select-none rounded-bl-[40px] overflow-hidden"
                  draggable="false"
                />
              </CollectTooltip>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
