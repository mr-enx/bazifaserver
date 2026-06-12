import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type {
  AuthUser,
  CompleteRegistrationResponse,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  RegisterResponse,
  VerifyOtpResponse
} from '@game-platform/shared';
import { AuthError, AuthService, type AdminUserItem, extractBearerToken } from './auth.service.js';
import {
  completeRegistrationBodySchema,
  loginBodySchema,
  registerBodySchema,
  updateProfileBodySchema,
  verifyOtpBodySchema,
  type CompleteRegistrationBody,
  type LoginBody,
  type RegisterBody,
  type UpdateProfileBody,
  type VerifyOtpBody
} from './auth.schemas.js';

function serializeError(error: unknown): { statusCode: number; body: { message: string } } {
  if (error instanceof AuthError) {
    return {
      statusCode: error.statusCode,
      body: { message: error.message }
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: { message: error.issues[0]?.message ?? 'Invalid request body' }
    };
  }

  return {
    statusCode: 500,
    body: { message: 'Internal server error' }
  };
}

export async function registerAuthRoutes(app: FastifyInstance) {
  const authService = new AuthService();

  app.post<{ Body: RegisterBody; Reply: RegisterResponse | { message: string } }>(
    '/auth/register',
    async (request, reply) => {
      try {
        const body = registerBodySchema.parse(request.body);
        return await authService.register(body);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  );

  app.post<{ Body: LoginBody; Reply: LoginResponse | { message: string } }>(
    '/auth/login',
    async (request, reply) => {
      try {
        const body = loginBodySchema.parse(request.body);
        return await authService.login(body);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  );

  app.post<{ Body: VerifyOtpBody; Reply: VerifyOtpResponse | { message: string } }>(
    '/auth/verify-otp',
    async (request, reply) => {
      try {
        const body = verifyOtpBodySchema.parse(request.body);
        return await authService.verifyOtp(body, request.headers['user-agent']);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  );

  app.post<{ Body: CompleteRegistrationBody; Reply: CompleteRegistrationResponse | { message: string } }>(
    '/auth/complete-registration',
    async (request, reply) => {
      try {
        const body = completeRegistrationBodySchema.parse(request.body);
        return await authService.completeRegistration(body, request.headers['user-agent']);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  );

  app.get<{ Reply: MeResponse | { message: string } }>('/auth/me', {
    preHandler: app.authenticate,
    handler: async (request) => request.user
  });

  app.patch<{ Body: UpdateProfileBody; Reply: AuthUser | { message: string } }>(
    '/auth/profile',
    {
      preHandler: app.authenticate,
      handler: async (request, reply) => {
        try {
          const body = updateProfileBodySchema.parse(request.body);
          return await authService.updateProfile(request.user.id, body);
        } catch (error) {
          request.log.error(error);
          const serializedError = serializeError(error);
          return reply.status(serializedError.statusCode).send(serializedError.body);
        }
      }
    }
  );

  app.get<{ Reply: AdminUserItem[] | { message: string } }>('/admin/users', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      try {
        return await authService.listUsersForAdmin(request.user);
      } catch (error) {
        request.log.error(error);
        const serializedError = serializeError(error);
        return reply.status(serializedError.statusCode).send(serializedError.body);
      }
    }
  });
  app.get<{ Params: { userId: string }; Reply: AuthUser | { message: string } }>(
    '/users/:userId/profile',
    {
      preHandler: app.authenticate,
      handler: async (request, reply) => {
        try {
          return await authService.getUserProfile(request.params.userId);
        } catch (error) {
          request.log.error(error);
          const serializedError = serializeError(error);
          return reply.status(serializedError.statusCode).send(serializedError.body);
        }
      }
    }
  );

  app.delete<{ Params: { userId: string }; Reply: { success: true } | { message: string } }>(
    '/admin/users/:userId',
    {
      preHandler: app.authenticate,
      handler: async (request, reply) => {
        try {
          return await authService.deleteUserAsAdmin(request.params.userId, request.user);
        } catch (error) {
          request.log.error(error);
          const serializedError = serializeError(error);
          return reply.status(serializedError.statusCode).send(serializedError.body);
        }
      }
    }
  );

  app.post<{ Reply: LogoutResponse | { message: string } }>('/auth/logout', {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const token = extractBearerToken(request.headers.authorization);

      if (!token) {
        return reply.status(401).send({ message: 'Missing bearer token' });
      }

      await authService.logout(token);

      return { ok: true };
    }
  });
}
