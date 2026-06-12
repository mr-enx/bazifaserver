import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { upgradeCastle, fetchCastleUpgradeRequirements, type CastleUpgradeRequirements } from '../../lib/api';
import { Dialog } from '../ui/Dialog';

type CastleUpgradeDialogProps = {
  open: boolean;
  onClose: () => void;
  currentLevel: number;
};

export function CastleUpgradeDialog({
  open,
  onClose,
  currentLevel
}: CastleUpgradeDialogProps) {
  const { token, refreshCurrentUser } = useAuthStore();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [requirements, setRequirements] = useState<CastleUpgradeRequirements | null>(null);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false);

  useEffect(() => {
    if (open && token) {
      setIsLoadingRequirements(true);

      fetchCastleUpgradeRequirements(token)
        .then(setRequirements)
        .catch(err => {
          console.error('Error fetching data:', err);
          alert('خطا در دریافت اطلاعات ارتقا');
        })
        .finally(() => setIsLoadingRequirements(false));
    }
  }, [open, token]);

  const canUpgrade = () => {
    if (!requirements) return false;
    return requirements.items.every((item) => item.hasEnoughScore);
  };

  const handleUpgrade = async () => {
    if (!token || isUpgrading || !canUpgrade()) return;

    try {
      setIsUpgrading(true);
      const result = await upgradeCastle(token);
      if (result.success) {
        alert(`تبریک! قلعه شما به سطح ${result.newLevel} ارتقا یافت.`);
        await refreshCurrentUser();
        onClose();
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'ارتقا با خطا مواجه شد');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      avatarType={5}
      title='ارتقای قلعه'
    >
      {isLoadingRequirements ? (
        <div className="py-10">
          <p className="text-gray-500">در حال دریافت اطلاعات...</p>
        </div>
      ) : requirements ? (
        <div className="mb-6 rounded-xl bg-gray-100 p-4 text-sm text-gray-800">
          <p className="mb-2 font-bold text-gray-900">
            قلعه سطح {currentLevel} ➔ سطح {requirements.nextLevel}
          </p>
          <p>
            برای ارتقا به سطح {requirements.nextLevel}، به امتیازات زیر نیاز دارید:
          </p>
          <ul className="mt-3 space-y-2 text-right">
            {requirements.items.map((item) => {
              return (
                <li key={item.slug} className="flex flex-col gap-1 rounded-lg bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span>{item.gameName}:</span>
                    <span className="font-bold text-blue-600">{item.requiredScore} امتیاز</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-1 text-xs">
                    <span className="text-gray-500">امتیاز فعلی شما:</span>
                    <span className={`font-bold ${item.hasEnoughScore ? 'text-green-600' : 'text-red-600'}`}>
                      {item.userScore}
                      {item.hasEnoughScore ? ' (کافی است)' : ' (کافی نیست)'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="py-10">
          <p className="text-red-500">خطا در نمایش اطلاعات</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isUpgrading}
          className="flex-1 rounded-xl bg-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition active:scale-95 disabled:opacity-50"
        >
          انصراف
        </button>
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={isUpgrading || !canUpgrade()}
          className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50 disabled:bg-gray-400"
        >
          {isUpgrading ? 'در حال ارتقا...' : 'ارتقا'}
        </button>
      </div>
    </Dialog>
  );
}
