<script lang="ts">
	import { dropCursor, EditorView, placeholder } from '@codemirror/view';
	import { onMount } from 'svelte';
	import { EditorState, Text } from '@codemirror/state';
	import { basicSetup } from 'codemirror';
	import type { Nullable } from '../../app';
	import { SC_Assembly } from '$lib/assembly/Assembly';
	import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
	import { tags as t } from '@lezer/highlight';
	import { autocompletion } from '@codemirror/autocomplete';
	import {
		CodeTag,
		InstructionTag,
		RCTag,
		ROneTag,
		RZeroTag,
		VarTag
	} from '$lib/assembly/Assembly-Highlights';
	import { machineCodeOutput } from '$lib/state.svelte';

	let {
		initialValue = [''],
		value = $bindable(),
		isMachineCodeView = false
	}: { initialValue?: string[]; value?: string[]; isMachineCodeView?: boolean } = $props();

	const changeEventListener = EditorState.changeFilter.of((t) => {
		if (t.changes.length != t.changes.newLength) value = t.newDoc.toJSON();
		return true;
	});

	const editorPlugins = [
		basicSetup,
		dropCursor(),
		SC_Assembly(),
		changeEventListener,
		autocompletion()
	];

	let boxElement: HTMLDivElement;

	let editorState: Nullable<EditorState> = $state(null);
	let view: Nullable<EditorView> = $state(null);
	let parentElement: HTMLDivElement;

	onMount(() => {
		const height = parentElement.offsetHeight;
		console.log(height, isMachineCodeView);

		let customTheme = EditorView.baseTheme({
			'&': {
				height: height + 'px'
			},
			'.cm-scroller': { overflow: 'auto' },
			'.cm-content': { 'font-family': 'Fira Code, monospace' }
		});

		const lightThemeHighlights = HighlightStyle.define([
			{ tag: t.lineComment, color: '#7c7f93' },
			{ tag: InstructionTag, color: '#04a5e5' },
			{ tag: ROneTag, color: '#1e66f5' },
			{ tag: RZeroTag, color: '#e64553' },
			{ tag: RCTag, color: '#179299' },
			{ tag: VarTag, color: '#ea76cb' },
			{ tag: CodeTag, color: '#8839ef' },
			{ tag: t.number, color: '#fe640b' }
		]);

		editorPlugins.push(syntaxHighlighting(lightThemeHighlights));
		editorPlugins.push(customTheme);

		if (isMachineCodeView) {
			editorPlugins.push(placeholder('Machine output will appear here'));
			editorPlugins.push(EditorView.lineWrapping);
			editorPlugins.push(EditorView.editable.of(false));
		}

		editorState = EditorState.create({
			doc: Text.of(initialValue),
			extensions: editorPlugins
		});

		view = new EditorView({
			state: editorState,
			parent: parentElement
		});

		if (isMachineCodeView) $effect(updateMachineCodeOutput);
	});

	function updateMachineCodeOutput() {
		if (editorState == null) return;

		editorState.update({
			changes: { from: 0, to: editorState.doc.length, insert: Text.of(machineCodeOutput) }
		});
	}
</script>

<div bind:this={boxElement} class="box">
	<div bind:this={parentElement}></div>
</div>

<style>
	.box {
		outline: 2px solid black;
		width: 90%;
		height: 80%;
	}

	.box > div {
		height: 100%;
	}
</style>
