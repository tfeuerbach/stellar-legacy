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
	<div class="nav-top">
		<a href="/" class="logo" on:click={goHome}>
			<span class="logo-text">Stellar Legacy</span>
		</a>
		{#if isHome}
			<div class="nav-controls-desktop">
				<StationSelector />
				<ModeSelector />
			</div>
		{/if}
		<div class="nav-right">
			<a href="/" class="nav-link" class:active={isHome}>Live</a>
			<a href="/archive" class="nav-link" class:active={pathname === '/archive'}>Archive</a>
			<a href="/about" class="nav-link" class:active={pathname === '/about'}>About</a>
		</div>
	</div>
	{#if isHome}
		<div class="nav-controls-mobile">
			<StationSelector />
			<ModeSelector />
		</div>
	{/if}
</nav>

<style>
	.nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		display: flex;
		flex-direction: column;
		padding: 12px 16px;
		pointer-events: none;
		gap: 8px;
	}

	.nav :global(*) {
		pointer-events: auto;
	}

	.nav-top {
		display: flex;
		align-items: center;
		gap: 14px;
		width: 100%;
	}

	.nav-controls-desktop {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
		min-width: 0;
	}

	.nav-controls-mobile {
		display: none;
	}

	.logo {
		text-decoration: none;
		flex-shrink: 0;
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
		gap: 4px;
		flex-shrink: 0;
		margin-left: auto;
	}

	.nav-link {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--color-text-muted);
		text-decoration: none;
		padding: 6px 10px;
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

	@media (max-width: 640px) {
		.nav {
			padding: 10px 12px;
			gap: 6px;
		}

		.nav-controls-desktop {
			display: none;
		}

		.nav-controls-mobile {
			display: flex;
			align-items: center;
			gap: 8px;
			width: 100%;
		}

		.logo-text {
			font-size: 1rem;
		}

		.nav-link {
			font-size: 0.6rem;
			padding: 5px 8px;
		}
	}
</style>
