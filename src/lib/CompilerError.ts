export class CompilerError extends Error {
	constructor(message: string, line?: number) {
		super(message + (line ? ` on line ${line}` : ''));
	}
}
