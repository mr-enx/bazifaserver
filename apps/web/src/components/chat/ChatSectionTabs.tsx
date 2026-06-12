type ChatSectionTab = 'friends' | 'requests';

type ChatSectionTabsProps = {
  activeTab: ChatSectionTab;
  onChange: (tab: ChatSectionTab) => void;
  requestsCount: number;
};

export function ChatSectionTabs({
  activeTab,
  onChange,
  requestsCount
}: ChatSectionTabsProps) {
  return (
    <div className="sticky top-0 z-20 rounded-[2rem]  bg-white/90 p-2 shadow-lg shadow-ink/10 backdrop-blur">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange('friends')}
          className={`rounded-[1.25rem] px-4 py-3 text-sm font-black transition ${
            activeTab === 'friends'
              ? 'bg-moss text-white shadow-lg shadow-moss/20'
              : 'bg-white text-ink/70 hover:bg-ink/5'
          }`}
        >
          لیست دوستان
        </button>

        <button
          type="button"
          onClick={() => onChange('requests')}
          className={`relative rounded-[1.25rem] px-4 py-3 text-sm font-black transition ${
            activeTab === 'requests'
              ? 'bg-moss text-white shadow-lg shadow-moss/20'
              : 'bg-white text-ink/70 hover:bg-ink/5'
          }`}
        >
          درخواست های دوستی

          {requestsCount > 0 ? (
            <span className="absolute left-3 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
              {requestsCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
