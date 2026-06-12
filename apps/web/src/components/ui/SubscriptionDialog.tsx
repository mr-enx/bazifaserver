import { Dialog } from './Dialog';

type SubscriptionPlan = {
  id: number;
  days: number;
  price: string;
};

type SubscriptionDialogProps = {
  open: boolean;
  onClose: () => void;
  status: string;
  remainingTime: string;
  plans: SubscriptionPlan[];
  isPurchasing?: boolean;
  onPurchase: (plan: SubscriptionPlan) => void;
};

export function SubscriptionDialog({
  open,
  onClose,
  status,
  remainingTime,
  plans,
  isPurchasing = false,
  onPurchase,
}: SubscriptionDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      avatarType={5}
      title='اشتراک ویژه'
    >


      <div className="mb-5 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-ink/55">وضعیت فعلی</p>

          <span
            className={
              status === 'فعال'
                ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700'
                : 'rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700'
            }
          >
            {status}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-ink/55">زمان باقی‌مانده</p>
          <span className="text-xs font-black text-ink">{remainingTime}</span>
        </div>
      </div>

      <div className="space-y-3">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            disabled={isPurchasing}
            onClick={() => onPurchase(plan)}
            className="flex w-full items-center justify-between rounded-2xl  bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div>
              <p className="text-sm font-black text-ink">
                اشتراک {plan.days} روزه
              </p>

              <p className="mt-1 text-xs font-bold text-ink/55">
                فعال‌سازی فوری بعد از خرید
              </p>
            </div>

            <span className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-ink">
              {plan.price}
            </span>
          </button>
        ))}
      </div>
    </Dialog>
  );
}
