import { env } from '$lib/server/env';

export const ACCESS_COOKIE = env.SESSION_COOKIE_NAME;
export const REFRESH_COOKIE = `${env.SESSION_COOKIE_NAME}_refresh`;

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export const PASSWORD_SALT_ROUNDS = 12;
