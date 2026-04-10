import { randomUUID } from 'node:crypto';

import { env } from '$env/dynamic/private';
import { redirect, type Handle, type HandleServerError } from '@sveltejs/kit';

import { ACCESS_COOKIE } from '$lib/server/auth/constants';
import { verifyAccessToken } from '$lib/server/auth/jwt';
import { rotateSession, touchSession } from '$lib/server/auth/service';
import { captureError, initServerObservability } from '$lib/server/observability';
import { prisma } from '$lib/server/prisma';
import { ensurePersonalWorkspace } from '$lib/server/workspace';

const csp = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: https:",
	"font-src 'self' data:",
	"connect-src 'self'",
	"frame-ancestors 'none'",
	"base-uri 'self'",
	"form-action 'self'"
].join('; ');

function isStateChanging(method: string) {
	return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

async function ensureBypassUser() {
	const user = await prisma.user.upsert({
		where: { email: 'dev@clarity.local' },
		update: {
			name: 'Dev Admin',
			emailVerified: true,
			deletedAt: null
		},
		create: {
			email: 'dev@clarity.local',
			name: 'Dev Admin',
			emailVerified: true,
			passwordHash: null,
			progressCore: {
				create: {}
			}
		},
		select: {
			id: true,
			email: true,
			name: true,
			avatarUrl: true
		}
	});

	await ensurePersonalWorkspace(user.id);
	return user;
}

export const handle: Handle = async ({ event, resolve }) => {
	initServerObservability();
	event.locals.requestId = randomUUID();
	event.locals.user = null;

	const authDisabled = true;
	const maintenance = env.MAINTENANCE_MODE === '1';
	if (
		maintenance &&
		event.url.pathname !== '/maintenance' &&
		!event.url.pathname.startsWith('/api/health')
	) {
		throw redirect(302, '/maintenance');
	}

	if (event.url.pathname.startsWith('/api') && isStateChanging(event.request.method)) {
		const origin = event.request.headers.get('origin');
		const host = event.request.headers.get('host');
		const expectedOrigin = `${event.url.protocol}//${host}`;
		if (origin && origin !== expectedOrigin) {
			return new Response(JSON.stringify({ error: 'Invalid request origin' }), {
				status: 403,
				headers: { 'content-type': 'application/json' }
			});
		}
	}

	const authBypass = authDisabled || env.AUTH_BYPASS === '1';
	if (authBypass) {
		if (
			event.url.pathname === '/' ||
			event.url.pathname.startsWith('/auth')
		) {
			throw redirect(302, '/dashboard');
		}

		try {
			const user = await ensureBypassUser();
			event.locals.user = {
				id: user.id,
				email: user.email,
				name: user.name,
				avatarUrl: user.avatarUrl
			};
		} catch {
			event.locals.user = {
				id: 'dev-bypass-user',
				email: 'dev@clarity.local',
				name: 'Dev Admin',
				avatarUrl: null
			};
		}
	} else {
		const accessToken = event.cookies.get(ACCESS_COOKIE);
		if (accessToken) {
			const payload = await verifyAccessToken(accessToken);

			if (payload?.sub) {
				const user = await prisma.user.findUnique({
					where: { id: payload.sub },
					select: {
						id: true,
						email: true,
						name: true,
						avatarUrl: true,
						deletedAt: true
					}
				});

				if (user && !user.deletedAt) {
					event.locals.user = {
						id: user.id,
						email: user.email,
						name: user.name,
						avatarUrl: user.avatarUrl
					};
				}
				await touchSession(event);
			} else {
				const rotated = await rotateSession(event);
				if (rotated) {
					event.locals.user = rotated;
				}
			}
		} else {
			const rotated = await rotateSession(event);
			if (rotated) {
				event.locals.user = rotated;
			}
		}
	}

	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-type' || name === 'cache-control'
	});

	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set('content-security-policy', csp);

	if (env.NODE_ENV === 'production' && env.VERCEL_URL) {
		response.headers.set('access-control-allow-origin', `https://${env.VERCEL_URL}`);
	} else {
		response.headers.set('access-control-allow-origin', event.url.origin);
	}
	response.headers.set('access-control-allow-credentials', 'true');

	return response;
};

export const handleError: HandleServerError = ({ error, event }) => {
	captureError(error, { requestId: event.locals.requestId, path: event.url.pathname });
};
