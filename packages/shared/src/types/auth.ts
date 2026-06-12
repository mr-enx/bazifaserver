export type UserRole = 'normal' | 'admin' | 'observer';

export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
  fullName: string | null;
  birthDateShamsi: string | null;
  age: number | null;
  province: string | null;
  city: string | null;
  gender: 'male' | 'female' | null;
  bio: string | null;
  avatarUrl: string | null;
  gem: number;
  xp: number;
  castleLevel: number;
  xpMinerLevel: number;
  gemMinerLevel: number;
  lastGemCollectionAt: string;
  lastXpCollectionAt: string;
  lastChangelogVersion: string | null;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export type OtpMethod = 'login' | 'register';

export type OtpChallengeResponse = {
  requestId: string;
  phone: string;
  maskedPhone: string;
  method: OtpMethod;
  expiresAt: string;
  resendAvailableAt: string;
};

export type RegisterRequest = {
  phone: string;
};

export type RegisterResponse = OtpChallengeResponse;

export type LoginRequest = {
  phone: string;
};

export type LoginResponse = OtpChallengeResponse;

export type VerifyOtpRequest = {
  requestId: string;
  code: string;
};

export type VerifyOtpAuthenticatedResponse = {
  needsProfile: false;
  token: string;
  user: AuthUser;
};

export type VerifyOtpNeedsProfileResponse = {
  needsProfile: true;
  requestId: string;
  onboardingToken: string;
  phone: string;
  maskedPhone: string;
};

export type VerifyOtpResponse = VerifyOtpAuthenticatedResponse | VerifyOtpNeedsProfileResponse;

export type CompleteRegistrationRequest = {
  requestId: string;
  onboardingToken: string;
  fullName: string;
  birthDateShamsi: string;
  province: string;
  city: string;
  gender: 'male' | 'female';
};

export type CompleteRegistrationResponse = VerifyOtpAuthenticatedResponse;

export type MeResponse = AuthUser;

export type LogoutResponse = {
  ok: true;
};

export type UpdateProfileRequest = {
  fullName?: string | null;
  birthDateShamsi?: string | null;
  province?: string | null;
  city?: string | null;
  gender?: 'male' | 'female' | null;
  bio?: string | null;
  avatarUrl?: string | null;
};

export type UpdateProfileResponse = AuthUser;

export type ProvinceItem = {
  id: number;
  name: string;
};

export type CityItem = {
  id: number;
  provinceId: number;
  name: string;
};

export type AdminCreateCityRequest = {
  provinceId: number;
  name: string;
};

export type AdminUpdateCityRequest = {
  provinceId?: number;
  name?: string;
};

export type AdminDeleteCityResponse = {
  success: true;
};
