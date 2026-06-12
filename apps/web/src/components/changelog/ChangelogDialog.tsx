import type { AppSettingsResponse } from '@game-platform/shared';
import { Dialog } from '../ui/Dialog';

type ChangelogDialogProps = {
  open: boolean;
  onClose: () => void;
  settings: AppSettingsResponse | null;
};

export function ChangelogDialog({ open, onClose, settings }: ChangelogDialogProps) {
  if (!settings) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      avatarType={4}
      title='آخرین تغییرات'
    >
      <h2 className="text-xl font-bold text-gray-900 p-6">
        آخرین تغییرات (نسخه {settings.version})
      </h2>

      <div className="max-h-[60vh] overflow-y-auto text-right px-4 mb-6" >
        <ul className="list-disc list-inside space-y-2 pr-6">
          {settings.changelog.map((change, index) => (
            <li key={index} className="text-gray-700 text-sm leading-relaxed">
              {change}
            </li>
          ))}
        </ul>
      </div>

    </Dialog>
  );
}
