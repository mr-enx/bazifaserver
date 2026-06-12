import { useQuery } from '@tanstack/react-query';

import { fetchNotifications } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { Dialog } from '../ui/Dialog';
import { AvatarWithFrame } from '../profile/AvatarWithFrame';

type NotificationsDialogProps = {
  open: boolean;
  onClose: () => void;
};

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function getDisplayName(user: { fullName?: string | null; username: string }): string {
  return user.fullName?.trim() || user.username;
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

export function NotificationsDialog({
  open,
  onClose
}: NotificationsDialogProps) {
  const token = useAuthStore((state) => state.token);

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(token!),
    enabled: Boolean(token) && open,
    refetchInterval: open ? 60_000 : false
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      avatarType={4}
      title='اعلانات'
    >
      <div className="flex flex-col px-4 gap-4">
          {!token ? (
            <div className="rounded-sm border border-ember/20 bg-ember/10 p-5 text-center font-black text-ember">
              برای دیدن اعلان‌ها باید وارد حساب شوی.
            </div>
          ) : null}

          {notificationsQuery.isLoading ? (
            <div className="rounded-sm  bg-white/75 p-6 text-center font-black text-ink shadow-xl shadow-ink/10">
              در حال بارگذاری اعلان‌ها...
            </div>
          ) : null}

          {notificationsQuery.error instanceof Error ? (
            <div className="rounded-sm border border-ember/20 bg-ember/10 p-5 text-ember shadow-xl shadow-ink/10">
              <p className="font-black">دریافت اعلان‌ها ناموفق بود.</p>
              <p className="mt-2 font-bold">{notificationsQuery.error.message}</p>

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
            <div className="rounded-sm border border-dashed border-ink/20 bg-white/65 p-8 text-center shadow-xl shadow-ink/10">
              <h3 className="font-display text-2xl font-black text-ink">
                اعلانی نداری
              </h3>
              <p className="mt-3 font-bold text-ink/60">
                اعلان جدیدی برای نمایش وجود ندارد.
              </p>
            </div>
          ) : null}

          <div className="space-y-4">
            {notificationsQuery.data?.map((notification) => (
              <article
                key={notification.id}
                className="rounded-[1rem]  bg-white/80 p-2 "
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="shrink-0 rounded-full bg-ink/10 px-3 py-1 text-xs font-black text-ink">
                    اعلان
                  </span>

                  <div className="flex min-w-0 flex-1 items-center justify-end gap-4 text-right">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-sm font-black text-ink">
                        {getDisplayName(notification.actor)}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-ink/65">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs font-bold text-ink/45">
                        {formatTimestamp(notification.createdAt)}
                      </p>
                    </div>

                    <AvatarWithFrame
                      avatarUrl={notification.actor.avatarUrl}
                      alt={getDisplayName(notification.actor)}
                      size="lg"
                      fallback={
                        <span className="font-display text-xl font-black text-white">
                          {initials(notification.actor.username)}
                        </span>
                      }
                      className="overflow-hidden rounded-[1rem] ring-2 ring-white"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
      </div>
    </Dialog>
  );
}
