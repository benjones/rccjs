// Original Author: Minwei Shen
// Modified by Ben Jones
// Modified again by Carter Carling

import { CompilerError } from '$lib/CompilerError';

/**
 * Translates assembly code into machine code.
 *
 * This function performs a two-pass translation of assembly code into
 * machine code. It first processes instructions and labels, then performs
 * a second pass to resolve variables and branch instructions.
 *
 * @param {string} code - The assembly code to translate.
 * @returns {{ code: (number)[], errors: CompilerError[] }} An object containing the machine code and an array of compiler errors.
 */
export function writeMachineCode(code: string): {
	code: number[];
	errors: CompilerError[];
} {
	let instructions = code.split('\n');

	const machineCodeAndInstructions: (Instruction | number)[] = [];

	//* Remove spaces and inline comments
	let new_instructions = instructions.map((x) => x.trim().split('//')[0]).filter(Boolean);

	instructions = [];

	//* Combine labels that appear on their own line with the next instruction
	for (let i = 0; i < new_instructions.length; i++) {
		let current = new_instructions[i];

		//* Check if the current instruction has a colon at the end
		if (current.slice(-1) == ':') {
			//* If it does, add the next instruction to the current instruction
			new_instructions[i + 1] = new_instructions[i] + new_instructions[i + 1];
		} else {
			//* If it doesn't, add the current instruction to the list of instructions
			instructions.push(current);
		}

	}

	const labels: Map<string, number> = new Map();
	const errors: CompilerError[] = [];

	for (let i = 0; i < instructions.length; i++) {
		let instruction = instructions[i];

		//* Split instructions by colon
		const split_instructions = instruction.split(':');

		//* Labelled instruction (It was split into multiple instructions)
		if (split_instructions.length > 1) {

			//* Set each label instructions to the current line number
			for (let label of split_instructions) {
				labels.set(label, i);
			}

			//* Get the last instruction
			instruction = split_instructions[split_instructions.length - 1].trim();

			//* Check if instruction is actually a number.
			//* Meaning the label is initializing a variable
			if (!isNaN(Number(instruction))) {
				let value = parseInt(instruction);
				if (value >= 0) machineCodeAndInstructions.push(value);
				else machineCodeAndInstructions.push(256 + value);

				continue;
			}
		}

		//* 1st pass translation: translate some instructions and record variables and labels
		let instructionType = instruction.split(' ')[0];
		let instObject = new Instruction(instruction);
		let result: number;
		switch (instObject.op) {
		//* these instructions don't do anything on the first pass
			case 'store':
			case 'load':
			case 'jump':
			case 'bgt':
			case 'bne':
				machineCodeAndInstructions.push(instObject);
				break;
			case 'nop':
				machineCodeAndInstructions.push(161);
				break;
			case 'cmp':
				machineCodeAndInstructions.push(cmp_instruction(instObject, errors, i + 1));
				break;
			case 'add':
			case 'sub':
			case 'and':
			case 'nor':
				result = cal_instruction(instObject, errors);
				if (result == 0) errors.push(new CompilerError(`"nor" Error`, i + 1));
				else machineCodeAndInstructions.push(result);
				break;

			case 'not':
				result = not_instruction(instObject, errors);
				if (result == 0) errors.push(new CompilerError(`"not" Error`, i + 1));
				else machineCodeAndInstructions.push(result);
				break;
			case 'clear':
				if (instObject.args[0] == 'r1') machineCodeAndInstructions.push(157);
				else if (instObject.args[0] == 'r0') machineCodeAndInstructions.push(129);
				else errors.push(new CompilerError(`Invalid operand to "clear" instruction`, i + 1));
				break;
			case 'halt':
				machineCodeAndInstructions.push(161);
				break;
			case 'or':
			case 'nand':
			case 'move':
				errors.push(new CompilerError(`Unimplemented instruction ${instructionType}`, i + 1));
				break;
			default:
				errors.push(new CompilerError(`Unknown instruction: ${instructionType}`, i + 1));
		}
	}

	//* 2nd pass: translate instructions that reference variables/labels
	for (let i = 0; i < machineCodeAndInstructions.length; i++) {
		if (machineCodeAndInstructions[i] instanceof Instruction) {
			let instruction: Instruction = machineCodeAndInstructions[i] as Instruction;
			let lineNum: number;
			switch (instruction.op) {
				case 'store':
					machineCodeAndInstructions[i] = store_instruction(instruction, labels, errors) as number;
					break;
				case 'load':
					machineCodeAndInstructions[i] = load_instruction(instruction, labels, errors) as number;
					break;
				case 'jump':
					lineNum = (branch_instruction(instruction, labels, errors) as number) ?? 0;
					if (lineNum > i) {
						machineCodeAndInstructions[i] = 160 + lineNum - i;
					} else {
						machineCodeAndInstructions[i] = 192 + lineNum - i;
					}
					break;
				case 'bgt':
					lineNum = (branch_instruction(instruction, labels, errors) as number) ?? 0;
					if (lineNum > i) {
						machineCodeAndInstructions[i] = 224 + lineNum - i;
					} else {
						machineCodeAndInstructions[i] = 256 + lineNum - i;
					}
					break;
				case 'bne':
					lineNum = (branch_instruction(instruction, labels, errors) as number) ?? 0;
					if (lineNum > i) {
						machineCodeAndInstructions[i] = 192 + lineNum - i;
					} else {
						machineCodeAndInstructions[i] = 224 + lineNum - i;
					}
					break;
				default:
					errors.push(new CompilerError(`Error line`, i + 1));
			}
		}
	}

	//* Should not contain any values with the type Instruction
	const machineCode: number[] = machineCodeAndInstructions as number[];

	return { code: machineCode, errors: errors };
}

