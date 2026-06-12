import { useLocation, useNavigate, matchPath } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchFriends } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Text } from './ui/Text';

import iconHome from '../assets/icon-home.png';
import iconShop from '../assets/icon-shop.png';
import iconSocial from '../assets/icon-social.png';

export function AppNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const isRoomLobbyPage =
    Boolean(matchPath('/rooms/:roomId', location.pathname)) ||
    Boolean(matchPath('/rooms/:roomId/lobby', location.pathname));

  const isRoomGamePage = Boolean(
    matchPath('/rooms/:roomId/game', location.pathname)
  );

  const isDirectChatPage = Boolean(
    matchPath('/chat/:friendId', location.pathname)
  );

  if (isRoomLobbyPage || isRoomGamePage || isDirectChatPage) {
    return null;
  }

  const friendsQuery = useQuery({
    queryKey: ['friends'],
    queryFn: () => fetchFriends(token!),
    enabled: Boolean(token),
  });

  const totalUnreadMessages = (friendsQuery.data ?? []).reduce(
    (total, friend) => total + friend.unreadCount,
    0
  );

  const isAdmin = user?.role === 'admin';
  const isObserver = user?.role === 'observer';
  const panelPath = isAdmin ? '/panel' : isObserver ? '/observer-panel' : null;

  const items = [
    {
      key: 'shop',
      label: 'Shop',
      icon: iconShop,
      path: '/shop',
      active: location.pathname === '/shop',
    },
    {
      key: 'home',
      label: 'Battle',
      icon: iconHome,
      path: '/games',
      active: location.pathname === '/games',
    },
    {
      key: 'chat',
      label: 'Chat',
      icon: iconSocial,
      path: '/chat',
      active: location.pathname === '/chat',
      hasUnreadMessages: totalUnreadMessages > 0,
    },
    ...(panelPath
      ? [
          {
            key: 'panel',
            label: 'Panel',
            icon: null,
            path: panelPath,
            active: location.pathname === panelPath,
          },
        ]
      : []),
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-ink/10 backdrop-blur overflow-visible"
      style={{
        height: '100px',
        background:
          'linear-gradient(to bottom, #ffffffff 0%, #2C9BB7 2%, #1f6299ff 100%)',
      }}
    >
      <div
        className="mx-auto grid max-w-6xl"
        style={{
          height: '100px',
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            title={item.label}
            className="relative flex h-[100px] w-full flex-col items-center justify-center border-0 bg-transparent p-0 shadow-none overflow-visible"
          >
            {item.active && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(255,255,255,0) 20%, rgba(3, 176, 245, 0.33) 50%, rgba(0, 204, 255, 0.6) 80%)',
                }}
              />
            )}

            {item.icon ? (
              <div
                className="relative z-10 flex flex-col items-center justify-center transition-all duration-300"
                style={{
                  transform: item.active
                    ? 'translateY(-5px) scale(1.1)'
                    : 'translateY(0px) scale(1)',
                }}
              >
                <img
                  src={item.icon}
                  alt={item.label}
                  className="block object-contain transition-all duration-300"
                  style={{
                    width: '72px',
                    height: '72px',
                    minWidth: '72px',
                    minHeight: '72px',
                    flexShrink: 0,
                    filter: item.active
                      ? 'drop-shadow(0 10px 10px rgba(0, 110, 255, 1))'
                      : 'drop-shadow(0 20px 20px rgba(3, 141, 221, 0.5))',
                  }}
                />

                <Text
                  as="span"
                  preset="outlinedWhite"
                  className="leading-none transition-all duration-300"
                  style={{
                    marginTop: '-8px',
                    fontSize: '10px',
                    letterSpacing: '0.04em',
                    opacity: item.active ? 1 : 0.4,
                    transform: item.active
                      ? 'translateY(0px)'
                      : 'translateY(-3px)',
                    pointerEvents: 'none',
                  }}
                >
                  {item.label}
                </Text>
              </div>
            ) : (
              <Text
                as="span"
                preset="outlinedWhite"
                className="relative z-10 text-sm"
              >
                {item.label}
              </Text>
            )}

            {'hasUnreadMessages' in item && item.hasUnreadMessages ? (
              <div className="absolute left-4 top-4 z-20 grid h-6 min-w-[24px] place-items-center rounded-full border-2 border-white bg-red-600 px-1 shadow-lg">
                <Text
                  as="span"
                  preset="levelBadge"
                  style={{
                    fontSize: '11px',
                    lineHeight: 1,
                    WebkitTextStroke: '0.6px black',
                  }}
                >
                  {totalUnreadMessages}
                </Text>
              </div>
            ) : null}

            {index < items.length - 1 && (
              <span
                className="absolute right-0 top-1/2 -translate-y-1/2"
                style={{
                  width: '1px',
                  height: '28px',
                  backgroundColor: 'rgba(255,255,255,0.35)',
                }}
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
