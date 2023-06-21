import { AssignmentStatement, IfStatement, LiteralExpression, ReturnStatement, VarDeclaration, WhileStatement } from "./parser.js";

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

//return the assembly version of the program
export function assemble(func){

    let variables = new Map();
    let instructions = [];
    //return value goes here
    if(func.retType.value == 'int'){
        variables.set(resLabel, 0);
    }
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
            let rhs = assembleExpression(statement.expr, variables);
            instructions.push(...memCopy(rhs, statement.lhs.value));

        } else if (statement instanceof ReturnStatement){
            let label = assembleExpression(statement.expr, variables);
            instructions.push(...memCopy(label, resLabel));
        } else {
            console.log("ASSEMBLING UNKNOWN STATEMENT TYPE");
        }
    }   

    let ret = instructions.map(x => x.toString()).join('\n');
    ret += "\n\n";
    ret += [...variables].map(kv => `${kv[0]}: ${kv[1]}`).join('\n');
    return ret;
}

function assembleExpression(expr, variables){
    console.log("assembling expr of type: ", expr.constructor.name);
    if(expr instanceof LiteralExpression){
        let literalName = `_CONSTANT_${expr.value}`;
        if(!variables.has(literalName)){
            variables.set(literalName, expr.value);
        }
        return literalName;
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