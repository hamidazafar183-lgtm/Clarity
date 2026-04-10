<script lang="ts">
	import { onMount } from 'svelte';

	import LoginForm from '$lib/components/auth/LoginForm.svelte';
	import { apiRequest } from '$lib/utils/http';

	let health = $state<'checking' | 'ok' | 'error'>('checking');
	let healthMessage = $state('');

	onMount(async () => {
		const result = await apiRequest<{ database?: string; error?: string }>('/api/health');
		if (!result.ok) {
			health = 'error';
			healthMessage = result.error ?? 'API not reachable';
			return;
		}

		if (result.data?.database === 'ok') {
			health = 'ok';
			healthMessage = 'DB connected';
		} else {
			health = 'error';
			healthMessage = 'DB not connected';
		}
	});
</script>

<div class="mx-auto mt-16 max-w-xl space-y-3">
	{#if health === 'checking'}
		<p class="rounded-[8px] border border-border bg-surface px-3 py-2 text-xs text-text-secondary">
			Checking API health...
		</p>
	{:else if health === 'ok'}
		<p class="rounded-[8px] border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
			{healthMessage}
		</p>
	{:else}
		<p class="rounded-[8px] border border-urgent/40 bg-urgent/10 px-3 py-2 text-xs text-urgent">
			{healthMessage}
		</p>
	{/if}
	<LoginForm />
</div>
