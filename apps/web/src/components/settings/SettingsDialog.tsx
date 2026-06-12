import { useEffect, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { useSettingsStore } from '../../stores/settingsStore';

type SettingsDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { soundVolume, setSoundVolume } = useSettingsStore();
  const [localVolume, setLocalVolume] = useState(soundVolume);

  useEffect(() => {
    if (open) {
      setLocalVolume(soundVolume);
    }
  }, [open, soundVolume]);

  const commitVolume = () => {
    if (localVolume !== soundVolume) {
      setSoundVolume(localVolume);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      avatarType={1}
      title='بخش تنظیمات'
    >
      <div className="flex flex-col gap-6 p-6 text-right" dir="rtl">
        <div className="flex flex-col gap-2">
          <label htmlFor="sound-volume" className="text-gray-900 font-medium">
            میزان صدای افکت‌ها: {localVolume}٪
          </label>
          <input
            id="sound-volume"
            type="range"
            min="0"
            max="100"
            value={localVolume}
            onChange={(e) => setLocalVolume(Number(e.target.value))}
            onMouseUp={commitVolume}
            onTouchEnd={commitVolume}
            onKeyUp={commitVolume}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            commitVolume();
            onClose();
          }}
          className="mt-4 w-full rounded-xl bg-[#26532b] px-4 py-3 font-medium text-white shadow-md transition active:scale-95"
        >
          ذخیره
        </button>
      </div>
    </Dialog>
  );
}
