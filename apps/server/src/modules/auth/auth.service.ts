import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type {
  AuthUser,
  CompleteRegistrationResponse,
  LoginResponse,
  RegisterResponse,
  VerifyOtpResponse
} from '@game-platform/shared';
import type { DbClient } from '../../db/repository.js';
import { db } from '../../db/index.js';
import type { OtpMethod, User } from '../../db/schema.js';
import { AuthRepository, type AdminUserRow, type PublicUserRow } from './auth.repository.js';
import type { CompleteRegistrationBody, LoginBody, RegisterBody, UpdateProfileBody, VerifyOtpBody } from './auth.schemas.js';
import {
  createOtpCodeHash,
  calculateAgeFromJalaliBirthDate,
  generateOtpCode,
  generateRequestId,
  maskPhoneNumber,
  normalizeJalaliDateInput,
  normalizePhoneNumber
} from './auth.utils.js';
import { SmsService } from './sms.service.js';

import { env } from '../../config/env.js';

const IS_DEV = env.nodeEnv === 'development';

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_SEND_COOLDOWN_MS = IS_DEV ? 3 * 1000 : 60 * 1000;
const OTP_SEND_WINDOW_MS = IS_DEV ? 5 * 60 * 1000 : 60 * 60 * 1000;
const OTP_SEND_MAX_PER_WINDOW = IS_DEV ? 100 : 5;
const OTP_VERIFY_WINDOW_MS = IS_DEV ? 5 * 60 * 1000 : 10 * 60 * 1000;
const OTP_VERIFY_MAX_PER_WINDOW = IS_DEV ? 100 : 10;
const OTP_MAX_ATTEMPTS = IS_DEV ? 20 : 5;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
  }
}

type RateLimitOptions = {
  scope: string;
  key: string;
  limit: number;
  windowMs: number;
  errorMessage: string;
};

function resolveUserAge(user: { birthDateShamsi: string | null }): number | null {
  if (user.birthDateShamsi) {
    try {
      return calculateAgeFromJalaliBirthDate(user.birthDateShamsi);
    } catch {
      return null;
    }
  }

  return null;
}

function toAuthUser(user: PublicUserRow): AuthUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    birthDateShamsi: user.birthDateShamsi,
    age: resolveUserAge(user),
    province: user.province,
    city: user.city,
    gender: user.gender,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    gem: user.gem,
    xp: user.xp,
    castleLevel: user.castleLevel,
    xpMinerLevel: user.xpMinerLevel,
    gemMinerLevel: user.gemMinerLevel,
    lastGemCollectionAt: user.lastGemCollectionAt.toISOString(),
    lastXpCollectionAt: user.lastXpCollectionAt.toISOString(),
    lastChangelogVersion: user.lastChangelogVersion
  };
}


function toPublicUserRow(user: User): PublicUserRow {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    birthDateShamsi: user.birthDateShamsi,
    province: user.province,
    city: user.city,
    gender: user.gender,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    gem: user.gem,
    xp: user.xp,
    castleLevel: user.castleLevel,
    xpMinerLevel: user.xpMinerLevel,
    gemMinerLevel: user.gemMinerLevel,
    lastGemCollectionAt: user.lastGemCollectionAt,
    lastXpCollectionAt: user.lastXpCollectionAt,
    lastChangelogVersion: user.lastChangelogVersion
  };
}

function ensureAdmin(user: AuthUser): void {
  if (user.role !== 'admin') {
    throw new AuthError('Forbidden', 403);
  }
}

function ensureAdminOrObserver(user: AuthUser): void {
  if (user.role !== 'admin' && user.role !== 'observer') {
    throw new AuthError('Forbidden', 403);
  }
}

export type AdminUserItem = {
  id: string;
  username: string;
  role: 'normal' | 'admin' | 'observer';
  phone: string | null;
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
  createdAt: string;
  updatedAt: string;
};


function toAdminUserItem(user: AdminUserRow): AdminUserItem {
  return {
    ...toAuthUser(user),
    phone: user.phone,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

export function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, token, extra] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token || extra) {
    return undefined;
  }

  return token;
}

