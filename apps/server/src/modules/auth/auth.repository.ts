import { and, eq, gt, sql } from 'drizzle-orm';
import { Repository, type DbClient } from '../../db/repository.js';
import {
  authRateLimits,
  otpRequests,
  rooms,
  userSessions,
  users,
  type AuthRateLimit,
  type NewAuthRateLimit,
  type NewOtpRequest,
  type NewUser,
  type NewUserSession,
  type OtpMethod,
  type OtpRequest,
  type User,
  type UserSession
} from '../../db/schema.js';

export type PublicUserRow = Pick<
  User,
  | 'id'
  | 'username'
  | 'role'
  | 'fullName'
  | 'birthDateShamsi'
  | 'province'
  | 'city'
  | 'gender'
  | 'bio'
  | 'avatarUrl'
  | 'gem'
  | 'xp'
  | 'castleLevel'
  | 'xpMinerLevel'
  | 'gemMinerLevel'
  | 'lastGemCollectionAt'
  | 'lastXpCollectionAt'
  | 'lastChangelogVersion'
>;

export type SessionWithUser = {
  session: UserSession;
  user: PublicUserRow;
};

export type AdminUserRow = Pick<
  User,
  | 'id'
  | 'username'
  | 'role'
  | 'phone'
  | 'fullName'
  | 'birthDateShamsi'
  | 'province'
  | 'city'
  | 'gender'
  | 'bio'
  | 'avatarUrl'
  | 'gem'
  | 'xp'
  | 'castleLevel'
  | 'xpMinerLevel'
  | 'gemMinerLevel'
  | 'lastGemCollectionAt'
  | 'lastXpCollectionAt'
  | 'lastChangelogVersion'
  | 'createdAt'
  | 'updatedAt'
>;

export class AuthRepository extends Repository {
  constructor(dbClient?: DbClient) {
    super(dbClient);
  }

