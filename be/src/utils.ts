import * as Sentry from '@sentry/node';

export function adler32(input: any): number {
  const MOD_ADLER = 65521;
  let a = 1,
    b = 0;

  try {
    const jsonString = JSON.stringify(input);

    for (let i = 0; i < jsonString.length; i++) {
      a = (a + jsonString.charCodeAt(i)) % MOD_ADLER;
      b = (b + a) % MOD_ADLER;
    }
  } catch (error) {
    Sentry.captureException(error);
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  }

  return (b << 16) | a;
}
