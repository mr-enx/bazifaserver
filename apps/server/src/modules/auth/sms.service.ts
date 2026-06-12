import { env } from '../../config/env.js';
import { maskPhoneNumber, toMelipayamakPhone } from './auth.utils.js';

type SendOtpSmsParams = {
  phone: string;
  code: string;
  requestId: string;
};

const MELIPAYAMAK_SEND_BY_BASE_NUMBER_URL = 'https://api.payamak-panel.com/post/Send.asmx/SendByBaseNumber2';

export class SmsService {
  async sendOtpCode({ phone, code, requestId }: SendOtpSmsParams): Promise<void> {
    if (env.smsProvider === 'melipayamak') {
      await this.sendViaMelipayamak(phone, code, requestId);
      return;
    }

    const message = `${code} is your Bazifa verification code. It expires in 5 minutes.`;

    if (env.smsProvider === 'http') {
      await this.sendViaHttp(phone, message, requestId);
      return;
    }

    if (env.nodeEnv === 'production') {
      throw new Error('SMS provider is not configured for production');
    }

    console.info(`[sms:otp] ${maskPhoneNumber(phone)} request=${requestId} code=${code}`);
  }

  private async sendViaMelipayamak(phone: string, code: string, requestId: string): Promise<void> {
    if (!env.melipayamakUsername || !env.melipayamakPassword || !env.melipayamakBodyId) {
      throw new Error('Melipayamak credentials are incomplete');
    }

    const payload = new URLSearchParams({
      username: env.melipayamakUsername,
      password: env.melipayamakPassword,
      text: code,
      to: toMelipayamakPhone(phone),
      bodyId: env.melipayamakBodyId
    });

    const response = await fetch(MELIPAYAMAK_SEND_BY_BASE_NUMBER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      body: payload.toString()
    });

    if (!response.ok) {
      throw new Error(`Melipayamak returned HTTP ${response.status}`);
    }

    const result = await response.text();

    console.info(
      `[sms:otp:sent] ${maskPhoneNumber(phone)} request=${requestId} provider=melipayamak result=${JSON.stringify(result)}`
    );
  }

  private async sendViaHttp(phone: string, message: string, requestId: string): Promise<void> {
    if (!env.smsApiUrl) {
      throw new Error('SMS_API_URL is required when SMS_PROVIDER=http');
    }

    const response = await fetch(env.smsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.smsApiKey ? { 'x-api-key': env.smsApiKey } : {})
      },
      body: JSON.stringify({
        to: phone,
        from: env.smsFrom ?? 'Bazifa',
        message,
        requestId
      })
    });

    if (!response.ok) {
      throw new Error(`SMS gateway returned ${response.status}`);
    }
  }
}
