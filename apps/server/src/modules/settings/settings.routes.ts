import type { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { settings, users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export async function registerSettingsRoutes(app: FastifyInstance) {
  app.get('/settings', async (request, reply) => {
    let setting = await db.query.settings.findFirst({
      where: eq(settings.id, 'default')
    });

    if (!setting) {
      const defaultChangelog = [
        'نسخه اولیه بازی منتشر شد.',
        'بهبود عملکرد سرور و رفع باگ‌های جزئی'
      ];
      
      const newSettings = await db.insert(settings).values({
        id: 'default',
        version: '1.0.0',
        changelog: defaultChangelog
      }).returning();
      
      setting = newSettings[0];
    }

    return {
      version: setting.version,
      changelog: setting.changelog
    };
  });

  const updateChangelogVersionSchema = z.object({
    version: z.string().min(1)
  });

  app.patch('/users/me/changelog-version', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { version } = updateChangelogVersionSchema.parse(request.body);
      
      await db.update(users)
        .set({ lastChangelogVersion: version })
        .where(eq(users.id, request.user.id));
        
      return { success: true, lastChangelogVersion: version };
    }
  });
}
