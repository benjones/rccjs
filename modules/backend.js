import { ArithmeticExpression, AssignmentStatement, IfStatement, LiteralExpression, NegationExpression, ReturnStatement, VarDeclaration, VariableExpression, WhileStatement } from "./parser.js";


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
class Instruction {
    label;
    code;

    toString(){
        return `${this.label? this.label + ": " : ""}${this.code}`;
    }
}

function labeledInstruction(label, code){
    let ret = new Instruction();
    ret.label = label;
    ret.code = code;
    return ret;
}

function instruction(code){
    let ret = new Instruction();
    ret.code = code;
    return ret;
}

const resLabel = '_RES';

class Variables{
    #map = new Map();
    #temps = 0;

    set(name, val){
        this.#map.set(name, val);
    }

    has(name){
        return this.#map.has(name);
    }

    getTemporary(){
        let name = `_TEMP_${this.#temps}`;
        this.#map.set(name, 0);
        this.#temps++;
        return name;
    }

    toString(){
         return [...this.#map].map(kv => `${kv[0]}: ${kv[1]}`).join('\n');
    }
}

//return the assembly version of the program
export function assemble(func){
    console.log("assembling\n\n\n\n");
    let variables = new Variables();
    let instructions = [];
    //return value goes here
    if(func.retType == Symbol.for('int')){
        variables.set(resLabel, 0);
    }
    console.log(JSON.stringify(func));
    for(let parameter of func.parameters){
        console.log(JSON.stringify(parameter));
        variables.set(parameter.value, 0);
    }
    for(let statement of func.body){
        console.log("statement type: ", statement.constructor.name);
        if(statement instanceof VarDeclaration){
            //should be a Literal here
            variables.set(statement.name.value, statement.value.value);
            
        } else if (statement instanceof IfStatement){

        } else if(statement instanceof WhileStatement){

        } else if (statement instanceof AssignmentStatement){
            console.log("assignment statement: ", JSON.stringify(statement));
            let rhs = assembleExpression(statement.expr, instructions, variables);
            instructions.push(...memCopy(rhs, statement.lhs.value));

        } else if (statement instanceof ReturnStatement){
            let label = assembleExpression(statement.expr, instructions, variables);
            instructions.push(...memCopy(label, resLabel));
        } else {
            console.log("ASSEMBLING UNKNOWN STATEMENT TYPE");
        }
    }   

    let ret = instructions.map(x => x.toString()).join('\n');
    ret += "\n\n";
    ret += variables.toString();
    
    return ret;
}

//will evaluate the expression and store it in memory and return the label
//for that instructions.  Simple expressions don't require any instructions
//potentially clobbers both registers
function assembleExpression(expr, instructions, variables){
    console.log("assembling expr of type: ", expr.constructor.name);
    if(expr instanceof LiteralExpression){
        let literalName = `_CONSTANT_${expr.value}`;
        if(!variables.has(literalName)){
            variables.set(literalName, expr.value);
        }
        return literalName;
    } else if(expr instanceof VariableExpression){
        return expr.name;
    } else if(expr instanceof ArithmeticExpression){
        let tmp = variables.getTemporary();
        let lhs = assembleExpression(expr.lhs, instructions, variables);
        let rhs = assembleExpression(expr.rhs, instructions, variables);
        instructions.push(...[
            instruction(`load ${lhs} r0`),
            instruction(`load ${rhs} r1`),
            instruction(`${expr.op.value == '+' ? 'add' : 'sub'} r0 r1 r0`),
            instruction(`store r0 ${tmp}`)
        ]);
        return tmp;
    } else if(expr instanceof NegationExpression) {
        let child = assembleExpression(expr.expr, instructions, variables);
        let tmp = variables.getTemporary();
        instructions.push(...[
            instruction(`load ${child} r0`),
            instruction(`clear r1`),
            instruction(`sub r1 r0 r0`),
            instruction(`store r0 ${tmp}`)
        ]);
        return tmp;
    } else {
        console.log("assembling unknown expression type");
    }
}

//copy 1 memory value to another, using R0 as a temporary
function memCopy(src, dst){
    return [
        instruction(`load ${src} r0`),
        instruction(`store r0 ${dst}`)
    ];
}