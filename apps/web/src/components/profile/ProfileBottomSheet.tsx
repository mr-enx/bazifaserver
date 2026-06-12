import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchUserProfile, sendFriendRequest, submitUserReport } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { FullScreenImageViewer } from './FullScreenImageViewer';
import { AvatarWithFrame } from '../profile/AvatarWithFrame';
import { getAllAvatars } from '../../lib/avatar';
import { BottomSheet } from '../ui/BottomSheet';

type ProfileBottomSheetProps = {
  isOpen: boolean;
  userId: string | null;
  onClose: () => void;
};

type ProfileInfoItemProps = {
  label: string;
  value: string | number | null | undefined;
};

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function formatProfileValue(value: string | number | null | undefined): string | number {
  if (typeof value === 'string') {
    return value.trim() || '—';
  }

  return value ?? '—';
}

function getDisplayName(user: { fullName?: string | null; username: string }): string {
  return user.fullName?.trim() || user.username;
}

function ProfileInfoItem({ label, value }: ProfileInfoItemProps) {
  return (
    <div className="rounded-2xl  bg-white/10 px-4 py-3">
      <p className="text-xs font-black text-white/55">{label}</p>
      <p className="mt-1 truncate font-black text-white">{formatProfileValue(value)}</p>
    </div>
  );
}

function ProfileSheetSkeleton() {
  return (
    <div className="px-5 pb-5 pt-2 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-[1.75rem] bg-white/10" />
        <div className="min-w-0 flex-1">
          <div className="h-3 w-20 rounded bg-white/10" />
          <div className="mt-3 h-8 w-40 rounded bg-white/10" />
          <div className="mt-2 h-4 w-28 rounded bg-white/10" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="h-[72px] rounded-2xl bg-white/10" />
        <div className="h-[72px] rounded-2xl bg-white/10" />
        <div className="h-[72px] rounded-2xl bg-white/10" />
        <div className="h-[72px] rounded-2xl bg-white/10" />
      </div>

      <div className="mt-6 space-y-3">
        <div className="h-[72px] rounded-2xl bg-white/10" />
        <div className="h-[72px] rounded-2xl bg-white/10" />
      </div>
    </div>
  );
}

