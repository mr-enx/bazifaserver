import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CityItem, ProvinceItem } from '@game-platform/shared';
import { fetchCities, fetchProvinces } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { BottomSheet } from '../ui/BottomSheet';

type LoginDialogSheetProps = {
  open: boolean;
  onClose?: () => void;
  dismissible?: boolean;
};

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function LoginDialogSheet({
  open,
  onClose,
  dismissible = false
}: LoginDialogSheetProps) {
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [cityId, setCityId] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [birthDateError, setBirthDateError] = useState<string | null>(null);

  const {
    status,
    error,
    pendingChallenge,
    pendingRegistration,
    requestLoginOtp,
    verifyOtp,
    completeRegistration,
    clearPendingChallenge,
    clearError
  } = useAuthStore();

  const helperText = useMemo(() => {
    if (!pendingChallenge) {
      return null;
    }

    return {
      expiresAt: formatTimestamp(pendingChallenge.expiresAt),
      resendAt: formatTimestamp(pendingChallenge.resendAvailableAt)
    };
  }, [pendingChallenge]);

  const selectedProvince = provinces.find((item) => String(item.id) === provinceId);
  const selectedCity = cities.find((item) => String(item.id) === cityId);



  useEffect(() => {
    if (!open) {
      clearError();
    }
  }, [open, clearError]);

  useEffect(() => {
    if (status === 'authenticated' && open) {
      onClose?.();
      navigate('/games', { replace: true });
    }
  }, [status, open, onClose, navigate]);

  useEffect(() => {
    if (!open || !pendingRegistration) {
      return;
    }

    let isCurrent = true;

    fetchProvinces()
      .then((items) => {
        if (isCurrent) {
          setProvinces(items);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setProvinces([]);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [open, pendingRegistration]);

  useEffect(() => {
    setCityId('');

    if (!provinceId) {
      setCities([]);
      return;
    }

    let isCurrent = true;

    fetchCities(Number(provinceId))
      .then((items) => {
        if (isCurrent) {
          setCities(items);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setCities([]);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [provinceId]);

  function toAsciiDigits(value: string): string {
    return value
      .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
  }

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  clearError();

  try {
    if (pendingRegistration) {
      if (!selectedProvince || !selectedCity) {
        return;
      }

      const normalizedBirthDate = toAsciiDigits(birthDate.trim()).replace(/\s+/g, '');
      if (!/^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/.test(normalizedBirthDate)) {
        setBirthDateError('تاریخ تولد را به فرمت ۱۳۸۰/۰۵/۱۲ وارد کنید');
        return;
      }

      setBirthDateError(null);
      await completeRegistration({
        fullName: fullName.trim(),
        birthDateShamsi: birthDate.trim(),
        province: selectedProvince.name,
        city: selectedCity.name,
        gender
      });

      return;
    }

    if (pendingChallenge) {
      await verifyOtp(code);
      return;
    }

    await requestLoginOtp(phone);
  } catch {
    // error is already stored in authStore and shown in UI
  }
}


  function handleEditPhone() {
    setCode('');
    clearError();
    clearPendingChallenge();
  }

  function handleClose() {
    if (!dismissible) {
      return;
    }

    onClose?.();
  }

  if (!open) {
    return null;
  }

  const isSubmitting = status === 'loading';

  const sheetTitle = pendingRegistration
    ? 'تکمیل ثبت نام'
    : pendingChallenge
      ? 'کد تایید'
      : 'ورود / ثبت نام';

  return (
    <BottomSheet
      isOpen={open}
      onClose={handleClose}
      dismissible={dismissible}
      title={sheetTitle}
      zIndex={120}
    >
      <div className="px-5 pb-5 pt-2" dir="rtl">
        <form onSubmit={handleSubmit}>
          {!pendingChallenge && !pendingRegistration ? (
            <div>
              <div className="mb-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-white/55">
                    شماره موبایل
                  </span>

                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="مثلا : 09123456789"
                    className="w-full rounded-2xl bg-white/10 px-4 py-3 text-base font-bold text-white outline-none transition placeholder:text-white/35"
                    required
                  />
                </label>
              </div>

              <p className="text-xs font-medium leading-6 text-white/55">
                ورود شما به معنی پذیرش{' '}
                <span className="font-black text-orange-400">
                  قوانین بازیفا
                </span>{' '}
                میباشد
              </p>
            </div>
          ) : null}

          {pendingChallenge ? (
            <div>
              <div className="text-center mb-4">
                <p className="text-sm font-black text-white">
                  کد برای {pendingChallenge.maskedPhone} ارسال شد
                </p>

                {helperText ? (
                  <p className="mt-2 text-xs font-medium leading-6 text-white/55">
                    اعتبار کد تا {helperText.expiresAt} است. ارسال مجدد بعد
                    از {helperText.resendAt}
                  </p>
                ) : null}
              </div>

              <div className="mb-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-white/55">
                    کد 6 رقمی
                  </span>

                  <input
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    placeholder="123456"
                    className="w-full rounded-2xl bg-white/10 px-4 py-3 text-center text-2xl font-black tracking-[0.4em] text-white outline-none transition placeholder:tracking-normal placeholder:text-white/35"
                    required
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleEditPhone}
                className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20"
              >
                تغییر شماره موبایل
              </button>
            </div>
          ) : null}

          {pendingRegistration ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 block min-w-0">
                <span className="mb-2 block text-sm font-black text-white/55">
                  نام نمایشی
                </span>

                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  placeholder="مثلا علی رضایی"
                  className="w-full min-w-0 rounded-2xl bg-white/10 px-4 py-3 text-base font-bold text-white outline-none transition placeholder:text-white/35"
                  required
                />
              </label>

              <label className="block min-w-0">
                <span className="mb-2 block text-sm font-black text-white/55">
                  تاریخ تولد (شمسی)
                </span>

                <input
                  value={birthDate}
                  onChange={(event) => {
                    let value = toAsciiDigits(event.target.value).replace(/\s+/g, '');
                    
                    value = value.replace(/-/g, '/');
                    
                    let digits = value.replace(/\D/g, '');
                    
                    let formatted = '';
                    if (digits.length > 0) {
                      formatted += digits.slice(0, 4);
                      if (digits.length > 4) {
                        formatted += '/' + digits.slice(4, 6);
                        if (digits.length > 6) {
                          formatted += '/' + digits.slice(6, 8);
                        }
                      }
                    }
                    
                    setBirthDate(formatted);
                    setBirthDateError(null);
                  }}
                  inputMode="numeric"
                  placeholder="مثلا ۱۳۸۰/۰۵/۱۲"
                  className="w-full min-w-0 rounded-2xl bg-white/10 px-4 py-3 text-base font-bold text-white outline-none transition placeholder:text-white/35"
                  maxLength={10}
                  required
                />
              </label>

              <label className="block min-w-0">
                <span className="mb-2 block text-sm font-black text-white/55">
                  جنسیت
                </span>

                <select
                  value={gender}
                  onChange={(event) =>
                    setGender(event.target.value as 'male' | 'female')
                  }
                  className="w-full min-w-0 rounded-2xl bg-white/10 px-4 py-3 text-base font-bold text-white outline-none transition"
                  required
                >
                  <option value="male">مرد</option>
                  <option value="female">زن</option>
                </select>
              </label>

              <label className="block min-w-0">
                <span className="mb-2 block text-sm font-black text-white/55">
                  استان
                </span>

                <select
                  value={provinceId}
                  onChange={(event) => setProvinceId(event.target.value)}
                  className="w-full min-w-0 rounded-2xl bg-white/10 px-4 py-3 text-base font-bold text-white outline-none transition"
                  required
                >
                  <option value="">انتخاب استان</option>
                  {provinces.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-0">
                <span className="mb-2 block text-sm font-black text-white/55">
                  شهر
                </span>

                <select
                  value={cityId}
                  onChange={(event) => setCityId(event.target.value)}
                  disabled={!provinceId}
                  className="w-full min-w-0 rounded-2xl bg-white/10 px-4 py-3 text-base font-bold text-white outline-none transition"
                  required
                >
                  <option value="">
                    {provinceId ? 'انتخاب شهر' : 'ابتدا استان را انتخاب کنید'}
                  </option>
                  {provinceId
                    ? cities.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))
                    : null}
                </select>
              </label>
            </div>
          ) : null}

          {birthDateError ? (
            <div className="mt-4 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-bold text-ember">
              {birthDateError}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-bold text-ember">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-2xl bg-moss px-6 py-3 text-base font-black text-white shadow-xl transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? 'لطفا صبر کنید...'
              : pendingRegistration
                ? 'تکمیل ثبت نام'
                : pendingChallenge
                  ? 'تایید کد'
                  : 'ارسال کد'}
          </button>

          {dismissible ? (
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 font-black text-white transition hover:bg-white/20"
            >
              بستن
            </button>
          ) : null}
        </form>
      </div>
    </BottomSheet>
  );
}