function generateRawToken(): string {
  return randomBytes(32).toString('base64url');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function hashesMatch(candidateHash: string, storedHash: string): boolean {
  const candidate = Buffer.from(candidateHash, 'hex');
  const stored = Buffer.from(storedHash, 'hex');

  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function tokenHashesMatch(rawToken: string, storedHash: string): boolean {
  return hashesMatch(hashToken(rawToken), storedHash);
}

function buildOtpChallengeResponse(
  requestId: string,
  phone: string,
  method: OtpMethod,
  expiresAt: Date,
  now: Date
): LoginResponse {
  return {
    requestId,
    phone,
    maskedPhone: maskPhoneNumber(phone),
    method,
    expiresAt: expiresAt.toISOString(),
    resendAvailableAt: new Date(now.getTime() + OTP_SEND_COOLDOWN_MS).toISOString()
  };
}

function secondsUntil(date: Date, now: Date): number {
  return Math.max(1, Math.ceil((date.getTime() - now.getTime()) / 1000));
}

export class AuthService {
  constructor(
    private readonly authRepository = new AuthRepository(),
    private readonly smsService = new SmsService()
  ) {}

  async register(body: RegisterBody): Promise<RegisterResponse> {
    return this.login(body);
  }

  async login(body: LoginBody): Promise<LoginResponse> {
    const phone = this.normalizePhoneOrThrow(body.phone);
    const user = await this.authRepository.findUserByPhone(phone);

    return this.sendOtpChallenge({ method: user ? 'login' : 'register', phone });
  }

  async listUsersForAdmin(user: AuthUser): Promise<AdminUserItem[]> {
    ensureAdminOrObserver(user);
    const users = await this.authRepository.listUsersForAdmin();
    return users.map(toAdminUserItem);
  }

  async getUserProfile(userId: string): Promise<PublicUserRow> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new AuthError('User not found', 404);
    }
    return toPublicUserRow(user);
  }

  async deleteUserAsAdmin(userId: string, currentUser: AuthUser): Promise<{ success: true }> {
    ensureAdmin(currentUser);

    if (userId === currentUser.id) {
      throw new AuthError('Admin account cannot delete itself', 409);
    }

    const deleted = await this.authRepository.deleteUserById(userId);
    if (!deleted) {
      throw new AuthError('User not found', 404);
    }

    return { success: true };
  }

  async verifyOtp(body: VerifyOtpBody, deviceInfo?: string): Promise<VerifyOtpResponse> {
    const now = new Date();

    await this.consumeRateLimit({
      scope: 'otp_verify_window',
      key: body.requestId,
      limit: OTP_VERIFY_MAX_PER_WINDOW,
      windowMs: OTP_VERIFY_WINDOW_MS,
      errorMessage: 'Too many OTP verification attempts'
    });

    const otpRequest = await this.authRepository.findOtpRequestByRequestId(body.requestId);
    if (!otpRequest) {
      throw new AuthError('OTP request is invalid or has expired', 400);
    }

    if (otpRequest.verified) {
      throw new AuthError('OTP code has already been used', 409);
    }

    if (otpRequest.expiresAt <= now) {
      throw new AuthError('OTP code has expired. Please request a new one.', 400);
    }

    if (otpRequest.attempts >= OTP_MAX_ATTEMPTS) {
      throw new AuthError('Too many incorrect codes. Please request a new OTP.', 429);
    }

    const codeHash = createOtpCodeHash(otpRequest.requestId, body.code);
    if (!hashesMatch(codeHash, otpRequest.codeHash)) {
      const nextAttempts = otpRequest.attempts + 1;
      await this.authRepository.updateOtpRequest(
        otpRequest.id,
        {
          attempts: nextAttempts,
          ...(nextAttempts >= OTP_MAX_ATTEMPTS ? { expiresAt: now } : {})
        },
        now
      );

      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        throw new AuthError('Too many incorrect codes. Please request a new OTP.', 429);
      }

      throw new AuthError('Invalid OTP code', 401);
    }

    if (otpRequest.method === 'register') {
      const existingPhoneUser = await this.authRepository.findUserByPhone(otpRequest.phone);
      if (existingPhoneUser) {
        return this.createAuthenticatedSession(toPublicUserRow(existingPhoneUser), deviceInfo, otpRequest.id);
      }

      const onboardingToken = generateRawToken();
      const onboardingTokenHash = hashToken(onboardingToken);
      const onboardingExpiresAt = new Date(now.getTime() + SESSION_TTL_MS);

      await this.authRepository.updateOtpRequest(
        otpRequest.id,
        {
          verified: true,
          token: onboardingTokenHash,
          tokenExpires: onboardingExpiresAt
        },
        now
      );

      return {
        needsProfile: true,
        requestId: otpRequest.requestId,
        onboardingToken,
        phone: otpRequest.phone,
        maskedPhone: maskPhoneNumber(otpRequest.phone)
      };
    }

    const existingUser = await this.authRepository.findUserByPhone(otpRequest.phone);
    if (!existingUser) {
      throw new AuthError('No account found for this phone number', 404);
    }

    return this.createAuthenticatedSession(toPublicUserRow(existingUser), deviceInfo, otpRequest.id);
  }

  async completeRegistration(
    body: CompleteRegistrationBody,
    deviceInfo?: string
  ): Promise<CompleteRegistrationResponse> {
    const now = new Date();
    const otpRequest = await this.authRepository.findOtpRequestByRequestId(body.requestId);

    if (
      !otpRequest ||
      otpRequest.method !== 'register' ||
      !otpRequest.verified ||
      !otpRequest.token ||
      !otpRequest.tokenExpires ||
      otpRequest.tokenExpires <= now
    ) {
      throw new AuthError('Registration session is invalid or has expired', 400);
    }

    if (!tokenHashesMatch(body.onboardingToken, otpRequest.token)) {
      throw new AuthError('Registration session is invalid or has expired', 401);
    }

    const existingUser = await this.authRepository.findUserByPhone(otpRequest.phone);
    if (existingUser) {
      return this.createAuthenticatedSession(toPublicUserRow(existingUser), deviceInfo, otpRequest.id);
    }

    let normalizedBirthDateShamsi: string;
    try {
      normalizedBirthDateShamsi = normalizeJalaliDateInput(body.birthDateShamsi);
      void calculateAgeFromJalaliBirthDate(normalizedBirthDateShamsi, now);
    } catch (error) {
      throw new AuthError(error instanceof Error ? error.message : 'Birth date is invalid', 400);
    }

    return db.transaction(async (tx) => {
      const transactionalRepository = new AuthRepository(tx as unknown as DbClient);
      const username = await this.generateUniqueUsername(transactionalRepository);
      const user = await transactionalRepository.createUser({
        username,
        role: 'normal',
        phone: otpRequest.phone,
        fullName: body.fullName,
        birthDateShamsi: normalizedBirthDateShamsi,
        province: body.province,
        city: body.city,
        gender: body.gender,
        avatarUrl: null
      });

      return this.createAuthenticatedSession(user, deviceInfo, otpRequest.id, transactionalRepository);
    });
  }

  async validateToken(token: string): Promise<{ user: AuthUser; sessionId: string }> {
    const sessionWithUser = await this.authRepository.findActiveSessionByTokenHash(hashToken(token));

    if (!sessionWithUser || !tokenHashesMatch(token, sessionWithUser.session.tokenHash)) {
      throw new AuthError('Invalid or expired auth token', 401);
    }

    await this.authRepository.touchSession(sessionWithUser.session.id);

    return {
      user: toAuthUser(sessionWithUser.user),
      sessionId: sessionWithUser.session.id
    };
  }

  async updateProfile(userId: string, body: UpdateProfileBody): Promise<AuthUser> {
    const data: Partial<User> = {};

    if (body.fullName !== undefined) data.fullName = body.fullName;
    if (body.province !== undefined) data.province = body.province;
    if (body.city !== undefined) data.city = body.city;
    if (body.gender !== undefined) data.gender = body.gender;
    if (body.bio !== undefined) data.bio = body.bio;
    
    if (body.avatarUrl !== undefined) {
      data.avatarUrl = body.avatarUrl === '' ? null : body.avatarUrl;
    }

    if (body.birthDateShamsi !== undefined) {
      if (body.birthDateShamsi === null) {
        data.birthDateShamsi = null;
      } else {
        try {
          data.birthDateShamsi = normalizeJalaliDateInput(body.birthDateShamsi);
          // Validate age calculation doesn't throw
          calculateAgeFromJalaliBirthDate(data.birthDateShamsi);
        } catch (error) {
          throw new AuthError(error instanceof Error ? error.message : 'Birth date is invalid', 400);
        }
      }
    }

    const updatedUser = await this.authRepository.updateUserProfile(userId, data);

    return toAuthUser(updatedUser);
  }

  async logout(token: string): Promise<void> {
    await this.authRepository.revokeSessionByTokenHash(hashToken(token));
  }

  private async createAuthenticatedSession(
    user: PublicUserRow,
    deviceInfo: string | undefined,
    otpRequestId: string,
    repository = this.authRepository
  ): Promise<CompleteRegistrationResponse> {
    const token = generateRawToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await repository.revokeActiveSessionsForUser(user.id);
    await repository.createSession({
      userId: user.id,
      tokenHash,
      expiresAt,
      deviceInfo
    });
    await repository.updateOtpRequest(
      otpRequestId,
      {
        verified: true,
        token: tokenHash,
        tokenExpires: expiresAt
      },
      new Date()
    );

    return {
      needsProfile: false,
      token,
      user: toAuthUser(user)
    };
  }

  private async generateUniqueUsername(repository = this.authRepository): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const username = randomInt(100_000_000_000, 1_000_000_000_000).toString();
      const existingUser = await repository.findUserByUsername(username);

      if (!existingUser) {
        return username;
      }
    }

    throw new AuthError('Could not generate a unique username. Please try again.', 500);
  }

  private normalizePhoneOrThrow(phone: string): string {
    try {
      return normalizePhoneNumber(phone);
    } catch (error) {
      throw new AuthError(error instanceof Error ? error.message : 'Phone number is invalid', 400);
    }
  }

  private async sendOtpChallenge({
    method,
    phone,
    username,
    avatarUrl
  }: {
    method: OtpMethod;
    phone: string;
    username?: string;
    avatarUrl?: string | null;
  }): Promise<LoginResponse> {
    const now = new Date();

    await this.consumeRateLimit({
      scope: 'otp_send_cooldown',
      key: `${method}:${phone}`,
      limit: 1,
      windowMs: OTP_SEND_COOLDOWN_MS,
      errorMessage: 'Please wait before requesting another OTP'
    });

    await this.consumeRateLimit({
      scope: 'otp_send_window',
      key: `${method}:${phone}`,
      limit: OTP_SEND_MAX_PER_WINDOW,
      windowMs: OTP_SEND_WINDOW_MS,
      errorMessage: 'Too many OTP requests'
    });

    const requestId = generateRequestId();
    const code = generateOtpCode();
    const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

    await this.authRepository.expireActiveOtpRequests(phone, method, now);

    const otpRequest = await this.authRepository.createOtpRequest({
      requestId,
      phone,
      email: null,
      username: username ?? null,
      avatarUrl: avatarUrl ?? null,
      method,
      codeHash: createOtpCodeHash(requestId, code),
      expiresAt,
      verified: false,
      attempts: 0,
      token: null,
      tokenExpires: null
    });

    try {
      await this.smsService.sendOtpCode({ phone, code, requestId });
    } catch (error) {
      await this.authRepository.updateOtpRequest(
        otpRequest.id,
        {
          expiresAt: now
        },
        now
      );

      throw new AuthError(
        error instanceof Error ? error.message : 'Failed to send OTP. Please try again.',
        502
      );
    }

    return buildOtpChallengeResponse(requestId, phone, method, expiresAt, now);
  }

  private async consumeRateLimit({ scope, key, limit, windowMs, errorMessage }: RateLimitOptions): Promise<void> {
    const now = new Date();
    const existingRateLimit = await this.authRepository.findAuthRateLimit(scope, key);

    if (!existingRateLimit) {
      await this.authRepository.createAuthRateLimit({
        scope,
        key,
        attemptCount: 1,
        windowStart: now,
        blockedUntil: null
      });
      return;
    }

    if (existingRateLimit.blockedUntil && existingRateLimit.blockedUntil > now) {
      throw new AuthError(
        `${errorMessage}. Try again in ${secondsUntil(existingRateLimit.blockedUntil, now)} seconds.`,
        429
      );
    }

    const windowEndsAt = new Date(existingRateLimit.windowStart.getTime() + windowMs);
    if (windowEndsAt <= now) {
      await this.authRepository.updateAuthRateLimit(existingRateLimit.id, {
        attemptCount: 1,
        windowStart: now,
        blockedUntil: null
      });
      return;
    }

    if (existingRateLimit.attemptCount >= limit) {
      await this.authRepository.updateAuthRateLimit(existingRateLimit.id, {
        blockedUntil: windowEndsAt
      });

      throw new AuthError(
        `${errorMessage}. Try again in ${secondsUntil(windowEndsAt, now)} seconds.`,
        429
      );
    }

    await this.authRepository.updateAuthRateLimit(existingRateLimit.id, {
      attemptCount: existingRateLimit.attemptCount + 1,
      blockedUntil: null
    });
  }
}
