//Original Author: Minwei Shen
//Modified by Ben Jones


export function writeMachineCode(code) {
    //console.log("begin assemble");
    let instructions = code.split("\n");
    let machineCode = [];


    // remove spaces
    let new_instructions =
        instructions.map(x => x.trim().split("//")[0]).filter(Boolean);

    instructions = [];

    // combine labels
    for (let i = 0; i < new_instructions.length; i++) {
        let instruction = new_instructions[i];
        if (instruction.slice(-1) == ":") {
            //console.log("combine");
            new_instructions[i + 1] = new_instructions[i] + new_instructions[i + 1];
        }
        else {
            instructions.push(instruction);
        }
    }

    // console.log(instructions);
    let labelLocations = new Map();
    let errors = [];
    for (let i = 0; i < instructions.length; i++) {
        let instruction = instructions[i];
        let split_instructions = instruction.split(":");

        //labelled instruction
        if (split_instructions.length > 1) {
            //console.log(instruction);
            //there may be many labels for the same instruction, so loop
            for (let j = 0; j < split_instructions.length - 1; j++) {
                let label = split_instructions[j];
                labelLocations.set(label,i);
            }
            instruction = split_instructions[split_instructions.length - 1].trim();

            //check if instruction is actually a number.
            //meaning the label is a initializing a variable
            if (!isNaN(instruction)) {
                let value = parseInt(instruction);
                if (value >= 0)
                    machineCode.push(value)
                else
                    machineCode.push(256 + value); //2's complement negatives

                continue;
            }
        }

        //1st pass translation. some instructions are translated. some variables and labels are recorded
        let instructionType = instruction.split(" ")[0];
        let instObject = new Instruction(instruction);
        switch (instObject.op) {
            //these instructions don't do anything on the first pass
            case "store":
            case "load":
            case "jump":
            case "bgt":
            case "bne":
                machineCode.push(instObject);
                break;
            case "nop":
                //console.log("nop");
                //TODO/FIXME SAME AS HALT?
                //See virtualMachine.js for an explanation
                //see nopsolver.py for proof :)
                machineCode.push(0xA0); //161 dec 
                break;
            case "cmp":
                //console.log("cmp");
                machineCode.push(cmp_instruction(instObject, errors, i + 1));
                break;
            case "add":
            case "sub":
            case "and":
            case "nor":
                //ALU ops
                var result = cal_instruction(instObject, errors);
                if (result == 0)
                    errors.push(`Error on line ${i + 1}`);
                else
                    machineCode.push(result);
                break;

            case "not":
                var result = not_instruction(instObject, errors);
                if (result == 0)
                    errors.push(`Error on line  ${i + 1}`);
                else
                    machineCode.push(result);
                break;
            case "clear":
                //console.log("clear");
                if (instObject.args[0] == 'r1')
                    machineCode.push(0x9D); //157
                else if (instObject.args[0] == 'r0')
                    machineCode.push(0x81); //129
                else 
                    errors.push(`invalid operand to not instruction on line ${i+1}`);
                break;
            case "halt":
                //console.log("halt");
                machineCode.push(0xA1); //161
                break;
            case "or":
            case "nand":
            case "move":
                errors.push(`unimplemented instruction ${instructionType} on line ${i + 1}`);
                break;
            default:
               errors.push(`unknown instruction: ${instructionType} on line ${i + 1}`);
        }

    }

    // console.log("machine code after first pass");
    // console.log(JSON.stringify(machineCode));


    //todo line numbers are all messed up at this point...

    //2nd pass, translate instructions with variables
    for (let i = 0; i < machineCode.length; i++) {
        if (machineCode[i] instanceof Instruction){
            let instruction = machineCode[i];
            switch (instruction.op) {
                case "store":
                    //console.log("store");
                    machineCode[i] = store_instruction(instruction, labelLocations, errors);
                    break;
                case "load":
                    //console.log("store");
                    machineCode[i] = load_instruction(instruction, labelLocations, errors);
                    break;
                case "jump":
                    //console.log("jump");
                    //machineCode[i] = jump_instruction(instruction,2,labelLocation);
                    var lineno = branch_instruction(instruction, labelLocations, errors)
                    // console.log(lineno);
                    // console.log(i)
                    if (lineno > i) {
                        //160 = A0 = 1010_0000
                        machineCode[i] = 0xA0 + lineno - i;
                    }
                    else {
                        //192 = C0 = 1100_0000
                        //but we subtract from it, so will be
                        //101xxxxx (- 5 bit offset)
                        machineCode[i] = 0xC0 + lineno - i;
                    }
                    break;
                case "bgt":
                    //console.log("bgt");
                    var lineno = branch_instruction(instruction, labelLocations, errors)
                    if (lineno > i) {
                        //224 = 0xE0 = 1110_0000
                        machineCode[i] = 0xE0 + lineno - i;
                    }
                    else {
                        //but we're subtracting so we get
                        //111xxxxx (-5 bit offset)
                        machineCode[i] = 0x100 + lineno - i;
                    }
                    break;
                case "bne":
                    //console.log("bne");
                    var lineno = branch_instruction(instruction, labelLocations, errors)
                    // console.log(lineno);
                    // console.log(i)
                    if (lineno > i) {
                        //0x110_offset
                        machineCode[i] = 0xC0 + lineno - i;
                    }
                    else {
                        //0x1110 - offset ->
                        //0x110_5 bit offset
                        machineCode[i] = 0xE0 + lineno - i;
                    }
                    // console.log(machineCode[i]);
                    break;
                default:
                    errors.push(`Error line  ${i + 1}`);
            }

        }
    }

    return {code: machineCode, errors: errors};
}

