import type { GameFinishedResult } from '@game-platform/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

export const roomStatusValues = ['waiting', 'in_game', 'finished'] as const;
export type RoomStatus = (typeof roomStatusValues)[number];

export const matchStatusValues = ['pending', 'active', 'finished'] as const;
export type MatchStatus = (typeof matchStatusValues)[number];

export const otpMethodValues = ['login', 'register'] as const;
export type OtpMethod = (typeof otpMethodValues)[number];

export const friendRequestStatusValues = ['pending', 'accepted', 'rejected', 'cancelled'] as const;
export type FriendRequestStatus = (typeof friendRequestStatusValues)[number];

export const notificationTypeValues = ['friend_request'] as const;
export type NotificationType = (typeof notificationTypeValues)[number];

export const userRoleValues = ['normal', 'admin', 'observer'] as const;
export type UserRole = (typeof userRoleValues)[number];

export type RoomSettings = Record<string, unknown>;
export type MatchState = Record<string, unknown>;
export type GamePointRules = {
  base_points?: number;
  round_win_points?: number;
  finished_token_points?: number;
  step_points?: number;
  final_win_multiplier?: number;
};

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull()
};

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    username: varchar('username', { length: 64 }).notNull().unique(),
    role: varchar('role', { length: 16 }).$type<UserRole>().default('normal').notNull(),
    phone: varchar('phone', { length: 32 }),
    fullName: varchar('full_name', { length: 128 }),
    birthDateShamsi: varchar('birth_date_shamsi', { length: 10 }),
    province: varchar('province', { length: 128 }),
    city: varchar('city', { length: 128 }),
    gender: varchar('gender', { length: 16 }).$type<'male' | 'female'>(),
    bio: varchar('bio', { length: 500 }),
    avatarUrl: text('avatar_url'),
    gem: integer('gem').default(0).notNull(),
    xp: integer('xp').default(0).notNull(),
    castleLevel: integer('castle_level').default(1).notNull(),
    xpMinerLevel: integer('xp_miner_level').default(0).notNull(),
    gemMinerLevel: integer('gem_miner_level').default(0).notNull(),
    lastGemCollectionAt: timestamp('last_gem_collection_at', { withTimezone: false }).defaultNow().notNull(),
    lastXpCollectionAt: timestamp('last_xp_collection_at', { withTimezone: false }).defaultNow().notNull(),
    lastChangelogVersion: varchar('last_changelog_version', { length: 32 }),
    ...timestamps
  },
  (table) => [
    uniqueIndex('users_phone_unique').on(table.phone),
    check(
      'users_birth_date_shamsi_format_check',
      sql`${table.birthDateShamsi} is null or ${table.birthDateShamsi} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`
    ),
    check('users_gender_check', sql`${table.gender} is null or ${table.gender} in ('male', 'female')`),
    check('users_role_check', sql`${table.role} in ('normal', 'admin', 'observer')`),
    check('users_gem_non_negative_check', sql`${table.gem} >= 0`),
    check('users_xp_non_negative_check', sql`${table.xp} >= 0`),
    check('users_xp_miner_level_non_negative_check', sql`${table.xpMinerLevel} >= 0`),
    check('users_gem_miner_level_non_negative_check', sql`${table.gemMinerLevel} >= 0`)
  ]
);
export const provinces = pgTable('provinces', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull()
});

export const cities = pgTable('cities', {
  id: integer('id').primaryKey(),
  provinceId: integer('province_id')
    .notNull()
    .references(() => provinces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 128 }).notNull()
});

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: false }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: false }).defaultNow().notNull(),
    isRevoked: boolean('is_revoked').default(false).notNull(),
    deviceInfo: text('device_info')
  },
  (table) => [uniqueIndex('user_sessions_token_hash_unique').on(table.tokenHash)]
);

export const authRateLimits = pgTable(
  'auth_rate_limits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scope: varchar('scope', { length: 64 }).notNull(),
    key: varchar('key', { length: 255 }).notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    windowStart: timestamp('window_start', { withTimezone: false }).defaultNow().notNull(),
    blockedUntil: timestamp('blocked_until', { withTimezone: false }),
    ...timestamps
  },
  (table) => [uniqueIndex('auth_rate_limits_scope_key_unique').on(table.scope, table.key)]
);

export const otpRequests = pgTable(
  'otp_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requestId: varchar('request_id', { length: 128 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    email: varchar('email', { length: 255 }),
    username: varchar('username', { length: 64 }),
    avatarUrl: text('avatar_url'),
    method: varchar('method', { length: 32 }).$type<OtpMethod>().notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: false }).notNull(),
    verified: boolean('verified').default(false).notNull(),
    attempts: integer('attempts').default(0).notNull(),
    token: text('token'),
    tokenExpires: timestamp('token_expires', { withTimezone: false }),
    ...timestamps
  },
  (table) => [
    uniqueIndex('otp_requests_request_id_unique').on(table.requestId),
    check('otp_requests_method_check', sql`${table.method} in ('login', 'register')`)
  ]
);

export const games = pgTable(
  'games',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull().unique(),
    name: varchar('name', { length: 128 }).notNull(),
    minPlayers: integer('min_players').notNull(),
    maxPlayers: integer('max_players').notNull(),
    gameType: varchar('game_type', { length: 16 }).$type<'online' | 'offline'>().default('online').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    pointRules: jsonb('point_rules').$type<GamePointRules>().default({}).notNull(),
    ...timestamps
  },
  (table) => [check('games_game_type_check', sql`${table.gameType} in ('online', 'offline')`)]
);

