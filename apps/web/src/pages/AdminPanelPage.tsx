import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  createAdminCity,
  deleteAdminCity,
  deleteAdminRoom,
  deleteAdminUser,
  fetchAdminCities,
  fetchAdminProvinces,
  fetchAdminReports,
  fetchAdminRooms,
  fetchAdminUsers,
  updateAdminCity,
  type AdminUserItem
} from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { AvatarWithFrame } from '../components/profile/AvatarWithFrame';
import type { CityItem, ProvinceItem, RoomListItem } from '@game-platform/shared';

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

type TabKey = 'rooms' | 'users' | 'locations' | 'reports';

export function AdminPanelPage() {
  const { user, token, status } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabKey>('users');

  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | ''>('');
  const [cities, setCities] = useState<CityItem[]>([]);
  const [cityDraftNames, setCityDraftNames] = useState<Record<number, string>>({});

  const [roomsLoading, setRoomsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [savingCityId, setSavingCityId] = useState<number | null>(null);
  const [deletingCityId, setDeletingCityId] = useState<number | null>(null);
  const [newCityName, setNewCityName] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!token || !isAdmin || activeTab !== 'rooms') {
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
  }, [token, isAdmin, activeTab]);

  useEffect(() => {
    if (!token || !isAdmin) {
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
  }, [token, isAdmin]);

  useEffect(() => {
    if (!token || !isAdmin || activeTab !== 'locations') {
      return;
    }

    let cancelled = false;

    async function loadProvinces() {
      if (!token) return;
      setLocationsLoading(true);
      setLocationsError(null);

      try {
        const data = await fetchAdminProvinces(token);
        if (!cancelled) {
          setProvinces(data);
        }
      } catch (err) {
        if (!cancelled) {
          setLocationsError(err instanceof Error ? err.message : 'Failed to load provinces');
        }
      } finally {
        if (!cancelled) {
          setLocationsLoading(false);
        }
      }
    }

    void loadProvinces();

    return () => {
      cancelled = true;
    };
  }, [token, isAdmin, activeTab]);

  useEffect(() => {
    if (!token || !isAdmin || activeTab !== 'locations' || !selectedProvinceId) {
      setCities([]);
      setCityDraftNames({});
      return;
    }

    let cancelled = false;

    async function loadCities() {
      if (!token) return;
      setLocationsLoading(true);
      setLocationsError(null);

      try {
        const data = await fetchAdminCities(token, Number(selectedProvinceId));
        if (!cancelled) {
          setCities(data);
          setCityDraftNames({});
        }
      } catch (err) {
        if (!cancelled) {
          setLocationsError(err instanceof Error ? err.message : 'Failed to load cities');
          setCities([]);
          setCityDraftNames({});
        }
      } finally {
        if (!cancelled) {
          setLocationsLoading(false);
        }
      }
    }

    void loadCities();

    return () => {
      cancelled = true;
    };
  }, [token, isAdmin, activeTab, selectedProvinceId]);

  useEffect(() => {
    if (!token || !isAdmin || activeTab !== 'reports') {
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
  }, [token, isAdmin, activeTab]);

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

  if (!isAdmin) {
    return <Navigate to="/games" replace />;
  }

  async function handleDeleteRoom(roomId: string) {
    if (!token) return;

    const confirmed = window.confirm('Are you sure you want to delete this room?');
    if (!confirmed) {
      return;
    }

    setDeletingRoomId(roomId);
    setRoomsError(null);

    try {
      await deleteAdminRoom(roomId, token);
      setRooms((current) => current.filter((room) => room.id !== roomId));
    } catch (err) {
      setRoomsError(err instanceof Error ? err.message : 'Failed to delete room');
    } finally {
      setDeletingRoomId(null);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!token) return;

    const confirmed = window.confirm('Are you sure you want to delete this user?');
    if (!confirmed) {
      return;
    }

    setDeletingUserId(userId);
    setUsersError(null);

    try {
      await deleteAdminUser(userId, token);
      setUsers((current) => current.filter((userItem) => userItem.id !== userId));
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleCreateCity() {
    if (!token || !selectedProvinceId) return;

    const name = newCityName.trim();
    if (name.length < 2) {
      setLocationsError('City name is too short');
      return;
    }

    setLocationsError(null);
    setLocationsLoading(true);

    try {
      const created = await createAdminCity(token, {
        provinceId: Number(selectedProvinceId),
        name
      });

      setCities((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCityName('');
    } catch (err) {
      setLocationsError(err instanceof Error ? err.message : 'Failed to create city');
    } finally {
      setLocationsLoading(false);
    }
  }

  async function handleSaveCity(cityId: number) {
    if (!token) return;

    const draftName = (cityDraftNames[cityId] ?? '').trim();
    if (!draftName || draftName.length < 2) {
      setLocationsError('City name is invalid');
      return;
    }

    setSavingCityId(cityId);
    setLocationsError(null);

    try {
      const updated = await updateAdminCity(token, cityId, { name: draftName });
      setCities((current) => current.map((item) => (item.id === cityId ? updated : item)));
      setCityDraftNames((current) => {
        const next = { ...current };
        delete next[cityId];
        return next;
      });
    } catch (err) {
      setLocationsError(err instanceof Error ? err.message : 'Failed to update city');
    } finally {
      setSavingCityId(null);
    }
  }

  async function handleDeleteCity(cityId: number) {
    if (!token) return;

    const confirmed = window.confirm('Are you sure you want to delete this city?');
    if (!confirmed) {
      return;
    }

    setDeletingCityId(cityId);
    setLocationsError(null);

    try {
      await deleteAdminCity(token, cityId);
      setCities((current) => current.filter((item) => item.id !== cityId));
      setCityDraftNames((current) => {
        const next = { ...current };
        delete next[cityId];
        return next;
      });
    } catch (err) {
      setLocationsError(err instanceof Error ? err.message : 'Failed to delete city');
    } finally {
      setDeletingCityId(null);
    }
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
          onClick={() => setActiveTab('locations')}
          className={`rounded-full px-5 py-3 text-sm font-black transition ${
            activeTab === 'locations'
              ? 'bg-ink text-white'
              : ' bg-white text-ink'
          }`}
        >
          Locations
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`rounded-full px-5 py-3 text-sm font-black transition ${
            activeTab === 'reports'
              ? 'bg-ink text-white'
              : ' bg-white text-ink'
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
                        <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                          room.isLocked ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {room.isLocked ? 'Locked' : 'Public'}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                          room.status === 'waiting' ? 'bg-green-100 text-green-700' : 
                          room.status === 'in_game' ? 'bg-amber-100 text-amber-700' : 
                          'bg-ink/10 text-ink/50'
                        }`}>
                          {room.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-ink/60">
                      <div className="flex justify-between">
                        <span className="font-bold">Players:</span>
                        <span className="font-black text-ink">{room.currentPlayerCount} / {room.maxPlayers}</span>
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
                          <div className="col-span-2 text-center text-[10px] text-ink/30 italic">No players</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-1 border-t border-ink/5 pt-3">
                      <button
                        type="button"
                        onClick={() => void handleDeleteRoom(room.id)}
                        disabled={deletingRoomId === room.id}
                        className="w-full rounded-xl bg-rose-50 py-2 text-xs font-black text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        {deletingRoomId === room.id ? 'Deleting...' : 'Delete Room'}
                      </button>
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
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          userItem.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {userItem.role}
                        </span>
                        
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenMenuUserId(openMenuUserId === userItem.id ? null : userItem.id)}
                            className="rounded-lg p-1 transition hover:bg-ink/5"
                          >
                            <svg className="h-4 w-4 text-ink/40" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>

                          {openMenuUserId === userItem.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuUserId(null)} />
                              <div className="absolute left-0 top-full z-20 mt-1 min-w-[100px] rounded-xl  bg-white p-1 shadow-xl">
                                <button
                                  type="button"
                                  className="flex w-full items-center px-3 py-2 text-right text-xs font-bold text-ink transition hover:bg-ink/5"
                                  onClick={() => {
                                    alert('Edit functionality not implemented');
                                    setOpenMenuUserId(null);
                                  }}
                                >
                                  ویرایش
                                </button>
                                <button
                                  type="button"
                                  className="flex w-full items-center px-3 py-2 text-right text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                                  onClick={() => {
                                    void handleDeleteUser(userItem.id);
                                    setOpenMenuUserId(null);
                                  }}
                                >
                                  حذف
                                </button>
                              </div>
                            </>
                          )}
                        </div>
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
                      <span className="font-black text-ink">{userItem.xp} / {userItem.gem}</span>
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
      ) : activeTab === 'locations' ? (
        locationsLoading && provinces.length === 0 ? (
          <div className="rounded-[2rem]  bg-white/70 p-8 text-center font-black shadow-xl shadow-ink/10">
            Loading locations...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[2rem]  bg-white/80 p-4 shadow-lg shadow-ink/5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-ink/70">Province</span>
                  <select
                    value={selectedProvinceId}
                    onChange={(event) =>
                      setSelectedProvinceId(event.target.value ? Number(event.target.value) : '')
                    }
                    className="w-full rounded-2xl  bg-white px-4 py-3 text-sm font-bold text-ink outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-orange-200/60"
                  >
                    <option value="">Select province</option>
                    {provinces.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="min-w-0">
                  <span className="mb-2 block text-sm font-black text-ink/70">Add city</span>
                  <div className="flex gap-3">
                    <input
                      value={newCityName}
                      onChange={(event) => setNewCityName(event.target.value)}
                      placeholder="City name"
                      disabled={!selectedProvinceId || locationsLoading}
                      className="w-full min-w-0 rounded-2xl  bg-white px-4 py-3 text-sm font-bold text-ink outline-none transition placeholder:text-ink/35 focus:border-amber-400 focus:ring-4 focus:ring-orange-200/60 disabled:cursor-not-allowed disabled:bg-ink/5"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCreateCity()}
                      disabled={!selectedProvinceId || locationsLoading || newCityName.trim().length < 2}
                      className="shrink-0 rounded-2xl bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {locationsError ? (
              <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">
                {locationsError}
              </div>
            ) : null}

            {!selectedProvinceId ? (
              <div className="rounded-[2rem]  bg-white/70 p-8 text-center font-black shadow-xl shadow-ink/10">
                Select a province to manage its cities.
              </div>
            ) : locationsLoading && cities.length === 0 ? (
              <div className="rounded-[2rem]  bg-white/70 p-8 text-center font-black shadow-xl shadow-ink/10">
                Loading cities...
              </div>
            ) : cities.length === 0 ? (
              <div className="rounded-[2rem]  bg-white/70 p-8 text-center font-black shadow-xl shadow-ink/10">
                No cities found for this province.
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid gap-4">
                  {cities.map((city) => {
                    const draft = cityDraftNames[city.id];
                    const currentValue = draft !== undefined ? draft : city.name;
                    const isDirty = draft !== undefined && draft.trim() !== city.name;
                    const isSaving = savingCityId === city.id;
                    const isDeleting = deletingCityId === city.id;

                    return (
                      <article
                        key={city.id}
                        className="min-w-0 rounded-2xl  bg-white/80 p-2 shadow-sm shadow-ink/5"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            value={currentValue}
                            onChange={(event) =>
                              setCityDraftNames((current) => ({
                                ...current,
                                [city.id]: event.target.value
                              }))
                            }
                            className="h-9 min-w-0 flex-1 rounded-xl  bg-white px-3 text-xs font-bold text-ink outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-orange-200/60"
                          />

                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => void handleSaveCity(city.id)}
                              disabled={!isDirty || isSaving || isDeleting}
                              title="Save"
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isSaving ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                              ) : (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleDeleteCity(city.id)}
                              disabled={isSaving || isDeleting}
                              title="Delete"
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isDeleting ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                              ) : (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
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