export function machineCodeToHex(machineCode) {
    //convert the codes into hex
    let count = 0;
    let code = "";
    for (var i = 0; i < machineCode.length; i++) {
        var hex = machineCode[i].toString(16);
        if (hex.length == 1)
            hex = "0" + hex;
        code += hex + " ";
        count++;
        if (count == 4) {
            count = 0;
            code += "\n";
        }
    }
    return code;
}

class Instruction {
    op;
    args;
    constructor(line){
        let words = line.split(' ');
        this.op = words[0];
        this. args = words.slice(1,words.length).map( x => x.split(',')[0].trim()).filter(Boolean);
        //console.log(`inst constructor ${line} -> ${this.op},  ${JSON.stringify(this.args)}`);
    }
}

function store_instruction(instruction, labelLocations, errors) {
    if(instruction.args.length != 2){
        errors.push(`store must have a register and a label as operands, but got: ${JSON.stringify(instruction.args)}`);
        return 0;
    }
    let [a, b] = instruction.args;
    var result = 0;
    if (a == "r1")
        result += 0x20;

    if (!labelLocations.has(b)) {
        errors.push(`undefined label  ${b}`);
        return 0;
    }
    result += labelLocations.get(b);
    return result;
}

function load_instruction(instruction, labelLocations, errors) {
    if(instruction.args.length != 2){
        errors.push(`load must have a label and a register as operands, but got: ${JSON.stringify(instruction.args)}`);
        return 0;
    }
    let [a,b] = instruction.args;
    var result = 0x40;
    if (b == "r1")
        result += 0x20;
    if (!labelLocations.has(a)) {
        errors.push(`undefined label ${a}`);
        return 0;
    }
    result += labelLocations.get(a);
    return result;

}

function cmp_instruction(instruction, errors, line) {

    if(instruction.args.length != 2){
        errors.push(`wrong number of operands for cmp on line ${line}`);
        return 0;
    }

    let [a, b] = instruction.args;
    if (a == "r0" && b == "r0")
        return 0xC0; //1100_0000
    else if (a == "r0" && b == "r1")
        return 0xC1;//1100_0001
    else if (a == "r1" && b == "r0")
        return 0xE0; //1110_0000
    else if (a == "r1" && b == "r1")
        return 0xE1; //1110_0001
    else {
        errors.push(`invalid operands for compare on line ${line}: ${instruction.args}`);
        return 0;
    }

}

function not_instruction(instruction, errors) {
    if(instruction.args.length != 2){
        errors.push(`wrong number of operands for not instruction.  Expected 2, got ${instruction.args}`);
        return 0;
    }

    for(let arg of instruction.args){
        if(arg != 'r0' && arg != 'r1'){
            errors.push(`opeand for ${instruction.op} instruction must be a register(r0 or r1), but got ${arg}`);
            return 0;
        }
    }

    let [a, b] = instruction.args;
    if (a == "r0" && b == "r0")
        return 0x83;
    else if (a == "r0" && b == "r1")
        return 0x93;
    else if (a == "r1" && b == "r0")
        return 0x8F;
    else if (a == "r1" && b == "r1")
        return 0x9F;
    else {
        //unreachable
        return 0;
    }
}

function cal_instruction(instruction, errors) {
    if(instruction.args.length != 3){
        errors.push(`expected 3 operands for ${instruction.op} instruction, but got ${instruction.args}`);
        return 0;
    }
    let [a,b,c] = instruction.args;

    for(let arg of instruction.args){
        if(arg != 'r0' && arg != 'r1'){
            errors.push(`opeand for ${instruction.op} instruction must be a register(r0 or r1), but got ${arg}`);
            return 0;
        }
    }

    var result = 0x80; //128
    switch(instruction.op){
        case "add":
            result += 0; break;
        case "sub":
            result += 1; break;
        case "and":
            result += 2; break;
        case "nor":
            result += 3; break;
        default:
            return 0;
    }

    if (a == "r1")
        result += 8;
    if (b == "r1")
        result += 4;
    if (c == "r1")
        result += 16;

    return result;
}

function branch_instruction(instruction, labelLocations, errors) {
    // var label = instruction.split(" ")[1];
    // var result = 160;
    // result += labelLocation[label];
    // return result;
    var label = instruction.args[0]
    if (!labelLocations.has(label)) {
        errors.push(`undefined label ${label}`);
        return 0;
    }
    return labelLocations.get(label);

}
