import { ChangeEvent, useRef, useState } from 'react';

type AvatarUploadProps = {
  onUploadSuccess: (url: string) => void;
  onUploadError: (error: string) => void;
};

export function AvatarUpload({ onUploadSuccess, onUploadError }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      onUploadError('فرمت فایل نامعتبر است. فقط JPG، PNG، GIF و WEBP مجاز هستند.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      onUploadError('حجم فایل نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('https://dl-genius.ir/Bazifa/api/upload.php', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.url) {
        onUploadSuccess(data.url);
      } else {
        console.error('Upload failed:', data);
        onUploadError(data.error || 'خطا در آپلود فایل');
      }
    } catch (err) {
      console.error('Upload connection error:', err);
      onUploadError('خطا در برقراری ارتباط با سرور آپلود');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="mt-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <button
        type="button"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/20 bg-white px-4 py-8 text-sm font-bold text-ink/60 transition hover:border-moss/40 hover:bg-moss/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading ? (
          <>
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            در حال آپلود...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <path fill="currentColor" d="M11 16V7.85l-2.6 2.6L7 9l5-5l5 5l-1.4 1.45l-2.6-2.6V16h-2Zm-5 4q-.825 0-1.413-.588T4 18v-3h2v3h12v-3h2v3q0 .825-.588 1.413T18 20H6Z" />
            </svg>
            انتخاب و آپلود عکس جدید
          </>
        )}
      </button>
    </div>
  );
}
