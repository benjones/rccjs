import { ArithmeticExpression, AssignmentStatement, IfStatement, LiteralExpression, NegationExpression, ReturnStatement, VarDeclaration, VariableExpression, WhileStatement } from "./parser.js";


//return the assembly version of the program
export function assemble(func) {
    console.log("assembling\n\n\n\n");
    let assembly = new Assembly();
    //return value goes here
    if (func.retType == Symbol.for('int')) {
        assembly.setVar(resLabel, 0);
    }
    console.log(JSON.stringify(func));
    for (let parameter of func.parameters) {
        console.log(JSON.stringify(parameter));
        assembly.setVar(parameter.value, 0);
    }
    assembly.assembleStatements(func.body);

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
        return `${this.label ? this.label + ": " : ""}${this.op} ${this.args.join(', ')}`;
    }
}

function codeLabel(label) {
    return new Instruction(label, "", []);
}

function instruction(op, args) {
    return new Instruction("", op, args);
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
        return ['THEN', 'ELSE', 'DONE'].map(x => base + x);
    }

    getWhileLabels() {
        let base = `_WHILE_${this.#cfTemps}_`;
        ++this.#cfTemps;
        return ['TEST', 'BODY', 'DONE'].map(x => base + x);
    }

    toString() {
        return [...this.#map].map(kv => `${kv[0]}: ${kv[1]}`).join('\n');
    }
}

class Assembly {
    variables = new Variables();
    instructions = [];

    toString(){
        let ret = this.instructions.map(x => x.toString()).join('\n');
        ret += "\n\n";
        ret += this.variables.toString();
        return ret;
    }

    setVar(label, val) {
        this.variables.set(label, val);
    }

    assembleStatements(statements) {
        for (let statement of statements) {
            console.log("statement type: ", statement.constructor.name);
            if (statement instanceof VarDeclaration) {
                //should be a Literal here
                this.setVar(statement.name.value, statement.value.value);

            } else if (statement instanceof IfStatement) {
                this.assembleIfStatement(statement);
            } else if (statement instanceof WhileStatement) {
                this.assembleWhileStatement(statement);
            } else if (statement instanceof AssignmentStatement) {
                console.log("assignment statement: ", JSON.stringify(statement));
                let rhs = this.assembleExpression(statement.expr);
                this.instructions.push(...memCopy(rhs, statement.lhs.value));

            } else if (statement instanceof ReturnStatement) {
                let label = this.assembleExpression(statement.expr);
                this.instructions.push(...memCopy(label, resLabel));
            } else {
                console.log("ASSEMBLING UNKNOWN STATEMENT TYPE");
            }
        }
    }

    //will evaluate the expression and store it in memory and return the label
    //for that instructions.  Simple expressions don't require any instructions
    //potentially clobbers both registers
    assembleExpression(expr) {
        console.log("assembling expr of type: ", expr.constructor.name);
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
            this.instructions.push(...[
                instruction('load', [lhs, r0]),
                instruction('load', [rhs, r1]),
                instruction(expr.op.value == '+' ? 'add' : 'sub', [r0, r1, r0]),
                instruction('store', [r0, tmp])
            ]);
            return tmp;
        } else if (expr instanceof NegationExpression) {
            let child = this.assembleExpression(expr.expr);
            let tmp = this.variables.getTemporary();
            this.instructions.push(...[
                instruction('load', [child, r0]),
                instruction('clear', [r1]),
                instruction('sub', [r1, r0, r0]),
                instruction('store', [r0, tmp])
            ]);
            return tmp;
        } else {
            console.log("assembling unknown expression type");
        }
    }

    assembleIfStatement(statement) {

        console.log("assembling if: ", JSON.stringify(statement));
        let lhs = this.assembleExpression(statement.cond.lhs);
        let rhs = this.assembleExpression(statement.cond.rhs);
        let [then, else_, done] = this.variables.getIfLabels();

        this.instructions.push(...[
            instruction('load', [lhs, r0]),
            instruction('load', [rhs, r1])
        ]);

        //all variants will be:
        //comparison, conditional jump, fallthrough statements, jump to label
        //label, conditional jump statements, done label
        //These are all tested in the 'if statement combos' test,
        //but no automated checking, just manual inspection...
        let table = {
            '==': {
                cmp: [instruction('cmp', [r0, r1]), instruction('bne', [else_])],
                fallthrough: statement.thenStatements, label: else_, cjs: statement.elseStatements
            },
            '!=': {
                cmp: [instruction('cmp', [r0, r1]), instruction('bne', [then])],
                fallthrough: statement.elseStatements, label: then, cjs: statement.thenStatements
            },
            '<': {
                cmp: [instruction('cmp', [r1, r0]), instruction('bgt', [then])],
                fallthrough: statement.elseStatements, label: then, cjs: statement.thenStatements
            },
            '>': {
                cmp: [instruction('cmp', [r0, r1]), instruction('bgt', [then])],
                fallthrough: statement.elseStatements, label: then, cjs: statement.thenStatements
            },
            '<=': {
                cmp: [instruction('cmp', [r0, r1]), instruction('bgt', [else_])],
                fallthrough: statement.thenStatements, label: else_, cjs: statement.elseStatements
            },
            // if( l >= r) { then } else { l < r  === r > l }
            '>=': {
                cmp: [instruction('cmp', [r1, r0]), instruction('bgt', [else_])],
                fallthrough: statement.thenStatements, label: else_, cjs: statement.elseStatements
            }
        }



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




        this.instructions.push(...[
            instruction('load', [lhs, r0]),
            instruction('load', [rhs, r1])
        ]);
        switch (statement.cond.op.value) {
            case '==':
                this.instructions.push(...[
                    instruction('cmp', [r0, r1]),
                    instruction('bne', [done])
                ]);
                break;
            case '!=':
                this.instructions.push(...[
                    instruction('cmp', [r0, r1]),
                    instruction('bne', [body]),
                    instruction('jump', [done]),
                    codeLabel(body)
                ]);
                break;
            case '<':
                this.instructions.push(...[
                    instruction('cmp', [r1, r0]),
                    instruction('bgt', [body]),
                    instruction('jump', [done]),
                    codeLabel(body)
                ]);
                break;
            case '>':
                this.instructions.push(...[
                    instruction('cmp', [r0, r1]),
                    instruction('bgt', [body]),
                    instruction('jump', [done]),
                    codeLabel(body)
                ]);
                break;
            case '<=':
                this.instructions.push(...[
                    instruction('cmp', [r0, r1]),
                    instruction('bgt', [done]),
                ]);
                break;
            case '>=':
                this.instructions.push(...[
                    instruction('cmp', [r1, r0]),
                    instruction('bgt', [done]),
                ]);
                break;
        }

        this.assembleStatements(statement.body);
        this.instructions.push(...[instruction('jump', [test]), codeLabel(done)]);

    }

}

//copy 1 memory value to another, using R0 as a temporary
function memCopy(src, dst) {
    return [
        instruction('load', [src, r0]),
        instruction('store', [r0, dst])
    ];
}