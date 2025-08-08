import crypto from 'crypto';
import type { Response } from 'express';
import * as dotenv from 'dotenv';
import * as v from './validators';
dotenv.config({ path: '.env.local' });

type BinaryToTextEncoding = 'base64' | 'base64url' | 'hex' | 'binary';
const TOKEN_ALGORITHM = 'sha256';
const TOKEN_ENCODING = 'hex' as BinaryToTextEncoding;
const TOKEN_SEPARATOR = '.';
const TOKEN_SECRET_KEY = process.env.COOKIE_SECRET;

export const createHmac = (data: string) => {
  const hmac = crypto
    .createHmac(TOKEN_ALGORITHM, TOKEN_SECRET_KEY)
    .update(data)
    .digest(TOKEN_ENCODING);
  return hmac;
};

/**
 * Get token ID retrieve from text.
 * Return `null` if signature does not match.
 */
export const getTokenId = (token: string) => {
  if (!v.isString(token)) return null;

  const [tokenId, signature] = token.split(TOKEN_SEPARATOR);

  if (!tokenId) return null;

  const hmac = createHmac(tokenId);
  return hmac === signature ? tokenId : null;
};

/**
 * Create token that appended signature
 */
export const signToken = (tokenId: string) => {
  const signature = createHmac(tokenId);
  const token = [tokenId, signature].join(TOKEN_SEPARATOR);
  return token;
};

export const signSessionToken = (sessionId: string) => {
  const hmac = crypto
    .createHmac(TOKEN_ALGORITHM, TOKEN_SECRET_KEY)
    .update(sessionId)
    .digest('base64');

  return [sessionId, hmac].join(TOKEN_SEPARATOR);
};

export const getSessionIdFromToken = (sessionToken: string) => {
  try {
    const sessionId = sessionToken.split(TOKEN_SEPARATOR)[0] as string;
    const generatedSessionToken = signSessionToken(sessionId || '');

    const decoded = `${decodeURIComponent(sessionToken)}=`;

    return decoded === generatedSessionToken ? sessionId : false;
  } catch (err) {
    console.error(`Session token cannot be validated`, err);
    return false;
  }
};

const COOKIE_SESSION_NAME = process.env.COOKIE_SESSION_NAME;

export const setSessionCookie = (sessionId: string, res: Response) => {
  res.cookie(COOKIE_SESSION_NAME, sessionId, {
    sameSite: process.env.COOKIE_SAME_SITE === 'TRUE' || 'none',
    httpOnly: true,
    signed: true,
    secure: process.env.COOKIE_SAME_SITE !== 'TRUE',
    maxAge: 24 * 60 * 60 * 1000,
    domain:
      process.env.COOKIE_SAME_SITE === 'TRUE' ? process.env.HOST : undefined,
  });
};

export const removeSessionCookie = (res: Response) => {
  res.clearCookie(COOKIE_SESSION_NAME, {
    sameSite: process.env.COOKIE_SAME_SITE === 'TRUE' || 'none',
    httpOnly: true,
    signed: true,
    secure: process.env.COOKIE_SAME_SITE !== 'TRUE',
    domain:
      process.env.COOKIE_SAME_SITE === 'TRUE' ? process.env.HOST : undefined,
  });
};
