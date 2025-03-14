export class CompilerError extends Error {
	line: number;

	constructor(message: string, line?: number) {
		super(message);
		this.line = line ?? -1;
	}
}
