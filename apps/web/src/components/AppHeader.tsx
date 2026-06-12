import { useEffect, useState } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import { isIosPwa } from '../lib/isIosPwa';
import { useAuthStore } from '../stores/authStore';
import { getXpProgressInfo } from '../lib/xp';

import Diamond from '../assets/diamond.png';
import xpIcon from '../assets/icon-level.png';
import add from '../assets/button-add.png';
import { Text } from './ui/Text';
import { AvatarWithFrame } from './profile/AvatarWithFrame';

const VISUAL_MIN = 20;
const VISUAL_MAX = 95;

function XpBalance({ xp = 0 }: { xp?: number }) {
  const xpInfo = getXpProgressInfo(xp);

  const rawPercent = Math.max(
    0,
    Math.min(100, (xpInfo.currentLevelXp / xpInfo.currentLevelCapacity) * 100),
  );

  const visualPercent =
    VISUAL_MIN + (rawPercent / 100) * (VISUAL_MAX - VISUAL_MIN);

  return (
    <div className="relative flex h-11 w-[168px] items-center justify-center">
      {/* Container with rounded-sm and no blur */}
      <div className="relative flex h-7 w-[156px] items-center justify-center overflow-hidden rounded-full bg-black/35 px-8">
        {/* base layer */}
        <div className="absolute inset-[2px] rounded-sm bg-black/20" />

{/* gradient progress */}
{/* ۱. تغییر لبه‌های ظرف نگهدارنده */}
<div className="absolute inset-[2px] overflow-hidden rounded-full">
  <div
    className="h-full rounded-md"
    style={{
      width: `${visualPercent}%`,
      background:
        "linear-gradient(to bottom, #15FBFF 0%, #13D8FC 50%, #11B5F9 51%, #11B5F9 100%)",
      border: "1px solid #0000005b",
      boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.66)",
    }}
  />
</div>



        {/* glossy top highlight */}
        <div className="absolute inset-x-[2px] top-[2px] h-[45%] rounded-sm bg-white/10" />

        <Text
          preset="outlinedWhite"
          className="relative z-10 w-full text-center text-[10px] leading-none"
        >
          {xpInfo.progressText}
        </Text>
      </div>

      <div className="absolute left-0 z-10 h-10 w-10">
        <img src={xpIcon} alt="XP" className="h-10 w-10 object-contain" />
        <Text
          preset="levelBadge"
          className="absolute inset-0 flex items-center justify-center"
        >
          {xpInfo.level}
        </Text>
      </div>

      <button
        type="button"
        className="absolute right-0 z-10 grid h-9 w-9 place-items-center transition active:scale-95"
      >
        <img src={add} alt="" className="h-7 w-7 object-contain" />
      </button>
    </div>
  );
}

function DiamondBalance({ value = 0 }: { value?: number }) {
  return (
    <div className="relative flex h-11 w-[120px] items-center justify-center">
      <div className="relative flex h-7 w-[88px] items-center justify-start overflow-hidden rounded-full bg-black/35 px-7">
        <div className="absolute inset-[2px] rounded-full bg-black/20" />
        <div className="absolute inset-x-[2px] top-[2px] h-[45%] rounded-full bg-white/10" />

        <Text
          preset="outlinedWhite"
          className="relative z-10 w-full text-left text-[10px] leading-none"
        >
          {value.toLocaleString('en-US')}
        </Text>
      </div>

      <img src={Diamond} alt="Diamond" className="absolute left-0 z-10 h-10 w-10 object-contain" />

      <button
        type="button"
        className="absolute right-0 z-10 grid h-9 w-9 place-items-center transition active:scale-95"
      >
        <img src={add} alt="" className="h-7 w-7 object-contain" />
      </button>
    </div>
  );
}



export function AppHeader({ onProfileClick }: { onProfileClick?: () => void }) {
  const location = useLocation();
  const { user, status } = useAuthStore();
  const [hasIosPwaPadding, setHasIosPwaPadding] = useState(false);

  useEffect(() => {
    setHasIosPwaPadding(isIosPwa());
  }, []);

  const isHiddenPage =
    Boolean(matchPath('/rooms/:roomId', location.pathname)) ||
    Boolean(matchPath('/rooms/:roomId/lobby', location.pathname)) ||
    Boolean(matchPath('/rooms/:roomId/game', location.pathname)) ||
    Boolean(matchPath('/chat/:friendId', location.pathname));

  if (isHiddenPage) return null;

  const firstGradientStop = hasIosPwaPadding ? '0.6' : '0.4';

  return (
    <header
      style={{
        background: `linear-gradient(to bottom, rgba(0, 204, 255, ${firstGradientStop}), rgba(0, 204, 255, 0.1))`,
      }}
      className={`fixed left-0 right-0 top-0 z-50 border-b border-ink/10 backdrop-blur-lg ${
        hasIosPwaPadding ? 'h-[94px] pt-[30px]' : 'h-16'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {status === 'authenticated' ? (
            <>
              <AvatarWithFrame avatarUrl={user?.avatarUrl} size="md" onClick={onProfileClick} />
              <XpBalance xp={user?.xp ?? 0} />
              <DiamondBalance value={user?.gem ?? 0} />
            </>
          ) : (
            <Link
              to="/login"
              className="flex h-11 items-center rounded-full border border-ink/15 bg-white/20 px-4 transition hover:bg-white/40"
            >
              <Text preset="body" className="text-xs font-bold text-ink/70">
                Login
              </Text>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
