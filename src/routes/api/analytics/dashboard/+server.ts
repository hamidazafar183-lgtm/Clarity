import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const now = new Date();
	const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	const [tasksCompletedWeek, tasksCreatedWeek, habitLogsWeek, focusMinutesWeek] = await Promise.all([
		prisma.task.count({
			where: { creatorId: locals.user.id, status: 'DONE', completedAt: { gte: weekStart }, deletedAt: null }
		}),
		prisma.task.count({
			where: { creatorId: locals.user.id, createdAt: { gte: weekStart }, deletedAt: null }
		}),
		prisma.habitLog.count({ where: { userId: locals.user.id, completedDate: { gte: weekStart } } }),
		prisma.focusSession.aggregate({
			where: { userId: locals.user.id, startedAt: { gte: weekStart } },
			_sum: { durationMinutes: true }
		})
	]);

	const [tasksCompletedMonth, habitLogsMonth, focusMinutesMonth] = await Promise.all([
		prisma.task.count({
			where: { creatorId: locals.user.id, status: 'DONE', completedAt: { gte: monthStart }, deletedAt: null }
		}),
		prisma.habitLog.count({ where: { userId: locals.user.id, completedDate: { gte: monthStart } } }),
		prisma.focusSession.aggregate({
			where: { userId: locals.user.id, startedAt: { gte: monthStart } },
			_sum: { durationMinutes: true }
		})
	]);

	const completionRate = tasksCreatedWeek > 0 ? Math.round((tasksCompletedWeek / tasksCreatedWeek) * 100) : 0;

	const taskPoints = await prisma.task.groupBy({
		by: ['createdAt'],
		where: { creatorId: locals.user.id, deletedAt: null, createdAt: { gte: weekStart } },
		_count: { _all: true }
	});

	const completedPoints = await prisma.task.groupBy({
		by: ['completedAt'],
		where: {
			creatorId: locals.user.id,
			deletedAt: null,
			status: 'DONE',
			completedAt: { gte: weekStart }
		},
		_count: { _all: true }
	});

	const byDay = new Map<string, { created: number; completed: number }>();
	for (const point of taskPoints) {
		const label = point.createdAt.toISOString().slice(0, 10);
		byDay.set(label, { created: point._count._all, completed: byDay.get(label)?.completed ?? 0 });
	}
	for (const point of completedPoints) {
		if (!point.completedAt) continue;
		const label = point.completedAt.toISOString().slice(0, 10);
		const existing = byDay.get(label) ?? { created: 0, completed: 0 };
		byDay.set(label, { ...existing, completed: point._count._all });
	}

	const points = Array.from(byDay.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.slice(-7)
		.map(([label, counts]) => ({
			label,
			created: counts.created,
			completed: counts.completed
		}));

	const habitHeatmap = await prisma.habitLog.groupBy({
		by: ['completedDate'],
		where: { userId: locals.user.id, completedDate: { gte: monthStart } },
		_count: { _all: true }
	});

	const heatmap = habitHeatmap.map((item) => ({
		date: item.completedDate.toISOString().slice(0, 10),
		count: item._count._all
	}));

	const sessions = await prisma.focusSession.findMany({
		where: { userId: locals.user.id, startedAt: { gte: weekStart } },
		orderBy: { startedAt: 'desc' },
		select: { startedAt: true, durationMinutes: true, interruptions: true }
	});

	return json({
		overview: {
			week: {
				tasksCompleted: tasksCompletedWeek,
				tasksCreated: tasksCreatedWeek,
				completionRate,
				habitLogs: habitLogsWeek,
				focusMinutes: focusMinutesWeek._sum.durationMinutes ?? 0
			},
			month: {
				tasksCompleted: tasksCompletedMonth,
				habitLogs: habitLogsMonth,
				focusMinutes: focusMinutesMonth._sum.durationMinutes ?? 0
			}
		},
		points,
		heatmap,
		sessions
	});
};
