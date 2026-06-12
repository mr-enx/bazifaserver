import type { ClientToServerEvents, ServerToClientEvents } from '@game-platform/shared';
import { io, type Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// استخراج دامنه اصلی برای جلوگیری از اتصال اشتباه به Namespace (مثل /api)
const SOCKET_URL = API_URL.startsWith('http') ? new URL(API_URL).origin : API_URL;

type LobbySocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: LobbySocket | null = null;
let activeToken: string | null = null;

export function getLobbySocket(token: string): LobbySocket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token },
      transports: ['websocket'], // اجبار به استفاده از وب‌سوکت برای رفع ارور 400 در لیارا
      path: '/socket.io/'
    });
    activeToken = token;
  }

  if (activeToken !== token) {
    activeToken = token;
    socket.auth = { token };
    if (socket.connected) {
      socket.disconnect();
    }
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function pauseLobbySocket(): void {
  socket?.disconnect();
}

export function resumeLobbySocket(): void {
  if (socket && !socket.connected) {
    socket.connect();
  }
}

export function disconnectLobbySocket(): void {
  socket?.disconnect();
  socket = null;
  activeToken = null;
}
