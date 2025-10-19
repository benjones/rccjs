

export class VirtualMachine{
    //ram contents should be byte[]
    constructor(ramContents){
        this.ram = Array(32)
        this.ram.splice(0, ramContents.length, ...ramContents)
        this.pc = 0
        this.reg = [0,0]
        this.ne = false
        this.gt = false
        this.halted = false
    }
    
    step(){
        const instruction = this.ram[this.pc]
        const decoded = decode(instruction)
        switch(decoded.op){
            case "store":
            this.ram[decoded.addr] = this.reg[decoded.reg]
            this.pc += 1
            break
            
            case "load":
            this.reg[decoded.reg] = this.ram[decoded.addr]
            this.pc += 1
            break

            case "alu":
            const a = this.reg[decoded.src1]
            const b = this.reg[decoded.src2]
            let result = 0
            switch(decoded.operator){
                case "add": result = a + b; break
                case "sub": result = a - b; break
                case "and" : result = a & b; break
                case "nor" : result = ~(a | b); break
            }
            this.reg[decoded.dest] = result

            this.ne = (a != b)
            this.gt = (a > b)
            this.pc += 1
            break

            case "nop": this.pc += 1; break
            case "halt" : this.halted = true; break

            case "jump" : 
            this.pc += decoded.offset
            this.pc &= 0x1F;
            break;

            case "bgt" :
            if(this.gt){
                this.pc += decoded.offset
                this.pc &= 0x1F;
            } else {
                this.pc += 1
            }
            break

            case "bne" :
            if(this.ne){
                this.pc += decoded.offset
                this.pc &= 0x1F;
            } else {
                this.pc += 1
            }
            break

            case "cmp" :
                console.log("cmp :" + JSON.stringify(decoded))
            this.gt = (this.reg[decoded.src1] > this.reg[decoded.src2])
            this.ne = (this.reg[decoded.src1] != this.reg[decoded.src2])
            this.pc += 1
            break


            default:
                throw "unimplemented"


        }   
    }
    
    
}



export function decode(instruction){
    
    /*
    store ra, L       // store the value in register ra to label L 
    00_r_addr5
    
    load L, ra        // load the value at label L into register ra
    01_r_addr5
    
    ALU ops:
    100 dest,src1,src2, op(2) //TODO: register order?
    add ra, rb, rc    // add the values in registers ra and rb, putting the result in register rc
    sub ra, rb, rc    // subtract the value in register rb from the value in register ra, putting the result in register rc
    and ra, rb, rc    // bitwise-and the values in registers ra and rb, putting the result in register rc 
    nor ra, rb, rc    // bitwise-nor the values in registers ra and rb, putting the result in register rc not ra, rb
    
    not ra, rb        // complement the value in register ra, putting the result in register rb
    //100rb_ra_ra_11
    //just ALU for rb = ra nor ra
    
    clear ra          // put the value zero into register ra
    //just ALU for r = r - r
    //10011101 -> r1 = r1 - r1
    //10000001 -> r0 = r0 - r0
    
    // **********
    //jumps only happen if at least 1 of defg is 1, if all are 0, its a compare
    
    jump L            // execute the instruction at label L next
    101_signed_5_bit_offset
    
    halt              // stop execution
    //1010_0001 -> same as jump forward 1? (no because defg are all 0)
    
    //nop should set  1_pqr_stuv
    //write r0, -> at least one of pqr must be 1 (p, q, r)
    // write r1 to 0, (p, q, ~r)
    // enable ram = 0 means MSb = 1
    //jump to 0 (rstu all 0) or ((p ~q) and (~p, q, ~r), (~p, ~q, ~r)) ->
    1x0 or 00x for pqr -> 1x0 or 001 bc of write r0 constraint,
    but breaks r1 constraint
    1x0 meets both register write constrains
    //halt to 0 (not 1010_0001)
    //enable cc to 0 -> (p, q) and (~p, q,r,s,t,u) and (~p,~q,r,s,t,u)
    // ALU of r = r or/and/or r would be
    // 100rrr1x, but that sets carry flags...
    // 
    //z3 solution from nopsolver.py gives: **1010_0000**
    //doesn't count as jumpL because of the 4 0's starting the address
    
    bgt L             // if in the previous instruction the first operand is greater than the second operand, 
    // execute the instruction at label L next
    111_signed_5_bit_offset
    
    bne L             // if in the previous instruction the first and second operand are unequal, 
    // execute the instruction at label L next */
    //110_signed_5_bit_offset
    
    //cmp ra, rb        // compare the values in registers ra and rb, setting condition codes 
    //11_ra_0000_rb
    //TODO FIXME, BGT, BNE have overlapping rep?
    //11 1 0000 1 -> compare 1 to 1 == BGT 1 //useless
    //11 0 0000 0 -> compare 0 to 0 == BNE 0 //infinite loop
    
    
    const aluOps = ["add", "sub", "and", "nor"]
    
    /*
    Decode a machine code instruction
    abcd_efgh
    defgh -> address for ops using memory
    
    */
    //abc
    const opcode = (instruction >> 6) & 3 // mask might not be necessary
    //~a == enable ram
    
    
    switch(opcode){
        case 0: //store
        return { op: "store", 
            reg: ((instruction >> 5) & 1),
            addr: (instruction & 31)
        }
        
        case 1: //load
        return { op: "load",
            reg: ((instruction >> 5) & 1),
            addr: (instruction & 31)
        }
        
        case 2: //ALU (which could be not, clear or nop mnemonic), jump, or halt
        // must start with 100
        if((instruction & 0x20) == 0){
            return { op: "alu",
                dest: ((instruction >> 4) & 1),
                src1: ((instruction >> 3) & 1),
                src2: ((instruction >> 2) & 1),
                //00 for addition, 01 for subtraction, 10 for AND, 11 for NOR
                operator: aluOps[(instruction & 3)]
            }
        } else {
            //starts with 101, unconditional jump, halt, or nop
            const address = instruction & 0x1F
            if(address == 0){
                return { op: "nop"}
            } else if(address == 1){
                return { op: "halt"}
            } else {
                return { op: "jump", offset: address }
            }
        }
        
        default: //3
        const bgt = (instruction >> 5) & 1
        const address = instruction & 0x1F
        
        if(address == 0){
            //compare instruction, rb = 0
            return { op: "cmp", src1: bgt, src2: 0}
        } else if(address == 1){
            return { op: "cmp", src1: bgt, src2: 1}
        } else {
            return { op: (bgt ? "bgt" : "bne"), offset: address }
        }
    }
}

