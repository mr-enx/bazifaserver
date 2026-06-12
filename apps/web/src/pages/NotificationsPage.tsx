import { useQuery } from '@tanstack/react-query';
import { fetchNotifications } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { AvatarWithFrame } from '../components/profile/AvatarWithFrame';

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function getDisplayName(user: { fullName?: string | null; username: string }): string {
  return user.fullName?.trim() || user.username;
}

export function NotificationsPage() {
  const token = useAuthStore((state) => state.token);

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(token!),
    enabled: Boolean(token),
    refetchInterval: 60_000
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-5 px-6 pb-10 pt-28">
      <div className="rounded-3xl  bg-white/75 p-6 shadow-xl shadow-ink/10 backdrop-blur">
        <h1 className="text-2xl font-black text-ink">اعلان‌ها</h1>
        <p className="mt-3 text-sm font-bold text-ink/70">
          درخواست‌های دوستی به بخش چت منتقل شده‌اند.
        </p>
      </div>

      {notificationsQuery.isLoading ? (
        <div className="rounded-3xl  bg-white/75 p-6 text-center font-black text-ink shadow-xl shadow-ink/10">
          در حال بارگذاری اعلان‌ها...
        </div>
      ) : null}

      {notificationsQuery.isError ? (
        <div className="rounded-3xl border border-ember/20 bg-ember/10 p-5 text-ember shadow-xl shadow-ink/10">
          <p className="font-black">دریافت اعلان‌ها ناموفق بود.</p>
          <p className="mt-2 font-bold">
            {notificationsQuery.error instanceof Error
              ? notificationsQuery.error.message
              : 'لطفا دوباره تلاش کن.'}
          </p>
          <button
            type="button"
            onClick={() => void notificationsQuery.refetch()}
            className="mt-4 rounded-full bg-ember px-5 py-3 font-black text-white"
          >
            تلاش دوباره
          </button>
        </div>
      ) : null}

      {notificationsQuery.data && notificationsQuery.data.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink/20 bg-white/65 p-8 text-center shadow-xl shadow-ink/10">
          <h2 className="font-display text-2xl font-black text-ink">اعلانی نداری</h2>
          <p className="mt-3 font-bold text-ink/60">
            اعلان جدیدی برای نمایش وجود ندارد.
          </p>
        </div>
      ) : null}

      {notificationsQuery.data?.map((notification) => (
        <article
          key={notification.id}
          className="rounded-[2rem]  bg-white/80 p-5 shadow-xl shadow-ink/10"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="shrink-0 rounded-full bg-ink/10 px-3 py-1 text-xs font-black text-ink">
              اعلان
            </span>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-4 text-right">
              <div className="min-w-0">
                <h2 className="truncate font-display text-2xl font-black text-ink">
                  {getDisplayName(notification.actor)}
                </h2>
                <p className="mt-1 text-sm font-bold text-ink/65">
                  {notification.message}
                </p>
                <p className="mt-2 text-xs font-bold text-ink/45">
                  {formatTimestamp(notification.createdAt)}
                </p>
              </div>

              {notification.actor.avatarUrl ? (
                <AvatarWithFrame
                      avatarUrl={notification.actor.avatarUrl}
                      alt={getDisplayName(notification.actor)}
                      size="lg"
                      className="h-16 w-16"
                    />
                  ) : (
                    <AvatarWithFrame
                      alt={getDisplayName(notification.actor)}
                      size="lg"
                      className="h-16 w-16"
                    />
              )}
            </div>
          </div>
        </article>
      ))}
    </main>
  );
}
