import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';

import buttonStartOnlineImage from '../assets/button-start-online.png';
import buttonStartOfflineImage from '../assets/button-start-offline.png';
import logoimage from '../assets/logo.png';
import frameGlassImage from '../assets/frame-glass.png';

import notificationIcon from '../assets/icon-Notifications.png';
import historyIcon from '../assets/icon-History.png';
import leaderboardIcon from '../assets/icon-Leaderboard.png';
import statsIcon from '../assets/icon-Stats.png';
import settingsIcon from '../assets/icon-Settings.png';
import menuClickSound from '../assets/sounds/menu_click_06.ogg';

import { LeaderboardDialog } from '../components/leaderboard/LeaderboardDialog';
import { GameStatsDialog } from '../components/game/GameStatsDialog';
import { CastleUpgradeDialog } from '../components/game/CastleUpgradeDialog';
import { ChangelogDialog } from '../components/changelog/ChangelogDialog';
import { SettingsDialog } from '../components/settings/SettingsDialog';
import { Castle } from '../components/game/Castle';
import { useSettingsStore } from '../stores/settingsStore';
import {
  fetchCollectorStatus,
  collectGems,
  collectXp,
  fetchAppSettings,
  updateChangelogVersion,
  type CollectorStatus
} from '../lib/api';
import type { AppSettingsResponse } from '@game-platform/shared';

type GamesHomePageProps = {
  onNotificationsClick?: () => void;
  onRecentResultsClick?: () => void;
};

