<script lang="ts">
	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import MachineCodeOutput from '$lib/components/MachineCodeOutput.svelte';
	import ErrorPanel from '$lib/components/ErrorPanel.svelte';
</script>

<svelte:head>
	<title>CS 1810 Simple Computer Compiler</title>
</svelte:head>

<main>
	<h1>CS 1810 Simple Computer Compiler</h1>

	<div class="grid-container">
		<section class="editor">
			<CodeEditor />
		</section>

		<section class="editor">
			<MachineCodeOutput />
		</section>

		<section class="error-panel">
			<ErrorPanel />
		</section>

		<section>
			<h2>Instructions</h2>

			<div class="flex flex-col gap-2 p-2">
				<p>
					Write your assembly code in the "Assembly Editor" panel. When you're ready, click the
					"Assemble" button to generate machine code. Note: this will overwrite anything in the
					"machine code" panel.
				</p>
				<p>
					If you have errors, try to fix the first error first, since the assembler has a hard time
					producing good error messages after the first error.
				</p>
				<p>
					Find out more about this tool
					<a href="https://github.com/carter121/rccjs">here</a>
				</p>
			</div>
		</section>
	</div>
</main>

<style>
    .grid-container {
        display: grid;
        grid-template-columns: 70% 30%;
        grid-template-rows: 70% 30%;
        grid-gap: 1rem;
        height: 100%;
        width: 100%;
    }

    section {
        width: 100%;
        height: 100%;
        padding: 1rem 0 1rem 0;
        background: #fdfdfd;
				border-radius: 0.5rem;
    }

    @media (max-width: 1150px) {
        .grid-container {
            grid-template-columns: 100%;
            grid-template-rows: repeat(4, 1fr);
        }

				.editor {
						min-height: 30rem;
				}

				.error-panel {
						min-height: 15rem;
				}
    }
</style>
