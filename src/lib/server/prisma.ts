import { PrismaClient } from '@prisma/client';

import { env } from '$lib/server/env';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		datasourceUrl: env.DATABASE_URL,
		log:
			env.NODE_ENV === 'development' || Number(env.LOG_SLOW_QUERIES_MS ?? '0') > 0
				? ['query', 'error', 'warn']
				: ['error']
	});

if (env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = prisma;
}

const slowQueryMs = Number(env.LOG_SLOW_QUERIES_MS ?? '0');
if (slowQueryMs > 0) {
	const onQuery = prisma.$on as unknown as (event: string, cb: (e: any) => void) => void;
	onQuery('query', (event) => {
		if (event.duration >= slowQueryMs) {
			console.warn(`[slow-query] ${event.model}.${event.action} ${event.duration}ms`);
		}
	});
}
