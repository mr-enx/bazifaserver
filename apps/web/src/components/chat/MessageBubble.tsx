import { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

type MessageBubbleProps = {
  isMine: boolean;
  message: string;
  createdAt: string;
  isSeen: boolean;
  showTail?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
};

// ============== تنظیمات رنگ و استایل ==============
const BUBBLE_THEME = {
  mine: {
    background: 'linear-gradient(135deg, #227CF4 0%, #0652D3 100%)',
    border: '#2a9cfaff',
    tailFill: '#0652D3',
    text: '#ffffff',
    timeText: 'rgba(255, 255, 255, 0.8)',
    innerShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.2)',
    outerShadow: '0 4px 0 rgba(0, 0, 0, 0.15)'
  },
  other: {
    background: 'linear-gradient(135deg, #E9F5FD 0%, #ADCAEA 100%)',
    border: '#3a3a3aff',
    tailFill: '#D4E6F6',
    text: '#1f2937',
    timeText: 'rgba(31, 41, 55, 0.45)',
    innerShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.08)',
    outerShadow: '0 4px 0 rgba(0, 0, 0, 0.1)'
  }
};
// =================================================

function formatMessageTime(value: string): string {
  return new Date(value).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function SentIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
      <path fill="currentColor" d="M21 7L9 19l-5.5-5.5l1.41-1.41L9 16.17L19.59 5.59z" />
    </svg>
  );
}

function SeenIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
      <path
        fill="currentColor"
        d="M.41 13.41L6 19l1.41-1.42L1.83 12m20.41-6.42L11.66 16.17L7.5 12l-1.43 1.41L11.66 19l12-12M18 7l-1.41-1.42l-6.35 6.35l1.42 1.41z"
      />
    </svg>
  );
}

function BubbleTail({ isMine }: { isMine: boolean }) {
  const theme = isMine ? BUBBLE_THEME.mine : BUBBLE_THEME.other;
  const pointsPath = isMine ? 'M0 0 L12 14 L0 28 Z' : 'M12 0 L0 14 L12 28 Z';
  const edgesPath = isMine ? 'M0 0 L12 14 L0 28' : 'M12 0 L0 14 L12 28';

  return (
    <svg
      width="10"
      height="40"
      viewBox="0 0 12 28"
      className={isMine ? 'absolute -right-2 bottom-2' : 'absolute -left-2 bottom-2'}
      aria-hidden="true"
    >
      <path d={pointsPath} fill={theme.tailFill} />
      <path
        d={edgesPath}
        fill="none"
        stroke={theme.border}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MessageBubble({ isMine, message, createdAt, isSeen, showTail = true, isFirstInGroup = true, isLastInGroup = true }: MessageBubbleProps) {
  const isRoomInvite = message.startsWith('[ROOM_INVITE:') && message.endsWith(']');
  const inviteRoomId = isRoomInvite ? message.slice(13, -1) : null;
  const theme = isMine ? BUBBLE_THEME.mine : BUBBLE_THEME.other;

  const bubbleStyle: CSSProperties = {
    background: theme.background,
    borderColor: theme.border,
    color: theme.text,
    boxShadow: `${theme.innerShadow}, ${theme.outerShadow}`
  };

  // گوشه‌ها: گرد-بزرگ (rounded-2xl) و گرد-کم (rounded-sm)
  // برای پیام‌های من، گوشه‌های سمت راست (بالا/پایین) کمتر خمیده می‌شوند (محل دم)
  // برای پیام‌های دیگران، همین منطق قرینه با سمت چپ
  let cornerClasses = '';
  if (isFirstInGroup && isLastInGroup) {
    // تک‌پیام در گروه
    cornerClasses = isMine
      ? 'rounded-2xl rounded-br-md'
      : 'rounded-2xl rounded-bl-md';
  } else if (isFirstInGroup && !isLastInGroup) {
    // اولین پیام (بالای گروه): همه گرد، فقط پایین-راست/چپ کمتر
    cornerClasses = isMine
      ? 'rounded-2xl rounded-br-md'
      : 'rounded-2xl rounded-bl-md';
  } else if (!isFirstInGroup && isLastInGroup) {
    // آخرین پیام (پایین گروه): همه گرد، فقط بالا و پایین سمت راست/چپ کمتر
    cornerClasses = isMine
      ? 'rounded-2xl rounded-tr-md rounded-br-md'
      : 'rounded-2xl rounded-tl-md rounded-bl-md';
  } else {
    // پیام‌های وسط: همه گرد، فقط بالا و پایین سمت راست/چپ کمتر
    cornerClasses = isMine
      ? 'rounded-2xl rounded-tr-md rounded-br-md'
      : 'rounded-2xl rounded-tl-md rounded-bl-md';
  }

  return (
    <div className="flex w-full">
      <div className={`relative ${isMine ? 'ml-auto' : 'mr-auto'} max-w-[78%]`}>
        <div
          className={`${cornerClasses} border-2 px-4 py-3 text-right`}
          style={bubbleStyle}
        >
          {isRoomInvite ? (
            <div className={`rounded-xl p-3 text-center border ${isMine ? 'bg-white/20 border-white/30' : 'bg-moss/10 border-moss/20'}`}>
              <p className="font-black text-sm mb-2">دعوت به بازی</p>
              <Link
                to={`/rooms/${inviteRoomId}`}
                className={`inline-block rounded-lg px-4 py-2 text-sm font-black shadow-sm ${isMine ? 'bg-white text-ink' : 'bg-blue-500 text-white'}`}
              >
                ورود به اتاق
              </Link>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words font-bold leading-7">
              {message}
            </p>
          )}

          <div
            className="mt-2 flex items-center justify-end gap-1 text-xs font-bold"
            style={{ color: theme.timeText }}
          >
            <span>{formatMessageTime(createdAt)}</span>

            {isMine ? (
              <>
                <span>•</span>
                <span className="flex items-center">
                  {isSeen ? <SeenIcon /> : <SentIcon />}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {showTail ? <BubbleTail isMine={isMine} /> : null}
      </div>
    </div>
  );
}
