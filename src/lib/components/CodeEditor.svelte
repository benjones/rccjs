<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';
	import { onMount } from 'svelte';
	import type { Nullable } from '../../app';

	const defaultValue = [
		'\tload A, r0',
		'\tload B, r1',
		'\tadd r0, r1, r0',
		'\tstore r0, S',
		'\thalt',
		'A:\t2',
		'B:\t3',
		'S:\t0'
	];

	let startValue: string[] = $state([]);

	let value: string[] = $state([]);

	function save() {
		localStorage.setItem('codeEditorValue', JSON.stringify(value));
	}

	function load() {
		const localStorageValue = localStorage.getItem('codeEditorValue') as Nullable<string>;

		if (localStorageValue == null) {
			startValue = defaultValue;
			value = defaultValue;
			return;
		}

		value = JSON.parse(localStorageValue);

		if (value.length == 0) {
			startValue = defaultValue;
			value = defaultValue;
			return;
		}

		startValue = value;
	}

	onMount(() => {
		load();
		$effect(save);
	});

	function assemble() {}
</script>

<div class="flex h-full flex-col items-center gap-4">
	<h2>Code Editor</h2>

	{#if startValue.length > 0}
		<Editor initialValue={startValue} bind:value />
	{/if}

	<button onclick={assemble}>Assemble</button>
</div>

<style lang="scss">
	button {
		padding: 0.5rem;
		border-radius: 0.5rem;
		background-color: var(--color-blue-800);
		color: white;
		font-size: 1rem;
		margin-top: 1rem;

		&:hover {
			background-color: var(--color-blue-700);
			cursor: pointer;
		}

		&:active {
			background-color: var(--color-blue-900);
		}
	}
</style>
