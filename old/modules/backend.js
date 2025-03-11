//Author Ben Jones (benjones@cs.utah.edu)

import {
	ArithmeticExpression,
	AssignmentStatement,
	IfStatement,
	LiteralExpression,
	NegationExpression,
	ReturnStatement,
	VarDeclaration,
	VariableExpression,
	WhileStatement
} from './parser.js';

//return the assembly version of the program
export function assemble(func) {
	let assembly = new Assembly(func.name);
	//return value goes here
	if (func.retType == Symbol.for('int')) {
		assembly.setVar(resLabel, 0);
	}
	// console.log(JSON.stringify(func));
	for (let parameter of func.parameters) {
		assembly.setVar(parameter.value, 0);
	}
	assembly.assembleStatements(func.body);
	if (func.retType != Symbol.for('int')) {
		assembly.addHalt();
	}

	return assembly;
}

/*** 
store ra, L       // store the value in register ra to label L 
load L, ra        // load the value at label L into register ra
cmp ra, rb        // compare the values in registers ra and rb, setting condition codes 
add ra, rb, rc    // add the values in registers ra and rb, putting the result in register rc
sub ra, rb, rc    // subtract the value in register rb from the value in register ra, putting the result in register rc
and ra, rb, rc    // bitwise-and the values in registers ra and rb, putting the result in register rc 
nor ra, rb, rc    // bitwise-nor the values in registers ra and rb, putting the result in register rc not ra, rb
not ra, rb        // complement the value in register ra, putting the result in register rb
clear ra          // put the value zero into register ra
halt              // stop execution
jump L            // execute the instruction at label L next
bgt L             // if in the previous instruction the first operand is greater than the second operand, 
                  // execute the instruction at label L next
bne L             // if in the previous instruction the first and second operand are unequal, 
                  // execute the instruction at label L next
***/
const r0 = 'r0';
const r1 = 'r1';

class Instruction {
	label;
	op;
	args;

	constructor(label, op, args) {
		this.label = label;
		this.op = op;
		this.args = args;
	}

	toString() {
		return `${this.label ? this.label + ': ' : '    '}${this.op} ${this.args.join(', ')}`;
	}
}

function codeLabel(label) {
	return new Instruction(label, '', []);
}

function instruction(op, args) {
	return new Instruction('', op, args);
}

const resLabel = '_RES';

class Variables {
	#map = new Map();
	#temps = 0;
	#cfTemps = 0;

	set(name, val) {
		this.#map.set(name, val);
	}

	has(name) {
		return this.#map.has(name);
	}

	getTemporary() {
		let name = `_TEMP_${this.#temps}`;
		this.#map.set(name, 0);
		this.#temps++;
		return name;
	}

	getIfLabels() {
		let base = `_IF_${this.#cfTemps}_`;
		++this.#cfTemps;
		return ['THEN', 'ELSE', 'DONE'].map((x) => base + x);
	}

	getWhileLabels() {
		let base = `_WHILE_${this.#cfTemps}_`;
		++this.#cfTemps;
		return ['TEST', 'BODY', 'DONE'].map((x) => base + x);
	}

	toString() {
		return [...this.#map].map((kv) => `${kv[0]}: ${kv[1]}`).join('\n');
	}

	//NOTE THIS WILL DELETE UNUSED PARAMETERS... IS THAT OK?
	deleteUnused(usedVars) {
		for (let key of this.#map.keys()) {
			if (!usedVars.has(key)) {
				this.#map.delete(key);
			}
		}
	}
}

class Assembly {
	variables = new Variables();
	instructions = [];
	funcName;
	constructor(funcName) {
		this.funcName = funcName;
	}
	toString() {
		let ret = `${this.funcName}: \n`;
		ret += this.instructions.map((x) => x.toString()).join('\n');
		ret += '\n\n';
		ret += this.variables.toString();
		return ret;
	}

	optimize() {
		let done = false;
		while (!done) {
			let oldLength = this.instructions.length;

			this.optimizeSpills();
			this.optimizeLabels();

			done = oldLength == this.instructions.length;
		}
		return this; //for chaining
	}

	setVar(label, val) {
		this.variables.set(label, val);
	}

	assembleStatements(statements) {
		for (let statement of statements) {
			// console.log("statement type: ", statement.constructor.name);
			if (statement instanceof VarDeclaration) {
				//should be a Literal here
				this.setVar(statement.name.value, statement.value.value);
			} else if (statement instanceof IfStatement) {
				this.assembleIfStatement(statement);
			} else if (statement instanceof WhileStatement) {
				this.assembleWhileStatement(statement);
			} else if (statement instanceof AssignmentStatement) {
				let rhs = this.assembleExpression(statement.expr);
				this.instructions.push(...memCopy(rhs, statement.lhs.value));
			} else if (statement instanceof ReturnStatement) {
				let label = this.assembleExpression(statement.expr);
				this.instructions.push(...memCopy(label, resLabel));
				this.addHalt();
			} else {
				console.log('ASSEMBLING UNKNOWN STATEMENT TYPE');
			}
		}
	}

