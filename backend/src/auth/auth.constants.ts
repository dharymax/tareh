export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 30;
export const OTP_TTL_SECONDS = Number(process.env.OTP_CODE_TTL_SECONDS ?? 300);
export const OTP_RESEND_COOLDOWN_SECONDS = Number(
  process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60,
);
export const OTP_MAX_PER_HOUR = Number(process.env.OTP_MAX_PER_HOUR ?? 3);

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET ?? '';
  if (secret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters.');
  }
  return new TextEncoder().encode(secret);
}

export function getOtpHashSecret(): string {
  const secret = process.env.OTP_HASH_SECRET ?? '';
  if (secret.length < 32) {
    throw new Error('OTP_HASH_SECRET must contain at least 32 characters.');
  }
  return secret;
}
