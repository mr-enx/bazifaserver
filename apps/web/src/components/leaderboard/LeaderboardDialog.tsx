import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { AvatarWithFrame } from '../profile/AvatarWithFrame';
import { useAuthStore } from '../../stores/authStore';
import { fetchLeaderboard } from '../../lib/api';
import type { LeaderboardEntry } from '@game-platform/shared';

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function getDisplayName(user: { fullName?: string | null; username: string }): string {
  return user.fullName?.trim() || user.username;
}

type LeaderboardDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function LeaderboardDialog({ open, onClose }: LeaderboardDialogProps) {
  const token = useAuthStore((state) => state.token);
  const [activeTab, setActiveTab] = useState<'global' | 'monthly' | 'friends'>('global');

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => fetchLeaderboard(token!),
    enabled: open && !!token,
  });

  const entries = data ? data[activeTab] : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      avatarType={2}
      title='جدول امتیازات'
    >
      <div className="flex flex-col gap-4 px-6 text-ink">

        <div className="flex justify-around border-b border-ink/10 pb-2">
          <button
            onClick={() => setActiveTab('global')}
            className={`px-2 py-1 text-sm font-bold transition ${
              activeTab === 'global' ? 'border-b-2 border-yellow-600 text-yellow-600' : 'text-ink/60'
            }`}
          >
            جهانی
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-2 py-1 text-sm font-bold transition ${
              activeTab === 'monthly' ? 'border-b-2 border-yellow-600 text-yellow-600' : 'text-ink/60'
            }`}
          >
            این ماه
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-2 py-1 text-sm font-bold transition ${
              activeTab === 'friends' ? 'border-b-2 border-yellow-600 text-yellow-600' : 'text-ink/60'
            }`}
          >
            دوستان
          </button>
        </div>

        <div className="flex flex-col gap-2 py-2">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-ink/60">
              در حال بارگذاری...
            </div>
          ) : entries.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-ink/60">
              موردی یافت نشد
            </div>
          ) : (
            <div className="flex flex-col gap-2 py-2">
              {entries.map((entry: LeaderboardEntry, index: number) => (
                <div
                  key={entry.userId}
                  className="flex items-center gap-3 rounded-xl bg-ink/5 p-2 transition hover:bg-ink/10"
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full font-black ${
                    index === 0 ? 'bg-yellow-400 text-black shadow-sm' : 
                    index === 1 ? 'bg-gray-200 text-black shadow-sm' :
                    index === 2 ? 'bg-amber-600 text-white shadow-sm' :
                    'bg-ink/10 text-ink'
                  }`}>
                    {index + 1}
                  </div>
                  <AvatarWithFrame
                    avatarUrl={entry.avatarUrl}
                    alt={getDisplayName(entry)}
                    size="sm"
                    fallback={
                      <span className="font-display text-xs font-black text-ink/30">
                        {initials(entry.username)}
                      </span>
                    }
                    className="overflow-hidden rounded-full border-2 border-ink/10 bg-ink/5"
                  />
                  <div className="flex-1 font-bold truncate">{getDisplayName(entry)}</div>
                  <div className="font-display font-black text-yellow-600">{entry.totalScore.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
