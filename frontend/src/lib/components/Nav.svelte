<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import StationSelector from './StationSelector.svelte';
	import ModeSelector from './ModeSelector.svelte';
	import { renderMode } from '$lib/stores/cosmic';

	$: pathname = $page.url.pathname;
	$: isHome = pathname === '/';

	function goHome(e: MouseEvent) {
		e.preventDefault();
		renderMode.set('noise');
		if (!isHome) goto('/');
	}
</script>

<nav class="nav">
	<div class="nav-left">
		<a href="/" class="logo" on:click={goHome}>
			<span class="logo-text">Stellar Legacy</span>
		</a>
		{#if isHome}
			<StationSelector />
			<ModeSelector />
		{/if}
	</div>

	<div class="nav-right">
		<a href="/" class="nav-link" class:active={isHome}>Live</a>
		<a href="/archive" class="nav-link" class:active={pathname === '/archive'}>Archive</a>
		<a href="/about" class="nav-link" class:active={pathname === '/about'}>About</a>
	</div>
</nav>

<style>
	.nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 24px;
		pointer-events: none;
	}

	.nav > * {
		pointer-events: auto;
	}

	.nav-left {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.logo {
		text-decoration: none;
	}

	.logo-text {
		font-family: var(--font-display);
		font-size: 1.15rem;
		color: var(--color-text);
		letter-spacing: -0.02em;
		opacity: 0.8;
		transition: opacity 0.3s ease;
	}

	.logo:hover .logo-text {
		opacity: 1;
	}

	.nav-right {
		display: flex;
		gap: 6px;
	}

	.nav-link {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--color-text-muted);
		text-decoration: none;
		padding: 6px 12px;
		border-radius: 6px;
		transition:
			color 0.2s ease,
			background 0.2s ease;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.nav-link:hover {
		color: var(--color-text);
		background: rgba(232, 230, 225, 0.05);
		text-decoration: none;
	}

	.nav-link.active {
		color: var(--color-text);
		background: rgba(232, 230, 225, 0.08);
	}
</style>
