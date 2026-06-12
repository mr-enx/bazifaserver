import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../lib/api';
import { getXpProgressInfo } from '../lib/xp';
import { clearStoredToken, useAuthStore } from '../stores/authStore';
import { AvatarUpload } from '../components/profile/AvatarUpload';
import { getAllAvatars } from '../lib/avatar';
import { FullScreenImageViewer } from '../components/profile/FullScreenImageViewer';
import { AvatarWithFrame } from '../components/profile/AvatarWithFrame';

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
    <div className="rounded-2xl  bg-canvas p-4">
      <p className="text-sm font-bold text-ink/50">{label}</p>
      <h3 className="mt-2 truncate text-2xl font-black">
        {formatProfileValue(value)}
      </h3>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, token, status, error, updateAvatar, clearError, setAnonymous } = useAuthStore();

  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl ?? '');
  }, [user?.avatarUrl]);

  // Removed handleSave as it's no longer used

  async function handleLogout() {
    try {
      setIsLoggingOut(true);

      if (token) {
        await logoutUser(token).catch(() => undefined);
      }

      clearStoredToken();
      setAnonymous();

      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl  bg-white p-6 shadow-soft">
        <p className="text-ink/70">User not found.</p>
      </div>
    );
  }

  const xpInfo = getXpProgressInfo(user.xp);
  const displayName = getDisplayName(user);

  return (
    <div className="mx-auto max-w-xl rounded-3xl  bg-white p-6 shadow-soft">
      <div className="rounded-2xl  bg-canvas p-4">
        <p className="text-sm font-bold text-ink/50">نام</p>
        <h2 className="mt-2 truncate text-2xl font-black">{displayName}</h2>
        <p className="mt-1 text-sm font-bold text-ink/45">
          @{user.username}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <ProfileInfoItem label="نام" value={user.fullName} />
        <ProfileInfoItem label="نام کاربری" value={user.username} />
        <ProfileInfoItem label="سن" value={user.age} />
        <ProfileInfoItem label="شهر" value={user.city} />
        <ProfileInfoItem label="استان" value={user.province} />
        <ProfileInfoItem label="Level" value={xpInfo.level} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-2xl  bg-canvas p-4">
          <p className="text-sm font-bold text-ink/50">Gem</p>
          <h3 className="mt-2 text-2xl font-black">{user.gem.toLocaleString('en-US')}</h3>
        </div>
      </div>

      {isViewerOpen && (
        <FullScreenImageViewer
          images={getAllAvatars(avatarUrl)}
          canDelete={true}
          onDelete={async (index) => {
            const urls = getAllAvatars(avatarUrl);
            const deletedUrl = urls[index];
            urls.splice(index, 1);
            const newAvatarStr = urls.join(',');
            
            try {
              // Update local state first for quick UI response
              setAvatarUrl(newAvatarStr);
              if (urls.length === 0) setIsViewerOpen(false);
              
              // Update database
              await updateAvatar(newAvatarStr);
              
              // Delete from host
              const formData = new FormData();
              formData.append('url', deletedUrl);
              
              const response = await fetch('https://dl-genius.ir/Bazifa/api/delete.php', {
                method: 'POST',
                body: formData
              });
              
              const result = await response.json();
              console.log('نتیجه درخواست حذف به هاست دانلود:', result);
              
            } catch (err) {
              console.error('Failed to update avatar or delete from host', err);
            }
          }}
          onClose={() => setIsViewerOpen(false)}
        />
      )}

      <div className="mt-6 rounded-2xl  bg-canvas p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-ink/50">تصویر پروفایل</p>
        </div>

        <div className="mt-3 flex justify-center">
          <div 
            className="relative cursor-pointer"
            onClick={() => avatarUrl && setIsViewerOpen(true)}
          >
            <AvatarWithFrame
              avatarUrl={avatarUrl}
              alt={`${displayName} avatar`}
              size="xl"
              className="h-32 w-32"
            />
            {avatarUrl && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full">
                {getAllAvatars(avatarUrl).length} عکس
              </div>
            )}
          </div>
        </div>

        <AvatarUpload
          onUploadSuccess={async (url) => {
            const newAvatarUrl = avatarUrl ? `${avatarUrl},${url}` : url;
            setAvatarUrl(newAvatarUrl);
            try {
              setIsSaving(true);
              await updateAvatar(newAvatarUrl);
              setSuccessMessage('تصویر با موفقیت آپلود و ذخیره شد.');
            } catch(e) {
              // handle error
            } finally {
              setIsSaving(false);
            }
          }}
          onUploadError={(err) => {
            setSuccessMessage(null);
            alert(err); // Simple alert for now to show the error
          }}
        />

        {error ? (
          <p className="mt-4 rounded-2xl bg-ember/10 px-4 py-3 font-bold text-ember">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mt-4 rounded-2xl bg-moss/10 px-4 py-3 font-bold text-moss">
            {successMessage}
          </p>
        ) : null}
      </div>

      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="mt-6 rounded-full bg-ink px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoggingOut ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  );
}