/**
 * Converts an array of machine code numbers to a formatted hexadecimal string.
 *
 * @param {number[]} machineCode - The machine code array.
 * @returns {string} The formatted hexadecimal string.
 */
export function machineCodeToHex(machineCode: number[]): string {
	//* Convert the codes into hex
	let count = 0;
	let code = '';
	for (let i = 0; i < machineCode.length; i++) {
		let hex = machineCode[i].toString(16);
		if (hex.length == 1) hex = '0' + hex;
		code += hex + ' ';
		count++;
		if (count == 4) {
			count = 0;
			code += '\n';
		}
	}
	return code;
}


/**
 * Generates machine code for a 'store' instruction.
 *
 * @param {Instruction} instruction - The instruction object.
 * @param {Map<string, number>} labelLocations - A map of label locations.
 * @param {CompilerError[]} errors - An array to collect compiler errors.
 * @returns {number} The machine code for the store instruction, or 0 on error.
 */
function store_instruction(
	instruction: Instruction,
	labelLocations: Map<string, number>,
	errors: CompilerError[]
): number {
	if (instruction.args.length != 2) {
		errors.push(
			new CompilerError(
				`Store must have a register and a label as operands, but got: ${instruction.args})}`
			)
		);
		return 0;
	}
	let [a, b] = instruction.args;
	let result = 0;
	if (a == 'r1') result += 32;

	const labelGetB = labelLocations.get(b);
	if (labelGetB == undefined) {
		errors.push(new CompilerError(`Undefined label  ${b}`));
		return 0;
	}
	result += labelGetB;
	return result;
}

/**
 * Generates machine code for a 'load' instruction.
 *
 * @param {Instruction} instruction - The instruction object.
 * @param {Map<string, number>} labelLocations - A map of label locations.
 * @param {CompilerError[]} errors - An array to collect compiler errors.
 * @returns {number} The machine code for the load instruction, or 0 on error.
 */
function load_instruction(
	instruction: Instruction,
	labelLocations: Map<string, number>,
	errors: CompilerError[]
): number {
	if (instruction.args.length != 2) {
		errors.push(
			new CompilerError(
				`Load must have a label and a register as operands, but got: ${instruction.args}`
			)
		);
		return 0;
	}
	let [a, b] = instruction.args;
	let result = 64;
	if (b == 'r1') result += 32;

	const labelGetA = labelLocations.get(a);
	if (labelGetA == undefined) {
		errors.push(new CompilerError(`Undefined label ${a}`));
		return 0;
	}
	result += labelGetA;
	return result;
}

/**
 * Generates machine code for a 'cmp' (compare) instruction.
 *
 * @param {Instruction} instruction - The instruction object.
 * @param {CompilerError[]} errors - An array to collect compiler errors.
 * @param {number} line - The line number for error reporting.
 * @returns {number} The machine code for the cmp instruction, or 0 on error.
 */
