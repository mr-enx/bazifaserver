import { FormEvent, useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Dialog } from '../ui/Dialog';
import { fetchProvinces, fetchCities } from '../../lib/api';
import type { ProvinceItem, CityItem } from '@game-platform/shared';
import { AvatarUpload } from './AvatarUpload';
import { FullScreenImageViewer } from './FullScreenImageViewer';
import { getPrimaryAvatar, getAllAvatars } from '../../lib/avatar';
import defaultProfile from '../../assets/default_profile.png';

type EditProfileDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function EditProfileDialog({ open, onClose }: EditProfileDialogProps) {
  const { user, updateProfile, updateAvatar, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [provinceName, setProvinceName] = useState('');
  const [cityName, setCityName] = useState('');
  const [bio, setBio] = useState('');
  
  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  useEffect(() => {
    if (open && user) {
      setFullName(user.fullName || '');
      setBirthDate(user.birthDateShamsi || '');
      setGender(user.gender || 'male');
      setProvinceName(user.province || '');
      setCityName(user.city || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || '');
      setSuccessMessage(null);
      clearError();
    }
  }, [open, user, clearError]);

  useEffect(() => {
    if (open) {
      fetchProvinces().then(setProvinces).catch(console.error);
    }
  }, [open]);

  useEffect(() => {
    if (provinceName) {
      const province = provinces.find(p => p.name === provinceName);
      if (province) {
        fetchCities(province.id).then(setCities).catch(console.error);
      } else {
        setCities([]);
      }
    } else {
      setCities([]);
    }
  }, [provinceName, provinces]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      await updateProfile({
        fullName,
        birthDateShamsi: birthDate,
        gender,
        province: provinceName,
        city: cityName,
        bio,
      });
      setSuccessMessage('اطلاعات با موفقیت به‌روزرسانی شد.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      // Error is handled by authStore
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {isViewerOpen && user && (
        <FullScreenImageViewer
          images={getAllAvatars(avatarUrl || user.avatarUrl)}
          canDelete={true}
          onDelete={async (index) => {
            const urls = getAllAvatars(avatarUrl || user.avatarUrl);
            const deletedUrl = urls[index];
            urls.splice(index, 1);
            const newAvatarStr = urls.join(',');

            try {
              // Update local state first
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
    <Dialog
      open={open}
      onClose={onClose}
      avatarType={1}
      title='ویرایش پروفایل'
    >

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="px-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block">
              <span className="mb-1.5 block text-xs font-black text-ink/60">نام و نام خانوادگی</span>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full rounded-xl  bg-white px-4 py-3 text-sm font-bold text-ink outline-none focus:border-amber-400"
                placeholder="مثلا علی رضایی"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-ink/60">تاریخ تولد (شمسی)</span>
              <input
                type="text"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full rounded-xl  bg-white px-4 py-3 text-sm font-bold text-ink outline-none focus:border-amber-400"
                placeholder="۱۳۸۰/۰۱/۰۱"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-ink/60">جنسیت</span>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as 'male' | 'female')}
                className="w-full rounded-xl  bg-white px-4 py-3 text-sm font-bold text-ink outline-none focus:border-amber-400"
              >
                <option value="male">مرد</option>
                <option value="female">زن</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-ink/60">استان</span>
              <select
                value={provinceName}
                onChange={e => {
                  setProvinceName(e.target.value);
                  setCityName('');
                }}
                className="w-full rounded-xl  bg-white px-4 py-3 text-sm font-bold text-ink outline-none focus:border-amber-400"
                required
              >
                <option value="">انتخاب استان</option>
                {provinces.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-ink/60">شهر</span>
              <select
                value={cityName}
                onChange={e => setCityName(e.target.value)}
                className="w-full rounded-xl  bg-white px-4 py-3 text-sm font-bold text-ink outline-none focus:border-amber-400"
                required
                disabled={!provinceName}
              >
                <option value="">انتخاب شهر</option>
                {cities.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </label>

            <label className="col-span-2 block">
              <span className="mb-1.5 block text-xs font-black text-ink/60">بیوگرافی</span>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="w-full rounded-xl  bg-white px-4 py-3 text-sm font-bold text-ink outline-none focus:border-amber-400 min-h-[100px] resize-none"
                placeholder="چیزی درباره خودت بنویس..."
                maxLength={500}
              />
            </label>
            
          </div>

          <div className="mt-6 rounded-2xl  bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-ink/60">
                تصویر پروفایل
              </span>
            </div>

            <div className="mt-3 flex justify-center">
              <div 
                className="relative cursor-pointer"
                onClick={() => avatarUrl && setIsViewerOpen(true)}
              >
                <img
                  src={getPrimaryAvatar(avatarUrl) || defaultProfile}
                  alt="آواتار"
                  className="h-24 w-24 rounded-2xl border-2 border-white object-cover shadow-sm"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = defaultProfile;
                  }}
                />
                {avatarUrl && (
                  <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {getAllAvatars(avatarUrl).length}
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
          </div>
          
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-ink px-4 py-4 text-sm font-black text-white shadow-lg transition active:scale-95 disabled:opacity-60"
        >
          {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </button>
        </div>

        {error && (
          <p className="rounded-xl bg-ember/10 px-4 py-3 text-xs font-bold text-ember">
            {error}
          </p>
        )}

        {successMessage && (
          <p className="rounded-xl bg-moss/10 px-4 py-3 text-xs font-bold text-moss">
            {successMessage}
          </p>
        )}

      </form>
    </Dialog>
    </>
  );
}
