<script lang="ts">
	import '../app.css';
	import Nav from '$lib/components/Nav.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { stations } from '$lib/stores/cosmic';
	import { initSocket, disconnect } from '$lib/stores/socket';
	import { PUBLIC_API_URL, PUBLIC_WS_URL } from '$env/static/public';

	const API_URL = PUBLIC_API_URL || 'http://localhost:3001';
	const WS_URL = PUBLIC_WS_URL || 'ws://localhost:3001';

	onMount(async () => {
		try {
			const res = await fetch(`${API_URL}/api/stations`);
			const data = await res.json();
			stations.set(data);
		} catch (e) {
			console.warn('Failed to fetch stations:', e);
		}

		initSocket(WS_URL);
	});

	onDestroy(() => {
		disconnect();
	});
</script>

<Nav />
<PageTransition key={$page.url.pathname}>
	<slot />
</PageTransition>