function cmp_instruction(instruction: Instruction, errors: CompilerError[], line: number): number {
	if (instruction.args.length != 2) {
		errors.push(new CompilerError(`Wrong number of operands for cmp`, line));
		return 0;
	}

	let [a, b] = instruction.args;
	if (a == 'r0' && b == 'r0') return 192;
	else if (a == 'r0' && b == 'r1') return 193;
	else if (a == 'r1' && b == 'r0') return 224;
	else if (a == 'r1' && b == 'r1') return 225;
	else {
		errors.push(
			new CompilerError(`Invalid operands for compare ${instruction.args}`, line)
		);
		return 0;
	}
}

/**
 * Generates machine code for a 'not' instruction.
 *
 * @param {Instruction} instruction - The instruction object.
 * @param {CompilerError[]} errors - An array to collect compiler errors.
 * @returns {number} The machine code for the not instruction, or 0 on error.
 */
function not_instruction(instruction: Instruction, errors: CompilerError[]): number {
	if (instruction.args.length != 2) {
		errors.push(
			new CompilerError(
				`Wrong number of operands for not instruction. Expected 2, got ${instruction.args}`
			)
		);
		return 0;
	}

	for (let arg of instruction.args) {
		if (arg != 'r0' && arg != 'r1') {
			errors.push(
				new CompilerError(
					`Operand for ${instruction.op} instruction must be a register(r0 or r1), but got ${arg}`
				)
			);
			return 0;
		}
	}

	let [a, b] = instruction.args;
	if (a == 'r0' && b == 'r0') return 131;
	else if (a == 'r0' && b == 'r1') return 147;
	else if (a == 'r1' && b == 'r0') return 143;
	else if (a == 'r1' && b == 'r1') return 159;
	else {
		return 0;
	}
}

/**
 * Generates machine code for arithmetic and logical instructions ('add', 'sub', 'and', 'nor').
 *
 * @param {Instruction} instruction - The instruction object.
 * @param {CompilerError[]} errors - An array to collect compiler errors.
 * @returns {number} The machine code for the instruction, or 0 on error.
 */
function cal_instruction(instruction: Instruction, errors: CompilerError[]): number {
	if (instruction.args.length != 3) {
		errors.push(
			new CompilerError(
				`Expected 3 operands for ${instruction.op} instruction, but got ${instruction.args}`
			)
		);
		return 0;
	}

	const [a, b, c] = instruction.args;

	for (let arg of instruction.args) {
		if (arg != 'r0' && arg != 'r1') {
			errors.push(
				new CompilerError(
					`Operand for ${instruction.op} instruction must be a register(r0 or r1), but got ${arg}`
				)
			);
			return 0;
		}
	}

	let result = 128;
	switch (instruction.op) {
		case 'add':
			result += 0;
			break;
		case 'sub':
			result += 1;
			break;
		case 'and':
			result += 2;
			break;
		case 'nor':
			result += 3;
			break;
		default:
			return 0;
	}

	if (a == 'r1') result += 8;
	if (b == 'r1') result += 4;
	if (c == 'r1') result += 16;

	return result;
}

/**
 * Resolves branch instructions by mapping a label to its corresponding line number.
 *
 * @param {Instruction} instruction - The instruction object containing the label.
 * @param {Map<string, number>} labelLocations - A map of label locations.
 * @param {CompilerError[]} errors - An array to collect compiler errors.
 * @returns {number} The line number associated with the label, or 0 if undefined.
 */
function branch_instruction(
	instruction: Instruction,
	labelLocations: Map<string, number>,
	errors: CompilerError[]
): number {
	const label = instruction.args[0];
	const labelGet = labelLocations.get(label);
	if (labelGet == undefined) {
		errors.push(new CompilerError(`Undefined label ${label}`));
		return 0;
	}
	return labelGet;
}

/**
 * Represents a single assembly instruction.
 */
class Instruction {
	/**
	 * The operation (opcode) of the instruction.
	 */
	op: string;
	/**
	 * The arguments for the instruction.
	 */
	args: string[];

	/**
	 * Creates an Instruction instance by parsing a line of assembly code.
	 *
	 * @param {string} line - A single line of assembly code.
	 */
	constructor(line: string) {
		let words = line.split(' ');
		this.op = words[0];
		this.args = words
			.slice(1, words.length)
			.map((x) => x.split(',')[0].trim())
			.filter(Boolean);
	}
}