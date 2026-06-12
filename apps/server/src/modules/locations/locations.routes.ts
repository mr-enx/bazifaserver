import type { FastifyInstance } from 'fastify';
import type { AdminCreateCityRequest, AdminDeleteCityResponse, AdminUpdateCityRequest, CityItem, ProvinceItem } from '@game-platform/shared';
import { z } from 'zod';
import { LocationsService } from './locations.service.js';

function serializeError(error: unknown): { statusCode: number; body: { message: string } } {
  const message = error instanceof Error ? error.message : 'Internal server error';

  if (message === 'Forbidden') {
    return { statusCode: 403, body: { message } };
  }

  if (message.endsWith('not found')) {
    return { statusCode: 404, body: { message } };
  }

  if (message.startsWith('Invalid') || message.endsWith('invalid')) {
    return { statusCode: 400, body: { message } };
  }

  return { statusCode: 500, body: { message: 'Internal server error' } };
}

const createCityBodySchema = z.object({
  provinceId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(128)
});

const updateCityBodySchema = z.object({
  provinceId: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2).max(128).optional()
});

export async function registerLocationsRoutes(app: FastifyInstance) {
  const locationsService = new LocationsService();

  app.get<{ Reply: ProvinceItem[] | { message: string } }>('/locations/provinces', {
    handler: async () => locationsService.listProvinces()
  });

  app.get<{ Params: { provinceId: string }; Reply: CityItem[] | { message: string } }>(
    '/locations/provinces/:provinceId/cities',
    {
      handler: async (request) => locationsService.listCities(Number(request.params.provinceId))
    }
  );

  app.get<{ Reply: ProvinceItem[] | { message: string } }>('/admin/locations/provinces', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        if (request.user.role !== 'admin') {
          return reply.status(403).send({ message: 'Forbidden' });
        }
        return await locationsService.listProvinces();
      } catch (error) {
        request.log.error(error);
        const serialized = serializeError(error);
        return reply.status(serialized.statusCode).send(serialized.body);
      }
    }
  });

  app.get<{ Params: { provinceId: string }; Reply: CityItem[] | { message: string } }>(
    '/admin/locations/provinces/:provinceId/cities',
    {
      preHandler: app.authenticate,
      handler: async (request, reply) => {
        try {
          if (request.user.role !== 'admin') {
            return reply.status(403).send({ message: 'Forbidden' });
          }
          return await locationsService.listCities(Number(request.params.provinceId));
        } catch (error) {
          request.log.error(error);
          const serialized = serializeError(error);
          return reply.status(serialized.statusCode).send(serialized.body);
        }
      }
    }
  );

  app.post<{ Body: AdminCreateCityRequest; Reply: CityItem | { message: string } }>(
    '/admin/locations/cities',
    {
      preHandler: app.authenticate,
      handler: async (request, reply) => {
        try {
          const body = createCityBodySchema.parse(request.body);
          return await locationsService.createCity(request.user, body);
        } catch (error) {
          request.log.error(error);
          const serialized = serializeError(error);
          return reply.status(serialized.statusCode).send(serialized.body);
        }
      }
    }
  );

  app.patch<{ Params: { cityId: string }; Body: AdminUpdateCityRequest; Reply: CityItem | { message: string } }>(
    '/admin/locations/cities/:cityId',
    {
      preHandler: app.authenticate,
      handler: async (request, reply) => {
        try {
          const cityId = Number(request.params.cityId);
          const body = updateCityBodySchema.parse(request.body);
          return await locationsService.updateCity(request.user, cityId, body);
        } catch (error) {
          request.log.error(error);
          const serialized = serializeError(error);
          return reply.status(serialized.statusCode).send(serialized.body);
        }
      }
    }
  );

  app.delete<{ Params: { cityId: string }; Reply: AdminDeleteCityResponse | { message: string } }>(
    '/admin/locations/cities/:cityId',
    {
      preHandler: app.authenticate,
      handler: async (request, reply) => {
        try {
          await locationsService.deleteCity(request.user, Number(request.params.cityId));
          return { success: true };
        } catch (error) {
          request.log.error(error);
          const serialized = serializeError(error);
          return reply.status(serialized.statusCode).send(serialized.body);
        }
      }
    }
  );
}
