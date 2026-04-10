import type { Cookies } from '@sveltejs/kit';

import {
	ACCESS_COOKIE,
	ACCESS_TOKEN_TTL_SECONDS,
	REFRESH_COOKIE,
	REFRESH_TOKEN_TTL_SECONDS
} from '$lib/server/auth/constants';
import { env } from '$lib/server/env';

const baseCookieOptions = {
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: env.NODE_ENV === 'production',
	path: '/'
};

export function setAuthCookies(cookies: Cookies, accessToken: string, refreshToken: string): void {
	cookies.set(ACCESS_COOKIE, accessToken, {
		...baseCookieOptions,
		maxAge: ACCESS_TOKEN_TTL_SECONDS
	});

	cookies.set(REFRESH_COOKIE, refreshToken, {
		...baseCookieOptions,
		maxAge: REFRESH_TOKEN_TTL_SECONDS
	});
}

export function clearAuthCookies(cookies: Cookies): void {
	cookies.delete(ACCESS_COOKIE, { path: '/' });
	cookies.delete(REFRESH_COOKIE, { path: '/' });
}
