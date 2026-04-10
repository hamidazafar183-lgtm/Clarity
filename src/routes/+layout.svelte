<script lang="ts">
	import { onMount } from 'svelte';

	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import OnboardingTour from '$lib/components/system/OnboardingTour.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { initObservability } from '$lib/observability/client';
	import { registerPwa } from '$lib/pwa/register';

	let { children } = $props();

	onMount(() => {
		const stored = localStorage.getItem('clarity_theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const theme = stored ?? (prefersDark ? 'dark' : 'light');
		document.documentElement.setAttribute('data-theme', theme);
		initObservability();
		registerPwa();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#4F46E5" />
	<title>Clarity | Task manager and routines</title>
	<meta
		name="description"
		content="Clarity is a desktop-first productivity suite for tasks, habits, goals, and routines."
	/>
</svelte:head>

<a class="skip-link" href="#main-content">Skip to main content</a>
<div class="min-h-screen bg-background text-text-primary">
	<main id="main-content">{@render children()}</main>
	<OnboardingTour />
	<Toast />
</div>
