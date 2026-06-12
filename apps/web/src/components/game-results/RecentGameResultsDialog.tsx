import { useQuery } from '@tanstack/react-query';

import { fetchRecentGameResults } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { Dialog } from '../ui/Dialog';

type RecentGameResultsDialogProps = {
  open: boolean;
  onClose: () => void;
};

function formatOutcome(outcome: 'won' | 'lost' | 'draw'): string {
  if (outcome === 'won') {
    return 'برده';
  }

  if (outcome === 'lost') {
    return 'باخته';
  }

  return 'مساوی کرده';
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

export function RecentGameResultsDialog({
  open,
  onClose
}: RecentGameResultsDialogProps) {
  const token = useAuthStore((state) => state.token);

  const recentResultsQuery = useQuery({
    queryKey: ['recent-game-results'],
    queryFn: () => fetchRecentGameResults(token!),
    enabled: Boolean(token) && open,
    refetchInterval: open ? 15000 : false,
    refetchIntervalInBackground: true
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      avatarType={2}
      title='تاریخچه بازی ها'
    >
      <div className="flex flex-col gap-4 text-right">
          {!token ? (
            <div className="rounded-3xl border border-ember/20 bg-ember/10 p-5 text-center font-black text-ember">
              برای دیدن نتایج اخیر باید وارد حساب شوی.
            </div>
          ) : null}

          {recentResultsQuery.isLoading ? (
            <div className="rounded-3xl  bg-white/75 p-6 text-center font-black text-ink shadow-xl shadow-ink/10">
              در حال بارگذاری نتایج اخیر...
            </div>
          ) : null}

          {recentResultsQuery.error instanceof Error ? (
            <div className="rounded-3xl border border-ember/20 bg-ember/10 p-5 text-ember shadow-xl shadow-ink/10">
              <p className="font-black">دریافت نتایج اخیر ناموفق بود.</p>
              <p className="mt-2 font-bold">{recentResultsQuery.error.message}</p>

              <button
                type="button"
                onClick={() => void recentResultsQuery.refetch()}
                className="mt-4 rounded-full bg-ember px-5 py-3 font-black text-white"
              >
                تلاش دوباره
              </button>
            </div>
          ) : null}

          {recentResultsQuery.data && recentResultsQuery.data.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/20 bg-white/65 p-8 text-center shadow-xl shadow-ink/10">
              <h3 className="font-display text-2xl font-black text-ink">
                هنوز نتیجه‌ای ثبت نشده
              </h3>
              <p className="mt-3 font-bold text-ink/60">
                بعد از تمام شدن هر بازی، نتیجه آن اینجا اضافه می‌شود.
              </p>
            </div>
          ) : null}

          <div className="space-y-4 px-3">
            {recentResultsQuery.data?.map((result) => (
              <article
                key={result.id}
                className="rounded-[1rem]  bg-white/80 p-2 "
              >
                <div className="flex items-start justify-between gap-4">
                  {result.createdAt ? (
                    <div className="shrink-0 rounded-full bg-ink/10 px-3 py-1 text-xs font-black text-ink">
                      {formatTimestamp(result.createdAt)}
                    </div>
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-md font-black text-ink">
                      {result.gameName}
                    </h3>
                    <p className="mt-2 text-sm font-bold text-ink/70">
                      بازی {result.gameName} را {formatOutcome(result.outcome)} با امتیاز {result.score}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
      </div>
    </Dialog>
  );
}
