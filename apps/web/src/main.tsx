import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { App } from './App';
import { ProtectedRoute } from './components/ProtectedRoute';
import { GameRoomsPage } from './pages/GameRoomsPage';
import { GamePage } from './pages/GamePage';
import { GamesPage } from './pages/GamesPage';
import { GamesHomePage } from './pages/GamesHomePage';
import { ChatPage } from './pages/ChatPage';
import { DirectChatPage } from './pages/DirectChatPage';
import { ShopPage } from './pages/ShopPage';
import ProfilePage from './pages/ProfilePage';
import { RoomLobbyPage } from './pages/RoomLobbyPage';
import { RootRedirect } from './pages/RootRedirect';
import { AdminPanelPage } from './pages/AdminPanelPage';
import { ObserverPanelPage } from './pages/ObserverPanelPage';
import { NotificationsPage } from './pages/NotificationsPage';
import './styles.css';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <RootRedirect />
      },
      {
        path: 'games',
        element: <GamesHomePage />
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'games/list',
            element: <GamesPage />
          },
          {
            path: 'games/:gameId/rooms',
            element: <GameRoomsPage />
          },
          {
            path: 'rooms/:roomId',
            element: <RoomLobbyPage />
          },
          {
            path: 'rooms/:roomId/game',
            element: <GamePage />
          },
          {
            path: 'chat',
            element: <ChatPage />
          },
          {
            path: 'chat/:friendId',
            element: <DirectChatPage />
          },
          {
            path: 'shop',
            element: <ShopPage />
          },
          {
            path: 'profile',
            element: <ProfilePage />
          },
          {
            path: 'panel',
            element: <AdminPanelPage />
          },
          {
            path: 'observer-panel',
            element: <ObserverPanelPage />
          },
          {
            path: 'notifications',
            element: <NotificationsPage />
          }
        ]
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </QueryClientProvider>
  </React.StrictMode>
);
