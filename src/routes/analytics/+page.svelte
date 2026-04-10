<script lang="ts">
	import { onMount } from 'svelte';

	import ChartWrapper, { type ChartPoint } from '$lib/components/analytics/ChartWrapper.svelte';
	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import { apiRequest } from '$lib/utils/http';

	let loading = $state(false);
	let error = $state<string | null>(null);

	let overview = $state({
		week: { tasksCompleted: 0, tasksCreated: 0, completionRate: 0, habitLogs: 0, focusMinutes: 0 },
		month: { tasksCompleted: 0, habitLogs: 0, focusMinutes: 0 }
	});

	let taskPoints = $state([] as ChartPoint[]);
	let habitHeatmap = $state([] as Array<{ date: string; count: number }>);
	let focusSessions = $state([] as Array<{ startedAt: string; durationMinutes: number; interruptions: number }>);

	onMount(() => {
		void loadAnalytics();
	});

	async function loadAnalytics() {
		loading = true;
		error = null;

		try {
			const dashboardRes = await apiRequest<{
				overview?: typeof overview;
				points?: Array<{ label: string; completed: number; created: number }>;
				heatmap?: Array<{ date: string; count: number }>;
				sessions?: Array<{ startedAt: string; durationMinutes: number; interruptions: number }>;
				error?: string;
			}>('/api/analytics/dashboard');

			if (!dashboardRes.ok) {
				error = dashboardRes.error ?? 'Unable to load analytics';
				return;
			}

			overview = dashboardRes.data?.overview ?? overview;
			taskPoints = (dashboardRes.data?.points ?? []).map((point) => ({
				label: point.label,
				value: point.completed,
				secondaryValue: point.created
			}));
			habitHeatmap = dashboardRes.data?.heatmap ?? [];
			focusSessions = dashboardRes.data?.sessions ?? [];
		} catch {
			error = 'Unable to load analytics';
		} finally {
			loading = false;
		}
	}

	const focusTrend = $derived.by(() => {
		return focusSessions
			.slice(0, 7)
			.reverse()
			.map((session, index) => ({
				label: `S${index + 1}`,
				value: session.durationMinutes,
				secondaryValue: session.interruptions
			}));
	});
</script>

<MainLayout>
	<section class="space-y-4">
		<div class="flex items-center justify-between">
			<h1 class="text-2xl font-bold text-text-primary">Analytics</h1>
			<div class="flex gap-2">
				<a class="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary" href="/api/analytics/export" target="_blank">Export JSON</a>
				<a class="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary" href="/api/reviews/weekly" target="_blank">Weekly Review</a>
				<a class="rounded-[8px] border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary" href="/api/reviews/monthly" target="_blank">Monthly Review</a>
			</div>
		</div>

		{#if error}
			<p class="rounded-[8px] border border-urgent/40 bg-urgent/10 px-3 py-2 text-sm text-urgent">{error}</p>
		{/if}

		{#if loading}
			<p class="text-sm text-text-secondary">Loading analytics...</p>
		{:else}
			<div class="grid grid-cols-4 gap-3">
				<article class="rounded-[8px] border border-border bg-surface p-4">
					<p class="text-xs text-text-secondary">Weekly Completion</p>
					<p class="mt-1 text-2xl font-bold text-text-primary">{overview.week.completionRate}%</p>
				</article>
				<article class="rounded-[8px] border border-border bg-surface p-4">
					<p class="text-xs text-text-secondary">Tasks Done (7d)</p>
					<p class="mt-1 text-2xl font-bold text-text-primary">{overview.week.tasksCompleted}</p>
				</article>
				<article class="rounded-[8px] border border-border bg-surface p-4">
					<p class="text-xs text-text-secondary">Habit Logs (7d)</p>
					<p class="mt-1 text-2xl font-bold text-text-primary">{overview.week.habitLogs}</p>
				</article>
				<article class="rounded-[8px] border border-border bg-surface p-4">
					<p class="text-xs text-text-secondary">Focus Minutes (7d)</p>
					<p class="mt-1 text-2xl font-bold text-text-primary">{overview.week.focusMinutes}</p>
				</article>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<ChartWrapper
					title="Task Completion Trend"
					points={taskPoints}
					primaryLabel="Completed"
					secondaryLabel="Created"
				/>
				<ChartWrapper
					title="Focus Session Trend"
					points={focusTrend}
					primaryLabel="Minutes"
					secondaryLabel="Interruptions"
				/>
			</div>

			<section class="rounded-[8px] border border-border bg-surface p-4">
				<h2 class="text-sm font-semibold text-text-primary">Habit Heatmap (30 days)</h2>
				<div class="mt-3 grid grid-cols-10 gap-2">
					{#each habitHeatmap as point (point.date)}
						<div
							class="h-6 rounded-[6px] border border-border"
							title={`${point.date}: ${point.count}`}
							style={`background: color-mix(in srgb, var(--color-success) ${Math.min(90, point.count * 20)}%, white);`}
						></div>
					{/each}
				</div>
			</section>
		{/if}
	</section>
</MainLayout>
