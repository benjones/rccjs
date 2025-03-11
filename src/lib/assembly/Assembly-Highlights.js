import { styleTags, Tag, tags as t } from '@lezer/highlight';

export const ROneTag = Tag.define('R1');
export const RZeroTag = Tag.define('R0');
export const RCTag = Tag.define('RC');
export const VarTag = Tag.define('Var');
export const CodeTag = Tag.define('Code');
export const InstructionTag = Tag.define('Instruction');

export const SC_Assembly_Highlighting = styleTags({
	LineComment: t.lineComment,
	VarName: VarTag,
	Instruction: InstructionTag,
	CodeName: CodeTag,
	CodeLabel: CodeTag,
	R1: ROneTag,
	R0: RZeroTag,
	RC: RCTag,
	Number: t.number
});
