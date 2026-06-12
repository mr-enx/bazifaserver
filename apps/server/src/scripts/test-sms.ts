import { SmsService } from '../modules/auth/sms.service.js';

const smsService = new SmsService();

smsService
  .sendOtpCode({
    phone: '+989002860067',
    code: '1234',
    requestId: 'manual-test'
  })
  .then(() => {
    console.log('Test SMS sent');
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('Test SMS failed:', error);
    process.exit(1);
  });
