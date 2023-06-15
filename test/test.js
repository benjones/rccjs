//tests should be runnable either by opening test.html (must be running in a web server since CORS blocks loading js from files)
//or with a commandline runner: brew install v8; d8 --module test.js

import {Token, InvalidToken, Lexer} from '../modules/lexer.js';
import {ArithmeticExpression, AssignmentStatement, FunctionDef, IfStatement, Parser, ReturnStatement, VarDeclaration, WhileStatement} from '../modules/parser.js';
function test(name, code){
    try {
        console.log('running ', name);
        code();
        console.log(name, ' passed');
    } catch (error) {
        console.log(name , 'failed: ', error);
        console.log(error.stack);
    }
}

function assert(cond){
    if (!cond) {
        throw new Error();
    }
}

function arraysEqual(a, b){
    if(a.length != b.length){ return false;}
    for(let i = 0; i < a.length; i++){
        if(a[i] != b[i]){ return false;}
    }
    return true;
}


/****** LEXER TESTS *****/

test('lexing delimiters', ()=>{
    let lexer = new Lexer(`{(}   
        +   ;  -`);
    let tokens = Array.from(lexer);
    let tokenString = tokens.map(x => x.value).join('');
    assert(tokenString == '{(}+;-');
    for(let i = 0; i < 3; i++){
        assert(tokens[i].line == 1);
        assert(tokens[i].col == i + 1);
    }
    for(let i = 3; i < tokens.length; i++){
        assert(tokens[i].line == 2);
    }
});

test('lexing literals', ()=>{
    let lexer = new Lexer(`1234
    5678`);
    // for(let token of lexer){
    //     console.log(token);
    // }
    let tokens = Array.from(lexer);
    let values = tokens.map(x => x.value);
    assert(arraysEqual(values, [1234,5678]));
    assert(tokens[0].line == 1);
    assert(tokens[0].col == 1);
    assert(tokens[1].line == 2);
    assert(tokens[1].col == 5);

});

test('logic ops', () => {
    let lexer = new Lexer(`< > <= >=
    != =
    <
    !
    <`); //'!' is invalid token
    // for(let token of lexer){
    //     console.log(token);
    // }
    let tokens = Array.from(lexer);
    let values = tokens.map(x => x.value);

    assert(arraysEqual(values, ['<', '>', '<=', '>=', '!=', '=', '<', '!', '<']));
    assert(tokens[0].col == 1);
    assert(tokens[3].line == 1);
    assert(tokens[3].col == 8);
    assert(tokens[4].line == 2);
    assert(tokens[4].col = 5);
    assert(tokens[5].line == 2);
    assert(tokens[5].col == 8);
    assert(tokens[7] instanceof InvalidToken);
    assert(tokens[8] instanceof Token);
});

test('words', () => {
    let lexer = new Lexer(`void int hello while
    if else`); //'!' is invalid token
    let tokens = Array.from(lexer);
    let values = tokens.map(x => x.value);
    assert(arraysEqual(values, ['void', 'int', 'hello', 'while',
    'if', 'else']));
    assert(tokens[0].line == 1);
    assert(tokens[2].line == 1);
    assert(tokens[3].line == 1);
    assert(tokens[4].line == 2);
    assert(tokens[5].line == 2);

    assert(tokens[1].col == 6);
    assert(tokens[4].col == 5);
    assert(tokens[5].col == 8);
});

test('mixed lexing', () => {
    let lexer = new Lexer(`void function(int x, int y){
        int z = 3;
        int y = 5;
        return y+z;
    }`); 
    let tokens = Array.from(lexer);
    let values = tokens.map(x => x.value);
    assert(arraysEqual(values, ['void', 'function', '(', 'int', 'x', ',',
    'int', 'y', ')', '{', 'int', 'z', '=', 3, ';', 'int', 'y', '=', 5, ';',
    'return', 'y', '+', 'z', ';', '}']));

});

/***** PARSER TESTS *****/

test('empty function def', ()=>{
    let parser = new Parser(`int aName(){
    }`);
    let func = parser.parseFunction();
    assert(func instanceof FunctionDef);
    //console.log(JSON.stringify(func));
    assert(func.name == 'aName');
    assert(func.parameters.length == 0);
    assert(func.body.length == 0);
});

test('func with parameters', ()=>{
    let parser = new Parser(`int aName(int x,
        int y, int z){
    }`);
    let func = parser.parseFunction();
    assert(func instanceof FunctionDef);
    //console.log(JSON.stringify(func));
    assert(func.name == 'aName');
    assert(func.parameters.length == 3);
    assert(func.body.length == 0);
    assert(arraysEqual(func.parameters.map(x => x.value) , ['x', 'y', 'z']));
});

test('func with body', ()=>{
    let parser = new Parser(`int aName(){
        int x = 0;
        if(x < 3){} else {}
        while(3 > x){}
        return x + 3;
    }`);
    let func = parser.parseFunction();
    assert(func instanceof FunctionDef);
    //console.log(JSON.stringify(func));
    assert(func.name == 'aName');
    assert(func.parameters.length == 0);
    assert(func.body.length == 4);
    assert(func.body[0] instanceof VarDeclaration);
    assert(func.body[1] instanceof IfStatement);
    assert(func.body[2] instanceof WhileStatement);
    assert(func.body[3] instanceof ReturnStatement);
});

test('func compound expression', ()=>{
    let parser = new Parser(`int func(int x, int y, int z){
        int b = 1;
        b = b + x + y;
        return x + y + z + 3 + -b;
    }`);
    let func = parser.parseFunction();
    assert(func instanceof FunctionDef);
    //console.log(JSON.stringify(func));
    assert(func.name == 'func');
    assert(func.parameters.length == 3);
    assert(func.body.length == 3);
    assert(func.body[0] instanceof VarDeclaration);
    assert(func.body[1] instanceof AssignmentStatement);
    assert(func.body[2] instanceof ReturnStatement);
    assert(func.body[1].lhs.value == 'b');
    assert(func.body[1].expr.lhs.name == 'b');
    assert(func.body[1].expr.op.value == '+');
    assert(func.body[1].expr.rhs instanceof ArithmeticExpression);
    
    //not testing EVERYTHING, but a pretty good subset here
    
});

//error handling
test('missing semicolons', ()=>{
    let parser = new Parser(`int func(int x,){
        int b = 1
        b = b + x;
        if(b > 0){
            b = b + 2
        }
        return b;
    }`);
    let func = parser.parseFunction();
    console.log(JSON.stringify(func));
});

