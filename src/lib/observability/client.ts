import * as Sentry from '@sentry/browser';
import posthog from 'posthog-js';
import { env } from '$env/dynamic/public';

let initialized = false;

export function initObservability() {
	if (initialized) return;
	initialized = true;

	if (env.PUBLIC_SENTRY_DSN) {
		Sentry.init({
			dsn: env.PUBLIC_SENTRY_DSN,
			tracesSampleRate: 0.1
		});
	}

	if (env.PUBLIC_POSTHOG_KEY) {
		posthog.init(env.PUBLIC_POSTHOG_KEY, {
			api_host: env.PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
			capture_pageview: true
		});
	}
}
