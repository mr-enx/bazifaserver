import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  fetchAdminReports,
  fetchAdminRooms,
  fetchAdminUsers,
  type AdminUserItem
} from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { AvatarWithFrame } from '../components/profile/AvatarWithFrame';
import type { RoomListItem } from '@game-platform/shared';

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

type ReportItem = {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterUsername: string;
  reportedUserId: string;
  reportedUserName: string;
  reportedUserUsername: string;
  reason: string | null;
  createdAt: string;
};

type TabKey = 'rooms' | 'users' | 'reports';

export function ObserverPanelPage() {
  const { user, token, status } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabKey>('users');

  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);

  const [roomsLoading, setRoomsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const isObserver = user?.role === 'observer';

  useEffect(() => {
    if (!token || !isObserver || activeTab !== 'rooms') {
      return;
    }

    let cancelled = false;

    async function loadRooms() {
      if (!token) return;

      setRoomsLoading(true);
      setRoomsError(null);

      try {
        const data = await fetchAdminRooms(token);
        if (!cancelled) {
          setRooms(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load rooms';
          setRoomsError(message);
          setRooms([]);
        }
      } finally {
        if (!cancelled) {
          setRoomsLoading(false);
        }
      }
    }

    void loadRooms();

    return () => {
      cancelled = true;
    };
  }, [token, isObserver, activeTab]);

  useEffect(() => {
    if (!token || !isObserver) {
      setUsersLoading(false);
      return;
    }

    let cancelled = false;

    async function loadUsers() {
      if (!token) return;

      setUsersLoading(true);
      setUsersError(null);

      try {
        const data = await fetchAdminUsers(token);
        if (!cancelled) {
          setUsers(data);
        }
      } catch (err) {
        if (!cancelled) {
          setUsersError(err instanceof Error ? err.message : 'Failed to load users');
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [token, isObserver]);

  useEffect(() => {
    if (!token || !isObserver || activeTab !== 'reports') {
      return;
    }

    let cancelled = false;

    async function loadReports() {
      if (!token) return;

      setReportsLoading(true);
      setReportsError(null);

      try {
        const data = await fetchAdminReports(token);
        if (!cancelled) {
          setReports(data);
        }
      } catch (err) {
        if (!cancelled) {
          setReportsError(err instanceof Error ? err.message : 'Failed to load reports');
        }
      } finally {
        if (!cancelled) {
          setReportsLoading(false);
        }
      }
    }

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [token, isObserver, activeTab]);

  if (status === 'idle' || status === 'loading') {
    return (
      <section className="rounded-[2rem]  bg-white/70 p-8 shadow-xl shadow-ink/10">
        <p className="text-center font-black">Loading panel...</p>
      </section>
    );
  }

  if (status !== 'authenticated' || !token) {
    return <Navigate to="/login" replace />;
  }

  if (!isObserver) {
    return <Navigate to="/games" replace />;
  }

  return (
    <section className="min-w-0 space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('rooms')}
          className={`rounded-full px-5 py-3 text-sm font-black transition ${
            activeTab === 'rooms' ? 'bg-ink text-white' : ' bg-white text-ink'
          }`}
        >
          Rooms
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`rounded-full px-5 py-3 text-sm font-black transition ${
            activeTab === 'users' ? 'bg-ink text-white' : ' bg-white text-ink'
          }`}
        >
          Users
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`rounded-full px-5 py-3 text-sm font-black transition ${
            activeTab === 'reports' ? 'bg-ink text-white' : ' bg-white text-ink'
          }`}
        >
          Reports
        </button>
      </div>

      {activeTab === 'rooms' ? (
        roomsLoading ? (
          <div className="rounded-[2rem]  bg-white/70 p-8 text-center font-black shadow-xl shadow-ink/10">
            Loading rooms...
          </div>
        ) : roomsError ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">
            {roomsError}
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-[2rem]  bg-white/70 p-8 text-center font-black shadow-xl shadow-ink/10">
            No rooms found.
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <article
                  key={room.id}
                  className="relative min-w-0 rounded-3xl  bg-white/80 p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-lg font-black text-ink">
                        Room {room.id.slice(0, 6)}
                      </h2>
                      <div className="flex gap-1">
                        <span
                          className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                            room.isLocked ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {room.isLocked ? 'Locked' : 'Public'}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                            room.status === 'waiting'
                              ? 'bg-green-100 text-green-700'
                              : room.status === 'in_game'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-ink/10 text-ink/50'
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-ink/60">
                      <div className="flex justify-between">
                        <span className="font-bold">Players:</span>
                        <span className="font-black text-ink">
                          {room.currentPlayerCount} / {room.maxPlayers}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold">Created:</span>
                        <span>{new Intl.DateTimeFormat('fa-IR').format(new Date(room.createdAt))}</span>
                      </div>
                    </div>

                    <div className="mt-2 rounded-xl bg-ink/5 p-2">
                      <p className="mb-1 text-[10px] font-black text-ink/40 uppercase">Players List</p>
                      <div className="grid grid-cols-2 gap-1">
                        {room.players.map((p, idx) => (
                          <div key={idx} className="truncate text-[10px] font-bold text-ink/70">
                            • {p.fullName || p.username}
                          </div>
                        ))}
                        {room.players.length === 0 && (
                          <div className="col-span-2 text-center text-[10px] text-ink/30 italic">
                            No players
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )
      ) : activeTab === 'users' ? (
        usersLoading ? (
          <div className="rounded-[2rem]  bg-white/70 p-8 text-center font-black shadow-xl shadow-ink/10">
            Loading users...
          </div>
        ) : usersError ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">
            {usersError}
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-[2rem]  bg-white/70 p-8 text-center font-black shadow-xl shadow-ink/10">
            No users found.
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((userItem) => (
                <article
                  key={userItem.id}
                  className="relative min-w-0 rounded-3xl  bg-white/80 p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      <AvatarWithFrame
                        avatarUrl={userItem.avatarUrl}
                        alt={userItem.username}
                        size="md"
                        fallback={
                          <span className="font-display text-xs font-black text-ink/30">
                            {initials(userItem.username)}
                          </span>
                        }
                        className="overflow-hidden rounded-2xl ring-2 ring-ink/5"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            userItem.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {userItem.role}
                        </span>
                      </div>

                      <h2 className="mt-1 truncate font-display text-sm font-black text-ink">
                        {userItem.fullName || userItem.username}
                      </h2>
                      <p className="truncate text-[11px] font-bold text-ink/40">@{userItem.username}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ink/5 pt-3 text-[10px]">
                    <div className="flex flex-col">
                      <span className="font-bold text-ink/40">شماره:</span>
                      <span className="font-black text-ink">{userItem.phone || '---'}</span>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-ink/40">تاریخ ثبت‌نام:</span>
                      <span className="font-black text-ink">
                        {new Intl.DateTimeFormat('fa-IR').format(new Date(userItem.createdAt))}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-bold text-ink/40">XP / Gem:</span>
                      <span className="font-black text-ink">
                        {userItem.xp} / {userItem.gem}
                      </span>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-ink/40">جنسیت:</span>
                      <span className="font-black text-ink">
                        {userItem.gender === 'male' ? 'مرد' : userItem.gender === 'female' ? 'زن' : '---'}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-bold text-ink/40">مکان:</span>
                      <span className="font-black text-ink truncate">
                        {userItem.province ? `${userItem.province}، ${userItem.city}` : '---'}
                      </span>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-ink/40">تاریخ تولد:</span>
                      <span className="font-black text-ink">
                        {userItem.birthDateShamsi ? `${userItem.birthDateShamsi}` : '---'}
                        {userItem.age ? ` (${userItem.age} سال)` : ''}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )
      ) : activeTab === 'reports' ? (
        reportsLoading ? (
          <div className="rounded-[2rem]  bg-white/70 p-8 text-center font-black shadow-xl shadow-ink/10">
            Loading reports...
          </div>
        ) : reportsError ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">
            {reportsError}
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-[2rem]  bg-white/70 p-8 text-center font-black shadow-xl shadow-ink/10">
            No reports found.
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid gap-3">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="relative min-w-0 rounded-3xl  bg-white/80 p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-[10px] font-black uppercase text-rose-700">
                          Report
                        </span>
                        <span className="text-[10px] font-bold text-ink/40">
                          {new Intl.DateTimeFormat('fa-IR').format(new Date(report.createdAt))}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl bg-ink/5 p-3">
                        <p className="mb-2 text-[10px] font-black uppercase text-ink/40">Reporter</p>
                        <p className="font-display text-sm font-black text-ink">{report.reporterName}</p>
                        <p className="text-xs font-bold text-ink/40">@{report.reporterUsername}</p>
                      </div>

                      <div className="rounded-2xl bg-rose-50/50 p-3">
                        <p className="mb-2 text-[10px] font-black uppercase text-rose-400">Reported User</p>
                        <p className="font-display text-sm font-black text-ink">{report.reportedUserName}</p>
                        <p className="text-xs font-bold text-ink/40">@{report.reportedUserUsername}</p>
                      </div>
                    </div>

                    {report.reason && (
                      <div className="rounded-2xl border border-ink/5 bg-white p-3">
                        <p className="mb-1 text-[10px] font-black uppercase text-ink/40">Reason</p>
                        <p className="text-sm font-bold text-ink/70">{report.reason}</p>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}