	addHalt() {
		this.instructions.push(instruction('halt', []));
	}

	//will evaluate the expression and store it in memory and return the label
	//for that instructions.  Simple expressions don't require any instructions
	//potentially clobbers both registers
	assembleExpression(expr) {
		// console.log("assembling expr of type: ", expr.constructor.name);
		if (expr instanceof LiteralExpression) {
			let literalName = `_CONSTANT_${expr.value}`;
			if (!this.variables.has(literalName)) {
				this.setVar(literalName, expr.value);
			}
			return literalName;
		} else if (expr instanceof VariableExpression) {
			return expr.name;
		} else if (expr instanceof ArithmeticExpression) {
			let tmp = this.variables.getTemporary();
			let lhs = this.assembleExpression(expr.lhs);
			let rhs = this.assembleExpression(expr.rhs);
			this.instructions.push(
				...[
					instruction('load', [lhs, r0]),
					instruction('load', [rhs, r1]),
					instruction(expr.op.value == '+' ? 'add' : 'sub', [r0, r1, r0]),
					instruction('store', [r0, tmp])
				]
			);
			return tmp;
		} else if (expr instanceof NegationExpression) {
			let child = this.assembleExpression(expr.expr);
			let tmp = this.variables.getTemporary();
			this.instructions.push(
				...[
					instruction('load', [child, r0]),
					instruction('clear', [r1]),
					instruction('sub', [r1, r0, r0]),
					instruction('store', [r0, tmp])
				]
			);
			return tmp;
		} else {
			console.log('assembling unknown expression type');
		}
	}

	assembleIfStatement(statement) {
		let lhs = this.assembleExpression(statement.cond.lhs);
		let rhs = this.assembleExpression(statement.cond.rhs);
		let [then, else_, done] = this.variables.getIfLabels();

		this.instructions.push(...[instruction('load', [lhs, r0]), instruction('load', [rhs, r1])]);

		//all variants will be:
		//comparison, conditional jump, fallthrough statements, jump to label
		//label, conditional jump statements, done label
		//These are all tested in the 'if statement combos' test,
		//but no automated checking, just manual inspection...
		let table = {
			'==': {
				cmp: [instruction('cmp', [r0, r1]), instruction('bne', [else_])],
				fallthrough: statement.thenStatements,
				label: else_,
				cjs: statement.elseStatements
			},
			'!=': {
				cmp: [instruction('cmp', [r0, r1]), instruction('bne', [then])],
				fallthrough: statement.elseStatements,
				label: then,
				cjs: statement.thenStatements
			},
			'<': {
				cmp: [instruction('cmp', [r1, r0]), instruction('bgt', [then])],
				fallthrough: statement.elseStatements,
				label: then,
				cjs: statement.thenStatements
			},
			'>': {
				cmp: [instruction('cmp', [r0, r1]), instruction('bgt', [then])],
				fallthrough: statement.elseStatements,
				label: then,
				cjs: statement.thenStatements
			},
			'<=': {
				cmp: [instruction('cmp', [r0, r1]), instruction('bgt', [else_])],
				fallthrough: statement.thenStatements,
				label: else_,
				cjs: statement.elseStatements
			},
			// if( l >= r) { then } else { l < r  === r > l }
			'>=': {
				cmp: [instruction('cmp', [r1, r0]), instruction('bgt', [else_])],
				fallthrough: statement.thenStatements,
				label: else_,
				cjs: statement.elseStatements
			}
		};

		let pattern = table[statement.cond.op.value];
		this.instructions.push(...pattern.cmp);
		this.assembleStatements(pattern.fallthrough);
		this.instructions.push(instruction('jump', [done]));
		this.instructions.push(codeLabel(pattern.label));
		this.assembleStatements(pattern.cjs);
		this.instructions.push(codeLabel(done));
	}

	//all conditions show up in
	//'while loop types' tests, but just inspected, not asserted
	assembleWhileStatement(statement) {
		//depending on condition we might be able to conditionally
		//jump to done, or we may have to have a conditional jump to body and
		//a fallthrough jump to done.
		let [test, body, done] = this.variables.getWhileLabels();
		this.instructions.push(codeLabel(test));
		let lhs = this.assembleExpression(statement.cond.lhs);
		let rhs = this.assembleExpression(statement.cond.rhs);

		this.instructions.push(...[instruction('load', [lhs, r0]), instruction('load', [rhs, r1])]);
		switch (statement.cond.op.value) {
			case '==':
				this.instructions.push(...[instruction('cmp', [r0, r1]), instruction('bne', [done])]);
				break;
			case '!=':
				this.instructions.push(
					...[
						instruction('cmp', [r0, r1]),
						instruction('bne', [body]),
						instruction('jump', [done]),
						codeLabel(body)
					]
				);
				break;
			case '<':
				this.instructions.push(
					...[
						instruction('cmp', [r1, r0]),
						instruction('bgt', [body]),
						instruction('jump', [done]),
						codeLabel(body)
					]
				);
				break;
			case '>':
				this.instructions.push(
					...[
						instruction('cmp', [r0, r1]),
						instruction('bgt', [body]),
						instruction('jump', [done]),
						codeLabel(body)
					]
				);
				break;
			case '<=':
				this.instructions.push(...[instruction('cmp', [r0, r1]), instruction('bgt', [done])]);
				break;
			case '>=':
				this.instructions.push(...[instruction('cmp', [r1, r0]), instruction('bgt', [done])]);
				break;
		}

		this.assembleStatements(statement.body);
		this.instructions.push(...[instruction('jump', [test]), codeLabel(done)]);
	}

