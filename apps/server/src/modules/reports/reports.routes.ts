import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { ReportsError, ReportsService } from './reports.service.js';
import { createReportSchema, type CreateReportBody } from './reports.schemas.js';
import type { ReportItem } from '@game-platform/shared';

function serializeError(error: unknown): { statusCode: number; body: { message: string } } {
  if (error instanceof ReportsError) {
    return {
      statusCode: error.statusCode,
      body: { message: error.message }
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: { message: error.issues[0]?.message ?? 'Invalid request' }
    };
  }

  return {
    statusCode: 500,
    body: { message: 'Internal server error' }
  };
}

export async function registerReportsRoutes(app: FastifyInstance) {
  const reportsService = new ReportsService();

  app.post<{ Body: CreateReportBody; Reply: { message: string } }>(
    '/reports',
    {
      preHandler: app.authenticate,
      handler: async (request, reply) => {
        try {
          const body = createReportSchema.parse(request.body);
          return await reportsService.createReport(request.user, body);
        } catch (error) {
          request.log.error(error);
          const serializedError = serializeError(error);
          return reply.status(serializedError.statusCode).send(serializedError.body);
        }
      }
    }
  );

  app.get<{ Reply: ReportItem[] | { message: string } }>(
    '/admin/reports',
    {
      preHandler: app.authenticate,
      handler: async (request, reply) => {
        try {
          return await reportsService.listReports(request.user);
        } catch (error) {
          request.log.error(error);
          const serializedError = serializeError(error);
          return reply.status(serializedError.statusCode).send(serializedError.body);
        }
      }
    }
  );
}