export function GamesHomePage({
  onNotificationsClick,
  onRecentResultsClick
}: GamesHomePageProps) {
  const navigate = useNavigate();
  const { user, token, updateUser } = useAuthStore();
  const { showToast } = useToastStore();
  const { soundVolume } = useSettingsStore();

  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCastleUpgradeOpen, setIsCastleUpgradeOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [collectorStatus, setCollectorStatus] = useState<CollectorStatus | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettingsResponse | null>(null);

  const currentLevel = user?.castleLevel ?? 1;
  const currentXpMinerLevel = user?.xpMinerLevel ?? 0;
  const currentGemMinerLevel = user?.gemMinerLevel ?? 0;

  useEffect(() => {
    async function loadSettingsAndCheckChangelog() {
      try {
        const settings = await fetchAppSettings();
        setAppSettings(settings);

        if (user && user.lastChangelogVersion !== settings.version) {
          setIsChangelogOpen(true);
        }
      } catch (error) {
        console.error('Failed to fetch app settings:', error);
      }
    }

    loadSettingsAndCheckChangelog();
  }, [user]);

  const handleChangelogClose = async () => {
    setIsChangelogOpen(false);
    if (user && appSettings && token) {
      try {
        const { lastChangelogVersion } = await updateChangelogVersion(token, { version: appSettings.version });
        updateUser({ lastChangelogVersion });
      } catch (error) {
        console.error('Failed to update changelog version:', error);
      }
    }
  };

  const loadCollectorStatus = useCallback(async () => {
    if (!token) return;
    try {
      const status = await fetchCollectorStatus(token);
      setCollectorStatus(status);
    } catch (error) {
      console.error('Failed to load collector status:', error);
    }
  }, [token]);

  useEffect(() => {
    loadCollectorStatus();
    const interval = setInterval(loadCollectorStatus, 1000);
    return () => clearInterval(interval);
  }, [loadCollectorStatus]);

  const handleCollectGem = async () => {
    if (!token) return;
    try {
      const result = await collectGems(token);
      showToast(`${result.collectedAmount} جواهر جمع‌آوری شد!`, 'success');
      if (user) {
        updateUser({ gem: result.newGemCount });
      }
      await loadCollectorStatus();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'خطا در جمع‌آوری جواهر', 'error');
    }
  };

  const handleCollectXp = async () => {
    if (!token) return;
    try {
      const result = await collectXp(token);
      showToast(`${result.collectedAmount} XP جمع‌آوری شد!`, 'success');
      if (user) {
        updateUser({ xp: result.newXpCount });
      }
      await loadCollectorStatus();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'خطا در جمع‌آوری XP', 'error');
    }
  };

  const glassButtonClass =
    'absolute z-40 w-12 transition active:scale-95';

  const glassFrameClass =
    'relative z-10 w-full select-none';

  const glassIconClass =
    'pointer-events-none absolute left-1/2 top-1/2 z-20 h-10 w-10 -translate-x-1/2 -translate-y-1/2 select-none object-contain';

  return (
    <section className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-2 text-center">
      <button
        type="button"
        onClick={() => setIsSettingsOpen(true)}
        aria-label="تنظیمات"
        className={`${glassButtonClass} right-4 top-4`}
      >
        <img
          src={frameGlassImage}
          alt=""
          className={glassFrameClass}
          draggable="false"
        />

        <img
          src={settingsIcon}
          alt=""
          className={glassIconClass}
          draggable="false"
        />
      </button>

      <button
        type="button"
        onClick={onRecentResultsClick}
        aria-label="نتایج اخیر بازی‌ها"
        className={`${glassButtonClass} left-4 top-[42%] -translate-y-1/2`}
      >
        <img
          src={frameGlassImage}
          alt=""
          className={glassFrameClass}
          draggable="false"
        />

        <img
          src={historyIcon}
          alt=""
          className={glassIconClass}
          draggable="false"
        />
      </button>

      <button
        type="button"
        onClick={() => setIsStatsOpen(true)}
        aria-label="آمار بازی‌ها"
        className={`${glassButtonClass} left-4 top-[58%] -translate-y-1/2`}
      >
        <img
          src={frameGlassImage}
          alt=""
          className={glassFrameClass}
          draggable="false"
        />

        <img
          src={statsIcon}
          alt=""
          className={glassIconClass}
          draggable="false"
        />
      </button>

      <button
        type="button"
        onClick={onNotificationsClick}
        aria-label="اعلان‌ها"
        className={`${glassButtonClass} right-4 top-[42%] -translate-y-1/2`}
      >
        <img
          src={frameGlassImage}
          alt=""
          className={glassFrameClass}
          draggable="false"
        />

        <img
          src={notificationIcon}
          alt=""
          className={glassIconClass}
          draggable="false"
        />
      </button>

      <button
        type="button"
        onClick={() => setIsLeaderboardOpen(true)}
        aria-label="جدول امتیازات"
        className={`${glassButtonClass} right-4 top-[58%] -translate-y-1/2`}
      >
        <img
          src={frameGlassImage}
          alt=""
          className={glassFrameClass}
          draggable="false"
        />

        <img
          src={leaderboardIcon}
          alt=""
          className={glassIconClass}
          draggable="false"
        />
      </button>

      <div className="relative z-10 flex w-full flex-col items-center">
        <img
          src={logoimage}
          alt="Arena"
          className="w-full max-w-[16rem] select-none"
          draggable="false"
          style={{
            filter: 'drop-shadow(0px 10px 0px rgba(0, 0, 0, 0.2))',
          }}
        />

        <div className="relative mt-2 flex w-full items-end justify-center">
          <Castle
            level={currentLevel}
            xpMinerLevel={currentXpMinerLevel}
            gemMinerLevel={currentGemMinerLevel}
            onClick={() => setIsCastleUpgradeOpen(true)}
            className="z-10 w-[70%] max-w-[22rem]"
            canCollectGem={collectorStatus?.canCollectGem}
            canCollectXp={collectorStatus?.canCollectXp}
            gemSecondsLeft={collectorStatus?.gemSecondsLeft}
            xpSecondsLeft={collectorStatus?.xpSecondsLeft}
            gemAmount={collectorStatus?.gemAmount}
            xpAmount={collectorStatus?.xpAmount}
            onCollectGem={handleCollectGem}
            onCollectXp={handleCollectXp}
          />
        </div>

        <div className="mt-8 translate-y-6 rounded-2xl bg-black/30 px-4 py-3 shadow-lg backdrop-blur-[2px]">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                const audio = new Audio(menuClickSound);
                audio.volume = soundVolume / 100;
                audio.play().catch(console.error);
                navigate('/games/list?type=online');
              }}
              className="transition hover:scale-105"
              aria-label="شروع بازی‌های آنلاین"
            >
              <img
                src={buttonStartOnlineImage}
                alt="شروع بازی آنلاین"
                className="h-[80px] select-none "
                draggable="false"
              />
            </button>

            <button
              type="button"
              onClick={() => navigate('/games/list?type=offline')}
              className="transition hover:scale-105"
              aria-label="شروع بازی‌های آفلاین"
            >
              <img
                src={buttonStartOfflineImage}
                alt="شروع بازی آفلاین"
                className="h-[80px] select-none "
                draggable="false"
              />
            </button>
          </div>
        </div>
      </div>

      <LeaderboardDialog
        open={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />

      <GameStatsDialog
        open={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        avatarType={1}
      />

      <CastleUpgradeDialog
        open={isCastleUpgradeOpen}
        onClose={() => setIsCastleUpgradeOpen(false)}
        currentLevel={currentLevel}
      />

      <ChangelogDialog
        open={isChangelogOpen}
        onClose={handleChangelogClose}
        settings={appSettings}
      />

      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </section>
  );
}
