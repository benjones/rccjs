<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';

	let value: string[] = $state([]);
</script>

<div class="flex h-full flex-col items-center gap-4">
	<h2>Machine Code</h2>

	<Editor bind:value isMachineCodeView={true} />
</div>
