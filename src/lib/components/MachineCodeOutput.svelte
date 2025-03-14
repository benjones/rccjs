<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';
	import { State } from '$lib/state.svelte';

	let value: string[] = $derived(State.machineCodeOutput);

</script>

<div class="flex h-full flex-col items-center gap-4">
	<h2>Machine Code</h2>

	<div class="h-3"></div>

	<Editor {value} isMachineCodeView={true} />
</div>
