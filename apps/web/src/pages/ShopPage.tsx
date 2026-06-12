import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../components/ui/Dialog';
import { SubscriptionDialog } from '../components/ui/SubscriptionDialog';
import { Text } from '../components/ui/Text';
import { fetchMySubscription, purchaseSubscription } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';

import gemBox1Image from '../assets/shop/gem-box-1.png';
import gemBox2Image from '../assets/shop/gem-box-2.png';
import gemBox3Image from '../assets/shop/gem-box-3.png';
import gemBox4Image from '../assets/shop/gem-box-4.png';
import gemBox5Image from '../assets/shop/gem-box-5.png';
import gemBox6Image from '../assets/shop/gem-box-6.png';

import labelCategoryImage from '../assets/shop/lable-category.png';
import frameItemsImage from '../assets/shop/frame-items.png';

type SubscriptionPlan = {
  id: number;
  days: number;
  price: string;
};

type GemPack = {
  id: number;
  gems: number;
  price: string;
  image: string;
};

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 1,
    days: 30,
    price: '45 تومان',
  },
  {
    id: 2,
    days: 90,
    price: '80 تومان',
  },
  {
    id: 3,
    days: 180,
    price: '120 هزار تومان',
  },
];

const gemPacks: GemPack[] = [
  {
    id: 1,
    gems: 200,
    price: '25 تومان',
    image: gemBox1Image,
  },
  {
    id: 2,
    gems: 500,
    price: '55 تومان',
    image: gemBox2Image,
  },
  {
    id: 3,
    gems: 1200,
    price: '110 تومان',
    image: gemBox3Image,
  },
  {
    id: 4,
    gems: 2500,
    price: '200 تومان',
    image: gemBox4Image,
  },
  {
    id: 5,
    gems: 5000,
    price: '380 تومان',
    image: gemBox5Image,
  },
  {
    id: 6,
    gems: 10000,
    price: '700 تومان',
    image: gemBox6Image,
  },
];

function formatRemainingTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '-';
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (days > 0) {
    return `${days} روز ${hours} ساعت`;
  }

  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function ShopPage() {
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] =
    useState(false);
  const [pendingGemPack, setPendingGemPack] = useState<GemPack | null>(null);

  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const showToast = useToastStore((state) => state.showToast);

  const subscriptionQuery = useQuery({
    queryKey: ['subscription', 'me'],
    queryFn: () => fetchMySubscription(token!),
    enabled: Boolean(token),
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
  });

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const purchaseMutation = useMutation({
    mutationFn: (days: number) => purchaseSubscription(token!, { days }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscription', 'me'] });
      showToast('اشتراک با موفقیت فعال شد', 'success');
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : 'خطا در خرید اشتراک');
    },
  });

  const computedRemainingSeconds = useMemo(() => {
    const data = subscriptionQuery.data;
    if (!data?.active || !data.expiresAt) {
      return 0;
    }

    const expiresAtMs = new Date(data.expiresAt).getTime();
    const remaining = Math.floor((expiresAtMs - now) / 1000);
    return Math.max(0, remaining);
  }, [now, subscriptionQuery.data]);

  const subscriptionStatus = subscriptionQuery.data?.active ? 'فعال' : 'غیرفعال';
  const remainingTime = formatRemainingTime(computedRemainingSeconds);
  const statusColorClass = subscriptionQuery.data?.active
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-rose-100 text-rose-700';

  return (
    <>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-md space-y-4 px-4 pb-4 pt-4"
      >


        <div className="space-y-4">
          <div className="rounded-2xl  bg-white/75 p-4 shadow-lg shadow-ink/10">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <p className="text-xs font-bold text-ink/50">وضعیت اشتراک</p>

                <div
                  className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${statusColorClass}`}
                >
                  {subscriptionStatus}
                </div>

                <p className="text-xs font-bold text-ink/55">
                  زمان باقی‌مانده: <span className="font-black text-ink">{remainingTime}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSubscriptionDialogOpen(true)}
                className="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
              >
                تهیه اشتراک
              </button>
            </div>
          </div>

          <div className="relative w-full">
            <img
              src={labelCategoryImage}
              alt="GEMS"
              className="h-10 w-full object-fill drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]"
            />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-2">
              <Text
                preset="outlinedWhite"
                className="text-md tracking-[0.3em]"
              >
                GEMS
              </Text>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {gemPacks.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => setPendingGemPack(pack)}
                className="relative flex min-h-[180px] flex-col items-center justify-between bg-contain bg-center bg-no-repeat px-3 py-4 text-center"
                style={{ backgroundImage: `url(${frameItemsImage})` }}
              >
                <div className="pt-1 text-center">
                  <Text
                    preset="outlinedWhite"
                    className="text-lg leading-none"
                  >
                    {pack.gems}
                  </Text>
                </div>

                <img
                  src={pack.image}
                  alt={`${pack.gems} gems`}
                  className="h-14 w-14 object-contain"
                />

                <div className="mt-auto flex flex-col items-center gap-2 text-center">
                  <Text
                    preset="outlinedWhite"
                    className="text-xs leading-none"
                  >
                    {pack.price}
                  </Text>

                  <Text
                    preset="outlinedWhite"
                    className="text-sm leading-none"
                  >
                    BUY
                  </Text>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <SubscriptionDialog
        open={isSubscriptionDialogOpen}
        onClose={() => setIsSubscriptionDialogOpen(false)}
        status={subscriptionStatus}
        remainingTime={remainingTime}
        plans={subscriptionPlans}
        isPurchasing={purchaseMutation.isPending}
        onPurchase={(plan) => {
          if (!token) {
            showToast('برای خرید اشتراک ابتدا وارد شوید');
            return;
          }
          purchaseMutation.mutate(plan.days);
        }}
      />

      <Dialog
        open={pendingGemPack !== null}
        onClose={() => setPendingGemPack(null)}
        avatarType={1}
        title='تأیید خرید'
      >
        <div className="px-4 pb-2 text-center">
          <p className="text-sm font-bold text-ink">
            آیا از خرید مطمعین هستید؟
          </p>

          {pendingGemPack && (
            <div className="mt-3 flex items-center justify-center gap-3 rounded-2xl bg-white/70 p-3 shadow-sm">
              <img
                src={pendingGemPack.image}
                alt={`${pendingGemPack.gems} gems`}
                className="h-12 w-12 object-contain"
              />
              <div className="text-right">
                <p className="text-sm font-black text-ink">
                  {pendingGemPack.gems} جم
                </p>
                <p className="mt-1 text-xs font-bold text-ink/60">
                  {pendingGemPack.price}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3 px-4 pb-4">
          <button
            type="button"
            onClick={() => setPendingGemPack(null)}
            className="flex-1 rounded-xl bg-ink/10 px-4 py-2.5 text-xs font-bold text-ink transition hover:bg-ink/15"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={() => {
              if (!token) {
                showToast('برای خرید ابتدا وارد شوید');
                return;
              }
              // TODO: call purchaseGem mutation when API is ready
              showToast(`خرید ${pendingGemPack?.gems} جم با موفقیت انجام شد`, 'success');
              setPendingGemPack(null);
            }}
            className="flex-1 rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
          >
            تأیید خرید
          </button>
        </div>
      </Dialog>
    </>
  );
}
