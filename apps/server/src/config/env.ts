import 'dotenv/config';

type SmsProvider = 'log' | 'http' | 'melipayamak';

type AppEnv = {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  clientOrigins: string[];
  mediasoupAnnouncedIp?: string;
  databaseUrl?: string;
  otpSecret: string;
  phoneDefaultCountryCode: string;
  smsProvider: SmsProvider;
  smsApiUrl?: string;
  smsApiKey?: string;
  smsFrom?: string;
  melipayamakUsername?: string;
  melipayamakPassword?: string;
  melipayamakBodyId?: string;
};

function readPort(value: string | undefined): number {
  const port = Number(value ?? 8080);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return port;
}

function readNodeEnv(value: string | undefined): AppEnv['nodeEnv'] {
  if (value === 'production' || value === 'test' || value === 'development') {
    return value;
  }

  return 'development';
}

function readPhoneDefaultCountryCode(value: string | undefined): string {
  const normalized = value?.trim() || '+1';

  if (!/^\+[1-9]\d{0,3}$/.test(normalized)) {
    throw new Error('PHONE_DEFAULT_COUNTRY_CODE must look like +1 or +44');
  }

  return normalized;
}

function readSmsProvider(value: string | undefined): SmsProvider {
  if (!value || value === 'log') {
    return 'log';
  }

  if (value === 'http' || value === 'melipayamak') {
    return value;
  }

  throw new Error('SMS_PROVIDER must be one of: log, http, melipayamak');
}

function readOtpSecret(
  nodeEnv: AppEnv['nodeEnv'],
  value: string | undefined
): string {
  const trimmed = value?.trim();

  if (trimmed) {
    return trimmed;
  }

  if (nodeEnv === 'production') {
    throw new Error('AUTH_OTP_SECRET is required in production');
  }

  return 'development-otp-secret';
}

function readAnnouncedIp(
  nodeEnv: AppEnv['nodeEnv'],
  value: string | undefined
): string | undefined {
  const trimmed = value?.trim();

  if (trimmed) {
    return trimmed;
  }

  // In dev, fall back to loopback so mediasoup still works on localhost.
  if (nodeEnv === 'development') {
    return '127.0.0.1';
  }

  // In production a real announced IP is required, otherwise media never flows.
  throw new Error('MEDIASOUP_ANNOUNCED_IP is required in production');
}

const nodeEnv = readNodeEnv(process.env.NODE_ENV);

export const env: AppEnv = {
  nodeEnv,
  host: process.env.HOST ?? '0.0.0.0',
  port: readPort(process.env.PORT),
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  mediasoupAnnouncedIp: readAnnouncedIp(nodeEnv, process.env.MEDIASOUP_ANNOUNCED_IP),
  databaseUrl: process.env.DATABASE_URL,
  otpSecret: readOtpSecret(nodeEnv, process.env.AUTH_OTP_SECRET),
  phoneDefaultCountryCode: readPhoneDefaultCountryCode(
    process.env.PHONE_DEFAULT_COUNTRY_CODE
  ),
  smsProvider: readSmsProvider(process.env.SMS_PROVIDER),
  smsApiUrl: process.env.SMS_API_URL?.trim(),
  smsApiKey: process.env.SMS_API_KEY?.trim(),
  smsFrom: process.env.SMS_FROM?.trim(),
  melipayamakUsername: process.env.MELIPAYAMAK_USERNAME?.trim(),
  melipayamakPassword: process.env.MELIPAYAMAK_PASSWORD?.trim(),
  melipayamakBodyId: process.env.MELIPAYAMAK_BODY_ID?.trim()
};
