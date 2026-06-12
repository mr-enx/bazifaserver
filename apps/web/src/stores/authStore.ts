import type { AuthUser, CompleteRegistrationRequest, OtpChallengeResponse, UpdateProfileRequest } from '@game-platform/shared';
import { create } from 'zustand';
import {
  ApiError,
  completeRegistration as completeRegistrationRequest,
  fetchCurrentUser,
  loginUser,
  registerUser,
  updateProfile as updateProfileRequest,
  verifyOtp as verifyOtpRequest,
} from '../lib/api';

const AUTH_TOKEN_KEY = 'game-platform.authToken';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous';

type AuthStore = {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  error: string | null;
  pendingChallenge: OtpChallengeResponse | null;
  pendingRegistration: Pick<CompleteRegistrationRequest, 'requestId' | 'onboardingToken'> | null;
  bootstrap: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  requestLoginOtp: (phone: string) => Promise<void>;
  requestRegisterOtp: (
    phone: string,
    username: string,
    avatarUrl?: string,
  ) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  completeRegistration: (profile: Omit<CompleteRegistrationRequest, 'requestId' | 'onboardingToken'>) => Promise<void>;
  clearPendingChallenge: () => void;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  updateAvatar: (avatarUrl?: string) => Promise<void>;
  clearError: () => void;
  setAnonymous: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
};

function readStoredToken(): string | null {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

function storeToken(token: string): void {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

function isInvalidSessionError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.statusCode === 401 || error.statusCode === 403)
  );
}

function normalizeAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    gem: user.gem ?? 0,
    xp: user.xp ?? 0,
    fullName: user.fullName ?? null,
    age: user.age ?? null,
    province: user.province ?? null,
    city: user.city ?? null,
    gender: user.gender ?? null,
    bio: user.bio ?? null,
    castleLevel: user.castleLevel ?? 1,
    xpMinerLevel: user.xpMinerLevel ?? 0,
    gemMinerLevel: user.gemMinerLevel ?? 0,
    lastGemCollectionAt: user.lastGemCollectionAt ?? new Date().toISOString(),
    lastXpCollectionAt: user.lastXpCollectionAt ?? new Date().toISOString(),
    lastChangelogVersion: user.lastChangelogVersion ?? null,
  };
}