export function ProfileBottomSheet({ isOpen, userId, onClose }: ProfileBottomSheetProps) {
  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.user);
  const showToast = useToastStore((state) => state.showToast);

  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchUserProfile(token!, userId!),
    enabled: isOpen && Boolean(userId) && Boolean(token),
    staleTime: 60_000
  });

  const user = profileQuery.data ?? null;
  const isOwnProfile = Boolean(user && currentUser && user.id === currentUser.id);

  const {
    mutate: submitFriendRequest,
    isPending: isSubmittingFriendRequest,
    isSuccess: hasSentFriendRequest,
    reset: resetFriendRequestState
  } = useMutation({
    mutationFn: (receiverId: string) => sendFriendRequest(token!, { receiverId }),
    onSuccess: () => {
      showToast('درخواست دوستی ارسال شد.', 'success');
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : 'ارسال درخواست دوستی ناموفق بود.', 'error');
    }
  });

  const {
    mutate: submitReport,
    isPending: isSubmittingReport,
    isSuccess: hasSentReport,
    reset: resetReportState
  } = useMutation({
    mutationFn: (reportedUserId: string) => submitUserReport(token!, { reportedUserId }),
    onSuccess: () => {
      showToast('گزارش با موفقیت ثبت شد.', 'success');
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : 'ثبت گزارش ناموفق بود.', 'error');
    }
  });

  useEffect(() => {
    resetFriendRequestState();
    resetReportState();
  }, [isOpen, resetFriendRequestState, resetReportState, userId]);

  const friendRequestDescription = !token
    ? 'برای ارسال درخواست باید وارد حساب شوی.'
    : isOwnProfile
      ? 'نمی‌توانی برای خودت درخواست دوستی بفرستی.'
      : hasSentFriendRequest
        ? 'اعلان برای این کاربر ارسال شد.'
        : 'برای این بازیکن درخواست دوستی بفرست.';

  const friendRequestCta = isOwnProfile
    ? 'خودت'
    : isSubmittingFriendRequest
      ? 'در حال ارسال'
      : hasSentFriendRequest
        ? 'ارسال شد'
        : 'ارسال';

  const content = !userId ? (
    <div className="px-5 pb-5 pt-2">
      <div className="rounded-2xl border border-ember/15 bg-ember/5 px-4 py-4 text-sm font-bold text-ember">
        شناسه کاربر برای نمایش پروفایل پیدا نشد.
      </div>
    </div>
  ) : profileQuery.isLoading ? (
    <ProfileSheetSkeleton />
  ) : profileQuery.isError || !user ? (
    <div className="px-5 pb-5 pt-2">
      <div className="rounded-2xl border border-ember/15 bg-ember/5 px-4 py-4 text-sm font-bold text-ember">
        اطلاعات پروفایل دریافت نشد.
      </div>

      <button
        type="button"
        onClick={() => {
          void profileQuery.refetch();
        }}
        className="mt-4 w-full rounded-2xl  bg-white/10 px-4 py-3 font-black text-white transition hover:bg-white/20"
      >
        تلاش مجدد
      </button>
    </div>
  ) : (
    <div className="px-5 pb-5 pt-2">
      <div className="flex items-center gap-4">
        <AvatarWithFrame
        avatarUrl={user.avatarUrl}
        alt={user.username}
        size="lg"
        onClick={() => {
          if (user.avatarUrl) setIsViewerOpen(true);
        }}
        fallback={
          <span className="font-display text-2xl font-black text-white">
            {initials(user.username)}
          </span>
        }
        className="overflow-hidden rounded-[1.75rem] bg-ink"
      />

        <div className="min-w-0 flex-1">
          <h2 id="profile-sheet-title" className="mt-1 truncate font-display text-2xl font-black text-white">
            {getDisplayName(user)}
          </h2>
          <p className="mt-1 truncate text-sm font-bold text-white/60">@{user.username}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <ProfileInfoItem label="نام" value={user.fullName} />
        <ProfileInfoItem label="سن" value={user.age} />
        <ProfileInfoItem label="استان" value={user.province} />
        <ProfileInfoItem label="شهر" value={user.city} />
      </div>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          disabled={!token || isOwnProfile || isSubmittingFriendRequest || hasSentFriendRequest}
          onClick={() => {
            if (!token || isOwnProfile || isSubmittingFriendRequest || hasSentFriendRequest) {
              return;
            }

            submitFriendRequest(user.id);
          }}
          className="flex w-full items-center justify-between rounded-2xl  bg-white/10 px-4 py-4 text-left transition hover:border-moss/30 hover:bg-moss/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div>
            <p className="font-black text-white">درخواست دوستی</p>
            <p className="mt-1 text-sm font-bold text-white/60">{friendRequestDescription}</p>
          </div>

          <span className="rounded-full bg-moss px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
            {friendRequestCta}
          </span>
        </button>

        <button
          type="button"
          disabled={!token || isOwnProfile || isSubmittingReport || hasSentReport}
          onClick={() => {
            if (!token || isOwnProfile || isSubmittingReport || hasSentReport) {
              return;
            }

            submitReport(user.id);
          }}
          className="flex w-full items-center justify-between rounded-2xl border border-ember/30 bg-ember/10 px-4 py-4 text-left transition hover:border-ember/50 hover:bg-ember/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div>
            <p className="font-black text-ember">Report</p>
            <p className="mt-1 text-sm font-bold text-white/60">
              {isOwnProfile ? 'نمی‌توانی خودت را گزارش کنی.' : hasSentReport ? 'گزارش ارسال شد.' : 'گزارش تخلف این کاربر'}
            </p>
          </div>

          <span className="rounded-full bg-ember px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
            {isSubmittingReport ? 'Sending' : hasSentReport ? 'Sent' : 'Report'}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {isViewerOpen && user && (
        <FullScreenImageViewer
          images={getAllAvatars(user.avatarUrl)}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Profile"
        zIndex={70}
      >
        {content}
      </BottomSheet>
    </>
  );
}
