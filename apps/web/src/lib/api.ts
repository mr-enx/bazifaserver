import type {
  AppSettingsResponse,
  UpdateChangelogVersionRequest,
  UpdateChangelogVersionResponse,
  AuthUser,
  AdminCreateCityRequest,
  AdminDeleteCityResponse,
  AdminUpdateCityRequest,
  CompleteRegistrationRequest,
  CompleteRegistrationResponse,
  CancelFriendRequestResponse,
  CreateFriendRequestRequest,
  CreateFriendRequestResponse,
  DirectChatMessage,
  DirectChatThread,
  FriendListItem,
  Game,
  GameResultItem,
  GameType,
  LeaderboardResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  NotificationItem,
  OutgoingFriendRequestItem,
  CityItem,
  ProvinceItem,
  PurchaseSubscriptionRequest,
  RegisterRequest,
  RegisterResponse,
  RespondToFriendRequestResponse,
  RoomDetails,
  RoomListItem,
  RoomStatus,
  SubscriptionStatusResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  VerifyOtpRequest,
  VerifyOtpResponse
} from '@game-platform/shared';
import type { UserRole } from '@game-platform/shared';

export type CreateReportRequest = {
  reportedUserId: string;
  reason?: string;
};

export type ReportItem = {
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

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

type ApiErrorBody = {
  message?: string;
};

export type AdminUserItem = {
  id: string;
  username: string;
  fullName: string | null;
  birthDateShamsi: string | null;
  age: number | null;
  role: UserRole;
  phone: string | null;
  province: string | null;
  city: string | null;
  gender: string | null;
  bio: string | null;
  avatarUrl: string | null;
  gem: number;
  xp: number;
  castleLevel: number;
  xpMinerLevel: number;
  gemMinerLevel: number;
  createdAt: string;
  updatedAt: string;
};


export type ActiveMatchResponse = {
  matchId: string;
  gameSlug: string;
  state: unknown;
};

export type CurrentRoomMembershipResponse = {
  roomId: string;
  gameId: string;
  roomStatus: RoomStatus;
  gameSlug: string;
} | null;

export type UserProfile = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  age: number | null;
  province: string | null;
  city: string | null;
  bio: string | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;

  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status);
  }

  return body as T;
}

export async function registerUser(body: RegisterRequest): Promise<RegisterResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return parseJson<RegisterResponse>(response);
}

export async function loginUser(body: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return parseJson<LoginResponse>(response);
}

export async function verifyOtp(body: VerifyOtpRequest): Promise<VerifyOtpResponse> {
  const response = await fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return parseJson<VerifyOtpResponse>(response);
}

