import { Link } from 'react-router-dom';
import type { FriendListItem } from '@game-platform/shared';
import { AvatarWithFrame } from '../profile/AvatarWithFrame';

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function getDisplayName(user: { fullName?: string | null; username: string }): string {
  return user.fullName?.trim() || user.username;
}

type FriendsListSectionProps = {
  friends: FriendListItem[];
  backgroundListUser: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
};

export function FriendsListSection({
  friends,
  backgroundListUser,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry
}: FriendsListSectionProps) {
  if (isLoading) {
    return (
      <div className="rounded-[2rem]  bg-white/75 p-6 text-center font-black text-ink shadow-xl shadow-ink/10">
        در حال بارگذاری دوستان...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[2rem] border border-ember/20 bg-ember/10 p-5 text-ember shadow-xl shadow-ink/10">
        <p className="font-black">بارگذاری لیست دوستان ناموفق بود.</p>
        <p className="mt-2 font-bold">{errorMessage ?? 'لطفا دوباره تلاش کن.'}</p>

        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-full bg-ember px-5 py-3 font-black text-white"
          >
            تلاش دوباره
          </button>
        ) : null}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-ink/20 bg-white/65 p-8 text-center shadow-xl shadow-ink/10">
        <h2 className="font-display text-2xl font-black text-ink">
          هنوز دوستی اضافه نشده
        </h2>
        <p className="mt-3 font-bold text-ink/60">
          از دکمه پایین صفحه برای ارسال درخواست دوستی با شماره تماس استفاده کن.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {friends.map((friend) => (
        <Link
          to={`/chat/${friend.id}`}
          key={friend.id}
          className="block w-full  bg-[length:100%_100%] bg-center bg-no-repeat p-4 shadow-lg shadow-ink/10 transition hover:-translate-y-0.5 hover:shadow-xl"
          style={{
            backgroundImage: `url(${backgroundListUser})`
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <AvatarWithFrame
                avatarUrl={friend.avatarUrl}
                alt={getDisplayName(friend)}
                size="lg"
                fallback={
                  <span className="font-display text-xl font-black text-white">
                    {initials(friend.username)}
                  </span>
                }
                className="overflow-hidden rounded-[5px] bg-ink"
              />

              <span
                className={`absolute bottom-1 right-1 z-20 h-5 w-5 rounded-full border-2 border-white ${
                  friend.isOnline ? 'bg-green-300' : 'bg-ink/30'
                }`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h2 className="truncate font-display text-lg font-black text-ink">
                  {getDisplayName(friend)}
                </h2>

                {friend.unreadCount > 0 ? (
                  <span className="shrink-0 rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">
                    {friend.unreadCount} پیام جدید
                  </span>
                ) : null}
              </div>

              <p
                className={`mt-1 line-clamp-1 text-sm font-bold ${
                  friend.unreadCount > 0 ? 'text-blue-500' : 'text-ink/55'
                }`}
              >
                {friend.lastMessage
                  ? (friend.lastMessage.message.startsWith('[ROOM_INVITE:') && friend.lastMessage.message.endsWith(']')
                      ? 'دعوت به بازی'
                      : friend.lastMessage.message)
                  : 'هنوز پیامی بین شما رد و بدل نشده است.'}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
