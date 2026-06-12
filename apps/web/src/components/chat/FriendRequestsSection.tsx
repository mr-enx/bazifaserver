import type { NotificationItem, OutgoingFriendRequestItem } from '@game-platform/shared';
import { AvatarWithFrame } from '../profile/AvatarWithFrame';

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

type FriendRequestsSectionProps = {
  incomingNotifications: NotificationItem[];
  outgoingRequests: OutgoingFriendRequestItem[];
  backgroundListUser: string;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onCancel: (requestId: string) => void;
  isUpdatingRequest: (requestId: string) => boolean;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
};

export function FriendRequestsSection({
  incomingNotifications,
  outgoingRequests,
  backgroundListUser,
  onAccept,
  onReject,
  onCancel,
  isUpdatingRequest,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry
}: FriendRequestsSectionProps) {
  if (isLoading) {
    return (
      <div className="rounded-[2rem]  bg-white/75 p-6 text-center font-black text-ink shadow-xl shadow-ink/10">
        در حال بارگذاری درخواست‌های دوستی...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-4 text-amber-700 shadow-xl shadow-ink/10">
        <p className="font-black">بارگذاری درخواست‌های دوستی ناموفق بود.</p>
        <p className="mt-2 font-bold">{errorMessage ?? 'لطفا دوباره تلاش کن.'}</p>

        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-full bg-amber-500 px-5 py-3 font-black text-white"
          >
            تلاش دوباره
          </button>
        ) : null}
      </div>
    );
  }

  if (incomingNotifications.length === 0 && outgoingRequests.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-ink/20 bg-white/65 p-8 text-center shadow-xl shadow-ink/10">
        <h2 className="font-display text-2xl font-black text-ink">
          درخواست دوستی جدیدی نداری
        </h2>
        <p className="mt-3 font-bold text-ink/60">
          وقتی کسی برایت درخواست بفرستد، از این بخش می‌توانی آن را مدیریت کنی.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {incomingNotifications.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-right font-display text-lg font-black text-ink">
            درخواست‌های دریافتی
          </h2>

          {incomingNotifications.map((notification) => {
            const isUpdating = isUpdatingRequest(notification.friendRequest.id);

            return (
              <article
                key={notification.id}
                className="w-full  bg-[length:100%_100%] bg-center bg-no-repeat p-4 shadow-lg shadow-ink/10"
                style={{
                  backgroundImage: `url(${backgroundListUser})`
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => onAccept(notification.friendRequest.id)}
                      disabled={isUpdating}
                      className="rounded-2xl bg-moss px-4 py-2 text-sm font-black text-white shadow-lg shadow-moss/20 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isUpdating ? '...' : 'قبول'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onReject(notification.friendRequest.id)}
                      disabled={isUpdating}
                      className="rounded-2xl border border-ember/25 bg-ember/10 px-4 py-2 text-sm font-black text-ember transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isUpdating ? '...' : 'رد'}
                    </button>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-right">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-lg font-black text-ink">
                        {getDisplayName(notification.actor)}
                      </h2>

                      <p className="mt-1 text-[11px] font-bold text-ink/45">
                        {formatTimestamp(notification.friendRequest.createdAt)}
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
                      className="overflow-hidden rounded-[5px] bg-ink"
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {outgoingRequests.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-right font-display text-lg font-black text-ink">
            درخواست‌های ارسالی
          </h2>

          {outgoingRequests.map((item) => {
            const isUpdating = isUpdatingRequest(item.request.id);

            return (
              <article
                key={item.request.id}
                className="w-full  bg-[length:100%_100%] bg-center bg-no-repeat p-4 shadow-lg shadow-ink/10"
                style={{
                  backgroundImage: `url(${backgroundListUser})`
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => onCancel(item.request.id)}
                      disabled={isUpdating}
                      className="rounded-2xl border border-ember/25 bg-ember/10 px-4 py-2 text-sm font-black text-ember transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isUpdating ? '...' : 'کنسل'}
                    </button>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-right">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-lg font-black text-ink">
                        {getDisplayName(item.receiver)}
                      </h2>

                      <p className="mt-1 text-[11px] font-bold text-ink/45">
                        {formatTimestamp(item.request.createdAt)}
                      </p>
                    </div>

                    <AvatarWithFrame
                      avatarUrl={item.receiver.avatarUrl}
                      alt={getDisplayName(item.receiver)}
                      size="lg"
                      fallback={
                        <span className="font-display text-xl font-black text-white">
                          {initials(item.receiver.username)}
                        </span>
                      }
                      className="overflow-hidden rounded-[5px] bg-ink"
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
