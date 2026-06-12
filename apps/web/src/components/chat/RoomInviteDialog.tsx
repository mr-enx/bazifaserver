import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchFriends, sendDirectMessage } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { Dialog } from '../ui/Dialog';
import { AvatarWithFrame } from '../profile/AvatarWithFrame';

import backgroundListUser from '../../assets/backgrond-list-user.png';
import { FriendListItem } from '@game-platform/shared';

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function getDisplayName(user: { fullName?: string | null; username: string }): string {
  return user.fullName?.trim() || user.username;
}

type RoomInviteDialogProps = {
  open: boolean;
  onClose: () => void;
  roomId: string;
};

export function RoomInviteDialog({ open, onClose, roomId }: RoomInviteDialogProps) {
  const token = useAuthStore((state) => state.token);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());

  const friendsQuery = useQuery({
    queryKey: ['friends'],
    queryFn: () => fetchFriends(token!),
    enabled: Boolean(token && open),
  });

  const onlineFriends = useMemo(
    () => (friendsQuery.data ?? []).filter((friend) => friend.isOnline),
    [friendsQuery.data]
  );

  const inviteMutation = useMutation({
    mutationFn: ({ friendId, text }: { friendId: string; text: string }) =>
      sendDirectMessage(token!, friendId, text),
    onSuccess: (_, variables) => {
      setInvitedFriends((prev) => {
        const next = new Set(prev);
        next.add(variables.friendId);
        return next;
      });
    },
  });

  function handleInvite(friend: FriendListItem) {
    if (invitedFriends.has(friend.id) || inviteMutation.isPending) {
      return;
    }

    const inviteText = `[ROOM_INVITE:${roomId}]`;
    inviteMutation.mutate({ friendId: friend.id, text: inviteText });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      avatarType={7}
      title='دعوت دوستان'
    >

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {friendsQuery.isLoading ? (
            <div className="py-8 text-center font-black text-ink/60">در حال بارگذاری دوستان...</div>
          ) : friendsQuery.isError ? (
            <div className="py-8 text-center font-black text-ember">خطا در بارگذاری دوستان</div>
          ) : onlineFriends.length === 0 ? (
            <div className="py-8 text-center font-black text-ink/60">
              هیچ دوست آنلاینی برای دعوت پیدا نشد.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {onlineFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between  bg-[length:100%_100%] bg-center bg-no-repeat p-3 shadow-sm"
                  style={{ backgroundImage: `url(${backgroundListUser})` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      <AvatarWithFrame
                        avatarUrl={friend.avatarUrl}
                        alt={friend.username}
                        size="md"
                        fallback={
                          <span className="font-display text-base font-black text-white">
                            {initials(friend.username)}
                          </span>
                        }
                        className="overflow-hidden rounded-[14px] bg-ink"
                      />
                    </div>

                    <div className="text-right">
                      <h3 className="font-display text-base font-black text-ink">
                        {getDisplayName(friend)}
                      </h3>
                      <p className="text-xs font-bold text-moss">آنلاین</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInvite(friend)}
                    disabled={
                      invitedFriends.has(friend.id) ||
                      (inviteMutation.isPending &&
                        inviteMutation.variables?.friendId === friend.id)
                    }
                    className="rounded-xl bg-moss px-4 py-2 text-sm font-black text-white transition disabled:opacity-50"
                  >
                    {invitedFriends.has(friend.id) ? 'دعوت شد' : 'دعوت'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
    </Dialog>
  );
}
