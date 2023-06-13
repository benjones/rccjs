import { arithmeticOps, delimiters, InvalidToken, logicOps } from "./lexer";
import { IterBuffer } from "./iterBuffer";


//syntax elements
class ASTNode {
    constructor(startLine, startCol, endLine, endCol){
        this.startLine = startLine;
        this.startCol = startCol;
        this.endLine = endLine;
        this.endCol = endCol;
    }
}

class ParseError extends ASTNode {
    constructor(startLine, startCol, endLine, endCol, todo){
        super(startLine, startCol, endLine, endCol);
    }
}   

export class FunctionDef extends ASTNode {
    constructor(startLine, startCol, endLine, endCol,
        retType, name, parameters, body){
        super(startLine, startCol, endLine, endCol);
        this.retType = retType;
        this.name = name;
        this.parameters = parameters;
        this.body = body;
    }
}

let keywords = new Set(['int', 'void', 'if', 'while', 'else', 'return']);

export class Parser{
    #tokens;
    constructor(lexer) {
        this.#tokens = new IterBuffer(lexer[Symbol.iterator]());
//        console.log(this.#iter);
    }

    //return the advance to the next token and return it
    #nextToken(){
        //value will be InvalidToken with "end of file"
        //when we're out of tokens, 
        return this.#tokens.next().value;
        // let ret = this.#iter.next();
        // if(ret.done){
        //     throw new InvalidToken("end of file", 0,0);
        // }
        // return ret.value;
    }
    //return what will be returned by the next call to next, but don't advance the stream
    #peekToken(){
        return this.#tokens.peek().value;
    }

    parseFunction(){
        try {
            let retType = this.#expect(new Set(['int', 'void']));
            let token = this.#nextToken();
            let name = token.value;
            if(!validIdentifier(name)){
                throw new ParseError(token.line,token.col,token.line,token.line + name.length, 
                    "invalid function name: " + name);
            }
            this.#expect('(');

            let parameters = [];
            console.log("peeking for params: ", this.#peekToken().value);
            while(this.#peekToken().value != ')'){
                //parse parameters
                this.#expect('int');
                let idTok = this.#nextToken();
                if(!validIdentifier(idTok.value)){
                    throw new ParseError(token.line,token.col,token.line,token.line + name.length, 
                        "invalid parameter name: " + name);
                }
                //no need to store types since they're all ints,
                //but keep the whole token for future error reporting on name reuse
                parameters.push(idTok); 

                if(this.#peekToken().value == ','){
                    this.#nextToken();
                } else if(this.#peekToken().value != ')'){
                    let next = this.#nextToken();
                    throw new ParseError(netx.line,next.col,next.line,next.col + next.value.length, 
                        "Expecting ',' or ')' in function paramter list, not " + name);
                }
            }

            this.#expect(')');
            this.#expect('{');
            let endCurly = this.#expect('}');
            return new FunctionDef(retType.line, retType.col, endCurly.line, endCurly.col, 
                Symbol.for(retType.value), name, parameters, []);
        } catch(parseError){
            console.log("parse error, todo, better diagnostics");
            console.log(parseError.stack);
            return parseError;
        }
    }

    #expect(options){
        let ok = (val) => {
            if(options instanceof Set){
                return options.has(val);
            } else {
                return options == val;
            }
        }
        let token = this.#nextToken();
        console.log("expecting: ", (options instanceof Set) ? Array.from(options).join(', ') : options);
        console.log("token.value: ", token.value);
        if(!(token instanceof InvalidToken) && ok(token.value) ){
            console.log("OK");
            return token;
        } else {
            console.log("error");
            throw new ParseError(token.line, token.col, token.line, token.col, 
                "expected one of" + Array.from(options).join(" ") + " but got invalid token: " + token.value);
        }
    }
}

function validIdentifier(name){
    return !((delimiters.has(name) || arithmeticOps.has(name) || 
        logicOps.has(name) || keywords.has(name) || typeof name == 'number'));
}