export async function completeRegistration(
  body: CompleteRegistrationRequest
): Promise<CompleteRegistrationResponse> {
  const response = await fetch(`${API_URL}/auth/complete-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return parseJson<CompleteRegistrationResponse>(response);
}

export async function fetchProvinces(): Promise<ProvinceItem[]> {
  const response = await fetch(`${API_URL}/locations/provinces`);

  return parseJson<ProvinceItem[]>(response);
}

export async function fetchCities(provinceId: number): Promise<CityItem[]> {
  const response = await fetch(`${API_URL}/locations/provinces/${provinceId}/cities`);

  return parseJson<CityItem[]>(response);
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<AuthUser>(response);
}

export async function updateProfile(
  token: string,
  body: UpdateProfileRequest
): Promise<UpdateProfileResponse> {
  const response = await fetch(`${API_URL}/auth/profile`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return parseJson<UpdateProfileResponse>(response);
}

export async function logoutUser(token: string): Promise<LogoutResponse> {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  return parseJson<LogoutResponse>(response);
}

export async function fetchGames(token: string, type?: GameType): Promise<Game[]> {
  const url = new URL(`${API_URL}/games`);
  if (type) {
    url.searchParams.set('type', type);
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<Game[]>(response);
}

export async function fetchLeaderboard(token: string): Promise<LeaderboardResponse> {
  const response = await fetch(`${API_URL}/games/leaderboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<LeaderboardResponse>(response);
}

export async function fetchRecentGameResults(token: string): Promise<GameResultItem[]> {
  const response = await fetch(`${API_URL}/games/results/recent`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<GameResultItem[]>(response);
}

export async function fetchRooms(gameId: string, token: string): Promise<RoomListItem[]> {
  const response = await fetch(`${API_URL}/games/${gameId}/rooms`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<RoomListItem[]>(response);
}

export async function createRoom(gameId: string, token: string): Promise<RoomDetails> {
  const response = await fetch(`${API_URL}/games/${gameId}/rooms`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  return parseJson<RoomDetails>(response);
}

export async function fetchRoom(roomId: string, token: string): Promise<RoomDetails> {
  const response = await fetch(`${API_URL}/rooms/${roomId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<RoomDetails>(response);
}

export async function fetchCurrentRoomMembership(
  token: string
): Promise<CurrentRoomMembershipResponse> {
  const response = await fetch(`${API_URL}/rooms/current-membership`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<CurrentRoomMembershipResponse>(response);
}

export async function joinRoom(roomId: string, token: string): Promise<RoomDetails> {
  const response = await fetch(`${API_URL}/rooms/${roomId}/join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  return parseJson<RoomDetails>(response);
}

export async function fetchActiveMatch(
  roomId: string,
  token: string
): Promise<ActiveMatchResponse | null> {
  const response = await fetch(`${API_URL}/rooms/${roomId}/active-match`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<ActiveMatchResponse>(response);
}

export async function fetchAdminRooms(token: string): Promise<RoomListItem[]> {
  const response = await fetch(`${API_URL}/admin/rooms`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<RoomListItem[]>(response);
}

export async function deleteAdminRoom(
  roomId: string,
  token: string
): Promise<{ success: true }> {
  const response = await fetch(`${API_URL}/admin/rooms/${roomId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<{ success: true }>(response);
}

export async function fetchAdminUsers(token: string): Promise<AdminUserItem[]> {
  const response = await fetch(`${API_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<AdminUserItem[]>(response);
}

export async function deleteAdminUser(
  userId: string,
  token: string
): Promise<{ success: true }> {
  const response = await fetch(`${API_URL}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<{ success: true }>(response);
}

export async function fetchAdminProvinces(token: string): Promise<ProvinceItem[]> {
  const response = await fetch(`${API_URL}/admin/locations/provinces`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<ProvinceItem[]>(response);
}

export async function fetchAdminCities(token: string, provinceId: number): Promise<CityItem[]> {
  const response = await fetch(`${API_URL}/admin/locations/provinces/${provinceId}/cities`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<CityItem[]>(response);
}

export async function createAdminCity(token: string, body: AdminCreateCityRequest): Promise<CityItem> {
  const response = await fetch(`${API_URL}/admin/locations/cities`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return parseJson<CityItem>(response);
}

export async function updateAdminCity(
  token: string,
  cityId: number,
  body: AdminUpdateCityRequest
): Promise<CityItem> {
  const response = await fetch(`${API_URL}/admin/locations/cities/${cityId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return parseJson<CityItem>(response);
}

export async function deleteAdminCity(
  token: string,
  cityId: number
): Promise<AdminDeleteCityResponse> {
  const response = await fetch(`${API_URL}/admin/locations/cities/${cityId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<AdminDeleteCityResponse>(response);
}

export async function sendFriendRequest(
  token: string,
  body: CreateFriendRequestRequest
): Promise<CreateFriendRequestResponse> {
  const response = await fetch(`${API_URL}/friends/requests`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return parseJson<CreateFriendRequestResponse>(response);
}

export async function fetchNotifications(token: string): Promise<NotificationItem[]> {
  const response = await fetch(`${API_URL}/notifications`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<NotificationItem[]>(response);
}

export async function fetchSentFriendRequests(token: string): Promise<OutgoingFriendRequestItem[]> {
  const response = await fetch(`${API_URL}/friends/requests/sent`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<OutgoingFriendRequestItem[]>(response);
}

export async function cancelFriendRequest(
  requestId: string,
  token: string
): Promise<CancelFriendRequestResponse> {
  const response = await fetch(`${API_URL}/friends/requests/${requestId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<CancelFriendRequestResponse>(response);
}

export async function fetchMySubscription(token: string): Promise<SubscriptionStatusResponse> {
  const response = await fetch(`${API_URL}/subscriptions/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<SubscriptionStatusResponse>(response);
}

export async function purchaseSubscription(
  token: string,
  body: PurchaseSubscriptionRequest
): Promise<SubscriptionStatusResponse> {
  const response = await fetch(`${API_URL}/subscriptions/purchase`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return parseJson<SubscriptionStatusResponse>(response);
}

export async function acceptFriendRequest(
  requestId: string,
  token: string
): Promise<RespondToFriendRequestResponse> {
  const response = await fetch(`${API_URL}/friends/requests/${requestId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<RespondToFriendRequestResponse>(response);
}

export async function rejectFriendRequest(
  requestId: string,
  token: string
): Promise<RespondToFriendRequestResponse> {
  const response = await fetch(`${API_URL}/friends/requests/${requestId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<RespondToFriendRequestResponse>(response);
}

export async function fetchFriends(token: string): Promise<FriendListItem[]> {
  const response = await fetch(`${API_URL}/friends`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<FriendListItem[]>(response);
}

export async function fetchDirectChatThread(
  token: string,
  friendId: string
): Promise<DirectChatThread> {
  const response = await fetch(`${API_URL}/chat/${friendId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<DirectChatThread>(response);
}

export async function sendDirectMessage(
  token: string,
  friendId: string,
  message: string
): Promise<DirectChatMessage> {
  const response = await fetch(`${API_URL}/chat/${friendId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  });

  return parseJson<DirectChatMessage>(response);
}

export async function fetchUserProfile(token: string, userId: string): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/users/${userId}/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<UserProfile>(response);
}

export async function submitUserReport(
  token: string,
  body: CreateReportRequest
): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return parseJson<{ message: string }>(response);
}

export async function fetchAdminReports(token: string): Promise<ReportItem[]> {
  const response = await fetch(`${API_URL}/admin/reports`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<ReportItem[]>(response);
}

export type CastleUpgradeRequirementItem = {
  slug: string;
  gameName: string;
  requiredScore: number;
  userScore: number;
  hasEnoughScore: boolean;
};

export type CastleUpgradeRequirements = {
  nextLevel: number;
  items: CastleUpgradeRequirementItem[];
};

export async function fetchCastleUpgradeRequirements(token: string): Promise<CastleUpgradeRequirements> {
  const response = await fetch(`${API_URL}/games/castle/requirements`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<CastleUpgradeRequirements>(response);
}

export async function upgradeCastle(token: string): Promise<{ success: boolean; newLevel: number }> {
  const response = await fetch(`${API_URL}/games/castle/upgrade`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  return parseJson<{ success: boolean; newLevel: number }>(response);
}

export type CollectorStatus = {
  gemMinerLevel: number;
  xpMinerLevel: number;
  canCollectGem: boolean;
  canCollectXp: boolean;
  gemSecondsLeft: number;
  xpSecondsLeft: number;
  gemAmount: number;
  xpAmount: number;
};

export async function fetchCollectorStatus(token: string): Promise<CollectorStatus> {
  const response = await fetch(`${API_URL}/games/collector/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseJson<CollectorStatus>(response);
}

export async function collectGems(token: string): Promise<{ success: boolean; collectedAmount: number; newGemCount: number }> {
  const response = await fetch(`${API_URL}/games/collector/gems`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  return parseJson<{ success: boolean; collectedAmount: number; newGemCount: number }>(response);
}

export async function collectXp(token: string): Promise<{ success: boolean; collectedAmount: number; newXpCount: number }> {
  const response = await fetch(`${API_URL}/games/collector/xp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  return parseJson<{ success: boolean; collectedAmount: number; newXpCount: number }>(response);
}

export async function fetchAppSettings(): Promise<AppSettingsResponse> {
  const response = await fetch(`${API_URL}/settings`);

  return parseJson<AppSettingsResponse>(response);
}

export async function updateChangelogVersion(
  token: string,
  body: UpdateChangelogVersionRequest
): Promise<UpdateChangelogVersionResponse> {
  const response = await fetch(`${API_URL}/users/me/changelog-version`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return parseJson<UpdateChangelogVersionResponse>(response);
}

