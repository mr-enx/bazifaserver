const PENDING_ROOM_LEAVE_KEY = 'bazifa:pending-room-leave';

type PendingRoomLeave = {
  roomId: string;
  expiresAt: number;
};

const PENDING_ROOM_LEAVE_TTL_MS = 15_000;

export function markPendingRoomLeave(roomId: string): void {
  window.sessionStorage.setItem(
    PENDING_ROOM_LEAVE_KEY,
    JSON.stringify({
      roomId,
      expiresAt: Date.now() + PENDING_ROOM_LEAVE_TTL_MS
    } satisfies PendingRoomLeave)
  );
}

export function isPendingRoomLeave(roomId: string): boolean {
  const pendingRoomLeave = readPendingRoomLeave();
  return pendingRoomLeave?.roomId === roomId;
}

export function clearPendingRoomLeave(roomId?: string): void {
  const pendingRoomLeave = readPendingRoomLeave();

  if (!roomId || pendingRoomLeave?.roomId === roomId) {
    window.sessionStorage.removeItem(PENDING_ROOM_LEAVE_KEY);
  }
}

function readPendingRoomLeave(): PendingRoomLeave | null {
  try {
    const value = window.sessionStorage.getItem(PENDING_ROOM_LEAVE_KEY);
    const pendingRoomLeave = value ? (JSON.parse(value) as PendingRoomLeave) : null;

    if (!pendingRoomLeave || pendingRoomLeave.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(PENDING_ROOM_LEAVE_KEY);
      return null;
    }

    return pendingRoomLeave;
  } catch {
    window.sessionStorage.removeItem(PENDING_ROOM_LEAVE_KEY);
    return null;
  }
}
