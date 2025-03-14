import type { CompilerError } from '$lib/CompilerError';

export const State: { asmErrors: CompilerError[], machineCodeOutput: string[] } = $state({
	asmErrors: [],
	machineCodeOutput: ['']
});