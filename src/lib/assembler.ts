// Original Author: Minwei Shen
// Modified by Ben Jones
// noinspection JSUnusedGlobalSymbols

import { CompilerError } from '$lib/CompilerError';

/**
 * Translates assembly code into machine code.
 *
 * This function performs a two-pass translation of assembly code into
 * machine code. It first processes instructions and labels, then performs
 * a second pass to resolve variables and branch instructions.
 *
 * @param {string} code - The assembly code to translate.
 * @returns {{ code: (Instruction | number)[], errors: CompilerError[] }} An object containing the machine code and an array of compiler errors.
 */
export function writeMachineCode(code: string): {
	code: (Instruction | number)[];
	errors: CompilerError[];
} {
	let instructions = code.split('\n');

	//TODO: Get rid of this monstrosity
	let machineCode: (Instruction | number)[] = [];

	// remove spaces and inline comments
	let new_instructions = instructions.map((x) => x.trim().split('//')[0]).filter(Boolean);

	instructions = [];

	// combine labels that appear on their own line with the next instruction
	for (let i = 0; i < new_instructions.length; i++) {
		let instruction = new_instructions[i];
		if (instruction.slice(-1) == ':') {
			new_instructions[i + 1] = new_instructions[i] + new_instructions[i + 1];
		} else {
			instructions.push(instruction);
		}
	}

	let labelLocations: Map<string, number> = new Map();
	let errors: CompilerError[] = [];
	for (let i = 0; i < instructions.length; i++) {
		let instruction = instructions[i];
		let split_instructions = instruction.split(':');

		// labelled instruction
		if (split_instructions.length > 1) {
			for (let j = 0; j < split_instructions.length - 1; j++) {
				let label = split_instructions[j];
				labelLocations.set(label, i);
			}
			instruction = split_instructions[split_instructions.length - 1].trim();

			// check if instruction is actually a number.
			// meaning the label is initializing a variable
			try {
				let value = parseInt(instruction);
				if (value >= 0) machineCode.push(value);
				else machineCode.push(256 + value);

				continue;
			} catch (e) {
				errors.push(new CompilerError(`Invalid instruction: ${instruction}`));
			}
		}

		// 1st pass translation: translate some instructions and record variables and labels
		let instructionType = instruction.split(' ')[0];
		let instObject = new Instruction(instruction);
		let result: number;
		switch (instObject.op) {
			// these instructions don't do anything on the first pass
			case 'store':
			case 'load':
			case 'jump':
			case 'bgt':
			case 'bne':
				machineCode.push(instObject);
				break;
			case 'nop':
				machineCode.push(161);
				break;
			case 'cmp':
				machineCode.push(cmp_instruction(instObject, errors, i + 1));
				break;
			case 'add':
			case 'sub':
			case 'and':
			case 'nor':
				result = cal_instruction(instObject, errors);
				if (result == 0) errors.push(new CompilerError(`Error`, i + 1));
				else machineCode.push(result);
				break;

			case 'not':
				result = not_instruction(instObject, errors);
				if (result == 0) errors.push(new CompilerError(`Error on line`, i + 1));
				else machineCode.push(result);
				break;
			case 'clear':
				if (instObject.args[0] == 'r1') machineCode.push(157);
				else if (instObject.args[0] == 'r0') machineCode.push(129);
				else errors.push(new CompilerError(`invalid operand to not instruction`, i + 1));
				break;
			case 'halt':
				machineCode.push(161);
				break;
			case 'or':
			case 'nand':
			case 'move':
				errors.push(new CompilerError(`unimplemented instruction ${instructionType}`, i + 1));
				break;
			default:
				errors.push(new CompilerError(`unknown instruction: ${instructionType}`, i + 1));
		}
	}

	// 2nd pass: translate instructions that reference variables/labels
	for (let i = 0; i < machineCode.length; i++) {
		if (machineCode[i] instanceof Instruction) {
			let instruction: Instruction = machineCode[i] as Instruction;
			let lineno: number;
			switch (instruction.op) {
				case 'store':
					machineCode[i] = store_instruction(instruction, labelLocations, errors);
					break;
				case 'load':
					machineCode[i] = load_instruction(instruction, labelLocations, errors);
					break;
				case 'jump':
					lineno = branch_instruction(instruction, labelLocations, errors) ?? 0;
					if (lineno > i) {
						machineCode[i] = 160 + lineno - i;
					} else {
						machineCode[i] = 192 + lineno - i;
					}
					break;
				case 'bgt':
					lineno = branch_instruction(instruction, labelLocations, errors) ?? 0;
					if (lineno > i) {
						machineCode[i] = 224 + lineno - i;
					} else {
						machineCode[i] = 256 + lineno - i;
					}
					break;
				case 'bne':
					lineno = branch_instruction(instruction, labelLocations, errors) ?? 0;
					if (lineno > i) {
						machineCode[i] = 192 + lineno - i;
					} else {
						machineCode[i] = 224 + lineno - i;
					}
					break;
				default:
					errors.push(new CompilerError(`Error line`, i + 1));
			}
		}
	}

	return { code: machineCode, errors: errors };
}

/**
 * Converts an array of machine code numbers to a formatted hexadecimal string.
 *
 * @param {number[]} machineCode - The machine code array.
 * @returns {string} The formatted hexadecimal string.
 */
export function machineCodeToHex(machineCode: number[]): string {
	// convert the codes into hex
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
				`store must have a register and a label as operands, but got: ${JSON.stringify(instruction.args)}`
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
				`load must have a label and a register as operands, but got: ${JSON.stringify(instruction.args)}`
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
		errors.push(new CompilerError(`wrong number of operands for cmp on line ${line}`));
		return 0;
	}
	let [a, b] = instruction.args;
	if (a == 'r0' && b == 'r0') return 192;
	else if (a == 'r0' && b == 'r1') return 193;
	else if (a == 'r1' && b == 'r0') return 224;
	else if (a == 'r1' && b == 'r1') return 225;
	else {
		errors.push(
			new CompilerError(`invalid operands for compare on line ${line}: ${instruction.args}`)
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
				`wrong number of operands for not instruction.  Expected 2, got ${instruction.args}`
			)
		);
		return 0;
	}

	for (let arg of instruction.args) {
		if (arg != 'r0' && arg != 'r1') {
			errors.push(
				new CompilerError(
					`operand for ${instruction.op} instruction must be a register(r0 or r1), but got ${arg}`
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
				`expected 3 operands for ${instruction.op} instruction, but got ${instruction.args}`
			)
		);
		return 0;
	}
	const [a, b, c] = instruction.args;

	for (let arg of instruction.args) {
		if (arg != 'r0' && arg != 'r1') {
			errors.push(
				new CompilerError(
					`operand for ${instruction.op} instruction must be a register(r0 or r1), but got ${arg}`
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
