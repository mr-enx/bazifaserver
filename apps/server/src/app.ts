import cors from '@fastify/cors';
import Fastify from 'fastify';
import { env } from './config/env.js';
import { authPlugin } from './modules/auth/auth.plugin.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerDirectChatRoutes } from './modules/chat/direct-chat.routes.js';
import { registerFriendsRoutes } from './modules/friends/friends.routes.js';
import { registerGamesRoutes } from './modules/games/games.routes.js';
import { registerLocationsRoutes } from './modules/locations/locations.routes.js';
import { registerRoomsRoutes } from './modules/rooms/rooms.routes.js';
import { registerReportsRoutes } from './modules/reports/reports.routes.js';
import { registerSettingsRoutes } from './modules/settings/settings.routes.js';
import { registerSubscriptionsRoutes } from './modules/subscriptions/subscriptions.routes.js';
import { registerSocketServer } from './realtime/socket.js';
import { registerHealthRoutes } from './routes/health.js';

export async function buildApp() {
  const app = Fastify({
    logger: env.nodeEnv !== 'test'
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      // In development, allow all origins or if it matches our list
      if (env.nodeEnv === 'development') {
        cb(null, true);
        return;
      }

      if (!origin || env.clientOrigins.some(o => origin.startsWith(o))) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    credentials: true,
    maxAge: 600
  });

  await authPlugin(app);

  await app.register(registerAuthRoutes, { prefix: '/api' });
  await app.register(registerFriendsRoutes, { prefix: '/api' });
  await app.register(registerDirectChatRoutes, { prefix: '/api' });
  await app.register(registerGamesRoutes, { prefix: '/api' });
  await app.register(registerLocationsRoutes, { prefix: '/api' });
  await app.register(registerRoomsRoutes, { prefix: '/api' });
  await app.register(registerReportsRoutes, { prefix: '/api' });
  await app.register(registerSettingsRoutes, { prefix: '/api' });
  await app.register(registerSubscriptionsRoutes, { prefix: '/api' });
  await app.register(registerHealthRoutes);

  registerSocketServer(app);

  return app;
}
