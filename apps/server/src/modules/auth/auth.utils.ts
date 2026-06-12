import { createHmac, randomBytes, randomInt } from 'node:crypto';
import { env } from '../../config/env.js';

function toAsciiDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

function validateNormalizedPhone(phone: string): string {
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error('Phone number must be a valid international number');
  }

  return phone;
}

export function normalizePhoneNumber(input: string): string {
  const asciiInput = toAsciiDigits(input).trim();

  if (!asciiInput) {
    throw new Error('Phone number is required');
  }

  let sanitized = asciiInput.replace(/[().\-\s]/g, '');

  if (sanitized.startsWith('00')) {
    sanitized = `+${sanitized.slice(2)}`;
  }

  if (sanitized.startsWith('+')) {
    const digits = sanitized.slice(1).replace(/\D/g, '');
    return validateNormalizedPhone(`+${digits}`);
  }

  const digits = sanitized.replace(/\D/g, '');

  if (!digits) {
    throw new Error('Phone number is required');
  }

  if (digits.startsWith('0')) {
    const countryCodeDigits = env.phoneDefaultCountryCode.replace(/^\+/, '');
    return validateNormalizedPhone(`+${countryCodeDigits}${digits.slice(1)}`);
  }

  if (digits.length === 10) {
    return validateNormalizedPhone(`${env.phoneDefaultCountryCode}${digits}`);
  }

  return validateNormalizedPhone(`+${digits}`);
}

export function maskPhoneNumber(phone: string): string {
  if (phone.length <= 6) {
    return phone;
  }

  return `${phone.slice(0, 4)}${'*'.repeat(Math.max(phone.length - 6, 2))}${phone.slice(-2)}`;
}

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function generateRequestId(): string {
  return randomBytes(24).toString('base64url');
}

export function createOtpCodeHash(requestId: string, code: string): string {
  return createHmac('sha256', env.otpSecret).update(`${requestId}:${code}`, 'utf8').digest('hex');
}


export function toMelipayamakPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith('98')) {
    return `0${digits.slice(2)}`;
  }

  if (digits.startsWith('0')) {
    return digits;
  }

  return digits;
}

function div(a: number, b: number): number {
  return Math.floor(a / b);
}

function mod(a: number, b: number): number {
  return a - Math.floor(a / b) * b;
}

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192,
    2262, 2324, 2394, 2456, 3178
  ];

  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0] ?? -61;
  let jm = 0;
  let jump = 0;

  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i] ?? 0;
    jump = jm - jp;
    if (jy < jm) {
      break;
    }
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);

  if (mod(jump, 33) === 4 && jump - n === 4) {
    leapJ += 1;
  }

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }

  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) {
    leap = 4;
  }

  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  const d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408 -
    div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) +
    752;
  return d;
}

function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function isLeapJalaliYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

function isValidJalaliDate(jy: number, jm: number, jd: number): boolean {
  if (!Number.isInteger(jy) || !Number.isInteger(jm) || !Number.isInteger(jd)) {
    return false;
  }

  if (jy < 1200 || jy > 1600) {
    return false;
  }

  if (jm < 1 || jm > 12) {
    return false;
  }

  if (jd < 1) {
    return false;
  }

  if (jm <= 6) {
    return jd <= 31;
  }

  if (jm <= 11) {
    return jd <= 30;
  }

  return jd <= (isLeapJalaliYear(jy) ? 30 : 29);
}

export function normalizeJalaliDateInput(input: string): string {
  const asciiInput = toAsciiDigits(input).trim();
  const sanitized = asciiInput.replace(/\s+/g, '');

  const match = sanitized.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (!match) {
    throw new Error('Birth date must be in YYYY/MM/DD format');
  }

  const jy = Number(match[1]);
  const jm = Number(match[2]);
  const jd = Number(match[3]);

  if (!isValidJalaliDate(jy, jm, jd)) {
    throw new Error('Birth date is invalid');
  }

  return `${String(jy).padStart(4, '0')}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
}

export function calculateAgeFromJalaliBirthDate(birthDateShamsi: string, now = new Date()): number {
  const normalized = normalizeJalaliDateInput(birthDateShamsi);
  const [jy, jm, jd] = normalized.split('-').map((part) => Number(part));
  const gregorian = d2g(j2d(jy ?? 0, jm ?? 0, jd ?? 0));

  const todayYear = now.getUTCFullYear();
  const todayMonth = now.getUTCMonth() + 1;
  const todayDay = now.getUTCDate();

  let age = todayYear - gregorian.gy;
  const birthdayPassed =
    todayMonth > gregorian.gm ||
    (todayMonth === gregorian.gm && todayDay >= gregorian.gd);

  if (!birthdayPassed) {
    age -= 1;
  }

  if (!Number.isFinite(age) || age < 1 || age > 120) {
    throw new Error('Age is invalid');
  }

  return age;
}