  async findUserByUsername(username: string): Promise<User | undefined> {
    const normalizedUsername = username.toLowerCase();

    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = ${normalizedUsername}`)
      .limit(1);

    return user;
  }

  async findUserById(userId: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user;
  }

  async findUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return user;
  }

  async listUsersForAdmin(): Promise<AdminUserRow[]> {
    return this.db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        phone: users.phone,
        fullName: users.fullName,
        birthDateShamsi: users.birthDateShamsi,
        province: users.province,
        city: users.city,
        gender: users.gender,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        gem: users.gem,
        xp: users.xp,
        castleLevel: users.castleLevel,
        xpMinerLevel: users.xpMinerLevel,
        gemMinerLevel: users.gemMinerLevel,
        lastGemCollectionAt: users.lastGemCollectionAt,
        lastXpCollectionAt: users.lastXpCollectionAt,
        lastChangelogVersion: users.lastChangelogVersion,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .orderBy(users.createdAt);
  }

  async deleteUserById(userId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await tx.delete(rooms).where(eq(rooms.ownerUserId, userId));
      const deletedUsers = await tx.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
      return deletedUsers.length > 0;
    });
  }

  async createUser(user: NewUser): Promise<PublicUserRow> {
    const [createdUser] = await this.db
      .insert(users)
      .values(user)
      .returning({
        id: users.id,
        username: users.username,
        role: users.role,
        fullName: users.fullName,
        birthDateShamsi: users.birthDateShamsi,
        province: users.province,
        city: users.city,
        gender: users.gender,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        gem: users.gem,
        xp: users.xp,
        castleLevel: users.castleLevel,
        xpMinerLevel: users.xpMinerLevel,
        gemMinerLevel: users.gemMinerLevel,
        lastGemCollectionAt: users.lastGemCollectionAt,
        lastXpCollectionAt: users.lastXpCollectionAt,
        lastChangelogVersion: users.lastChangelogVersion
      });

    if (!createdUser) {
      throw new Error('Failed to create user');
    }

    return createdUser;
  }

  async updateUserProfile(userId: string, data: Partial<User>): Promise<PublicUserRow> {
    const [updatedUser] = await this.db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        role: users.role,
        fullName: users.fullName,
        birthDateShamsi: users.birthDateShamsi,
        province: users.province,
        city: users.city,
        gender: users.gender,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        gem: users.gem,
        xp: users.xp,
        castleLevel: users.castleLevel,
        xpMinerLevel: users.xpMinerLevel,
        gemMinerLevel: users.gemMinerLevel,
        lastGemCollectionAt: users.lastGemCollectionAt,
        lastXpCollectionAt: users.lastXpCollectionAt,
        lastChangelogVersion: users.lastChangelogVersion
      });

    if (!updatedUser) {
      throw new Error('Failed to update user profile');
    }

    return updatedUser;
  }

  async createSession(session: NewUserSession): Promise<UserSession> {
    const [createdSession] = await this.db.insert(userSessions).values(session).returning();

    if (!createdSession) {
      throw new Error('Failed to create session');
    }

    return createdSession;
  }

  async findActiveSessionByTokenHash(tokenHash: string, now = new Date()): Promise<SessionWithUser | undefined> {
    const [row] = await this.db
      .select({
        session: userSessions,
        user: {
          id: users.id,
          username: users.username,
          role: users.role,
          fullName: users.fullName,
          birthDateShamsi: users.birthDateShamsi,
          province: users.province,
          city: users.city,
          gender: users.gender,
          bio: users.bio,
          avatarUrl: users.avatarUrl,
          gem: users.gem,
          xp: users.xp,
          castleLevel: users.castleLevel,
          xpMinerLevel: users.xpMinerLevel,
          gemMinerLevel: users.gemMinerLevel,
          lastGemCollectionAt: users.lastGemCollectionAt,
          lastXpCollectionAt: users.lastXpCollectionAt,
          lastChangelogVersion: users.lastChangelogVersion
        }
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(
        and(
          eq(userSessions.tokenHash, tokenHash),
          eq(userSessions.isRevoked, false),
          gt(userSessions.expiresAt, now)
        )
      )
      .limit(1);

    return row;
  }

  async touchSession(sessionId: string, lastSeenAt = new Date()): Promise<void> {
    await this.db.update(userSessions).set({ lastSeenAt }).where(eq(userSessions.id, sessionId));
  }

  async revokeSessionByTokenHash(tokenHash: string): Promise<void> {
    await this.db
      .update(userSessions)
      .set({ isRevoked: true })
      .where(and(eq(userSessions.tokenHash, tokenHash), eq(userSessions.isRevoked, false)));
  }

  async revokeActiveSessionsForUser(userId: string): Promise<void> {
    await this.db
      .update(userSessions)
      .set({ isRevoked: true })
      .where(and(eq(userSessions.userId, userId), eq(userSessions.isRevoked, false)));
  }

  async findAuthRateLimit(scope: string, key: string): Promise<AuthRateLimit | undefined> {
    const [rateLimit] = await this.db
      .select()
      .from(authRateLimits)
      .where(and(eq(authRateLimits.scope, scope), eq(authRateLimits.key, key)))
      .limit(1);

    return rateLimit;
  }

  async createAuthRateLimit(rateLimit: NewAuthRateLimit): Promise<AuthRateLimit> {
    const [createdRateLimit] = await this.db.insert(authRateLimits).values(rateLimit).returning();

    if (!createdRateLimit) {
      throw new Error('Failed to create auth rate limit');
    }

    return createdRateLimit;
  }

  async updateAuthRateLimit(id: string, updates: Partial<NewAuthRateLimit>): Promise<AuthRateLimit> {
    const [updatedRateLimit] = await this.db
      .update(authRateLimits)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(authRateLimits.id, id))
      .returning();

    if (!updatedRateLimit) {
      throw new Error('Failed to update auth rate limit');
    }

    return updatedRateLimit;
  }

  async expireActiveOtpRequests(phone: string, method: OtpMethod, now = new Date()): Promise<void> {
    await this.db
      .update(otpRequests)
      .set({
        expiresAt: now,
        updatedAt: now
      })
      .where(
        and(
          eq(otpRequests.phone, phone),
          eq(otpRequests.method, method),
          eq(otpRequests.verified, false),
          gt(otpRequests.expiresAt, now)
        )
      );
  }

  async createOtpRequest(otpRequest: NewOtpRequest): Promise<OtpRequest> {
    const [createdOtpRequest] = await this.db.insert(otpRequests).values(otpRequest).returning();

    if (!createdOtpRequest) {
      throw new Error('Failed to create OTP request');
    }

    return createdOtpRequest;
  }

  async findOtpRequestByRequestId(requestId: string): Promise<OtpRequest | undefined> {
    const [otpRequest] = await this.db.select().from(otpRequests).where(eq(otpRequests.requestId, requestId)).limit(1);
    return otpRequest;
  }

  async updateOtpRequest(
    id: string,
    updates: Partial<NewOtpRequest>,
    updatedAt = new Date()
  ): Promise<OtpRequest> {
    const [updatedOtpRequest] = await this.db
      .update(otpRequests)
      .set({
        ...updates,
        updatedAt
      })
      .where(eq(otpRequests.id, id))
      .returning();

    if (!updatedOtpRequest) {
      throw new Error('Failed to update OTP request');
    }

    return updatedOtpRequest;
  }
}
