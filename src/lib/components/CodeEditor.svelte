<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';
	import { onMount } from 'svelte';
	import type { Nullable } from '../../app';
	import { machineCodeToHex, writeMachineCode } from '$lib/assembler';
	import { State } from '$lib/state.svelte';

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

	let lastUpdatedTimer: number;

	let autoCompile = $state(false);
	let vimMode = $state(false);

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

		const localStorageAutoCompile = localStorage.getItem('autoCompile') as Nullable<string>;

		if (localStorageAutoCompile == null) {
			autoCompile = false;
			return;
		}

		autoCompile = JSON.parse(localStorageAutoCompile);

		const localStorageVimMode = localStorage.getItem('vimMode') as Nullable<string>;

		if (localStorageVimMode == null) {
			vimMode = false;
			return;
		}

		vimMode = JSON.parse(localStorageVimMode);
	}

	onMount(() => {
		load();
		$effect(save);
	});

	function save() {
		clearTimeout(lastUpdatedTimer);
		localStorage.setItem('codeEditorValue', JSON.stringify(value));
		localStorage.setItem('autoCompile', JSON.stringify(autoCompile));
		localStorage.setItem('vimMode', JSON.stringify(vimMode));

		lastUpdatedTimer = window.setTimeout(autoAssemble, 1000);
	}

	function autoAssemble() {
		if (!autoCompile) return;

		clearTimeout(lastUpdatedTimer);
		assemble();
	}

	function assemble() {
		let asmOut = writeMachineCode(value.join('\n'));
		let machineCode = machineCodeToHex(asmOut.code);
		State.asmErrors = asmOut.errors;

		State.machineCodeOutput = [machineCode.trim().replaceAll('\n', '')];
	}

</script>

<div class="flex h-full flex-col items-center gap-4">
	<h2>Code Editor</h2>

	<div class="w-10/12 h-3 flex items-center justify-between">
		<div class="flex gap-2 items-center">
			<input type="checkbox" onchange={assemble} bind:checked={autoCompile}>
			<label for="autoCompile">Auto Compile</label>
			<input type="checkbox" bind:checked={vimMode}>
			<label for="vimMode">Vim Key Bindings</label>
		</div>
		<div>
			<a href="https://www.vim-hero.com/">Learn Vim</a>
		</div>
	</div>

	{#key vimMode}
		{#if startValue.length > 0}
			<Editor initialValue={startValue} {vimMode} bind:value />
		{/if}
	{/key}

	<button onclick={assemble}>Assemble</button>
</div>
