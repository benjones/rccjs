<script lang="ts">
	import { State } from '$lib/state.svelte';
</script>

<div class="flex h-full flex-col items-center gap-4">
	<h2>Compiler Errors</h2>

	<div>
		{#each State.asmErrors as error}
			<p>
				{#if error.line !== -1}<span>Line {error.line}: </span>{/if}

				{error.message}
			</p>
		{/each}
	</div>

</div>

<style lang="scss">
	p {
		color: #940000;
		span {
			font-weight: bold;
    }
	}
</style>