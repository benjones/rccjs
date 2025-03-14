import { describe, expect, test } from 'vitest';
import { machineCodeToHex as newMachineCodeToHex, writeMachineCode as newWriteMachineCode } from '$lib/assembler';
import { machineCodeToHex as oldMachineCodeToHex, writeMachineCode as oldWriteMachineCode } from '$lib/assembler-old';

const exampleCode = ['load A, r0\n' +
'add r0, r0, r0\n' +
'store r0, A\n' +
'halt\n' +
'\n' +
'A: 6', 'top:  load B, r0\n' +
'      clear r1\n' +
'      cmp r0, r1\n' +
'      bgt go\n' +
'      halt\n' +
'go:   not r1, r1\n' +
'      add r0, r1, r0       \n' +
'      store r0, B\n' +
'      load S, r0\n' +
'      load A, r1\n' +
'      add r0, r1, r0\n' +
'      store r0, S\n' +
'      jump top\n' +
'A:    2\n' +
'B:    3\n' +
'S:    0', '    load A, r0       // r0 contains the value at A\n' +
'    load B, r1       // r1 contains the value at B\n' +
'    add r0, r1, r0   // r0 contains A + B\n' +
'    store r0, C      // the value at C is A + B\n' +
'    halt\n' +
'A:  4 \n' +
'B:  5 \n' +
'C:  -1', '    load A, r0       // r0 contains the value at A\n' +
'    load B, r1       // r1 contains the value at B\n' +
'    cmp r1, r0\n' +
'    bgt L1           // if B > A goto instruction at L1, otherwise goto next instruction\n' +
'    store r0, B      \n' +
'    store r1, A      // swap A and B\n' +
'\n' +
'L1: load B, r0       // r0 contains the value at B\n' +
'    load C, r1       // r1 contains the value at c\n' +
'    cmp r1, r0\n' +
'    bgt L2           // if C > B goto instruction at L2, otherwise goto next instruction\n' +
'    store r0, C\n' +
'    store r1, B      // swap B and C\n' +
'\n' +
'L2: load A, r0       // r0 contains the value at A\n' +
'    load B, r1       // r1 contains the value at B\n' +
'    cmp r1, r0\n' +
'    bgt L3           // if B > A goto instruction at L3, otherwise goto next instruction\n' +
'    store r0, B\n' +
'    store r1, A      // swap A and B\n' +
'\n' +
'L3: halt\n' +
'A:  5 \n' +
'B:  3 \n' +
'C:  1', 'load A, r0\n' +
'add r0, r0, r0\n' +
'store r0, A\n' +
'halt\n' +
'\n' +
'A: 6a'];

function stringToArray(str: string): string[] {
	return str.split('\n');
}

function testExampleCode(num: number) {
	const code = exampleCode[num - 1];

	const newResult = newWriteMachineCode(code);
	const oldResult = oldWriteMachineCode(code);

	expect(newResult.code).toEqual(oldResult.code);

	expect(newMachineCodeToHex(newResult.code)).toEqual(oldMachineCodeToHex(oldResult.code));
}

describe('Ensure new assembler works the same as old assembler', () => {
	for(let i = 1; i <= exampleCode.length; i++) {
		test(`Test example code ${i}`, () => {
			testExampleCode(i);
		});
	}
});
