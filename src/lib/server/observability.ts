import * as Sentry from '@sentry/node';

import { env } from '$lib/server/env';

let initialized = false;

export function initServerObservability() {
	if (initialized) return;
	initialized = true;

	if (env.SENTRY_DSN) {
		Sentry.init({
			dsn: env.SENTRY_DSN,
			tracesSampleRate: 0.1
		});
	}
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
	if (!env.SENTRY_DSN) return;
	if (context) {
		Sentry.captureException(error, { extra: context });
		return;
	}
	Sentry.captureException(error);
}