export const rooms = pgTable(
  'rooms',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'restrict' }),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    settings: jsonb('settings').$type<RoomSettings>().default({}).notNull(),
    status: varchar('status', { length: 32 }).$type<RoomStatus>().notNull(),
    isLocked: boolean('is_locked').default(false).notNull(),
    ...timestamps
  },
  (table) => [
    check('rooms_status_check', sql`${table.status} in ('waiting', 'in_game', 'finished')`)
  ]
);

export const roomPlayers = pgTable(
  'room_players',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: false }).defaultNow().notNull(),
    isReady: boolean('is_ready').default(false).notNull(),
    isConnected: boolean('is_connected').default(true).notNull(),
    cancelRequested: boolean('cancel_requested').default(false).notNull(),
    seatIndex: integer('seat_index')
  },
  (table) => [
    uniqueIndex('room_players_room_id_user_id_unique').on(table.roomId, table.userId),
    uniqueIndex('room_players_user_id_unique').on(table.userId)
  ]
);

export const roomMessages = pgTable('room_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull()
});

export const directMessages = pgTable('direct_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  senderId: uuid('sender_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  receiverId: uuid('receiver_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  isSeen: boolean('is_seen').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull()
});

export const gameMatches = pgTable(
  'game_matches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 32 }).$type<MatchStatus>().notNull(),
    matchState: jsonb('match_state').$type<MatchState>().default({}).notNull()
  },
  (table) => [
    check('game_matches_status_check', sql`${table.status} in ('pending', 'active', 'finished')`)
  ]
);

export const gameResults = pgTable('game_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'restrict' }),
  dataResults: jsonb('data_results').$type<GameFinishedResult>().default({} as GameFinishedResult).notNull(),
  ...timestamps
});

export const playerGameScores = pgTable(
  'player_game_scores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    score: integer('score').default(0).notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex('player_game_scores_user_id_game_id_unique').on(table.userId, table.gameId),
    check('player_game_scores_score_non_negative_check', sql`${table.score} >= 0`)
  ]
);

export const friendRequests = pgTable(
  'friend_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    receiverId: uuid('receiver_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 32 }).$type<FriendRequestStatus>().default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: false })
  },
  (table) => [
    check(
      'friend_requests_status_check',
      sql`${table.status} in ('pending', 'accepted', 'rejected', 'cancelled')`
    ),
    check('friend_requests_no_self_check', sql`${table.senderId} <> ${table.receiverId}`)
  ]
);

export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    friendId: uuid('friend_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('friendships_user_id_friend_id_unique').on(table.userId, table.friendId),
    check('friendships_no_self_check', sql`${table.userId} <> ${table.friendId}`)
  ]
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 32 }).$type<NotificationType>().notNull(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    friendRequestId: uuid('friend_request_id')
      .notNull()
      .references(() => friendRequests.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('notifications_friend_request_id_user_id_unique').on(table.friendRequestId, table.userId),
    check('notifications_type_check', sql`${table.type} in ('friend_request')`)
  ]
);

export const userReports = pgTable(
  'user_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reportedUserId: uuid('reported_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull()
  },
  (table) => [
    check('user_reports_no_self_check', sql`${table.reporterId} <> ${table.reportedUserId}`)
  ]
);

export const castleUpgrades = pgTable(
  'castle_upgrades',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    level: integer('level').notNull().unique(),
    requiredScores: jsonb('required_scores').$type<Record<string, number>>().default({}).notNull(),
    ...timestamps
  },
  (table) => [
    check('castle_upgrades_level_check', sql`${table.level} > 0`)
  ]
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purchasedAt: timestamp('purchased_at', { withTimezone: false }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: false }).notNull()
  }
);

export const settings = pgTable(
  'settings',
  {
    id: varchar('id', { length: 32 }).primaryKey().default('default'),
    version: varchar('version', { length: 32 }).notNull(),
    changelog: jsonb('changelog').notNull(),
    ...timestamps
  }
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
export type AuthRateLimit = typeof authRateLimits.$inferSelect;
export type NewAuthRateLimit = typeof authRateLimits.$inferInsert;
export type OtpRequest = typeof otpRequests.$inferSelect;
export type NewOtpRequest = typeof otpRequests.$inferInsert;
export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type RoomPlayer = typeof roomPlayers.$inferSelect;
export type NewRoomPlayer = typeof roomPlayers.$inferInsert;
export type RoomMessage = typeof roomMessages.$inferSelect;
export type NewRoomMessage = typeof roomMessages.$inferInsert;
export type DirectMessage = typeof directMessages.$inferSelect;
export type NewDirectMessage = typeof directMessages.$inferInsert;
export type GameMatch = typeof gameMatches.$inferSelect;
export type NewGameMatch = typeof gameMatches.$inferInsert;
export type GameResult = typeof gameResults.$inferSelect;
export type NewGameResult = typeof gameResults.$inferInsert;
export type PlayerGameScore = typeof playerGameScores.$inferSelect;
export type NewPlayerGameScore = typeof playerGameScores.$inferInsert;
export type FriendRequest = typeof friendRequests.$inferSelect;
export type NewFriendRequest = typeof friendRequests.$inferInsert;
export type Friendship = typeof friendships.$inferSelect;
export type NewFriendship = typeof friendships.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type UserReport = typeof userReports.$inferSelect;
export type NewUserReport = typeof userReports.$inferInsert;
export type CastleUpgrade = typeof castleUpgrades.$inferSelect;
export type NewCastleUpgrade = typeof castleUpgrades.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