	//remove unnecessary load/store operations
	optimizeSpills() {
		for (let i = 0; i < this.instructions.length - 1; i++) {
			let curr = this.instructions[i];
			let next = this.instructions[i + 1];
			if (curr.op == 'store' && next.op == 'load' && curr.args[1] == next.args[0]) {
				//load/store to same address

				//guaranteed we have a dead load
				//not necessarily a dead store though

				//dead store if there is another load from that label
				//without another store to it first
				//so we can eliminate if we either find a store to that label
				//or end of instructions, but this must be control-flow aware...
				//conservative hack: if we hit a jump, assume that it's NOT a dead store

				//another idea: store locations of each label and use that somehow?
				//another idea: any __temp_ var will never be re-used, so all stores to temps
				//can be eliminated.  Is that true?
				//a temporary is returned from assembling arithmetic expressions
				//Looking through the code paths, temporaries are always
				//immediately loaded, we can always remove spills to temps safely

				//this is O(N^2) worst case since checking for dead stores for non-temps
				//can potentially look at the rest of the program
				//probably fine for CS1810 though...
				if (isTemporaryLabel(curr.args[1]) || this.#deadStore(i)) {
					if (curr.args[0] == next.args[1]) {
						//load/store to the same reg, no op
						curr.op = 'nop';
						next.op = 'nop';
					} else {
						//turn this into a move
						curr.op = 'and';
						curr.args = [curr.agrs[0], curr.args[0], next.args[1]];
						next.op = 'nop';
					}
				} else {
					//the load is definitely dead, so make it a nop
					next.op = 'nop';
				}
			}
		}
		this.instructions = this.instructions.filter((x) => x.op != 'nop');
	}

	optimizeLabels() {
		//eliminate unused variables first
		let usedVars = new Set();
		for (let i = 0; i < this.instructions.length; i++) {
			let inst = this.instructions[i];
			if (inst.op == 'load') {
				usedVars.add(inst.args[0]);
			} else if (inst.op == 'store') {
				usedVars.add(inst.args[1]);
			}
			if (
				i < this.instructions.length - 1 &&
				!inst.op && //just a label
				!this.instructions[i + 1].op
			) {
				//2 labels in a row, just use the 2nd one

				this.#replaceLabel(inst.label, this.instructions[i + 1].label);
				inst.op = 'nop'; //mark it as a no op to filter out later
			}
		}
		this.variables.deleteUnused(usedVars);

		this.instructions = this.instructions.filter((x) => x.op != 'nop');
	}

	#replaceLabel(oldLabel, newLabel) {
		for (let inst of this.instructions) {
			for (let i = 0; i < inst.args.length; i++) {
				if (inst.args[i] == oldLabel) {
					inst.args[i] = newLabel;
				}
			}
		}
	}

	//is the store here dead?
	//we'll do a conservative check
	//by looking at subsequent instructions until we find a jump (and assume it's live)
	//a load (we know it's live)
	//or by hitting the end or another store to that address (and know it's dead)
	#deadStore(index) {
		let label = this.instructions[index].args[1];
		// console.log(`is store to ${label} on line ${index} dead?`);
		//the next instruction is a load of this label, which is why we're considering
		//checking for a dead store.  Ignore that instruction
		for (let i = index + 2; i < this.instructions.length; i++) {
			let inst = this.instructions[i];
			if (inst.op == 'bne' || inst.op == 'bgt' || inst.op == 'jump') {
				// console.log("no because of branch at", i);
				return false;
			}
			if (inst.op == 'load' && inst.args[0] == label) {
				// console.log("no because of load from it at", i);
				return false;
			}
			if (inst.op == 'store' && inst.args[1] == label) {
				// console.log("yes because we store to it at ", i);
				return true;
			}
		}
		// console.log("yes because we hit EOF");
		return true;
	}
}

//copy 1 memory value to another, using R0 as a temporary
function memCopy(src, dst) {
	return [instruction('load', [src, r0]), instruction('store', [r0, dst])];
}

function isTemporaryLabel(label) {
	let re = /_TEMP_\d+/;
	return re.test(label);
}
