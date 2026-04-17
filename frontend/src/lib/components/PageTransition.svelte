<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade } from 'svelte/transition';

	export let key: string;
</script>

{#key key}
	<div class="page-wrapper" in:fade={{ duration: 400, delay: 200 }} out:fade={{ duration: 200 }}>
		<slot />
	</div>
{/key}

<style>
	.page-wrapper {
		width: 100%;
		height: 100%;
	}
</style>