export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  status: 'idle',
  error: null,
  pendingChallenge: null,
  pendingRegistration: null,

  bootstrap: async () => {
    const token = readStoredToken();

    if (!token) {
      set({
        status: 'anonymous',
        user: null,
        token: null,
        pendingChallenge: null,
        pendingRegistration: null,
      });
      return;
    }

    set({
      status: 'loading',
      token,
      error: null,
      pendingChallenge: null,
      pendingRegistration: null,
    });

    try {
      const user = await fetchCurrentUser(token);

      set({
        status: 'authenticated',
        user: normalizeAuthUser(user),
        token,
        pendingChallenge: null,
        pendingRegistration: null,
        error: null,
      });
    } catch (error) {
      if (isInvalidSessionError(error)) {
        clearStoredToken();

        set({
          status: 'anonymous',
          user: null,
          token: null,
          pendingChallenge: null,
          pendingRegistration: null,
        });

        return;
      }

      set((state) => ({
        status: state.user ? 'authenticated' : 'anonymous',
        user: state.user,
        token,
        pendingChallenge: null,
        pendingRegistration: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to refresh session',
      }));

      throw error;
    }
  },

  refreshCurrentUser: async () => {
    const token = get().token ?? readStoredToken();

    if (!token) {
      clearStoredToken();

      set({
        status: 'anonymous',
        user: null,
        token: null,
        pendingChallenge: null,
        pendingRegistration: null,
      });

      throw new Error('Auth token is missing');
    }

    try {
      const user = await fetchCurrentUser(token);

      set({
        status: 'authenticated',
        user: normalizeAuthUser(user),
        token,
        pendingChallenge: null,
        pendingRegistration: null,
        error: null,
      });
    } catch (error) {
      if (isInvalidSessionError(error)) {
        clearStoredToken();

        set({
          status: 'anonymous',
          user: null,
          token: null,
          pendingChallenge: null,
          pendingRegistration: null,
        });
      } else {
        set((state) => ({
          status: 'authenticated',
          user: state.user,
          token,
          pendingChallenge: null,
          pendingRegistration: null,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to refresh session',
        }));
      }

      throw error;
    }
  },

  requestLoginOtp: async (phone) => {
    set({
      status: 'loading',
      error: null,
    });

    try {
      const challenge = await loginUser({ phone });

      set({
        status: 'anonymous',
        user: null,
        token: null,
        pendingChallenge: challenge,
        pendingRegistration: null,
        error: null,
      });
    } catch (error) {
      set({
        status: 'anonymous',
        user: null,
        token: null,
        pendingChallenge: null,
        pendingRegistration: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to send login code',
      });

      throw error;
    }
  },

  requestRegisterOtp: async (phone, username, avatarUrl) => {
    set({
      status: 'loading',
      error: null,
    });

    try {
      void username;
      void avatarUrl;
      const challenge = await registerUser({ phone });

      set({
        status: 'anonymous',
        user: null,
        token: null,
        pendingChallenge: challenge,
        pendingRegistration: null,
        error: null,
      });
    } catch (error) {
      set({
        status: 'anonymous',
        user: null,
        token: null,
        pendingChallenge: null,
        pendingRegistration: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to send registration code',
      });

      throw error;
    }
  },

  verifyOtp: async (code) => {
    const challenge = get().pendingChallenge;

    if (!challenge) {
      const error = new Error('Request an OTP before entering a code');
      set({ error: error.message });
      throw error;
    }

    set({
      status: 'loading',
      error: null,
    });

    try {
      const response = await verifyOtpRequest({
        requestId: challenge.requestId,
        code,
      });

      if (response.needsProfile) {
        set({
          status: 'anonymous',
          user: null,
          token: null,
          pendingChallenge: null,
          pendingRegistration: {
            requestId: response.requestId,
            onboardingToken: response.onboardingToken,
          },
          error: null,
        });
        return;
      }

      storeToken(response.token);

      set({
        status: 'authenticated',
        user: normalizeAuthUser(response.user),
        token: response.token,
        pendingChallenge: null,
        pendingRegistration: null,
        error: null,
      });
    } catch (error) {
      set({
        status: 'anonymous',
        error:
          error instanceof Error
            ? error.message
            : 'OTP verification failed',
        pendingChallenge: challenge,
        pendingRegistration: null,
      });

      throw error;
    }
  },

  completeRegistration: async (profile) => {
    const pendingRegistration = get().pendingRegistration;

    if (!pendingRegistration) {
      const error = new Error('Registration session is missing');
      set({ error: error.message });
      throw error;
    }

    set({
      status: 'loading',
      error: null,
    });

    try {
      const response = await completeRegistrationRequest({
        ...pendingRegistration,
        ...profile,
      });

      storeToken(response.token);

      set({
        status: 'authenticated',
        user: normalizeAuthUser(response.user),
        token: response.token,
        pendingChallenge: null,
        pendingRegistration: null,
        error: null,
      });
    } catch (error) {
      set({
        status: 'anonymous',
        pendingRegistration,
        error:
          error instanceof Error
            ? error.message
            : 'Registration failed',
      });

      throw error;
    }
  },

  clearPendingChallenge: () => {
    set({
      pendingChallenge: null,
      pendingRegistration: null,
    });
  },

  updateProfile: async (data) => {
    const { token } = get();

    if (!token) {
      const error = new Error('Not authenticated');
      set({ error: error.message });
      throw error;
    }

    set({
      error: null,
    });

    try {
      const user = await updateProfileRequest(token, data);

      set((state) => ({
        ...state,
        user: normalizeAuthUser(user),
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update profile',
      });

      throw error;
    }
  },

  updateAvatar: async (avatarUrl) => {
    const { updateProfile } = get();
    await updateProfile({
      avatarUrl: avatarUrl?.trim() ? avatarUrl.trim() : null,
    });
  },

  clearError: () => {
    set({
      error: null,
    });
  },

  setAnonymous: () => {
    clearStoredToken();

    set({
      status: 'anonymous',
      user: null,
      token: null,
      error: null,
      pendingChallenge: null,
      pendingRegistration: null,
    });
  },

  updateUser: (updates) => {
    set((state) => {
      if (!state.user) return state;
      return {
        ...state,
        user: normalizeAuthUser({
          ...state.user,
          ...updates,
        }),
      };
    });
  },
}));
