import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { logoutUser } from '../../lib/api';
import { clearStoredToken, useAuthStore } from '../../stores/authStore';
import { Dialog } from '../ui/Dialog';
import { EditProfileDialog } from './EditProfileDialog';
import { AvatarWithFrame } from '../profile/AvatarWithFrame';

type ProfileDialogProps = {
  open: boolean;
  onClose: () => void;
};

type ProfileInfoItemProps = {
  label: string;
  value: string | number | null | undefined;
};

function getDisplayName(user: { fullName?: string | null; username: string }): string {
  return user.fullName?.trim() || user.username;
}

function formatProfileValue(value: string | number | null | undefined): string | number {
  if (typeof value === 'string') {
    return value.trim() || '—';
  }

  return value ?? '—';
}

function ProfileInfoItem({ label, value }: ProfileInfoItemProps) {
  return (
    <div className="rounded-2xl  bg-canvas px-4 py-3">
      <p className="text-xs font-black text-ink/45">{label}</p>
      <p className="mt-1 truncate font-black text-ink">
        {formatProfileValue(value)}
      </p>
    </div>
  );
}

export function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const navigate = useNavigate();

  const {
    user,
    token,
    status,
    error,
    updateAvatar,
    clearError,
    setAnonymous,
  } = useAuthStore();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    clearError();
  }, [open, clearError]);

  // Removed handleSave as it's no longer used

  async function handleLogout() {
    try {
      setIsLoggingOut(true);

      if (token) {
        await logoutUser(token).catch(() => undefined);
      }

      clearStoredToken();
      setAnonymous();
      onClose();

      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        avatarType={1}
        title='نمایه پروفایل'
      >


      {status === 'loading' ? (
        <div className="rounded-2xl  bg-white/70 p-4 text-center font-black text-ink">
          در حال بارگذاری...
        </div>
      ) : !user ? (
        <div className="rounded-2xl  bg-white/70 p-4 text-center font-black text-ink">
          کاربر پیدا نشد.
        </div>
      ) : (
        <>
          <div className="p-3">
            <div className="flex items-center gap-4">
              <AvatarWithFrame
                avatarUrl={user.avatarUrl}
                alt={`${getDisplayName(user)} avatar`}
                size="lg"
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink/50">نام</p>
                <h3 className="mt-1 truncate text-2xl font-black text-ink">
                  {getDisplayName(user)}
                </h3>
                <p className="mt-1 truncate text-sm font-bold text-ink/45">
                  @{user.username}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <ProfileInfoItem label="نام" value={user.fullName} />
              <ProfileInfoItem label="سن" value={user.age} />
              <ProfileInfoItem label="استان" value={user.province} />
              <ProfileInfoItem label="شهر" value={user.city} />
              <div className="col-span-2">
                <ProfileInfoItem label="بیوگرافی" value={user.bio} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                setIsEditOpen(true);
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl  bg-white px-4 py-3 text-sm font-black text-ink transition hover:bg-ink/5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83l3.75 3.75z"/>
              </svg>
              ویرایش اطلاعات
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-4 w-full rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? 'در حال خروج...' : 'خروج از حساب'}
          </button>
        </>
      )}
    </Dialog>

    <EditProfileDialog 
      open={isEditOpen} 
      onClose={() => setIsEditOpen(false)} 
    />
    </>
  );
}
